# Contrato REST: Espacios

Base URL: `/api`

Implementación de referencia: backend en TypeScript (Node.js LTS + Express).

## `GET /api/spaces/availability?date=YYYY-MM-DD`

Requiere rol `solicitante` o `administrador`. Devuelve espacios activos y sus reservas
activas para la fecha solicitada.

**Respuesta 200**

```json
{
  "date": "2026-11-10",
  "timezone": "America/Guayaquil",
  "spaces": [
    {
      "id": "space-id",
      "name": "Sala Norte",
      "type": "sala",
      "capacity": 20,
      "location": "Edificio A",
      "occupiedSlots": [
        {
          "startAt": "2026-11-10T08:00:00-05:00",
          "endAt": "2026-11-10T10:00:00-05:00"
        }
      ]
    }
  ]
}
```

## `GET /api/spaces`

Requiere autenticación. Lista espacios; admite un filtro `active=true|false` para
administración.

## `POST /api/spaces`

Requiere rol `administrador`.

```json
{
  "name": "Cancha 1",
  "type": "cancha",
  "capacity": 12,
  "location": "Complejo deportivo"
}
```

Responde `201` con el espacio creado; datos inválidos responden `400`.

## `PATCH /api/spaces/:id`

Requiere rol `administrador`. Permite editar nombre, tipo, capacidad, ubicación y estado.
Responde `200`, `400` para datos inválidos y `404` si no existe.

La desactivación se representa con `"isActive": false`; no elimina reservas históricas.
