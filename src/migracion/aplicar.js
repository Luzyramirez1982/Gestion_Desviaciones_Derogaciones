// Aplica el plan de migración (src/migracion/v1a2.js → planificar) sobre la base de datos nueva.
// No habla directamente con Supabase: recibe un "cliente" con unas pocas operaciones, así se puede
// probar con uno de mentira. El cliente real está en scripts/migrar-v1-a-v2.mjs.
//
// El cliente debe ofrecer:
//   upsert(tabla, filas, columnaUnica)       guarda las filas, reemplazando las que ya existan
//   reemplazar(tabla, columna, valor, filas) borra las filas con ese valor y guarda las nuevas
//   subir(ruta, bytes, tipo)                 sube un archivo (si ya existe, lo reemplaza)
//   contar(tabla)                            cuántas filas tiene una tabla
//   establecerConsecutivo(numero)
//
// Se puede ejecutar varias veces: cada paso reemplaza lo que ya había migrado, sin duplicar.

export function decodificarDataUrl(dataUrl){
  const m = String(dataUrl || "").match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if(!m) throw new Error("El archivo no tiene un formato de datos válido.");
  return { tipo: m[1], bytes: m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3])) };
}

const sinCampos = (fila, ...campos) => { const c = { ...fila }; campos.forEach(k => delete c[k]); return c; };

// Por seguridad no se aplica sobre una base que ya tiene registros (podría pisar trabajo real),
// salvo que se indique permitirRepetir: por ejemplo, para retomar una migración que se cortó a la mitad.
export async function aplicarPlan(plan, cliente, { alAvanzar = () => {}, permitirRepetir = false } = {}){
  if(!permitirRepetir && await cliente.contar("registros") > 0){
    throw new Error("La base de datos nueva ya tiene registros. Si es una migración que se cortó y quiere retomarla, repita indicando que se permite repetir.");
  }
  const hecho = { areas: 0, tipos: 0, perfiles: 0, registros: 0, bitacora: 0, firmas: 0, adjuntos: 0, archivos: 0, eliminados: 0 };
  const paso = async (nombre, fn) => {
    try { await fn(); } catch (e) { throw new Error(`Falló el paso "${nombre}": ${e.message}`); }
    alAvanzar(nombre);
  };

  await paso("áreas", async () => { await cliente.upsert("areas", plan.areas, "nombre"); hecho.areas = plan.areas.length; });
  await paso("personas", async () => { await cliente.upsert("perfiles", plan.perfiles, "id"); hecho.perfiles = plan.perfiles.length; });
  await paso("tipos", async () => { await cliente.upsert("tipos", plan.tipos, "id"); hecho.tipos = plan.tipos.length; });
  if(plan.config.length) await paso("ajustes", () => cliente.upsert("configuracion", plan.config, "clave"));

  await paso("registros", async () => { await cliente.upsert("registros", plan.registros.map(r => r.fila), "id"); hecho.registros = plan.registros.length; });

  // Archivos primero (si algo falla aquí, todavía no se anotó nada que apunte a un archivo inexistente).
  const subidas = [
    ...plan.registros.flatMap(r => r.firmas.filter(f => f.imagen).map(f => ({ ruta: f.ruta_imagen, dataUrl: f.imagen }))),
    ...plan.registros.flatMap(r => r.adjuntos.map(a => ({ ruta: a.ruta, dataUrl: a.dataUrl }))),
    ...plan.huellas.flatMap(h => h.firmas.map(f => ({ ruta: f.ruta_imagen, dataUrl: f.imagen }))),
  ];
  const yaSubidas = new Set();
  await paso("archivos", async () => {
    for(const s of subidas){
      if(yaSubidas.has(s.ruta)) continue;
      const { tipo, bytes } = decodificarDataUrl(s.dataUrl);
      await cliente.subir(s.ruta, bytes, tipo);
      yaSubidas.add(s.ruta);
      hecho.archivos++;
    }
  });

  await paso("historial, firmas y adjuntos", async () => {
    for(const r of plan.registros){
      const id = r.fila.id;
      await cliente.reemplazar("bitacora", "registro_id", id, r.bitacora.map(b => sinCampos(b, "id")));
      await cliente.reemplazar("firmas", "registro_id", id, r.firmas.map(f => sinCampos(f, "imagen")));
      await cliente.reemplazar("adjuntos", "registro_id", id, r.adjuntos.map(a => sinCampos(a, "dataUrl")));
      hecho.bitacora += r.bitacora.length; hecho.firmas += r.firmas.length; hecho.adjuntos += r.adjuntos.length;
    }
  });

  await paso("registros eliminados", async () => {
    // un mismo registro pudo eliminarse y restaurarse varias veces: se guardan todas sus huellas juntas
    const porRegistro = new Map();
    for(const h of plan.huellas) porRegistro.set(h.fila.registro_id, [...(porRegistro.get(h.fila.registro_id) || []), h.fila]);
    for(const [registroId, filas] of porRegistro){
      await cliente.reemplazar("auditoria_eliminados", "registro_id", registroId, filas);
      hecho.eliminados += filas.length;
    }
  });

  await paso("consecutivo", () => cliente.establecerConsecutivo(plan.consecutivo));
  return hecho;
}
