// Copia los archivos del bucket a una carpeta, para el respaldo nocturno (ver docs/RESPALDOS.md).
// Los archivos viven en el bucket de Neon, así que la copia de la base de datos NO los incluye.
//
// Uso:  node scripts/respaldo-archivos.mjs <carpeta de salida> [--horas 36] [--todo]
//   --horas N   copia solo los archivos de las últimas N horas (por defecto 36: así dos noches seguidas se solapan
//               y un día fallido no deja huecos). Los archivos nunca se modifican, solo se agregan.
//   --todo      copia todos los archivos (la primera vez, o para una copia completa).
// Además de los archivos deja `manifiesto.json` con la lista COMPLETA del bucket (ruta, tamaño, tipo, fecha),
// para saber qué había aunque no estuviera en la copia de ese día.
// Necesita las variables AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION y S3_BUCKET.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

const salida = process.argv[2];
const todo = process.argv.includes("--todo");
const horas = Number(process.argv[process.argv.indexOf("--horas") + 1]) || 36;
if(!salida || salida.startsWith("--")){
  console.error("Uso: node scripts/respaldo-archivos.mjs <carpeta de salida> [--horas 36] [--todo]");
  process.exit(1);
}
const faltan = ["AWS_ENDPOINT_URL_S3", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "S3_BUCKET"].filter(n => !process.env[n]);
if(faltan.length){ console.error("Faltan variables:", faltan.join(", ")); process.exit(1); }

const Bucket = process.env.S3_BUCKET;
const s3 = new S3Client({
  forcePathStyle: true, region: process.env.AWS_REGION, endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
});

// Solo se aceptan rutas como las que crea la aplicación; cualquier otra cosa se ignora (nunca se escribe fuera de la carpeta).
const RUTA_VALIDA = /^(registros|firmas)\/[A-Za-z0-9_-]+\/[A-Za-z0-9._() -]+$/;

const desde = Date.now() - horas * 3600 * 1000;
const manifiesto = [];
let copiados = 0, bytes = 0, ignorados = 0, token;
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken: token }));
  for(const o of r.Contents || []){
    if(!RUTA_VALIDA.test(o.Key) || o.Key.includes("..")){ ignorados++; continue; }
    const entrada = { ruta: o.Key, tamano: o.Size, modificado: o.LastModified && o.LastModified.toISOString(), tipo: "" };
    if(todo || (o.LastModified && o.LastModified.getTime() >= desde)){
      const g = await s3.send(new GetObjectCommand({ Bucket, Key: o.Key }));
      const contenido = Buffer.from(await g.Body.transformToByteArray());
      const destino = join(salida, "archivos", ...o.Key.split("/"));
      mkdirSync(dirname(destino), { recursive: true });
      writeFileSync(destino, contenido);
      entrada.tipo = g.ContentType || "";
      entrada.copiado = true;
      copiados++; bytes += contenido.length;
    }
    manifiesto.push(entrada);
  }
  token = r.IsTruncated ? r.NextContinuationToken : undefined;
} while(token);

mkdirSync(salida, { recursive: true });
writeFileSync(join(salida, "manifiesto.json"), JSON.stringify({ generado: new Date().toISOString(), bucket: Bucket, completo: todo, horas: todo ? null : horas, archivos: manifiesto }, null, 2));
console.log(`Archivos en el bucket: ${manifiesto.length}. Copiados ahora: ${copiados} (${(bytes / 1048576).toFixed(2)} MB).${ignorados ? ` Ignorados por nombre raro: ${ignorados}.` : ""}`);
