# Respaldos: cómo se configuran y cómo se restauran

Cada día a las 2:17 a. m. (hora de Colombia) GitHub hace una copia de la aplicación y la guarda **cifrada** en un segundo repositorio privado. Así, aunque Supabase gratis se pause, se llene o se pierda, la información se puede recuperar. La tarea diaria también mantiene "despierta" la base de datos (Supabase gratis se pausa tras 7 días sin uso).

## Qué se copia
- **Base de datos:** todas las tablas de la aplicación y las cuentas de acceso. Una copia por día, se guardan 90 días.
- **Archivos** (adjuntos y firmas): solo los que todavía no estaban respaldados. Como los archivos no se pueden reemplazar ni borrar desde la aplicación, el respaldo crece solo con lo nuevo.

Todo va cifrado con una contraseña que solo conoce el equipo. **Si se pierde esa contraseña, los respaldos no se pueden abrir.** Guardarla en un gestor de contraseñas y entregar una copia a la clienta.

## Configuración (una sola vez)
1. Crear un repositorio **privado y vacío** para los respaldos (por ejemplo `Respaldos_Desviaciones`) en la cuenta de la clienta.
2. Crear un token de GitHub de acceso limitado: *Settings → Developer settings → Fine-grained tokens*, solo para ese repositorio, permiso **Contents: Read and write**.
3. En el repositorio de la aplicación, *Settings → Secrets and variables → Actions*:

| Tipo | Nombre | Valor |
|---|---|---|
| Variable | `BACKUP_REPO` | `usuario/Respaldos_Desviaciones` |
| Secreto | `BACKUP_REPO_TOKEN` | el token del paso 2 |
| Secreto | `BACKUP_PASSPHRASE` | una contraseña larga (mínimo 16 caracteres) |
| Secreto | `SUPABASE_URL` | la URL del proyecto de Supabase |
| Secreto | `SUPABASE_SERVICE_ROLE_KEY` | clave `service_role` (Supabase → Project Settings → API) |
| Secreto | `SUPABASE_DB_URL` | cadena de conexión de la base de datos, la opción **Session pooler** (Supabase → Connect) |

4. **Activar el flujo:** copiar el archivo `docs/respaldo-diario.yml` a `.github/workflows/respaldo.yml`. Se hace desde la página de GitHub (*Add file → Create new file*) o desde un computador con un token que tenga el permiso **workflow**; GitHub no deja subir esa carpeta con un token común.
5. En la pestaña **Actions → Respaldo diario → Run workflow** lanzarlo una vez a mano y comprobar que termina en verde y que aparecen archivos en el repositorio de respaldos.

Si un respaldo falla, GitHub avisa por correo a quien configuró la tarea. Revisar de vez en cuando la pestaña Actions.

## Cómo abrir un respaldo
```bash
npm install
export BACKUP_PASSPHRASE="la contraseña de los respaldos"
node scripts/respaldo.mjs descifrar respaldos/base/base-2026-11-15.tar.gz.cif base.tar.gz
tar xzf base.tar.gz        # queda public.sql y auth.sql
```
Los archivos se abren igual: `node scripts/respaldo.mjs descifrar respaldos/archivos/registros/MTC-001/1-informe.pdf.cif informe.pdf`.

## Cómo restaurar
1. Crear un proyecto de Supabase nuevo (o usar el de pruebas).
2. Ejecutar en orden `supabase/migrations/0000` a `0004` en el *SQL Editor*.
3. Cargar los datos de `public.sql` con `psql "<cadena de conexión>" -f public.sql`. Si ya hay tablas, vaciarlas primero.
4. Cuentas de acceso: cargar `auth.sql` conserva las contraseñas. Si no se puede, el Administrador crea de nuevo a las personas desde la aplicación (cada una recibe una contraseña temporal).
5. Subir los archivos descifrados al bucket `archivos`, **con la misma ruta** que tenían.
6. Comprobar: entrar con el Administrador, abrir un registro con adjuntos y un PDF de trazabilidad.

**Hacer este ensayo de restauración en el proyecto de pruebas antes de entregar**, y repetirlo de vez en cuando: un respaldo que nunca se ha restaurado no es una garantía.
