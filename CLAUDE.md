# Reglas del proyecto — Gestión de Desviaciones y Derogaciones (MATEC)

Estas reglas valen para cualquier persona (o asistente) que trabaje en este repositorio. Si algo no está aquí, se decide con sentido común y se anota.
Qué falta por hacer: [PLAN.md](PLAN.md). Historia de los cambios: [HISTORIAL.md](HISTORIAL.md). Mapa de carpetas: [README.md](README.md).

## Qué es esto
Aplicación de MATEC para gestionar desviaciones y derogaciones, con ciclo de 3 etapas (Solicitud → Evaluación y Aprobación → Cierre), firmas, reporte 8D y tres roles: **Administrador**, **Responsable del proceso** y **Aprobador autorizado**. La clienta **no es técnica** y no puede pagar planes: todo debe ser gratis y sin tarjeta. Se empieza **desde cero**: no se migran datos de la versión 1.

## Reglas de trabajo con git
1. **Trabajar en `feat/v2`** (o en una rama `feat/...` que salga de ella). **No tocar `main`** hasta el cambio final: allí sigue la versión 1.
2. **Commits a nombre de la persona del equipo, nada más.** No agregar líneas `Co-Authored-By`, "Generated with" ni mención a herramientas de IA, ni en commits ni en descripciones de PR.
3. Mensajes de commit **en español, cortos y claros**: título de una línea y, si hace falta, una lista de lo que cambió.
4. **Antes de subir (`git push`)**: `npm test` y `npm run build` en verde, revisar `git status` y `git diff`, y comprobar que no haya claves ni datos reales.
5. Nunca `git push --force`, nunca borrar ramas ajenas, nunca saltarse las pruebas para subir algo.
6. **Flujos de GitHub Actions:** el token con el que se sube desde el computador puede no tener el permiso *workflow*; en ese caso GitHub rechaza lo que esté en `.github/workflows/`.
7. No subir: `.env`, claves de servidor, exportaciones de datos reales, archivos de la clienta ni copias de respaldo.

## Cómo se organiza el código (una sola responsabilidad)
Cada carpeta y cada archivo se encargan de **una sola cosa**. Antes de crear algo, buscar si ya existe.
- `src/dominio/` reglas del procedimiento (etapas, firmas, 8D, vigencias). Funciones puras, **sin pantalla ni base de datos**.
- `src/datos/` cómo se leen y guardan los datos. Las pantallas solo hablan con el repositorio (`repositorio.js`); nunca con una base de datos directamente. Cambiar de base de datos = cambiar el adaptador.
- `src/vistas/` una pantalla por archivo. `src/componentes/` piezas reutilizables. `src/nucleo/` armado de la aplicación (sesión, menú, actualización en vivo).
- `src/estilos/` **todo lo visual**, un archivo por tema (`base/`, `layout/`, `componentes/`, `vistas/`). Las pantallas no llevan estilos escritos dentro del JavaScript.
- `src/util/` ayudas pequeñas y sueltas. `src/exportar/` PDF y Excel.
- Un archivo que pase de unas 200 líneas o haga dos cosas distintas se divide.
- Funciones cortas, con nombre que diga lo que hacen. Nada de código muerto ni comentado.

## Cómo escribir el código
- **Comentarios en español sencillo**, cortos y fáciles de leer, como los escribiría una persona del equipo explicándole a alguien que no es técnico. Explican **por qué** se hace algo, no repiten lo que dice el código.
- Nombres como ya están en el proyecto (en español, p. ej. `registros`, `esDueno`). Seguir el estilo del archivo.
- Mensajes que ve la clienta: en español claro, diciendo qué pasó y qué hacer.
- Cambios pequeños y que se puedan probar. Si se ve algo que se puede mejorar (seguridad, claridad), se mejora y se anota.

## Pruebas
- `npm test` corre todo en pocos segundos y **no necesita internet**. Las de interfaz (`tests/ui/`) usan jsdom y el modo demostración.
- **Todo cambio de reglas lleva su prueba.** Si algo falla, se arregla la causa; no se borra ni se debilita la prueba.
- Probar los dos lados: lo que **sí** se puede hacer y lo que **no** (por ejemplo, otra área no ve el registro).

## Seguridad (no negociable)
- **Las reglas se exigen en el servidor, no solo en la pantalla.** Quien firma, en qué etapa, quién ve qué: la base de datos nueva debe repetirlas (ver PLAN.md, sección 4).
- Ninguna **clave secreta** va en el navegador, en el repositorio ni en una captura. Solo puede ir lo público (dirección de la base y clave pública), y la seguridad no depende de esconderlo.
- El registro abierto de usuarios debe estar **apagado**: las cuentas las crea el Administrador.
- Todo texto que venga de la base de datos se muestra con `esc()` y todo enlace con `urlSegura()` (`src/util/html.js`).
- Archivos **privados**, de 5 MB como máximo.
- No subir datos reales de la clienta a pruebas, issues ni conversaciones. Los datos de ejemplo se inventan.

## Reglas del procedimiento (no cambiar sin hablar con la clienta)
- Etapas: Solicitud (la firma quien la hace) → Evaluación y Aprobación (la firma el **Aprobador autorizado**) → Cierre (lo firma **quien hizo la solicitud**).
- Solo se firma la etapa en curso. Devolver o rechazar exige un motivo. Solo el Administrador retrocede de Cierre a Evaluación.
- Una **derogación** no se aprueba sin el 8D completo. Puede ser **temporal** (rango de fechas) o **definitiva** (fecha efectiva).
- Cada rol llena solo sus campos: evaluación y medidas de control (Aprobador), observaciones y cumplimiento de cierre (quien hizo la solicitud).
- Eliminar un registro: solo el Administrador, con motivo, dejando **huella** (quién, cuándo, por qué y copia). La huella no se borra.
- Siempre debe quedar al menos un Administrador activo.

## Costos y servicios
Todo en planes gratuitos y **sin tarjeta** (Cloudflare Pages, GitHub y la base de datos que se elija). Si una opción pide tarjeta, no se usa.

## Comandos
```bash
npm install        # una sola vez
npm run dev        # ver la aplicación mientras se trabaja
npm test           # todas las pruebas (sin internet)
npm run build      # genera dist/ para publicar
```

## Mantener los documentos al día
- Al terminar una tarea: marcar la casilla en [PLAN.md](PLAN.md) y cambiar la fecha de "Última actualización".
- Al cerrar una sesión de trabajo: agregar lo hecho a [HISTORIAL.md](HISTORIAL.md) en lenguaje sencillo.
- Si se toma una decisión que cambia el plan, escribirla en la sección "Decisiones tomadas" de PLAN.md.
