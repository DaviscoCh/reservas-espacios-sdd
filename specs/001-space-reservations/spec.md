# Feature Specification: Sistema de Reservas de Espacios

**Feature Branch**: `001-space-reservations`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Sistema de Reservas de Espacios para una organización (por ejemplo, una universidad), donde las personas reservan salas de reuniones o canchas sin que se crucen los horarios. Roles: solicitante y administrador. Ambos inician sesión con correo y contraseña. El solicitante puede consultar espacios disponibles filtrando por fecha y ver qué horarios ya están ocupados, crear una reserva indicando espacio, fecha, hora de inicio y hora de fin, y ver o cancelar sus propias reservas. El administrador puede dar de alta, editar y desactivar espacios. Regla principal: no pueden existir dos reservas activas del mismo espacio cuyos horarios se solapen en la misma fecha. La hora de fin debe ser posterior a la de inicio. Una reserva cancelada libera el horario. Si hay conflicto, el sistema rechaza la reserva con un mensaje claro. Fuera de alcance: pagos, reservas recurrentes y notificaciones."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar disponibilidad de espacios (Priority: P1)

Como solicitante, quiero consultar los espacios y los horarios ocupados para una fecha
determinada, para elegir un espacio y horario sin conflictos.

**Why this priority**: La consulta de disponibilidad es la base para que las personas
puedan planificar reservas válidas y evita intentos innecesarios de reserva.

**Independent Test**: Se puede probar iniciando sesión como solicitante, seleccionando una
fecha y verificando que cada espacio muestre sus horarios ocupados y su disponibilidad.

**Acceptance Scenarios**:

1. **Given** que existen espacios activos y reservas para una fecha, **When** el
   solicitante consulta esa fecha, **Then** el sistema muestra los espacios activos y los
   horarios ocupados de cada uno.
2. **Given** que no existen reservas para un espacio en la fecha consultada, **When** el
   solicitante revisa ese espacio, **Then** el sistema lo identifica como disponible durante
   toda la jornada configurada.
3. **Given** una fecha sin espacios activos disponibles, **When** el solicitante consulta
   esa fecha, **Then** el sistema informa que no hay espacios disponibles.

---

### User Story 2 - Crear y cancelar una reserva (Priority: P1)

Como solicitante, quiero reservar un espacio en un horario válido y cancelar mis reservas
cuando ya no las necesite, para asegurar el uso del espacio sin bloquearlo
innecesariamente.

**Why this priority**: La creación de reservas entrega el valor principal del sistema y
la cancelación permite recuperar horarios que dejan de estar comprometidos.

**Independent Test**: Se puede probar iniciando sesión como solicitante, creando una reserva
válida, consultándola en sus reservas y cancelándola para comprobar que el horario vuelve a
estar disponible.

**Acceptance Scenarios**:

1. **Given** que el solicitante está autenticado y el espacio está activo, **When** crea
   una reserva con fecha y hora de fin posterior a la de inicio sin solapamiento,
   **Then** el sistema registra la reserva como activa y la muestra en sus reservas.
2. **Given** que existe una reserva activa para el mismo espacio y fecha, **When** el
   solicitante intenta crear una reserva con horarios solapados, **Then** el sistema rechaza
   la solicitud, no crea una reserva y muestra un mensaje claro de conflicto.
3. **Given** que el solicitante tiene una reserva activa, **When** la cancela, **Then** la
   reserva cambia a cancelada y el horario queda disponible para nuevas reservas.
4. **Given** que el solicitante intenta cancelar una reserva que no le pertenece,
   **When** envía la solicitud, **Then** el sistema la rechaza y la reserva original no
   cambia.

---

### User Story 3 - Administrar espacios (Priority: P2)

Como administrador, quiero registrar, editar y desactivar espacios, para mantener
actualizado el catálogo de lugares que pueden reservarse.

**Why this priority**: El catálogo debe reflejar los espacios reales de la organización
para que las consultas y reservas sean confiables.

**Independent Test**: Se puede probar iniciando sesión como administrador, creando un
espacio, modificando sus datos y desactivándolo, verificando el resultado en cada paso.

**Acceptance Scenarios**:

1. **Given** que el administrador está autenticado, **When** registra un espacio con
   nombre, tipo, capacidad y ubicación válidos, **Then** el espacio aparece como activo en
   el catálogo.
2. **Given** que existe un espacio, **When** el administrador modifica sus datos válidos,
   **Then** el catálogo muestra la información actualizada.
3. **Given** que existe un espacio activo, **When** el administrador lo desactiva,
   **Then** deja de estar disponible para nuevas reservas y no aparece como opción
   reservable.
4. **Given** que un solicitante intenta administrar un espacio, **When** accede a una
   operación de alta, edición o desactivación, **Then** el sistema rechaza la operación.

---

### User Story 4 - Iniciar sesión según el rol (Priority: P1)

Como usuario, quiero iniciar sesión con mi correo y contraseña para acceder únicamente a
las acciones permitidas para mi rol.

**Why this priority**: La identificación del usuario protege las reservas personales y
separa las operaciones administrativas de las funciones de solicitante.

**Independent Test**: Se puede probar con credenciales válidas e inválidas de cada rol y
verificar el acceso permitido o rechazado.

**Acceptance Scenarios**:

1. **Given** credenciales válidas de un solicitante, **When** inicia sesión, **Then** el
   sistema le permite consultar, crear, ver y cancelar sus propias reservas.
2. **Given** credenciales válidas de un administrador, **When** inicia sesión, **Then** el
   sistema le permite administrar espacios.
3. **Given** credenciales inválidas, **When** un usuario intenta iniciar sesión, **Then**
   el sistema rechaza el acceso sin revelar cuál dato fue incorrecto.

