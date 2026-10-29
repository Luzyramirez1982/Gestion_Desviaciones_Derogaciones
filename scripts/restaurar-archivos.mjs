// Devuelve al bucket los archivos de una copia (la carpeta que dejó scripts/respaldo-archivos.mjs, ya descifrada).
// Sube solo los archivos que NO están ya en el bucket (nunca reemplaza uno existente), así se puede repetir sin riesgo,
// y se pueden aplicar varias copias diarias una tras otra.
//
// Uso:  node scripts/restaurar-archivos.mjs <carpeta de la copia>
// Necesita AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION y S3_BUCKET del proyecto destino.
// Después hay que asegurarse de que la tabla `archivos` de la base tenga las mismas filas (viene en la copia de la base).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const carpeta = process.argv[2];
if(!carpeta || !existsSync(join(carpeta, "manifiesto.json"))){
  console.error("Uso: node scripts/restaurar-archivos.mjs <carpeta de la copia>  (debe contener manifiesto.json)");
  process.exit(1);
}
const faltan = ["AWS_ENDPOINT_URL_S3", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "S3_BUCKET"].filter(n => !process.env[n]);
if(faltan.length){ console.error("Faltan variables:", faltan.join(", ")); process.exit(1); }

const Bucket = process.env.S3_BUCKET;
const s3 = new S3Client({
  forcePathStyle: true, region: process.env.AWS_REGION, endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
});
const RUTA_VALIDA = /^(registros|firmas)\/[A-Za-z0-9_-]+\/[A-Za-z0-9._() -]+$/;

const { archivos } = JSON.parse(readFileSync(join(carpeta, "manifiesto.json"), "utf8"));
let subidos = 0, yaEstaban = 0, sinCopia = 0;
for(const a of archivos){
  if(!a.copiado){ sinCopia++; continue; }
  if(!RUTA_VALIDA.test(a.ruta) || a.ruta.includes("..")) continue;
  const existe = await s3.send(new HeadObjectCommand({ Bucket, Key: a.ruta })).then(() => true, () => false);
  if(existe){ yaEstaban++; continue; }
  const cuerpo = readFileSync(join(carpeta, "archivos", ...a.ruta.split("/")));
  await s3.send(new PutObjectCommand({ Bucket, Key: a.ruta, Body: cuerpo, ContentType: a.tipo || "application/octet-stream" }));
  subidos++;
}
console.log(`Subidos: ${subidos}. Ya estaban: ${yaEstaban}. Sin copia en esta carpeta (están en copias de otros días): ${sinCopia}.`);
