# Respaldos y restauración

La base de datos (Neon) se copia **cada noche** con un flujo de GitHub Actions. La copia incluye las solicitudes, los archivos, las firmas, las personas y las cuentas de ingreso, queda **cifrada** y se guarda **90 días** en GitHub, fuera de Neon.

Esto es lo que protege el proyecto si Neon falla, se borra algo por error o hay que cambiar de proveedor. **No hay una segunda base funcionando al mismo tiempo**: hay copias listas para restaurar donde se necesite (otro proyecto de Neon, Supabase u otro PostgreSQL).

## Activarlo (una sola vez)

1. **El repositorio debe ser privado** (Settings > General > Danger Zone > Change visibility). Las copias están cifradas, pero no deben estar a la vista de nadie.
2. Cree una **contraseña larga** para cifrar las copias (mínimo 30 caracteres al azar; un gestor de contraseñas la genera). **Guárdela en dos lugares distintos**: sin ella las copias no se pueden abrir.
3. Copie la dirección de conexión de Neon (Neon > Connect > Connection string, la de la base real).
4. En GitHub: Settings > Secrets and variables > Actions > New repository secret:
   - `BACKUP_PASSPHRASE`: la contraseña del paso 2.
   - `NEON_DB_URL`: la dirección del paso 3.
5. Copie `docs/respaldo-diario.yml` a `.github/workflows/respaldo.yml` (hay que hacerlo en la página de GitHub o con una cuenta con permiso *workflow*; ver CLAUDE.md, regla 6).
6. Pestaña **Actions** > *Respaldo diario* > **Run workflow**. Debe terminar en verde y dejar un archivo `base-AAAA-MM-DD.sql.gz.cif` en *Artifacts*.
7. Si un día falla, GitHub envía un correo a quien administra el repositorio. Revíselo.

## Descargar una copia

Actions > *Respaldo diario* > el día que se necesite > *Artifacts* > descargue `base-AAAA-MM-DD`.

## Restaurar

Necesita `openssl`, `gzip` y `psql` (las herramientas de PostgreSQL). Desde una carpeta con el archivo descargado:

```bash
# 1. Descifrar (pide la contraseña de cifrado)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in base-2026-11-05.sql.gz.cif -out base.sql.gz
gunzip base.sql.gz

# 2. Restaurar en una base VACÍA (reemplace la dirección por la de la base nueva)
psql "postgresql://usuario:clave@host/neondb?sslmode=require" -v ON_ERROR_STOP=1 -f base.sql
```

### Restaurar en otro proyecto de Neon (lo normal)
1. Cree un proyecto nuevo y active la **Data API** con *Use Neon Auth* (igual que en `docs/NEON_PASOS.md`, pasos 1 y 2). Esto crea los roles y el esquema de ingreso.
2. Corra los dos comandos de arriba con la dirección del proyecto nuevo.
3. Pulse *Refresh schema cache* en la Data API y cambie `VITE_NEON_URL` por la dirección nueva.

### Restaurar en Supabase u otro PostgreSQL (si Neon deja de servir)
La copia es PostgreSQL estándar, así que los datos y las reglas (tablas, permisos y funciones del esquema `public`) se pueden cargar allí. Ojo: las **cuentas de ingreso** viven en el esquema `neon_auth` y las contraseñas están cifradas con el método de Neon; en otro proveedor habría que adaptar el ingreso y pedir a las personas que cambien su contraseña. Es un plan de emergencia, no un cambio automático.

## Ensayo recomendado
Antes de entregar y cada tantos meses: descargar una copia y restaurarla en un proyecto de pruebas, entrar a la aplicación y revisar que estén los registros y los archivos. Una copia que nunca se probó no es una copia.

## Lo que este respaldo NO cubre
- Cambios hechos después de la última copia (hasta 24 horas). Neon además guarda un historial reciente para volver atrás (*Restore*); en el plan gratis es corto, así que no dependa solo de eso.
- La pérdida de la contraseña de cifrado.