---

### Edge Cases

- Una reserva cuya hora de fin coincide exactamente con la hora de inicio de otra reserva
  del mismo espacio no se considera solapada; ambas pueden existir consecutivamente.
- Una reserva cuya hora de fin es igual o anterior a la hora de inicio se rechaza.
- No se puede reservar un espacio desactivado, aunque existan datos históricos de ese
  espacio.
- Las reservas canceladas no bloquean horarios, pero conservan su estado para el historial
  del solicitante.
- Una reserva no puede crearse para una fecha u hora pasada.
- La disponibilidad debe excluir las reservas canceladas y considerar únicamente reservas
  activas del mismo espacio y fecha.
- Si un espacio se desactiva con reservas futuras activas, esas reservas existentes se
  conservan y no se permiten nuevas reservas para ese espacio.
- Los nombres, tipos, capacidades y ubicaciones inválidos deben producir mensajes de
  validación comprensibles sin guardar cambios parciales.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir iniciar sesión con correo y contraseña y asociar cada
  cuenta con uno de los roles: solicitante o administrador.
- **FR-002**: El sistema MUST impedir el acceso a funciones no autorizadas según el rol del
  usuario autenticado.
- **FR-003**: El sistema MUST permitir al solicitante consultar espacios activos filtrando
  por fecha.
- **FR-004**: El sistema MUST mostrar, para cada espacio consultado, los horarios ocupados
  por reservas activas en la fecha seleccionada.
- **FR-005**: El sistema MUST permitir al solicitante crear una reserva indicando espacio,
  fecha, hora de inicio y hora de fin.
- **FR-006**: El sistema MUST rechazar una reserva cuando la hora de fin no sea posterior a
  la hora de inicio.
- **FR-007**: El sistema MUST rechazar una reserva si existe otra reserva activa del mismo
  espacio y fecha con horario solapado.
- **FR-008**: El sistema MUST considerar válidas dos reservas consecutivas cuando la hora de
  fin de una coincida con la hora de inicio de la otra.
- **FR-009**: El sistema MUST rechazar reservas de espacios desactivados o de fechas u horas
  pasadas.
- **FR-010**: El sistema MUST informar con un mensaje claro el motivo por el que una reserva
  fue rechazada.
- **FR-011**: El sistema MUST guardar cada reserva con su solicitante, espacio, fecha,
  horario y estado.
- **FR-012**: El sistema MUST permitir al solicitante consultar únicamente sus propias
  reservas.
- **FR-013**: El sistema MUST permitir al solicitante cancelar sus reservas y cambiar su
  estado a cancelada.
- **FR-014**: El sistema MUST liberar para nuevas reservas el horario asociado a una reserva
  cancelada.
- **FR-015**: El sistema MUST permitir al administrador registrar espacios con nombre, tipo
  (sala o cancha), capacidad y ubicación.
- **FR-016**: El sistema MUST permitir al administrador editar los datos de un espacio.
- **FR-017**: El sistema MUST permitir al administrador desactivar espacios sin eliminar el
  historial de reservas asociado.
- **FR-018**: El sistema MUST excluir los espacios desactivados de las opciones para nuevas
  reservas.
- **FR-019**: El sistema MUST validar los datos obligatorios y mostrar errores comprensibles
  antes de guardar usuarios, espacios o reservas.
- **FR-020**: El sistema MUST excluir pagos, reservas recurrentes y notificaciones del
  alcance de esta funcionalidad.

### Key Entities

- **Usuario**: Persona autenticada que solicita reservas o administra espacios; tiene
  correo, contraseña y rol.
- **Espacio**: Lugar reservable con nombre, tipo, capacidad, ubicación y estado activo o
  desactivado.
- **Reserva**: Solicitud de uso de un espacio asociada a un solicitante, fecha, hora de
  inicio, hora de fin y estado activa o cancelada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al menos el 95% de los solicitantes de prueba puede encontrar un espacio y
  confirmar su disponibilidad para una fecha en menos de 60 segundos.
- **SC-002**: El 100% de los intentos de reservar un mismo espacio con horarios activos
  solapados son rechazados, sin crear reservas duplicadas.
- **SC-003**: El 100% de las reservas con hora de fin igual o anterior a la de inicio son
  rechazadas con un mensaje comprensible.
- **SC-004**: Al menos el 95% de las reservas válidas de prueba se completa en menos de
  2 minutos desde la consulta de disponibilidad.
- **SC-005**: El 100% de las reservas canceladas de prueba deja de bloquear su horario para
  una nueva reserva válida.
- **SC-006**: El 100% de las operaciones de administración de espacios realizadas por
  solicitantes es rechazado y no modifica el catálogo.
- **SC-007**: Al menos el 90% de los usuarios de prueba identifica correctamente sus
  funciones disponibles después de iniciar sesión según su rol.

## Assumptions

- La organización proporciona previamente las cuentas de usuario y sus roles; el registro
  público de cuentas no forma parte de esta funcionalidad.
- Cada espacio tiene una jornada operativa definida por la organización; la especificación
  exige validar orden temporal y pasado, pero no define una jornada específica.
- Las fechas y horas se interpretan con la zona horaria oficial de la organización.
- Un administrador puede desactivar un espacio aunque tenga reservas futuras; esas reservas
  existentes permanecen visibles y no se crean nuevas para el espacio.
- Las reservas se mantienen para historial y auditoría, incluyendo las canceladas.
- Los mensajes de error se presentan en español y describen una acción correctiva cuando
  sea posible.
- Pagos, reservas recurrentes y notificaciones quedan fuera de alcance, aunque puedan
  considerarse en futuras especificaciones.
