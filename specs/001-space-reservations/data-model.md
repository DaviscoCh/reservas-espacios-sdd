# Data Model: Sistema de Reservas de Espacios

## Usuario

Representa una cuenta autenticable de la organización.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| `id` | Identificador | Único y generado por el sistema |
| `email` | Texto | Obligatorio, válido, único y normalizado |
| `passwordHash` | Texto | Obligatorio; nunca se expone en respuestas |
| `role` | Enumeración | `solicitante` o `administrador` |
| `createdAt` | Fecha completa | Generada por el sistema |
| `updatedAt` | Fecha completa | Actualizada por el sistema |

**Relaciones**: un usuario solicitante puede tener muchas reservas; los administradores
gestionan espacios.

## Espacio

Representa un lugar que puede ser reservado.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| `id` | Identificador | Único y generado por el sistema |
| `name` | Texto | Obligatorio y no vacío |
| `type` | Enumeración | `sala` o `cancha` |
| `capacity` | Entero | Obligatorio y mayor que cero |
| `location` | Texto | Obligatorio y no vacío |
| `isActive` | Booleano | Por defecto `true` |
| `createdAt` | Fecha completa | Generada por el sistema |
| `updatedAt` | Fecha completa | Actualizada por el sistema |

**Relaciones**: un espacio puede tener muchas reservas. Desactivarlo no elimina su
historial.

## Reserva

Representa una solicitud de uso de un espacio.

| Campo | Tipo lógico | Reglas |
|---|---|---|
| `id` | Identificador | Único y generado por el sistema |
| `userId` | Referencia | Obligatoria, debe referir a un usuario solicitante |
| `spaceId` | Referencia | Obligatoria, debe referir a un espacio |
| `localDate` | Texto `YYYY-MM-DD` | Obligatoria; fecha operativa en `America/Guayaquil` |
| `startAt` | Fecha completa | Obligatoria; interpretada en la zona operativa |
| `endAt` | Fecha completa | Obligatoria y posterior a `startAt` |
| `status` | Enumeración | `activa` o `cancelada`; por defecto `activa` |
| `createdAt` | Fecha completa | Generada por el sistema |
| `updatedAt` | Fecha completa | Actualizada por el sistema |

**Reglas de validación**:

- `startAt` y `endAt` deben pertenecer a la misma fecha operativa.
- `localDate` debe coincidir con la fecha local de `startAt` y `endAt` en la zona
  `America/Guayaquil`.
- El intervalo debe estar dentro de la jornada configurable 07:00-22:00.
- La fecha y hora de inicio no pueden estar en el pasado.
- Al crear, el espacio debe estar activo.
- Una reserva activa no puede solaparse con otra reserva activa del mismo espacio.
- El solapamiento se determina con `existing.startAt < new.endAt` y
  `existing.endAt > new.startAt`.
- Una reserva cancelada no bloquea el intervalo.
- Debe existir un índice compuesto que facilite buscar reservas por espacio, fecha, estado e
  intervalo, y otro por usuario, estado e inicio.

## Transiciones de estado

```text
Reserva activa -> Reserva cancelada
Reserva cancelada -> (sin transición de regreso)
Espacio activo -> Espacio desactivado
Espacio desactivado -> (sin reactivación en la primera versión)
```
