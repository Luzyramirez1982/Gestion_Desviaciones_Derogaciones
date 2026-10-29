# Gestión de Desviaciones y Derogaciones — MATEC

Proyecto creado el 28/09/2026 a partir del artefacto publicado
"GESTIÓN DE DESVIACIONES MATEC" (https://claude.ai/artifact/2uRRgnkJRp4Te5gb5GLvkR).
Última actualización: 29/10/2026.

## Archivos
- `index.html` — el aplicativo completo (ingreso, panel de control, registros, nuevo registro,
  usuarios, tipos de desviación o derogación, registros eliminados, instructivo).
- `config.js` — conexión a Supabase (URL y clave publishable del proyecto `ngwsvtlgripohebhtbxs`).
- `supabase_schema.sql` — crea las tablas `registros`, `usuarios`, `tipos_desviacion`, `configuracion` y `registros_eliminados`, y deja el acceso solo para usuarios con sesión. Se puede ejecutar varias veces sin borrar datos.
- `HISTORIAL.md` — historia de todas las solicitudes y cambios del proyecto.

## Funcionalidad principal
- **Ingreso con usuario y contraseña** (Supabase Auth). El Administrador crea cada usuario con su rol; el aplicativo genera una contraseña temporal y abre el correo de bienvenida con el enlace, el usuario (correo) y la contraseña (también se puede copiar o enviar por WhatsApp). En el primer ingreso se exige cambiar la contraseña; después se cambia con "Cambiar contraseña". "¿Olvidó su contraseña?" envía un enlace de recuperación.
- Dos figuras: **Desviación** y **Derogación** (la derogación exige el reporte 8D completo antes de aprobarse). La derogación es **temporal** (rango de fechas) o **definitiva** (fecha a partir de la cual es permanente).
- **Ciclo de 3 etapas:** Solicitud → Evaluación y Aprobación → Cierre, cada una con firma.
- **3 roles:** Administrador, Responsable del proceso, Aprobador autorizado.
- "Solicitud relacionada con temas de" y "Tipo específico de Desviación o Derogación" tienen la opción **Otro (escribir)** para digitar lo que no está en la lista.
- **Eliminación de registros (solo Administrador)** con huella: quién, cuándo, motivo y copia del registro, en el menú "Registros eliminados"; se pueden restaurar.
- Borradores, histórico en Excel, 8 áreas editables, 8D (5W2H, 5 Porqués, tablas D3/D5), PDF de trazabilidad al cierre, instructivo por rol.

## Puesta en marcha (una sola vez)
1. **Base de datos:** en supabase.com → proyecto → *SQL Editor* → *New query*: pegar `supabase_schema.sql` y pulsar *Run*.
2. **Correo y contraseña:** en *Authentication → Sign In / Providers → Email*: dejar activo *Enable Email provider* y *Allow new users to sign up*; para que los usuarios ingresen de inmediato con la contraseña temporal, **desactivar *Confirm email***.
3. **Enlace de recuperación:** en *Authentication → URL Configuration* escribir en *Site URL* el enlace donde quedó publicada la aplicación (y agregarlo en *Redirect URLs*).
4. **Publicar la aplicación** para tener un enlace (el ingreso con contraseña no funciona bien abriendo el archivo con doble clic):
   - Netlify Drop: entrar a https://app.netlify.com/drop y arrastrar la carpeta del proyecto (con `index.html` y `config.js`). Netlify entrega un enlace tipo `https://nombre.netlify.app`.
   - o GitHub Pages: subir los archivos a un repositorio y activar *Pages*.
5. **Primer ingreso del Administrador:** abrir el enlace → "Primer ingreso del Administrador: activar cuenta" → nombre, correo y contraseña. Solo funciona mientras no exista otro Administrador activo.
6. En **Usuarios → Enlace de acceso a la aplicación** pegar el enlace publicado y crear los usuarios.

Sin `config.js` (o sin conexión a Supabase) el aplicativo funciona en **modo local** para demostraciones: no pide contraseña y se cambia de usuario con la lista de la parte superior.

## Seguridad (prototipo)
- Los datos solo se leen y escriben con sesión iniciada (RLS para usuarios autenticados). Dentro del aplicativo, los permisos por rol los controla la interfaz.
- Las contraseñas las guarda Supabase cifradas; el aplicativo no las almacena. La contraseña temporal solo se muestra al crear el acceso.
- Eliminar un usuario en el aplicativo le quita el acceso; su cuenta queda en *Authentication → Users* de Supabase y se puede borrar allí.

## Versión 2 (en construcción, rama `feat/v2`)
La aplicación nueva está en `app/` (hecha con Vite). Es más segura y no pierde datos. Mientras no se publique, todo lo de arriba sigue siendo válido para la aplicación actual (`index.html`).

### Qué hay en el repositorio
- `app/` — la aplicación nueva: pantallas (`app/vistas/`), entrada `app/index.html`, estilos y cabeceras de seguridad (`app/public/_headers`).
- `src/` — lo que comparten pantallas, pruebas y scripts: reglas del procedimiento (`dominio/`), capa de datos con dos adaptadores intercambiables (`datos/`: Supabase y demostración), PDF y Excel (`exportar/`), fechas de Colombia y enlaces seguros (`util/`).
- `supabase/migrations/` — base de datos nueva en pasos numerados (`0000` a `0006`) y `supabase/functions/admin-usuarios/` (crear cuentas, solo Administrador).
- `scripts/` — migración de datos de la versión 1, primer Administrador y respaldos.
- `tests/` — pruebas automáticas (base de datos, reglas, adaptadores, interfaz).
- [PLAN.md](PLAN.md) — qué falta y cómo va cada fase (**empezar por aquí si se une alguien al proyecto**). [CLAUDE.md](CLAUDE.md) — reglas de trabajo del equipo. [HISTORIAL.md](HISTORIAL.md) — historia de cambios.
- `docs/` — [Manual del Administrador](docs/MANUAL_ADMINISTRADOR.md), [Respaldos](docs/RESPALDOS.md), [Cabeceras de seguridad](docs/CABECERAS.md).

### Cómo correrla, probarla y construirla
```bash
npm install        # una sola vez
npm run dev        # abre la aplicación en el navegador (http://localhost:5173)
npm test           # todas las pruebas (sin internet, unos segundos)
npm run build      # genera la carpeta dist/ que se publica
npm run preview    # ve el resultado de build antes de publicar
```
- **Modo demostración:** si no hay `.env`, la aplicación arranca con datos de ejemplo inventados y un aviso amarillo. Las cuentas de prueba aparecen en la pantalla de ingreso (contraseña `Demo2026`). Los datos viven en memoria: al recargar se pierden. Nunca se conecta a producción.
- **Conectarla a Supabase:** copie `.env.example` como `.env` y complete `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` (solo URL y clave **pública**). La clave `service_role` jamás va aquí ni en el navegador.

### Puesta en marcha de la versión 2 (una sola vez)
1. **Base de datos (proyecto de pruebas primero):** en *SQL Editor* ejecutar en orden `supabase/migrations/0000` … `0006`. Se pueden repetir sin borrar datos.
2. **Autenticación:** apagar *Allow new users to sign up*, exigir contraseñas de 8+ con letras y números, y configurar *Site URL* y *Redirect URLs* con el enlace publicado.
3. **Función de usuarios:** `supabase functions deploy admin-usuarios` (usa los secretos que Supabase ya pone solo).
4. **Primer Administrador:**
   ```bash
   SUPABASE_URL=https://<proyecto>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<clave del servidor> \
   node scripts/crear-primer-admin.mjs --nombre "Nombre Apellido" --correo persona@empresa.com --proyecto <identificador>
   ```
   Muestra una contraseña temporal una sola vez y crea las áreas y tipos iniciales.
5. **Publicar en Cloudflare Pages:** conectar el repositorio con *Build command* `npm run build`, *Build output directory* `dist` y las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY`. Las cabeceras de seguridad salen de `app/public/_headers` (ver [CABECERAS.md](docs/CABECERAS.md)).
6. **Respaldos:** copiar `docs/respaldo-diario.yml` a `.github/workflows/respaldo.yml` (ver [RESPALDOS.md](docs/RESPALDOS.md)).
7. Entrar con el Administrador, crear los usuarios en **Usuarios** (el enlace de acceso se llena solo con la dirección publicada) y compartirles el acceso.
