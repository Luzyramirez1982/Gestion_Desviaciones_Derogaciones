# Cabeceras de seguridad (Cloudflare Pages)

El archivo `public/_headers` se publica junto con la aplicación y le dice al navegador qué puede y qué no puede hacer la página. Protege contra que alguien meta código ajeno en la aplicación o la ponga dentro de otra página.

## Qué incluye

| Cabecera | Para qué sirve |
|---|---|
| `Content-Security-Policy` | Solo se ejecuta código de la propia aplicación; se conecta a ella y a Neon (https://*.neon.tech). |
| `X-Content-Type-Options: nosniff` | El navegador no adivina el tipo de archivo. |
| `Referrer-Policy` | No se manda la dirección completa a otros sitios. |
| `frame-ancestors 'none'` y `X-Frame-Options: DENY` | Nadie puede mostrar la aplicación dentro de otra página. |
| `Permissions-Policy` | La aplicación no pide cámara, micrófono ni ubicación. |
| `Strict-Transport-Security` | Siempre se usa https. |

## Neon

La base de datos y el ingreso viven en `*.neon.tech`, por eso `connect-src` los permite. Si Neon cambiara de dominio, hay que agregar el nuevo en `public/_headers` y volver a publicar. Los archivos se descargan desde la propia aplicación (lob:), así que img-src no necesita cambios.

## Cómo comprobar que quedó bien

1. Publique y abra la aplicación.
2. Abra las herramientas del navegador (F12) → pestaña **Consola**. No deben aparecer mensajes rojos que digan `Refused to ...` o `violates the following Content Security Policy`.
3. Si aparecen, copie el mensaje: dice qué dirección está bloqueada y en cuál directiva hay que agregarla.
4. En <https://securityheaders.com> se puede pegar la dirección publicada para ver la calificación.

## Por qué hay estilos «en línea»

La interfaz (heredada de la versión 1) usa muchos atributos `style="..."`. Por eso se permite `style-src-attr 'unsafe-inline'`, pero **solo para atributos**: las hojas de estilo y los scripts siguen limitados a la propia aplicación (`style-src 'self'`, `script-src 'self'`). Nunca se permite `unsafe-inline` ni `unsafe-eval` en scripts.
