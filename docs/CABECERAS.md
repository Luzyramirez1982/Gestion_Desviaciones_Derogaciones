# Cabeceras de seguridad (Cloudflare Pages)

El archivo `app/public/_headers` se publica junto con la aplicación y le dice al navegador qué puede y qué no puede hacer la página. Protege contra que alguien meta código ajeno en la aplicación o la ponga dentro de otra página.

## Qué incluye

| Cabecera | Para qué sirve |
|---|---|
| `Content-Security-Policy` | Solo se ejecuta código de la propia aplicación; solo se conecta a ella y a Supabase. |
| `X-Content-Type-Options: nosniff` | El navegador no adivina el tipo de archivo. |
| `Referrer-Policy` | No se manda la dirección completa a otros sitios. |
| `frame-ancestors 'none'` y `X-Frame-Options: DENY` | Nadie puede mostrar la aplicación dentro de otra página. |
| `Permissions-Policy` | La aplicación no pide cámara, micrófono ni ubicación. |
| `Strict-Transport-Security` | Siempre se usa https. |

## Lo único que hay que ajustar: la dirección de Supabase

Las cabeceras de Cloudflare **no pueden leer variables**, así que la dirección de Supabase no se escribe sola. El archivo ya permite todo `*.supabase.co` y `wss://*.supabase.co` (la actualización en vivo), así que **normalmente no hay que tocar nada**.

Solo si el proyecto usa un dominio propio (por ejemplo `datos.empresa.com`), cambie en `app/public/_headers`:

- `connect-src`: agregue `https://datos.empresa.com wss://datos.empresa.com`
- `img-src`: agregue `https://datos.empresa.com`

y vuelva a publicar.

## Cómo comprobar que quedó bien

1. Publique y abra la aplicación.
2. Abra las herramientas del navegador (F12) → pestaña **Consola**. No deben aparecer mensajes rojos que digan `Refused to ...` o `violates the following Content Security Policy`.
3. Si aparecen, copie el mensaje: dice qué dirección está bloqueada y en cuál directiva hay que agregarla.
4. En <https://securityheaders.com> se puede pegar la dirección publicada para ver la calificación.

## Por qué hay estilos «en línea»

La interfaz (heredada de la versión 1) usa muchos atributos `style="..."`. Por eso se permite `style-src-attr 'unsafe-inline'`, pero **solo para atributos**: las hojas de estilo y los scripts siguen limitados a la propia aplicación (`style-src 'self'`, `script-src 'self'`). Nunca se permite `unsafe-inline` ni `unsafe-eval` en scripts.
