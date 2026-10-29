# Plan del proyecto — Gestión de Desviaciones y Derogaciones (MATEC)

Guía para quien se una al proyecto: qué se quiere lograr, qué se decidió, qué está hecho y qué falta.
**Cuando termines algo, marca la casilla y cambia la fecha.** Detalle de cada sesión: [HISTORIAL.md](HISTORIAL.md). Reglas de trabajo: [CLAUDE.md](CLAUDE.md).

_Última actualización: 29/10/2026 (noche)_

Leyenda: `[x]` hecho · `[~]` en curso · `[ ]` pendiente · 🔑 necesita acceso a una cuenta de la clienta

## 1. Qué se quiere lograr
La clienta (C.I. Matec Logística) necesita una aplicación para gestionar **desviaciones y derogaciones**, lista para trabajar, compartida con sus usuarios (falta el enlace de acceso) y que **guarde los cambios sin perder información**. Todo gratis y **sin tarjeta**: no puede pagar planes.

## 2. Decisiones tomadas
| Tema | Decisión |
|---|---|
| Arranque | **Desde cero (pedido de la clienta, 29/10/2026):** no se migran datos de la versión 1; solo existirá su usuario como Administradora. |
| Publicación | Cloudflare Pages (gratis) desde este repositorio. |
| Base de datos | **Neon** (Postgres gratis, sin tarjeta) con su ingreso (Managed Better Auth) y su Data API. Supabase descartado; lo hecho con él quedó en la marca `referencia-supabase`. Los archivos van en la misma base (tabla `archivos`). Detalle en la sección 4. |
| Respaldo | Copia cifrada **cada noche** con GitHub Actions (guardada 90 días fuera de Neon). **No hay segunda base en paralelo**: la copia se restaura en otro proyecto de Neon o en otro PostgreSQL si hace falta (`docs/RESPALDOS.md`). |
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

## 4. Base de datos: Neon
Lo que debe cumplir (aprendido con la versión 1) y cómo se cubre:
| Requisito | Cómo |
|---|---|
| Gratis, sin tarjeta, que no se pause | Neon Free; el cómputo se duerme a los 5 min sin uso y despierta solo (no hay pausa de proyecto). |
| Seguridad por rol, área y etapa en el servidor | RLS y funciones en `db/migraciones/` (0001–0003). Una cuenta de ingreso sin perfil no ve nada. |
| Consecutivo `MTC-###` sin repetir y control de versión | Secuencia y `version` en la base (0001–0002). |
| Huella de eliminados que nadie borra | Tabla `auditoria_eliminados`, solo lectura para el Administrador. |
| Archivos de hasta 5 MB, privados | Tabla `archivos` (0004), con las mismas reglas de visibilidad del registro. |
| Cuentas solo por el Administrador | `admin.createUser` de Neon + `crear_perfil` (0005). |
| Respaldo fuera del proveedor | `docs/respaldo-diario.yml` → `docs/RESPALDOS.md`. |

- [x] Elegir la base de datos (Neon) y escribirlo aquí.
- [x] Reglas de seguridad y del flujo portadas a Neon, con pruebas (`db/migraciones/`, `tests/basedatos`, `flujo`, `archivos`, `usuarios`, `catalogo_inicial`).
- [x] Adaptador `src/datos/neon.js` con pruebas contra la base de prueba (`tests/datos_neon.test.js`); la aplicación lo usa cuando existe `VITE_NEON_URL`.
- [x] Scripts: `aplicar-migraciones`, `cargar-catalogo`, `crear-primer-admin` (`scripts/`).
- [x] Archivos privados (tabla `archivos`, se abren con un enlace que solo existe en el navegador).
- [x] Respaldo diario cifrado: plantilla y guía de restauración escritas.
- [x] Cabeceras de seguridad con `*.neon.tech` en `connect-src`.
- [ ] **Probar todo contra un Neon real** (lista de comprobaciones en `docs/NEON_PASOS.md`). 🔑
- [ ] Crear el proyecto de Neon, activar la Data API y correr los scripts. 🔑
- [ ] Crear a la Administradora (la clienta) y confirmar el catálogo inicial de áreas y tipos. 🔑
- [ ] Copiar el flujo de respaldo a `.github/workflows/`, cargar los secretos y ensayar una restauración. 🔑
- [ ] Correo de «¿Olvidó su contraseña?»: configurar SMTP propio en Neon (el compartido tiene límite) o dejar que el Administrador restablezca.
- [ ] Actualización en vivo: por ahora no hay (se refresca al volver a la pestaña) para no gastar horas de cómputo gratuitas. Revisar con el consumo real.
- [ ] Revisar los 11 avisos de `npm audit` que trae el SDK de Neon (`@neondatabase/neon-js`): vienen de sus dependencias de servidor y de componentes de pantalla que la aplicación no usa; confirmar con el equipo de Neon o actualizar cuando publiquen una versión corregida.
## 5. Pendiente: calidad del código y lo visual
- [x] Un solo árbol `src/` con carpetas por responsabilidad.
- [x] Dividir los archivos grandes (`vistas/formulario.js`, `vistas/detalle.js`, `vistas/ayuda.js`, `componentes/ui.js`) en piezas de una sola responsabilidad. Revisado con ESLint (`no-undef`) sobre todo `src/`.
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
