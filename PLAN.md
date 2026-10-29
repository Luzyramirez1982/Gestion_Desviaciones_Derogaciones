# Plan del proyecto — Gestión de Desviaciones y Derogaciones (MATEC)

Guía para quien se una al proyecto: qué se quiere lograr, qué se decidió, qué está hecho y qué falta.
**Cuando termines algo, marca la casilla y cambia la fecha.** Detalle de cada sesión: [HISTORIAL.md](HISTORIAL.md). Reglas de trabajo: [CLAUDE.md](CLAUDE.md).

_Última actualización: 29/10/2026_

Leyenda: `[x]` hecho · `[~]` en curso · `[ ]` pendiente · 🔑 necesita acceso a una cuenta de la clienta

## 1. Qué se quiere lograr
La clienta (C.I. Matec Logística) necesita una aplicación para gestionar **desviaciones y derogaciones**, lista para trabajar, compartida con sus usuarios (falta el enlace de acceso) y que **guarde los cambios sin perder información**. Todo gratis y **sin tarjeta**: no puede pagar planes.

## 2. Decisiones tomadas
| Tema | Decisión |
|---|---|
| Arranque | **Desde cero (pedido de la clienta, 29/10/2026):** no se migran datos de la versión 1; solo existirá su usuario como Administradora. |
| Publicación | Cloudflare Pages (gratis) desde este repositorio. |
| Base de datos | **Supabase descartado.** La nueva base **está por elegir** (ver sección 4). Lo hecho con Supabase quedó en la marca `referencia-supabase`. |
| Interfaz | Aplicación con Vite en `src/`, una pantalla por archivo y estilos separados por tema, para que un socio mejore lo visual. |
| Costos | Todo gratis y sin tarjeta. Si algo pide tarjeta, no se usa. |

## 3. Estado actual
- [x] Interfaz completa en modo demostración: ingreso, panel, lista (filtros y paginación), formulario de nuevo registro (8D, firma, borradores), detalle (firmas, devolver, rechazar, retroceder), usuarios, tipos y áreas, registros eliminados, instructivo, uso del almacenamiento.
- [x] Reglas del procedimiento en `src/dominio/` (etapas, firmas, 8D, vigencias, quién ve qué) con pruebas.
- [x] Guardado confiable en pantalla: indicador, reintentos y aviso de conflicto de versión.
- [x] PDF de trazabilidad y Excel histórico.
- [x] Compresión de fotos y límites de archivo (5 MB).
- [x] Cabeceras de seguridad para Cloudflare (`public/_headers`).
- [x] Estilos separados por tema en `src/estilos/`.
- [x] 107 pruebas automáticas, 0 vulnerabilidades, compilación correcta.

## 4. Pendiente: elegir la base de datos
Lo que debe cumplir (aprendido con la versión 1):
- Gratis, sin tarjeta y que **no se pause ni deje de guardar**.
- **Seguridad por rol, área y etapa** exigida en el servidor, no solo en la pantalla (nadie debe poder saltarse una firma).
- **Consecutivo `MTC-###` que no se repita** y **control de versión** para que dos personas no se pisen.
- **Huella de eliminados** (quién, cuándo, por qué) que nadie pueda borrar.
- **Archivos** de hasta 5 MB, privados.
- **Respaldo** automático fuera del proveedor.
- Cuentas creadas solo por el Administrador, con contraseña temporal.

Tareas una vez elegida:
- [ ] Elegir la base de datos y dejar la decisión escrita aquí.
- [ ] Escribir su adaptador en `src/datos/` (la interfaz está descrita en `src/datos/repositorio.js`; las pantallas no cambian).
- [ ] Escribir las reglas de seguridad y del flujo en el servidor, con pruebas (las reglas están en `src/dominio/` y, como referencia, en la marca `referencia-supabase`).
- [ ] Crear al Administrador (la clienta) y cargar el catálogo inicial de áreas y tipos (propuesta: las 8 áreas y sus tipos por defecto, editables; confirmar con ella). 🔑
- [ ] Archivos privados con enlaces temporales.
- [ ] Actualización en vivo (opcional: la interfaz ya la soporta si el adaptador ofrece `suscribir`).
- [ ] Respaldo diario cifrado (hay un flujo de GitHub Actions que armó el equipo y quedó pendiente de adaptar a la nueva base).
- [ ] Ajustar `public/_headers` con la dirección de la nueva base (ver `docs/CABECERAS.md`).

## 5. Pendiente: calidad del código y lo visual
- [x] Un solo árbol `src/` con carpetas por responsabilidad.
- [~] Dividir los archivos grandes (`vistas/formulario.js`, `vistas/detalle.js`, `vistas/ayuda.js`) en piezas de una sola responsabilidad.
- [ ] Revisión visual y mejora de la interfaz (socio de diseño).

## 6. Pendiente: publicación y entrega
- [ ] Publicar en Cloudflare Pages (`npm run build`, carpeta `dist`). 🔑
- [ ] Probar desde celular y computador: primer ingreso, recuperación de contraseña, firmar, cerrar, PDF y Excel.
- [ ] Actualizar `docs/MANUAL_ADMINISTRADOR.md` con la base elegida y entregarlo.
- [ ] Fusionar `feat/v2` en `main`.

## 7. Lo que necesitamos de la clienta
1. Nombre completo y correo de su usuario Administradora.
2. Confirmar el catálogo inicial de áreas y tipos.
3. El nombre que quiere para el enlace (`<nombre>.pages.dev`) y acceso a Cloudflare. 🔑
