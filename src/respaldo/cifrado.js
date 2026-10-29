// Cifrado de las copias de seguridad, para que los datos de la clienta no queden legibles
// en el repositorio de respaldos aunque alguien lo vea. Usa AES-256-GCM, que además detecta
// si el archivo fue alterado o si la contraseña es incorrecta.
//
// Formato del archivo cifrado: "MTC1" + sal (16 bytes) + iv (12) + etiqueta (16) + datos cifrados.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const MARCA = Buffer.from("MTC1");

const derivarClave = (frase, sal) => scryptSync(frase, sal, 32);

export function cifrar(datos, frase){
  if(!frase || frase.length < 16) throw new Error("La contraseña de los respaldos debe tener al menos 16 caracteres.");
  const sal = randomBytes(16), iv = randomBytes(12);
  const cifrador = createCipheriv("aes-256-gcm", derivarClave(frase, sal), iv);
  const cuerpo = Buffer.concat([cifrador.update(datos), cifrador.final()]);
  return Buffer.concat([MARCA, sal, iv, cifrador.getAuthTag(), cuerpo]);
}

export function descifrar(archivo, frase){
  if(archivo.length < 48 || !archivo.subarray(0, 4).equals(MARCA)) throw new Error("El archivo no es un respaldo válido.");
  const sal = archivo.subarray(4, 20), iv = archivo.subarray(20, 32), etiqueta = archivo.subarray(32, 48);
  const descifrador = createDecipheriv("aes-256-gcm", derivarClave(frase, sal), iv);
  descifrador.setAuthTag(etiqueta);
  try {
    return Buffer.concat([descifrador.update(archivo.subarray(48)), descifrador.final()]);
  } catch {
    throw new Error("No se pudo abrir el respaldo: la contraseña es incorrecta o el archivo está dañado.");
  }
}
