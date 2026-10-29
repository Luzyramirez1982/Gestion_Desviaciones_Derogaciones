# Poner la aplicación en Neon (paso a paso)

Guía para quien tiene la cuenta de Neon. **Nunca pegue contraseñas ni direcciones de conexión en chats, issues ni commits.** Lo único que va en el navegador es la dirección pública `VITE_NEON_URL`.

> Lo que está probado y lo que no: las reglas de la base (permisos, firmas, archivos, usuarios) y el adaptador están probados con un PostgreSQL de prueba. **Nada se probó todavía contra un Neon real.** Al final hay una lista de comprobaciones para hacer en cada paso.

## 1. Crear el proyecto en Neon
1. console.neon.tech > *New project*. Nombre sugerido: `desviaciones-matec`. Elija la región más cercana (US East suele ir bien desde Colombia). Postgres 17.
2. Plan **Free** (sin tarjeta).

## 2. Activar la Data API con ingreso de Neon
1. En el proyecto: *Postgres database > Data API > Enable*.
2. Marque **Use Neon Auth** (así el ingreso y la API quedan unidos).
3. **Deje SIN marcar** «Grant public schema access»: los permisos los define `db/migraciones/` tabla por tabla.
4. Anote la **dirección base** de la Data API (la que empieza con `https://ep-...neon.tech/neondb`, sin usuario ni contraseña). Esa es `VITE_NEON_URL`.

## 3. Crear las tablas y reglas
En su computador, dentro de la carpeta del proyecto:

```bash
npm install
```

Saque la **dirección de conexión** (*Connect > Connection string*, rol dueño, empieza con `postgresql://`) y úsela solo en esta consola:

```powershell
$env:DATABASE_URL = "postgresql://..."
node scripts/aplicar-migraciones.mjs
node scripts/cargar-catalogo.mjs
```

La primera línea debe mostrar `+ 0001_...` hasta `+ 0005_...`. Después, en Neon: *Data API > Refresh schema cache*.

## 4. Crear la cuenta de la Administradora
1. Neon > *Auth > Users* > crear usuario con su correo y una contraseña. Use el menú del usuario > **Make admin** (le da permiso de crear las demás cuentas desde la aplicación).
2. En la consola de antes:
   ```powershell
   node scripts/crear-primer-admin.mjs --correo persona@empresa.com --nombre "Nombre Apellido"
   ```

## 5. Probar en su computador
1. Copie `.env.example` como `.env` y escriba `VITE_NEON_URL=` con la dirección del paso 2.4.
2. `npm run dev`, abra el enlace, **ingrese como la Administradora**. No debe aparecer el aviso amarillo de *Modo demostración*.
3. Si el ingreso funciona pero algo falla después, abra F12 > Consola y copie el mensaje.

## 6. Publicar en Cloudflare Pages
1. Conecte el repositorio. Comando: `npm run build`, carpeta: `dist`.
2. En *Settings > Variables*, agregue `VITE_NEON_URL` (la dirección pública).
3. En Neon > *Auth > Configuration > Trusted domains* agregue `https://<su-nombre>.pages.dev`.
4. En Neon > *Auth > Settings*: desactive **Allow Localhost** una vez en producción, y configure un correo de envío (SMTP) si quiere que funcione «¿Olvidó su contraseña?» (el correo compartido de Neon tiene límite).
5. Entre a *Usuarios* en la aplicación y escriba el enlace publicado en *Enlace de acceso*.

## 7. Respaldos
Siga [RESPALDOS.md](RESPALDOS.md). Hágalo **antes** de entregar.

## 8. Comprobaciones (anote el resultado de cada una)
| # | Comprobación | Qué esperamos |
|---|---|---|
| 1 | `aplicar-migraciones` corre completo | cinco `+`, sin errores |
| 2 | Ingreso de la Administradora | entra y ve el menú de Administrador |
| 3 | Crear un usuario desde *Usuarios* | aparece la contraseña temporal; la persona entra y debe cambiarla |
| 4 | Cambiar la contraseña temporal | funciona sin recargar la página |
| 5 | Crear una solicitud con firma y un adjunto de 5 MB | se guarda y el adjunto se abre |
| 6 | Entrar con el Responsable de otra área | no ve la solicitud |
| 7 | «¿Olvidó su contraseña?» | llega el correo (si no, el Administrador restablece) |
| 8 | Dejar la aplicación 10 minutos sin uso y volver a entrar | la primera carga tarda un poco más, pero entra y no se pierde nada |
| 9 | Descargar PDF y Excel | se descargan completos |
| 10 | Revisar en Neon > *Monitoring* las horas de cómputo y el espacio usados | para estimar si el plan gratis alcanza |

Estos puntos **no están probados contra Neon** y son los que más pueden fallar: el tamaño máximo de una petición de la Data API con un archivo de 5 MB (se envía en base64), el nombre exacto de los métodos del SDK para crear usuarios, cambiar contraseñas y recuperarlas (`admin.createUser`, `admin.setUserPassword`, `changePassword`, `requestPasswordReset`), y que `auth.user_id()` devuelva el mismo identificador que usa el ingreso. Todos están en `src/datos/neon.js` y se corrigen allí sin tocar las pantallas.