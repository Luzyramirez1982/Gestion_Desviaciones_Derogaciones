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
| `VITE_ARCHIVOS_URL` | Dirección de la función que sube y entrega los archivos (se obtiene en el paso 5) | Sí |
| `AWS_*` y `S3_BUCKET` | Claves y nombre del bucket (las usa la función, los scripts de respaldo y nadie más) | **No** |

Las claves del bucket (`AWS_*`), `NEON_AUTH_BASE_URL` y `DATABASE_URL_POOLED` **no van al navegador**.

## 4. Crear las tablas y reglas
```powershell
npm install
node scripts/aplicar-migraciones.mjs     # debe mostrar + 0001 ... + 0007
node scripts/cargar-catalogo.mjs         # 8 áreas y 35 tipos
neon data-api refresh-schema --project-id <id> --branch production --database neondb
```
(El script lee `DATABASE_URL` de la consola; en PowerShell: cargue el `.env` o escriba `$env:DATABASE_URL = "..."`.)

## 5. Archivos: función de servidor + bucket
Los adjuntos y las firmas viven en el **bucket** de Neon (``uploads``, privado, 5 GB gratis). Las claves del bucket son secretas y no pueden ir en el navegador, así que una **función de servidor** (``functions/archivos/``) las guarda: recibe la sesión de la persona, le pregunta a la base si tiene permiso (las reglas siguen en ``db/migraciones/``) y solo entonces sube o entrega el archivo.

1. Cree el bucket ``uploads`` (privado) y deje sus claves en el ``.env`` (``neon deploy`` o la consola de Neon: *Object storage*).
2. Despliegue la función (solo esa función; no toca nada más del proyecto). En PowerShell, con el ``.env`` cargado:
   ```powershell
   neon functions deploy archivos --project-id <id> --branch production --src functions/archivos/index.js --runtime nodejs24 `
     --env AWS_ENDPOINT_URL_S3=$env:AWS_ENDPOINT_URL_S3 --env AWS_ACCESS_KEY_ID=$env:AWS_ACCESS_KEY_ID `
     --env AWS_SECRET_ACCESS_KEY=$env:AWS_SECRET_ACCESS_KEY --env AWS_REGION=$env:AWS_REGION --env S3_BUCKET=$env:S3_BUCKET `
     --env DATA_API_URL=<dirección de la Data API, termina en /rest/v1> `
     --env ORIGENES=https://<su-nombre>.pages.dev,http://localhost:5173
   ```
   ``ORIGENES`` es la lista de páginas desde las que se permite llamar a la función (la publicada y, para probar, ``localhost``).
