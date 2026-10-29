// Guardado confiable: junta los cambios, los envía de a uno y reintenta si se cae la conexión.
// Estados que ve la persona: pendiente, guardando, guardado, error (con "Reintentar") y conflicto.
//
// guardar(): función async que lee lo último que hay en pantalla y lo manda a la base.
// Si lanza un error con codigo "conflicto_version" no se reintenta: se avisa para que la persona recargue.
export function crearGuardador({
  guardar, alEstado = () => {}, esperaAntes = 700, esperas = [1500, 4000, 10000],
  puedeReintentar = (e) => e && e.codigo === "sin_conexion", programar = setTimeout, cancelar = clearTimeout,
}){
  let estado = "inactivo", mensaje = "";
  let temporizador = null, intento = 0, corriendo = false, sucio = false, enEspera = null;

  const poner = (nuevo, msg = "") => { estado = nuevo; mensaje = msg; alEstado(nuevo, msg); };

  async function correr(){
    if(corriendo) return enEspera;
    corriendo = true;
    enEspera = (async () => {
      try {
        while(sucio){
          sucio = false;
          poner("guardando");
          try {
            await guardar();
            intento = 0;
          } catch(e){
            sucio = true;
            if(e && e.codigo === "conflicto_version"){ sucio = false; poner("conflicto", e.message); return false; }
            if(puedeReintentar(e) && intento < esperas.length){
              const espera = esperas[intento++];
              poner("error", `${e.message} Se reintentará solo en ${Math.round(espera / 1000)} s.`);
              temporizador = programar(() => { temporizador = null; correr(); }, espera);
              return false;
            }
            poner("error", (e && e.message) || "No se pudo guardar. Intente de nuevo.");
            return false;
          }
        }
        poner("guardado");
        return true;
      } finally { corriendo = false; }
    })();
    return enEspera;
  }

  return {
    // Algo cambió en pantalla: se guarda poco después, para no enviar una vez por cada letra.
    marcar(){
      sucio = true;
      if(estado === "conflicto") return;
      poner("pendiente");
      if(temporizador) cancelar(temporizador);
      temporizador = programar(() => { temporizador = null; correr(); }, esperaAntes);
    },
    // Guarda ya (por ejemplo, antes de firmar o de cambiar de pantalla).
    async ahora(){
      if(temporizador){ cancelar(temporizador); temporizador = null; }
      if(estado === "conflicto") return false;
      if(!sucio && !corriendo) return true;
      return correr();
    },
    // Botón "Reintentar" después de un error.
    reintentar(){
      if(temporizador){ cancelar(temporizador); temporizador = null; }
      intento = 0; sucio = true;
      return correr();
    },
    // Después de recargar el registro la persona vuelve a poder guardar.
    reiniciar(){
      if(temporizador){ cancelar(temporizador); temporizador = null; }
      sucio = false; intento = 0; poner("inactivo");
    },
    hayPendientes: () => sucio || corriendo || estado === "error",
    get estado(){ return estado; },
    get mensaje(){ return mensaje; },
  };
}

// Texto corto para el indicador que ve la clienta.
export function textoEstado(estado){
  return {
    pendiente: "Cambios sin guardar…", guardando: "Guardando…", guardado: "Guardado",
    error: "Error al guardar", conflicto: "Alguien más cambió este registro",
  }[estado] || "";
}
