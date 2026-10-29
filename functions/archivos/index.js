// Entrada de la función «archivos» en Neon Functions: conecta el manejador con el bucket real.
// Las variables las pone Neon al desplegar (ver docs/NEON_PASOS.md); aquí no hay ninguna clave escrita.
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { crearManejador } from "./manejador.js";

const faltan = ["AWS_ENDPOINT_URL_S3", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "DATA_API_URL"]
  .filter(n => !process.env[n]);
if(faltan.length) console.error("Faltan variables de la función archivos:", faltan.join(", "));

const bucket = process.env.S3_BUCKET || "uploads";
const s3 = new S3Client({
  forcePathStyle: true,   // Neon solo entiende direcciones con el bucket en la ruta
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
});

const almacen = {
  async poner(ruta, bytes, tipo){
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: ruta, Body: bytes, ContentType: tipo }));
  },
  async leer(ruta){
    try {
      const r = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: ruta }));
      return { bytes: await r.Body.transformToByteArray(), tipo: r.ContentType };
    } catch(e){
      if(e && (e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404)) return null;
      throw e;
    }
  },
  async borrar(ruta){
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: ruta }));
  },
};

const origenes = (process.env.ORIGENES || "").split(",").map(s => s.trim()).filter(Boolean);

export default { fetch: crearManejador({ dataApiUrl: process.env.DATA_API_URL, almacen, origenes }) };
