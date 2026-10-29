# Reglas del proyecto — Gestión de Desviaciones y Derogaciones (MATEC)

Estas reglas valen para cualquier persona (o asistente) que trabaje en este repositorio. Si algo no está aquí, se decide con sentido común y se anota.
Para saber qué falta por hacer, ver [PLAN.md](PLAN.md). La historia de los cambios está en [HISTORIAL.md](HISTORIAL.md).

## Qué es esto
Aplicación de MATEC para gestionar desviaciones y derogaciones, con ciclo de 3 etapas (Solicitud → Evaluación y Aprobación → Cierre), firmas, reporte 8D y tres roles: **Administrador**, **Responsable del proceso** y **Aprobador autorizado**. La clienta **no es técnica** y no puede pagar planes: todo debe ser gratis y sin tarjeta.

## Reglas de trabajo con git
1. **Trabajar siempre en `feat/v2`** (o en una rama `feat/...` que salga de ella). **No tocar `main`** hasta el cambio final; `main` es lo que se publica.
2. **Commits a nombre de la persona del equipo, nada más.** No agregar líneas `Co-Authored-By`, "Generated with" ni mención a herramientas de IA, ni en commits ni en descripciones de PR.
3. Mensajes de commit **en español, cortos y claros**: una línea de título y, si hace falta, una lista de lo que cambió.
4. **Antes de subir (`git push`)**: correr `npm test` (todo en verde), revisar con `git status` y `git diff` que solo vaya lo que se quiere, y comprobar que no haya claves ni datos reales.
5. Nunca `git push --force`, nunca borrar ramas ajenas, nunca saltarse las pruebas para subir algo.
6. **Flujos de GitHub Actions:** el token con el que se sube desde el computador no tiene el permiso *workflow*, así que GitHub rechaza cualquier archivo dentro de `.github/workflows/`. Los flujos se guardan como plantilla en `docs/` y quien tenga permiso los copia a esa carpeta (ver `docs/RESPALDOS.md`).
7. No subir: `.env`, claves `service_role`, exportaciones de la base de datos real, archivos de la clienta ni copias de respaldo.

## Cómo escribir el código
- **Comentarios en español sencillo**, cortos y fáciles de leer, como los escribiría una persona del equipo explicándole a alguien que no es técnico. Explican **por qué** se hace algo, no repiten lo que ya dice el código. Sin jerga innecesaria, sin frases de relleno.
- Nombres de funciones y variables como ya están en el proyecto (en español, p. ej. `registros`, `firmar_etapa`, `esDueno`). Seguir el estilo del archivo en el que se trabaja.
- Mensajes que ve la clienta (errores, avisos): en español claro, diciendo qué pasó y qué hacer.
- Hacer cambios pequeños y que se puedan probar. Si se ve algo que se puede mejorar (seguridad, claridad, rendimiento), se mejora y se deja anotado.
- No inventar funciones que nadie pidió. No dejar código muerto ni comentado.

## Pruebas
- `npm test` corre todo en unos segundos y **no necesita internet**. Las pruebas de base de datos usan un PostgreSQL de prueba (PGlite) que carga los mismos archivos SQL que irán a Supabase.
- **Todo cambio de reglas o de base de datos lleva su prueba.** Si algo falla, se arregla la causa; no se borra ni se debilita la prueba.
- Probar los dos lados: lo que **sí** se puede hacer y lo que **no** (por ejemplo, otra área no ve el registro).
- Las reglas existen en dos lugares (pantalla en `src/dominio/` y base de datos en `supabase/migrations/`). Si se cambia una, se cambia la otra y la prueba de comparación (`tests/flujo.test.js`) debe seguir en verde.

## Base de datos (`supabase/migrations/`)
- Los archivos van numerados y se ejecutan **en orden**: `0000` → `0004`.
- **Mientras no estén ejecutados en un Supabase real**, se pueden editar. **Desde el día que se ejecuten en pruebas o producción, no se editan**: todo cambio va en un archivo nuevo (`0005_...`).
- Cada archivo debe poder ejecutarse **más de una vez sin errores** y **sin borrar datos** (`create ... if not exists`, `create or replace`, `drop policy if exists`).
- **La aplicación no escribe directo en las tablas de registros.** Lo hace por funciones (`crear_registro`, `firmar_etapa`...) que revisan quién es la persona y si puede hacerlo. No dar permisos de `insert`, `update` o `delete` sobre esas tablas.
- Toda función nueva: `security definer` con `set search_path = public`, quitar permiso a `public` y `anon`, y dar `execute` solo a `authenticated`. Las ayudas internas no se exponen a nadie.
- Al agregar un texto suelto a una lista (`text[]`), usar `'texto'::text` (si no, PostgreSQL lo lee como lista y falla).
- **Probar siempre que un permiso realmente bloquea**: apagar la regla a propósito y ver que la prueba falla.

## Seguridad (no negociable)
- La **clave `service_role` jamás va en el navegador**, en `config.js`, en el repositorio ni en una captura. Solo vive como secreto en la función del servidor y en GitHub Actions.
- Lo único que puede ir en el navegador es la URL de Supabase y la clave pública (*publishable/anon*), y la seguridad depende de los permisos de la base de datos, no de esconder esa clave.
- El **registro abierto de usuarios debe estar apagado** en Supabase. Las cuentas las crea el Administrador.
- Todo texto que venga de la base de datos se muestra con `esc()` y todo enlace con `urlSegura()` (`src/util/html.js`).
- Los archivos van en el bucket **privado**, con 5 MB como máximo por archivo, y cada uno en la carpeta de su registro. Las firmas, en la carpeta de quien firma.
- No subir datos reales de la clienta a pruebas, issues ni conversaciones. Los datos de ejemplo se inventan.

## Reglas del procedimiento (no cambiar sin hablar con la clienta)
- Etapas: Solicitud (la firma quien la hace) → Evaluación y Aprobación (la firma el **Aprobador autorizado**) → Cierre (lo firma **quien hizo la solicitud**).
- Solo se firma la etapa en curso. Devolver o rechazar exige un motivo. Solo el Administrador retrocede de Cierre a Evaluación.
- Una **derogación** no se aprueba sin el 8D completo. Puede ser **temporal** (rango de fechas) o **definitiva** (fecha efectiva).
- Cada rol llena solo sus campos: evaluación y medidas de control (Aprobador), observaciones y cumplimiento de cierre (quien hizo la solicitud).
- Eliminar un registro: solo el Administrador, con motivo, dejando **huella** (quién, cuándo, por qué y copia). La huella no se borra.
- Siempre debe quedar al menos un Administrador activo.

## Costos y servicios
Todo en planes gratuitos y **sin tarjeta**: Supabase (gratis), Cloudflare Pages, GitHub Actions. Si una opción pide tarjeta, no se usa y se busca otra. Cuidar los límites: **500 MB** de base de datos y **1 GB** de archivos en Supabase.

## Comandos
```bash
npm install     # una sola vez
npm test        # todas las pruebas (sin internet)
npm run test:watch
```

## Mantener los documentos al día
- Al terminar una tarea: marcar la casilla en [PLAN.md](PLAN.md) y cambiar la fecha de "Última actualización".
- Al cerrar una sesión de trabajo: agregar lo hecho a [HISTORIAL.md](HISTORIAL.md) en lenguaje sencillo.
- Si se toma una decisión que cambia el plan, escribirla en la sección "Decisiones tomadas" de PLAN.md.
