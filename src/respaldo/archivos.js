// Decide qué archivos hay que copiar en el respaldo. Es una función pura, para poder probarla.
//
// Los archivos de la aplicación no se pueden reemplazar ni borrar, así que basta copiar los que
// todavía no están en el respaldo. Así el repositorio de respaldos solo crece con lo nuevo.

// En el repositorio de respaldos cada archivo se guarda como "archivos/<ruta original>.cif".
export const rutaEnRespaldo = (ruta) => `archivos/${ruta}.cif`;

// remotos: rutas que hay en Storage. existentes: rutas ya guardadas en el respaldo (con su ".cif").
export function archivosPendientes(remotos, existentes){
  const ya = new Set(existentes);
  return remotos.filter(r => !ya.has(rutaEnRespaldo(r)));
}

// Las rutas de Storage vienen por carpetas: se recorren una a una (los elementos sin "id" son carpetas).
export async function listarTodo(storage, bucket, carpeta = ""){
  const rutas = [];
  const { data, error } = await storage.from(bucket).list(carpeta, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if(error) throw new Error(`No se pudo listar "${carpeta || "/"}": ${error.message}`);
  for(const e of data || []){
    const ruta = carpeta ? `${carpeta}/${e.name}` : e.name;
    if(e.id) rutas.push(ruta);
    else rutas.push(...await listarTodo(storage, bucket, ruta));
  }
  return rutas;
}
