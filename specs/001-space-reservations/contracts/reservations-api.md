# Contrato REST: Reservas

Base URL: `/api`

Implementación de referencia: backend en TypeScript (Node.js LTS + Express).

## `POST /api/reservations`

Requiere rol `solicitante`.

```json
{
  "spaceId": "space-id",
  "date": "2026-11-10",
  "startTime": "08:00",
  "endTime": "10:00"
}
```

Las horas se interpretan en `America/Guayaquil` y se almacenan como fechas completas.
Responde `201` con la reserva activa creada. Responde `400` si la fecha u hora es inválida,
está fuera de jornada o está en el pasado; `404` si el espacio no existe; `409` si el
espacio está desactivado o el intervalo se solapa con una reserva activa.

El servicio serializa la creación de reservas por `spaceId` mediante un bloqueo en memoria
y verifica el solapamiento dentro de ese bloqueo antes de guardar.

## `GET /api/reservations/me`

Requiere rol `solicitante`. Devuelve únicamente las reservas del usuario autenticado,
incluidas las canceladas, ordenadas por inicio descendente.

## `PATCH /api/reservations/:id/cancel`

Requiere rol `solicitante`. Sólo permite cancelar una reserva perteneciente al usuario
autenticado y que esté activa. Responde `200` con estado `cancelada`; responde `404` si no
existe o no pertenece al usuario, y `409` si ya está cancelada.

## Forma de la reserva en las respuestas

`POST /api/reservations` (201), `PATCH /api/reservations/:id/cancel` (200) y cada elemento de
`GET /api/reservations/me` devuelven:

```json
{
  "id": "reservation-id",
  "spaceId": "space-id",
  "spaceName": "Sala Norte",
  "date": "2026-11-10",
  "startAt": "2026-11-10T08:00:00-05:00",
  "endAt": "2026-11-10T10:00:00-05:00",
  "status": "activa"
}
```

Los rechazos devuelven `{ "code": "...", "message": "..." }` con un motivo claro en español,
por ejemplo: «El espacio ya está reservado de 08:00 a 10:00; elige otro horario».

## Limitación conocida de concurrencia

La serialización por `spaceId` en memoria protege contra solicitudes simultáneas sólo dentro
de una única instancia del servidor. En despliegues multi-instancia se requerirá un
mecanismo de bloqueo distribuido.
