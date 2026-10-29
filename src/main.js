// Punto de entrada de la aplicación: carga los estilos, elige de dónde vienen los datos y arranca.
import "./estilos/index.css";
import { crearRepositorio } from "./datos/repositorio.js";
import { arrancar } from "./nucleo/app.js";

// Se guarda antes de que nadie toque la dirección (por si un enlace de recuperar contraseña viaja en ella).
const hashInicial = String(location.hash || "");
const repo = crearRepositorio();
arrancar(document.getElementById("app"), repo, { hashInicial });
