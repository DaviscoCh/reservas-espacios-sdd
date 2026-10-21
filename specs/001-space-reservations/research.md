# Research: Sistema de Reservas de Espacios

## Decisión: Separación estricta backend/frontend en monorepo

**Rationale**: Mantiene independientes los ciclos de compilación y pruebas de Angular y del
backend TypeScript sobre Node.js, a la vez que permite una única Pull Request y un pipeline
coordinado.

**Alternativas consideradas**: Un proyecto único con frontend servido por Express fue
descartado porque mezcla responsabilidades y dificulta ejecutar pruebas y builds separados.

## Decisión: API REST versionada por prefijo funcional `/api`

**Rationale**: Los recursos `auth`, `spaces` y `reservations` tienen contratos explícitos,
son fáciles de probar con Supertest y permiten que el frontend permanezca desacoplado.

**Alternativas consideradas**: GraphQL fue descartado por añadir complejidad no necesaria
para los tres recursos iniciales.

## Decisión: JWT y bcrypt con autorización por rol

**Rationale**: JWT permite transportar la identidad autenticada entre solicitudes y bcrypt
evita almacenar contraseñas en texto plano. El middleware de autenticación valida el token y
el middleware de rol restringe las operaciones de administrador.

**Alternativas consideradas**: Sesiones almacenadas en servidor fueron descartadas para
mantener el backend stateless en la primera versión; OAuth/SSO queda fuera de alcance.

## Decisión: Intervalos semiabiertos y validación en el servicio de reservas

**Rationale**: La condición `existing.start < new.end` y
`existing.end > new.start` permite reservas consecutivas sin solapamiento y rechaza todos
los cruces. El filtro debe incluir únicamente reservas activas del mismo espacio y fecha.
La validación en el servicio centraliza la regla y evita confiar en el cliente.

**Alternativas consideradas**: Comparar sólo horas formateadas fue descartado porque pierde
la semántica de fecha completa; permitir que el frontend decida fue descartado por
inseguro y propenso a carreras.

## Decisión: Fecha operativa y fechas completas normalizadas con zona configurable

**Rationale**: La reserva se guarda con `startAt` y `endAt` como fechas completas y añade
`localDate` (`YYYY-MM-DD`) para consultas por día operativo y auditoría. La zona por defecto
es `America/Guayaquil` y la jornada es 07:00-22:00; ambas se leen de variables de entorno
para permitir despliegues compatibles sin cambiar el código.

**Alternativas consideradas**: Guardar sólo fecha y cadenas de hora fue descartado porque
complica comparaciones y cruces cerca de cambios de zona horaria.

Las solicitudes de creación aceptarán `date`, `startTime` y `endTime` en la zona operativa;
el backend los convertirá a instantes completos antes de persistirlos. Las respuestas
machine-facing usarán ISO-8601 y el frontend mostrará la zona de la organización.

## Decisión: Protección contra carreras en creación de reservas

**Rationale**: Una secuencia de “buscar conflicto y luego insertar” permite que dos
solicitudes concurrentes observen el mismo hueco. Como la instancia local de MongoDB es
standalone (sin replica set) y las pruebas usan `mongodb-memory-server` en standalone, no se
usarán transacciones. La implementación debe serializar la creación por `spaceId` en el
servicio con un bloqueo en memoria y ejecutar dentro de ese bloqueo la validación de
solapamiento y la creación de la reserva.

**Alternativas consideradas**: Un índice normal de MongoDB no puede imponer exclusión
arbitraria de intervalos. Las transacciones en MongoDB standalone no son una opción viable
en este entorno. Usar franjas fijas reduciría flexibilidad y no corresponde a la solicitud
de horas libres.

**Limitación conocida**: el bloqueo en memoria protege sólo una instancia del servidor. En
despliegues multi-instancia, la garantía de exclusión requerirá un lock distribuido o una
estrategia de coordinación externa.

## Decisión: Pruebas de backend con MongoDB efímero y frontend con el ejecutor Angular

**Rationale**: Jest/Supertest cubre contratos HTTP y reglas de negocio sin una base real;
mongodb-memory-server hace reproducibles las pruebas en GitHub Actions. Las pruebas del
frontend usan el ejecutor ya soportado por Angular para no introducir otro runner.

**Alternativas consideradas**: Una base MongoDB compartida en CI fue descartada por
fragilidad, configuración externa y riesgo de contaminación entre ejecuciones.

## Decisión: Pipeline de Pull Request como puerta de calidad

**Rationale**: Cada Pull Request instala dependencias, ejecuta pruebas y compila ambos
proyectos. Esto aplica de forma automática los principios de calidad y protege `main`.

**Alternativas consideradas**: Validación manual local fue descartada porque no es
repetible ni suficiente como protección de integración.

El workflow usará `npm ci` y lockfiles comprometidos, jobs independientes para backend y
frontend, permisos mínimos de lectura y caché determinista de dependencias. El job backend
ejecutará Jest con `mongodb-memory-server`; el job frontend ejecutará pruebas Angular sin
modo interactivo y ambos ejecutarán build. La protección de `main` requerirá estos checks.

## Decisión: Transporte del JWT y respuesta ante propiedad ajena

El frontend mantendrá el access token sólo en memoria durante la sesión de la aplicación y
lo enviará en el encabezado `Authorization: Bearer`. Los guards de Angular sólo mejoran la
experiencia; toda autorización se repite en el backend. Esta opción evita persistir el token
en almacenamiento accesible a scripts; una recarga requerirá iniciar sesión de nuevo en la
primera versión.

Una cancelación de una reserva ajena responderá `404` para no revelar si existe un recurso
perteneciente a otra persona. Las pruebas cubrirán esa política y el backend no expondrá
listados generales de reservas.

## Decisión: Pruebas por capas y ciclo de base efímera

La cobertura se dividirá en pruebas unitarias de intervalos, zona horaria y autorización;
pruebas de servicio para reglas de negocio; pruebas HTTP de contratos, JWT, roles y
propiedad; y una prueba de concurrencia que envía dos solicitudes solapadas y verifica que
exactamente una prospera. Cada suite aislará colecciones y cerrará Mongoose y el servidor
efímero al terminar.
