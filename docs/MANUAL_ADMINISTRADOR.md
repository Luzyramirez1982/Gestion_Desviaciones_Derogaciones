# Manual del Administrador

Guía corta para quien administra la aplicación de Gestión de Desviaciones y Derogaciones de MATEC. No hace falta saber de programación.

Las cosas que solo hace el Administrador están en el menú de la izquierda: **Usuarios**, **Tipos de desviación o derogación**, **Registros eliminados** y **Uso del almacenamiento**.

---

## 1. Crear un usuario

1. Entre a **Usuarios**.
2. En la tarjeta **Crear usuario** escriba el nombre completo, el correo, el rol y el área.
   - **Responsable del proceso:** hace las solicitudes y las cierra. Además de las suyas, ve las de su área (por eso conviene indicar el área).
   - **Aprobador autorizado:** evalúa y aprueba (o devuelve o rechaza).
   - **Administrador:** administra la aplicación y ve todo.
3. Pulse **Crear usuario y generar acceso**.
4. Aparece la tarjeta **Compartir acceso** con el enlace, el usuario y una **contraseña temporal**.
   **La contraseña solo se muestra en ese momento.** Envíela antes de cerrar la tarjeta (botones *Enviar correo de bienvenida*, *Copiar datos de acceso* o *Compartir por WhatsApp*).
5. La persona entra con esos datos y la aplicación le pide crear su propia contraseña.

> Nadie puede registrarse solo: las cuentas las crea únicamente el Administrador.

## 2. Compartir el acceso otra vez

- Para reenviar el enlace y el usuario: en la lista de usuarios, **Compartir**.
- Si alguien olvidó su contraseña, puede usar **¿Olvidó su contraseña?** en la pantalla de ingreso. Si no le llega el correo, use **Restablecer contraseña**: genera una contraseña temporal nueva (se muestra una sola vez) y la persona tendrá que cambiarla al entrar.

## 3. Enlace de acceso a la aplicación

En **Usuarios → Enlace de acceso a la aplicación** queda la dirección que se envía a los usuarios. Se llena sola con la dirección publicada de la aplicación. Si abrió la aplicación desde otro lugar (por ejemplo, una copia de prueba) el campo queda vacío: puede escribir el enlace y pulsar **Guardar enlace** (debe empezar por `https://`).

## 4. Cambiar, desactivar o reactivar a una persona

- **Editar:** cambia nombre, rol y área. El correo no se cambia.
- **Desactivar:** la persona pierde el acceso de inmediato, pero sus registros y firmas se conservan. Se puede **Activar** de nuevo cuando quiera.
- Siempre debe quedar **al menos un Administrador activo**: la aplicación no deja desactivar al último.

## 5. Áreas y tipos de desviación

- **Áreas** (en *Usuarios*, al final): puede cambiar el nombre (se actualiza en todos los registros, personas y tipos), agregar áreas nuevas, y eliminar las que no tengan registros ni personas.
- **Tipos de desviación o derogación**: cada área tiene su lista; agregue o quite tipos. Lo que ya se usó en registros anteriores no cambia.

## 6. Cuánto espacio queda

Entre a **Uso del almacenamiento**. Las barras muestran cuánto se usó de los límites gratuitos de la base de datos y de los archivos (en el plan gratuito de Neon, el espacio total es de 1 GB y lo comparten los datos y los archivos).

| Color | Qué significa | Qué hacer |
|---|---|---|
| Verde | Menos del 70 % | Nada. |
| Naranja | Entre el 70 % y el 90 % | Planear cómo liberar espacio y confirmar que los respaldos funcionan. |
| Rojo | Más del 90 % | Avisar de inmediato al equipo técnico: cuando se llena, la aplicación deja de guardar. |

Las fotos se reducen solas al subirlas y cada archivo puede pesar hasta 5 MB, lo que hace que el espacio dure mucho tiempo.

## 7. Eliminar un registro y restaurarlo

- **Eliminar:** abra el registro → **Eliminar registro** → escriba el motivo. Queda una **huella** (quién, cuándo, por qué y una copia completa) que no se puede borrar.
- **Restaurar:** entre a **Registros eliminados** y pulse **Restaurar**. El registro vuelve con su consecutivo, bitácora, firmas y adjuntos.

## 8. Retroceder una etapa

Solo el Administrador puede devolver un registro de **Cierre** a **Evaluación y Aprobación** (botón *Etapa anterior*). Se anulan las firmas de aprobación y de cierre para volver a hacerlas, y queda anotado en la bitácora.

## 9. Respaldos

Todas las noches se hace una copia **cifrada** de toda la base de datos (solicitudes, archivos, firmas y personas) en GitHub, y se guarda 90 días. El Administrador no tiene que hacer nada, pero conviene:

- Revisar de vez en cuando en GitHub (pestaña **Actions → Respaldo diario**) que las ejecuciones salgan en verde. Si una falla, GitHub avisa por correo.
- Guardar en un lugar seguro la **contraseña de los respaldos**: sin ella no se pueden abrir.

La configuración paso a paso y cómo abrir un respaldo están en [RESPALDOS.md](RESPALDOS.md).

## 10. Si algo sale mal

| Situación | Qué hacer |
|---|---|
| «Guardando…» no termina o dice **Error al guardar** | Revise la conexión a internet. La aplicación reintenta sola; también puede pulsar **Reintentar**. No cierre la pestaña hasta ver **Guardado**. |
| Aparece **Alguien más cambió este registro** | Otra persona lo modificó a la vez. Pulse **Recargar registro** para ver lo último y vuelva a escribir su cambio. No se pierde nada de lo de la otra persona. |
| Una persona no puede entrar | Confirme que su cuenta esté **Activa**. Si olvidó la contraseña, use **Restablecer contraseña**. |
| Se borró un registro por error | **Registros eliminados → Restaurar**. |
| Aparece el aviso amarillo **Modo demostración** | Esa copia de la aplicación no está conectada a la base de datos real: los datos son de ejemplo. Use el enlace oficial. |
