// Ayudas para las pruebas de recorrido: montan la aplicación completa en jsdom con el adaptador de demostración.
import { crearAdaptadorDemo } from "../../src/datos/demo.js";
import { arrancar } from "../../app/app.js";
import { CLAVE_DEMO } from "../../src/datos/ejemplo.js";

// jsdom no trae canvas: se simula lo mínimo para que el recuadro de firma "dibuje".
export function simularCanvas(){
  HTMLCanvasElement.prototype.getContext = () => ({ beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, clearRect(){} });
  HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,AAAA";
}

export const esperar = (ms = 0) => new Promise(r => setTimeout(r, ms));
// Espera hasta que se cumpla la condición (las pantallas se repintan de forma asíncrona).
export async function hasta(condicion, mensaje = "la condición", intentos = 80){
  for(let i = 0; i < intentos; i++){ const r = condicion(); if(r) return r; await esperar(10); }
  throw new Error("No se cumplió a tiempo: " + mensaje);
}

export async function montarApp(){
  document.body.innerHTML = '<div id="app"></div>';
  location.hash = "";
  const repo = { ...crearAdaptadorDemo(), demo: true, alEventoSesion: () => () => {} };
  const raiz = document.getElementById("app");
  const ctx = await arrancar(raiz, repo);
  return { raiz, repo, ctx };
}

export async function ingresar(app, usuario){
  const f = app.raiz.querySelector("#formIngreso");
  f.elements.correo.value = usuario + "@ejemplo.test"; f.elements.clave.value = CLAVE_DEMO;
  f.dispatchEvent(new Event("submit", {cancelable: true, bubbles: true}));
  await hasta(() => app.raiz.querySelector("#btnSalir"), "entrar a la aplicación");
}
export async function salir(app){
  app.raiz.querySelector("#btnSalir").click();
  await hasta(() => app.raiz.querySelector("#formIngreso"), "volver al ingreso");
}
export const menu = (app) => [...app.raiz.querySelectorAll(".nav button")].map(b => b.textContent.trim().replace(/\d+$/, "").trim());
export const clic = (el) => el.dispatchEvent(new MouseEvent("click", {bubbles: true}));
export const escribir = (el, valor) => { el.value = valor; el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", {bubbles: true})); };
