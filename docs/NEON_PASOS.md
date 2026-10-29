# Poner la aplicación en Neon (paso a paso)

Guía para quien tiene la cuenta de Neon. **Nunca pegue contraseñas ni direcciones de conexión en chats, issues ni commits.** Lo único público es `VITE_NEON_URL`.

> Estado: esta guía **ya se siguió y se probó contra un Neon real** (29/10/2026): migraciones, ingreso, creación de personas, cambio de contraseña, solicitudes con firma, adjuntos de hasta 5 MB y permisos entre áreas. Los resultados están al final.

## 1. Cuenta y proyecto
1. Cuenta en neon.com (plan **Free**, sin tarjeta) y un proyecto en una región de EE. UU. (la región no se puede cambiar después).
2. En su computador: `npm i -g neon` y luego `neon login` (se abre el navegador para aprobar).

## 2. Servicios del proyecto
Con el CLI (o desde la consola web, con las mismas opciones):

```bash
# Data API unida al ingreso de Neon, SIN permisos por defecto (los define db/migraciones/)
neon data-api create --project-id <id> --branch production --database neondb --auth-provider neon_auth
```

El proyecto también debe tener **Auth** activado (Better Auth). Los roles que crea Neon se llaman `anonymous` y `authenticated` (no `anon`).

## 3. Variables
En un archivo `.env` en la carpeta del proyecto (git lo ignora):

| Variable | Qué es | ¿Pública? |
|---|---|---|
| `DATABASE_URL` | Conexión directa a Postgres (la usan solo los scripts de administración) | **No** |
| `VITE_NEON_URL` | Dirección base de Neon: `https://ep-...c-14.us-east-1.aws.neon.tech/neondb` (la de Auth sin `.neonauth` ni `/auth`) | Sí |

Las demás variables que deja `neon deploy` (`AWS_*`, `NEON_AUTH_BASE_URL`, `DATABASE_URL_POOLED`) **no van al navegador**.

## 4. Crear las tablas y reglas
```powershell
npm install
node scripts/aplicar-migraciones.mjs     # debe mostrar + 0001 ... + 0005
node scripts/cargar-catalogo.mjs         # 8 áreas y 35 tipos
neon data-api refresh-schema --project-id <id> --branch production --database neondb
```
(El script lee `DATABASE_URL` de la consola; en PowerShell: cargue el `.env` o escriba `$env:DATABASE_URL = "..."`.)

## 5. Crear a la Administradora
```powershell
$env:CLAVE_ADMIN = "UnaClave2026"      # 8+ caracteres con letras y números
node scripts/crear-primer-admin.mjs --correo persona@empresa.com --nombre "Nombre Apellido"
```
Crea su cuenta de ingreso, la anota como Administradora y le da el rol de administración de Neon Auth (para crear las demás cuentas desde la aplicación). Solo funciona mientras no haya otro Administrador.

## 6. Probar en su computador
`npm run dev`, abra <http://localhost:5173> e ingrese. No debe verse el aviso amarillo de *Modo demostración*; arriba debe decir **Base de datos conectada**.

## 7. Publicar en Cloudflare Pages
1. Conecte el repositorio. Comando `npm run build`, carpeta `dist`.
2. Variable `VITE_NEON_URL` en *Settings > Variables*.
3. Dominio de confianza en Neon: `neon neon-auth domain add https://<nombre>.pages.dev --project-id <id> --branch production`.
4. Cuando la app esté publicada, apague `localhost`: `neon neon-auth domain allow-localhost disable ...`.
5. Escriba el enlace publicado en *Usuarios > Enlace de acceso*.

## 8. Seguridad del registro
Por ahora **cualquiera puede crear una cuenta de ingreso** en Neon, pero sin alta en la aplicación esa cuenta **no ve ni hace nada** (comprobado). Para cerrarlo del todo: `neon neon-auth config email-password update --disable-sign-up true ...`. **No se verificó** que la creación de cuentas por la Administradora siga funcionando con el registro apagado: pruébelo creando una persona de prueba; si falla, vuelva a poner `--disable-sign-up false`.

## 9. Respaldos
Siga [RESPALDOS.md](RESPALDOS.md) antes de entregar.

## Resultados de las pruebas contra Neon real
| Comprobación | Resultado |
|---|---|
| Migraciones 0001–0005 y catálogo | Aplicadas sin errores |
| Ingreso de la Administradora en el navegador | Funciona («Base de datos conectada») |
| Crear personas (cuenta de ingreso + alta en la app) | Funciona |
| Persona nueva: entrar con la temporal y cambiarla | Funciona |
| Solicitud firmada (la firma se valida en la base) | Funciona (MTC-001, etapa 1) |
| Adjunto de 200 KB y de 5 MB, abrirlos de vuelta | Funciona; 5 MB subir + leer ≈ 6,6 s |
| Otro Responsable de otra área: lista, abrir, leer archivo, subir, ver uso del espacio | Todo bloqueado |
| Responsable crea cuentas | Bloqueado |
| Administradora: restablecer contraseña, desactivar (bloquea el ingreso), activar | Funciona |
| No desactivar al último Administrador | Bloqueado |
| Recuperar contraseña por correo | **No disponible**: la Administradora restablece (ver abajo) |

**Hallazgos de la prueba real:**
- Las primeras consultas tras un rato sin uso a veces llegan **vacías** (respuesta 200 sin filas). El adaptador reintenta antes de darlas por buenas. No se averiguó la causa raíz; conviene vigilarlo con el uso real.
- La recuperación de contraseña por correo necesita una pantalla de «nueva contraseña» y un correo de envío propio; mientras tanto la Administradora restablece contraseñas.
- Los archivos están en la tabla `archivos` de la base (1 GB compartido). Mover a Object Storage está pendiente (ver PLAN.md).