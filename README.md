# Gestión de Desviaciones y Derogaciones — MATEC

Proyecto creado el 28/09/2026.
Última actualización: 25/10/2026.

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
