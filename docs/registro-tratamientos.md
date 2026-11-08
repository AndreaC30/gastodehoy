# Registro de actividades de tratamiento

Documento interno de GastoDeHoy. Describe lo que hace el código y lo que ya dice la política de privacidad (versión 2026-11-08.1, 8 de noviembre de 2026). Es una lista de trabajo, no un dictamen jurídico.

Responsable: Andrea Cruz, gastodehoy@gmail.com, https://gastodehoy.es. No hay delegado de protección de datos. El NIF y el domicilio postal no están publicados; no se añaden aquí.

Interesados: quien crea una cuenta, y quien escribe a gastodehoy@gmail.com.

No hay conexión bancaria, ni pagos, ni analítica, ni publicidad. No se venden datos.

## Actividades

### Cuenta y presupuesto

Prestar el presupuesto, el correo de bienvenida y el enlace de un solo uso (válido una hora) para elegir otra contraseña.

Datos de cuenta: email, nombre, hash de la contraseña, idioma, fechas de alta, último acceso y cambio de contraseña, versión de las condiciones aceptada y confirmación de tener al menos 14 años. También el hash del enlace de restablecimiento, si hay uno pendiente, y el hash del código de recuperación si se ha generado uno.

Datos de presupuesto: ingresos, gastos, categorías, metas y notas que escribe la persona.

Base ya usada en la política: ejecución del contrato, artículo 6.1.b del RGPD.

Conservación: mientras la cuenta existe. Al eliminarla desde la cuenta (con contraseña) se borran en cascada la cuenta, los ajustes, los gastos, las categorías, las metas, los ingresos extra y las suscripciones push. Una copia de seguridad sigue incluyéndolos hasta que la rotación sustituye ese archivo.

### Seguridad de acceso

Limitar abusos y mantener la sesión.

Datos: en `login_attempts`, la IP, la hora y, si el intento va ligado a un correo, el email normalizado. La cookie `gdh_session` (HttpOnly, SameSite=Lax, Secure en producción) lleva el identificador de usuario y el de sesión, firmados. Al cerrar sesión se guarda el identificador revocado. Los registros técnicos del servidor recogen lo que el proceso escribe al registrar un error o un límite; el repositorio no fija qué campos acaban en el log.

Base ya usada en la política: interés legítimo, artículo 6.1.f. Cabe oposición.

Conservación: en producción, `app/auth.py` borra los intentos en la siguiente comprobación del límite, cuando ya han salido de la ventana de cinco minutos (cinco intentos). En desarrollo no se escriben esas filas. Los identificadores de sesión revocada se podan, al cerrar otra sesión, cuando superan la vida de la cookie (`SESSION_TTL_DAYS`, 30 días si no se cambia). El plazo de los registros técnicos no está definido en el repositorio: duran lo que el servidor los conserve. El cron de copias añade líneas a `/var/log/gastodehoy-backup.log` y el repo no define una rotación de ese log.

### Avisos push

Enviar el aviso del sistema, solo si la persona lo activa.

Datos: endpoint de la suscripción y las claves `p256dh` y `auth` que genera el navegador. El texto del aviso puede incluir el margen del día y lo que queda del mes.

Base ya usada en la política: consentimiento. Se retira desactivando el aviso en la cuenta o en el sistema.

Conservación: mientras la suscripción exista. Se borra al desactivarla, si el envío indica que el endpoint ya no vale, o al eliminar la cuenta.

### Administración del servicio

Avisar a la titular de un alta y consultar cifras de uso para administrar el servicio.

El alta, si `ADMIN_NOTIFY_EMAIL` está definido, envía por SMTP nombre, email y fecha. La política usa para ese aviso el interés legítimo, artículo 6.1.f.

n8n no tiene en la política un artículo distinto. La política lo describe como automatización interna, por cuenta de la responsable, para administrar el servicio. No es una venta. El detalle de lo que recibe está en la lista de encargados.

No hay una tabla aparte para estos avisos. `GET /api/admin/analytics` calcula las cifras en el momento.

El código puede mandar un resumen semanal por el mismo SMTP si `weekly_digest_opt_in` está activo. El valor por defecto es falso y la cuenta no ofrece esa opción. La política dice que hoy no se envían resúmenes periódicos.

## Encargados

Qué recibe cada uno. El código no nombra al proveedor del VPS ni al del SMTP.

