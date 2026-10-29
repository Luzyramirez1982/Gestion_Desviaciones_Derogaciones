// Datos de ejemplo con la forma de la versión anterior (como salen de Supabase), inventados para las pruebas.
export const PNG = "data:image/png;base64,iVBORw0KGgo=";
export const PDF = "data:application/pdf;base64,JVBERi0xLjQ=";
export const EXE = "data:application/x-msdownload;base64,TVqQAAMAAAA=";

export const U_ADMIN = "10000000-0000-0000-0000-000000000001";
export const U_JUAN = "10000000-0000-0000-0000-000000000003";
export const U_CARLOS = "10000000-0000-0000-0000-000000000004";

export const exportacion = {
  auth_users: [
    { id: U_ADMIN, email: "Natalia@matec.com.co" }, // el correo se compara sin importar mayúsculas
    { id: U_JUAN, email: "juan@matec.com.co" },
    { id: U_CARLOS, email: "carlos@matec.com.co" },
  ],
  usuarios: [
    { id: "u1", data: { nombre: "Natalia", correo: "natalia@matec.com.co", rol: "Administrador", area: "" } },
    { id: "u3", data: { nombre: "Juan", correo: "juan@matec.com.co", rol: "Responsable del proceso", area: "Calidad de producto" } },
    { id: "u4", data: { nombre: "Carlos", correo: "carlos@matec.com.co", rol: "Aprobador autorizado", area: "" } },
    { id: "u9", data: { nombre: "Sin Cuenta", correo: "sin@matec.com.co", rol: "Líder de SST", area: "" } },
  ],
  configuracion: [
    { id: "areas", data: { areas: ["Calidad de producto", "Diseño", "Producción"], sstIncluida: true } },
    { id: "app", data: { url: "https://matec.pages.dev" } },
  ],
  tipos_desviacion: [
    { id: "t1", area: "Diseño", data: { id: "t1", nombre: "Interferencia de piezas", desc: "Detalle" } },
  ],
  registros: [
    { id: "MTC-001", data: {
      id: "MTC-001", modelo: 4, fechaHora: "2026-10-20T19:30", area: "Calidad de producto", tema: "Calidad de producto",
      tipoGestion: "Desviación", tipoEspecifico: "Un tipo", criticidad: "Menor", stage: 2, borrador: false, devuelta: false,
      reportadoPor: "Juan", reportadoPorId: "u3", vigenciaInicio: "2026-10-21", vigenciaFin: "2026-10-30",
      conceptoEvaluacion: "ok", controlesCompensatorios: "ok",
      firmas: {
        sol: { nombre: "Juan", usuarioId: "u3", rol: "Responsable del proceso", dataUrl: PNG, fecha: "20 oct 2026, 7:31 p. m." },
        aprob: { nombre: "Carlos", usuarioId: "u4", rol: "Aprobador autorizado", dataUrl: PNG, fecha: "21 oct 2026, 8:00 a. m." },
      },
      adjuntos: [
        { id: "f1", nombre: "Informe técnico ñandú.pdf", tipo: "application/pdf", tamano: 9, dataUrl: PDF, fecha: "2026-10-20 19:35", usuario: "Juan" },
        { id: "f2", nombre: "programa.exe", dataUrl: EXE },
        "solo-nombre.docx",
      ],
      bitacora: [
        { etapa: "Solicitud", rol: "Responsable del proceso", usuario: "Juan", fecha: "2026-10-20", comentario: "Solicitud creada y firmada." },
        { etapa: "Evaluación y Aprobación", rol: "Aprobador autorizado", usuario: "Carlos", fecha: "2026-10-21", comentario: "Evaluó la solicitud, la aprobó y firmó." },
      ],
    } },
    // Registro de un modelo muy antiguo (8 etapas) ya cerrado, con un área que cambió de nombre.
    { id: "MTC-002", data: {
      id: "MTC-002", fechaHora: "2026-09-01T08:00", area: "Diseño", tipoGestion: "Desviación", stage: 7, resultado: "",
      reportadoPor: "Juan", reportadoPorId: "u3", fechaCierre: "28 oct 2026, 7:30 p. m.",
      firmas: { sol: { nombre: "Juan", usuarioId: "u3", rol: "Responsable del proceso", dataUrl: "", fecha: "" }, s4: { nombre: "Carlos", usuarioId: "u4", rol: "Aprobador autorizado", dataUrl: "", fecha: "" } },
      conceptoCalidad: "Bien", conceptoSST: "Bien",
    } },
    { id: "MTC-003", data: { id: "MTC-003", area: "Producción", tipoGestion: "Rareza", stage: 1 } }, // figura inválida: se omite
  ],
  registros_eliminados: [
    { id: "del-1", data: {
      id: "del-1", registroId: "MTC-009", eliminadoPorId: "u1", eliminadoPor: "Natalia", eliminadoPorCorreo: "natalia@matec.com.co",
      rol: "Administrador", motivo: "Duplicado", fechaISO: "2026-10-25T15:00:00.000Z", fecha: "25 oct 2026, 10:00 a. m.", restaurado: false,
      copia: { id: "MTC-009", modelo: 4, area: "Producción", tipoGestion: "Derogación", stage: 1, reportadoPor: "Juan", reportadoPorId: "u3",
        firmas: { sol: { nombre: "Juan", usuarioId: "u3", rol: "Responsable del proceso", dataUrl: PNG, fecha: "" } },
        adjuntos: [{ nombre: "x.pdf", dataUrl: "", contenidoOmitido: true }],
        bitacora: [{ etapa: "Solicitud", rol: "Responsable del proceso", usuario: "Juan", fecha: "2026-10-22", comentario: "Solicitud creada y firmada." }] },
    } },
  ],
};