3. Copie la dirección que muestra (``https://br-...-archivos.compute....neon.tech``, **sin barra final**) al ``.env`` como ``VITE_ARCHIVOS_URL``.
4. Para cambiar el código o las variables de la función, repita el comando.

La función no tiene una clave propia de acceso: **cada petición debe traer la sesión de una persona** y es la base la que decide. Sin sesión responde 401; sin permiso, «no encontrado» (así no revela qué archivos existen).
## 6. Crear a la Administradora
```powershell
node scripts/crear-primer-admin.mjs --correo persona@empresa.com --nombre "Nombre Apellido"
```
El script crea su cuenta de ingreso, la anota como Administradora y le da el rol de administración de Neon Auth (para crear las demás cuentas desde la aplicación). **Inventa una contraseña temporal y la muestra una sola vez**: entréguesela por un medio privado. En su primer ingreso la aplicación le **exige cambiarla**, así no hace falta que ella esté presente para crearla. Solo funciona mientras no haya otro Administrador.

Si prefieren elegir ustedes la contraseña: `$env:CLAVE_ADMIN = "UnaClave2026"` antes del comando (8+ caracteres con letras y números).
## 7. Probar en su computador
`npm run dev`, abra <http://localhost:5173> e ingrese. No debe verse el aviso amarillo de *Modo demostración*; arriba debe decir **Base de datos conectada**.

## 8. Publicar en Cloudflare Pages
1. Compile con el `.env` completo (`VITE_NEON_URL` y `VITE_ARCHIVOS_URL`) y suba la carpeta `dist`: `npm run build` y luego `npx wrangler pages deploy dist --project-name <nombre> --branch main`. (Si en cambio conecta el repositorio a Cloudflare, ponga las dos variables en *Settings > Variables*.)
2. **Cada vez que cambie `VITE_ARCHIVOS_URL` hay que compilar y publicar de nuevo**: la dirección queda escrita dentro del sitio.
3. Dominio de confianza en Neon: `neon neon-auth domain add https://<nombre>.pages.dev --project-id <id> --branch production`.
4. Cuando la app esté publicada, apague `localhost`: `neon neon-auth domain allow-localhost disable ...`.
5. Escriba el enlace publicado en *Usuarios > Enlace de acceso*.

## 9. Seguridad del registro
Por ahora **cualquiera puede crear una cuenta de ingreso** en Neon, pero sin alta en la aplicación esa cuenta **no ve ni hace nada** (comprobado). Para cerrarlo del todo: `neon neon-auth config email-password update --disable-sign-up true ...`. **No se verificó** que la creación de cuentas por la Administradora siga funcionando con el registro apagado: pruébelo creando una persona de prueba; si falla, vuelva a poner `--disable-sign-up false`.

## 10. Respaldos
Siga [RESPALDOS.md](RESPALDOS.md) antes de entregar.

## Resultados de las pruebas contra Neon real
| Comprobación | Resultado |
|---|---|
| Migraciones 0001–0007 y catálogo | Aplicadas sin errores |
| Ingreso de la Administradora en el navegador | Funciona («Base de datos conectada») |
| Crear personas (cuenta de ingreso + alta en la app) | Funciona |
| Persona nueva: entrar con la temporal y cambiarla | Funciona |
| Solicitud firmada (la firma sube al bucket por la función y se valida en la base) | Funciona; llega completa a la primera |
| Adjunto de 200 KB y de 5 MB, abrirlos de vuelta | Funciona; 5 MB subir + leer ≈ 3,9 s |
| 5 MB + 1 byte, tipo peligroso (.exe) | Rechazados (el tamaño antes de subir; el tipo, la base) |
| Otro Responsable de otra área: lista, abrir el archivo, subir, ver el uso del espacio | Todo bloqueado |
| Llamar a la función sin sesión o con un token inventado | 401 |
| Página ajena (no es la de la aplicación) llamando a la función | Sin permiso de navegador (CORS) |
| Responsable crea cuentas | Bloqueado |
| Administradora: restablecer contraseña, desactivar (bloquea el ingreso), activar | Funciona |
| No desactivar al último Administrador | Bloqueado |
| Copiar los archivos del bucket y restaurarlos (``respaldo-archivos`` / ``restaurar-archivos``) | Idénticos, con su tipo; repetir no duplica |
| Recuperar contraseña por correo | **No disponible**: la Administradora restablece (ver abajo) |

**Hallazgo importante de la prueba real (Neon gratis):** cuando el procesador de la base se duerme por falta de uso (a los 5 minutos), **las primeras consultas al despertar a veces no reconocen la sesión**: una lista llega vacía, una solicitud llega sin sus firmas, o la base niega un permiso que sí se tiene. Con la base «caliente» no pasa (decenas de pruebas seguidas sin un fallo). Qué se hizo:
- Una solicitud (y la lista) se lee en **una sola consulta** (``registro_completo`` y ``listar_registros``): llega completa o no llega, y entonces se reintenta.
- Las listas vacías y los permisos negados se **reintentan hasta 2 veces** antes de darlos por ciertos (un permiso realmente negado tarda ~1 segundo más y nada se ejecuta). Lo mismo hace la función de archivos.
- **Causa de fondo (30/10/2026):** no es un error de esta aplicación. Es un problema ya reportado de Neon: justo al despertar, su función interna que identifica a la persona (``auth.user_id()``, de su extensión de sesión) a veces todavía no reconoce el token en la primera consulta, aunque el token sí llegó con la petición (reportado por otras personas en el repositorio de Neon y en el de esa extensión; no hay una fecha de corrección de Neon). Se agregó ``mi_id()`` (migración ``0008_identidad_robusta.sql``): pregunta "quién soy yo" de una segunda forma (leyendo el token directo) cuando la primera no responde, y las funciones que decidían permisos ahora pasan por ahí. Es un refuerzo que ayuda en ese caso puntual; los reintentos de la aplicación siguen siendo necesarios porque cubren también el caso en que el token no llega en absoluto (otro problema de Neon, más de fondo, que ninguna consulta a la base puede arreglar). Lo notarán como una primera carga un poco lenta tras un rato sin uso. En un plan de pago se puede apagar el «dormir» del procesador.

**Otros hallazgos:**
- La recuperación de contraseña por correo necesita una pantalla de «nueva contraseña» y un correo de envío propio; mientras tanto la Administradora restablece contraseñas.
- La copia nocturna de la base **no trae los archivos** (están en el bucket): por eso el flujo de respaldo copia también los archivos nuevos de cada día (ver RESPALDOS.md).