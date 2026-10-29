// Qué pasa al guardar un borrador o al enviar la solicitud: construye los datos, llama al
// repositorio, sube los archivos pendientes y deja la aplicación lista para seguir.
import { emptyD8 } from "../../dominio/d8.js";
import { validarVigencia } from "../../dominio/registro.js";
import { fmtFecha } from "../../util/formato.js";
import { confirmar } from "../../componentes/dialogos.js";
import { datosDelFormulario } from "./datos.js";
import { preparar } from "./preparar.js";

// Sube lo que se adjuntó en esta sesión del formulario. Si alguno falla, el registro queda
// creado igual: se avisa cuáles archivos hay que volver a subir desde el detalle.
async function subirPendientes(ctx, f, id){
  const fallidos = [];
  for(const a of f.archivos){
    try { await ctx.repo.subirAdjunto(id, a); } catch(e){ fallidos.push(`${a.name}: ${e.message}`); }
  }
  f.archivos = [];
  return fallidos;
}

// Guarda el avance sin firma (no exige campos obligatorios: es justo para seguir después).
export async function guardarBorrador(ctx, f, form){
  const datos = datosDelFormulario(form, ctx, f);
  const rec = f.rec
    ? await ctx.repo.guardarRegistro(f.rec.id, f.rec.version, {...f.rec, ...datos})
    : await ctx.repo.crearRegistro({data: datos, borrador: true});
  const fallidos = await subirPendientes(ctx, f, rec.id);
  fallidos.forEach(m => ctx.error(new Error(m)));
  await ctx.recargar();
  ctx.formulario = {clave: rec.id, rec: await ctx.repo.cargarRegistro(rec.id), d8: structuredClone(rec.d8 || emptyD8()), archivos: [],
    aviso: `Avance guardado (${fmtFecha(new Date().toISOString())}). Puede continuarlo después desde "Nuevo registro". La firma se pide solo al enviar.`};
  ctx.parametro = rec.id;
  location.hash = "#/nuevo/" + rec.id;
}

// Revisa que el formulario esté completo y firmado antes de enviarlo.
function validarAntesDeEnviar(form, firma){
  const oculto = (c) => c.closest('[style*="display:none"], [style*="display: none"]');
  const faltante = [...form.querySelectorAll("[required]")].find(c => !oculto(c) && !String(c.value).trim());
  if(faltante){
    faltante.focus();
    const nombre = faltante.closest(".field")?.querySelector("label")?.textContent || "un campo obligatorio";
    throw new Error(`Falta completar «${nombre}». Si aún no termina, use «Guardar borrador».`);
  }
  if(!firma.hayFirma()) throw new Error("Por favor dibuje su firma en el recuadro antes de enviar la solicitud.");
  if(!form.elements.confirmaVeraz.checked) throw new Error("Marque la confirmación de que la información es veraz.");
}

// Envía la solicitud: queda firmada y pasa a Evaluación y Aprobación.
export async function enviarFormulario(ctx, f, form, firma){
  validarAntesDeEnviar(form, firma);
  const datos = datosDelFormulario(form, ctx, f);
  const errVig = validarVigencia(datos);
  if(errVig) throw new Error(errVig);
  const rec = f.rec
    ? await ctx.repo.enviarRegistro(f.rec.id, f.rec.version, {...f.rec, ...datos}, firma.imagen())
    : await ctx.repo.crearRegistro({data: datos, firma: firma.imagen()});
  const fallidos = await subirPendientes(ctx, f, rec.id);
  await ctx.recargar();
  ctx.creado = await ctx.repo.cargarRegistro(rec.id);
  ctx.creadoAvisos = fallidos.length ? ["No se pudieron subir algunos archivos:", ...fallidos] : [];
  ctx.formulario = null; ctx.parametro = "";
  location.hash = "#/nuevo";
}

// Aviso cuando otra persona cambió el registro mientras se editaba (control de versión):
// no se sobrescribe su trabajo, se ofrece recargar la versión más reciente.
export async function avisoConflicto(ctx){
  const recargar = await confirmar("Alguien más cambió esta solicitud",
    "Otra persona modificó este registro mientras usted lo editaba. Para no pisar su trabajo, no se guardó nada. ¿Desea recargar la versión más reciente? (Lo que escribió en pantalla se perderá.)",
    {aceptar: "Recargar", cancelar: "Quedarme aquí"});
  if(recargar){ ctx.formulario = null; await ctx.recargar(); await preparar(ctx); ctx.render(); }
}