- **VPS.** El servidor donde corre la aplicación guarda la base SQLite (`data/gastodehoy.db`): cuenta, presupuesto, claves push, intentos de acceso y sesiones revocadas. También guarda las copias. Actúa por cuenta de la titular, como ya dice la política.
- **Google, buzón gastodehoy@gmail.com.** Recibe lo que se escribe a ese correo. La política sitúa ahí el aviso interno de alta y declara la transferencia con el EU-US Data Privacy Framework (Google LLC, certificación revisable en dataprivacyframework.gov).
- **Servidor SMTP de la titular.** Encargado del correo de bienvenida (nombre y email) y del enlace de un solo uso para restablecer la contraseña (email y URL con el token, una hora). El mismo servidor envía el aviso de alta a `ADMIN_NOTIFY_EMAIL` cuando esa variable existe.
- **n8n.** Llama a `GET /api/admin/analytics` con la cabecera `X-Admin-Key`. Recibe el email de cada cuenta y conteos de uso: número de cuentas; cuentas con gastos, con un ingreso mensual indicado y con la guía terminada; total de gastos variables y de gastos fijos; cuentas activas a 7 y a 30 días; y, por cuenta, el email, el número de gastos variables y los días distintos con gasto de los últimos 30 días. No recibe importes, nombres, notas ni el hash de la contraseña. No es una venta.
- **Google, Mozilla o Apple.** Solo si la persona activa el push. El aviso se entrega al endpoint de la suscripción, que es el servicio de su navegador. El texto puede incluir cifras del margen. La política ya dice que puede haber una transferencia fuera del EEE, amparada por una decisión de adecuación o por las cláusulas de ese proveedor. Si el push no está activo, estos proveedores no intervienen.

## Copias y plazos

`scripts/backup.sh` vuelca la base a un `.gz` sin cifrar. El cron de producción es diario a las 03:30 en el mismo equipo:

```cron
30 3 * * * cd /root/gastodehoy && ./scripts/backup.sh >> /var/log/gastodehoy-backup.log 2>&1
```

Con el directorio por defecto, los archivos quedan en `/root/gastodehoy/backups`. El servidor tiene un solo disco: no hay segundo montaje ni copia remota. `KEEP_DAYS` vale 7 si no se cambia; el script borra los `gastodehoy-*.db.gz` con más días que ese valor.

| Dato | Plazo |
| --- | --- |
| Cuenta y presupuesto | Hasta que la persona elimina la cuenta |
| Copias de seguridad | Hasta que la rotación de 7 días sustituye el archivo |
| IP (y email, si lo hay) de intentos de acceso | 5 minutos; se borra al salir de esa ventana |
| Registros técnicos | No hay un plazo en el repositorio. Duran lo que el servidor los conserve |

## Notas de riesgo

Hechos del sistema, no una conclusión sobre la evaluación de impacto. Esa decisión está pendiente de un asesor. Este registro no dice que la evaluación sea innecesaria.

- La base viva y las copias están en el mismo disco, y las copias no van cifradas. Quien accede al VPS alcanza las dos.
- La contraseña se guarda como hash bcrypt, no en claro. No hay credenciales bancarias.
- Con la clave de administración, n8n obtiene el email de cada cuenta y los conteos de uso descritos arriba.
- El buzón de contacto está en Google, con el mecanismo de transferencia que ya cita la política.
- Con el push activo, el texto del aviso puede llevar cifras del margen al servicio del navegador, y ese envío puede salir del EEE.

## Qué hacer en las 72 horas siguientes a una brecha

Lista interna. No sustituye el criterio de quien asesore ni adelanta si un caso concreto hay que comunicarlo.

1. **Detectar.** Anotar la fecha y la hora en que se tiene constancia. Desde ese momento cuentan las 72 horas.
2. **Contener.** Cortar el acceso que siga abierto (clave de administración, secreto de la cookie, SMTP, claves push si hacen falta). Parar el servicio si la fuga continúa. Guardar lo necesario para saber qué pasó, sin seguir exponiendo datos.
3. **Valorar el riesgo.** Qué datos salieron (email, nombre, hash de contraseña, cifras de presupuesto, claves push, IP de intentos si aún estaban en los cinco minutos), cuántas cuentas, y si también salió una copia sin cifrar. Anotar qué uso cabe esperar.
4. **Decir a la AEPD si hace falta.** Si el riesgo para las personas no es improbable, la comunicación a la Agencia Española de Protección de Datos (https://www.aepd.es) entra en esas 72 horas. Si se decide no comunicar, dejar escrito por qué.
5. **Avisar a las personas si el riesgo es alto.** En lenguaje claro: qué ha pasado, qué datos y qué pueden hacer. El contacto publicado es gastodehoy@gmail.com.
6. **Dejar constancia.** Hechos, efectos, medidas y la decisión de comunicar o no. Se guarda aunque no haya aviso a la AEPD ni a las cuentas.
