# Respaldos y restauración

La base de datos (Neon) se copia **cada noche** con un flujo de GitHub Actions. La copia incluye las solicitudes, los archivos, las firmas, las personas, los permisos y las cuentas de ingreso, queda **cifrada** y se guarda **90 días** en GitHub, fuera de Neon.

Esto es lo que protege el proyecto si Neon falla, se borra algo por error o hay que cambiar de proveedor. **No hay una segunda base funcionando al mismo tiempo**: hay copias listas para restaurar donde se necesite (otro proyecto de Neon, Supabase u otro PostgreSQL).

## Activarlo (una sola vez)

1. **El repositorio debe ser privado** (Settings > General > Danger Zone > Change visibility). Las copias están cifradas, pero no deben estar a la vista de nadie.
2. Cree una **contraseña larga** para cifrar las copias (30 caracteres o más, al azar; un gestor de contraseñas la genera). **Guárdela en dos lugares distintos**: sin ella las copias no se pueden abrir.
3. Copie la dirección de conexión de Neon (Neon > Connect > Connection string, la de la base real).
4. En GitHub: Settings > Secrets and variables > Actions > New repository secret:
   - `BACKUP_PASSPHRASE`: la contraseña del paso 2.
   - `NEON_DB_URL`: la dirección del paso 3.
5. El archivo del flujo debe estar en **`.github/workflows/respaldo.yml` de la rama `main`**: GitHub solo ejecuta las tareas programadas (y deja lanzarlas a mano) desde la rama por defecto. El modelo está en `docs/respaldo-diario.yml`.
6. Pestaña **Actions** > *Respaldo diario* > **Run workflow**. Debe terminar en verde y dejar un archivo `base-AAAA-MM-DD.tar.gz.cif` en *Artifacts*.
7. Si un día falla, GitHub envía un correo a quien administra el repositorio. Revíselo.

> La herramienta de copia (`pg_dump`) debe ser de la **misma versión o más nueva** que el Postgres de Neon (hoy 18). Si Neon sube de versión, cambie `postgresql-client-18` en el flujo.

## Descargar una copia

Actions > *Respaldo diario* > el día que se necesite > *Artifacts* > descargue `base-AAAA-MM-DD`.

## Restaurar

Necesita `openssl`, `tar` y `psql` (las herramientas de PostgreSQL, versión 18 o más nueva). Desde una carpeta con el archivo descargado:

```bash
# 1. Descifrar y abrir (pide la contraseña de cifrado)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in base-2026-11-05.tar.gz.cif -out base.tar.gz
tar xzf base.tar.gz        # deja public.sql y cuentas.sql
```

La copia tiene dos partes: `public.sql` (solicitudes, archivos, firmas, personas, reglas y permisos) y `cuentas.sql` (las cuentas de ingreso de Neon: correos y contraseñas cifradas).

### Restaurar en un proyecto nuevo de Neon (lo normal)
1. Cree un proyecto nuevo, active **Auth** y la **Data API** con el ingreso de Neon (`docs/NEON_PASOS.md`, pasos 1 a 3). Esto crea los roles `authenticated` y `anonymous` y el esquema de ingreso, que la copia necesita.
2. Restaure, con la dirección de conexión del proyecto nuevo (la que tiene permiso de dueño):
   ```bash
   psql "<dirección de conexión>" -v ON_ERROR_STOP=1 -f public.sql
   psql "<dirección de conexión>" -v ON_ERROR_STOP=1 -f cuentas.sql
   ```
   Si `cuentas.sql` protesta porque ya hay filas en las tablas de ingreso (por ejemplo, de una cuenta de prueba), borre esas filas del proyecto nuevo y repita.
3. Pulse *Refresh schema cache* en la Data API (`neon data-api refresh-schema ...`), cambie `VITE_NEON_URL` por la dirección nueva, vuelva a publicar y agregue el dominio en *Auth > Trusted domains*.

### Restaurar en Supabase u otro PostgreSQL (si Neon deja de servir)
`public.sql` es PostgreSQL estándar, así que los datos y las reglas se pueden cargar en otro proveedor. Ojo: los roles (`authenticated`, `anonymous`) y la función `auth.user_id()` los provee Neon; en otro proveedor hay que crearlos o adaptarlos, y las **cuentas de ingreso** (`cuentas.sql`) están en el formato de Neon, así que habría que adaptar el ingreso y pedir a las personas que cambien su contraseña. Es un plan de emergencia, no un cambio automático.
## Ensayo recomendado
Antes de entregar y cada tantos meses: descargar una copia y restaurarla en un proyecto de pruebas, entrar a la aplicación y revisar que estén los registros y los archivos. Una copia que nunca se probó no es una copia.

## Lo que este respaldo NO cubre
- Cambios hechos después de la última copia (hasta 24 horas). Neon además guarda un historial reciente para volver atrás (*Restore*); en el plan gratis es corto, así que no dependa solo de eso.
- La pérdida de la contraseña de cifrado.