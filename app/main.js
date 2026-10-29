// Punto de entrada de la aplicación nueva.
// Si no hay URL ni clave pública de Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_KEY), arranca en modo demostración.
import { crearRepositorio } from "../src/datos/repositorio.js";
import { arrancar } from "./app.js";

// Se guarda antes de que Supabase lea el enlace de "recuperar contraseña" (viene en la dirección).
const hashInicial = String(location.hash || "");
const repo = crearRepositorio(import.meta.env, location.origin + location.pathname);
arrancar(document.getElementById("app"), repo, { hashInicial });
