# Implementation Plan: Sistema de Reservas de Espacios

**Branch**: `001-space-reservations` | **Date**: 2026-10-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-space-reservations/spec.md`

## Summary

Construir un monorepo con `backend/` y `frontend/` para autenticar solicitantes y
administradores, administrar espacios, consultar disponibilidad y crear o cancelar
reservas. El backend expondrá una API REST bajo `/api`, con JWT y bcrypt, y persistirá
usuarios, espacios y reservas en MongoDB mediante Mongoose. La creación de reservas
validará intervalos semiabiertos `[inicio, fin)` contra reservas activas del mismo espacio.
El frontend Angular ofrecerá las pantallas de login, disponibilidad, nueva reserva, mis
reservas y administración de espacios.

## Technical Context

**Language/Version**: TypeScript sobre Node.js LTS en backend; TypeScript y Angular en
frontend

**Primary Dependencies**: Express, Mongoose, JWT, bcrypt; Angular; Jest, Supertest y
mongodb-memory-server. La construcción de la aplicación Express se separará del arranque
del servidor para permitir pruebas HTTP directas.

**Storage**: MongoDB con colecciones `usuarios`, `espacios` y `reservas`

**Testing**: Jest y Supertest para backend; ejecutor de pruebas predeterminado de Angular
para frontend; mongodb-memory-server para pruebas de integración del backend

**Target Platform**: Aplicación web con API REST ejecutada en entornos compatibles con
Node.js LTS y navegadores soportados por Angular

**Project Type**: Monorepo web con backend y frontend

**Performance Goals**: El 95% de las consultas de disponibilidad y operaciones de reserva
debe responder en menos de 2 segundos bajo la carga inicial prevista; la interfaz debe
permitir completar una reserva válida en menos de 2 minutos

**Constraints**: API bajo `/api`; JWT obligatorio para operaciones autenticadas; bcrypt
para contraseñas; autorización por rol; zona horaria `America/Guayaquil`; jornada
configurable por entorno con valores iniciales 07:00-22:00; la regla de no solapamiento
debe evaluarse con reservas activas y protegerse contra solicitudes concurrentes
serializando la creación de reservas por `spaceId` dentro del servicio.

**Scale/Scope**: Primera versión para una organización, dos roles, tres colecciones,
cinco áreas principales de frontend y sin pagos, recurrencias ni notificaciones

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Especificación previa**: PASS. Esta implementación se basa en `spec.md`.
- **Arquitectura definida**: PASS. Se conserva Angular, Node.js/Express y
  MongoDB/Mongoose.
- **Calidad y TDD**: PASS. El plan incluye pruebas automatizadas de la regla de
  solapamiento, autenticación, autorización y flujos principales.
- **Control de versiones**: PASS. La implementación está limitada a la rama de feature y
  deberá integrarse mediante Pull Request.
- **Documentación y comunicación**: PASS. Los artefactos de diseño y los contratos se
  documentan en español; los commits serán pequeños y claros.
- **Automatización**: PASS. Se define un pipeline de Pull Request para instalar,
  probar y compilar backend y frontend.
- **Seguridad de credenciales y roles**: PASS. Las contraseñas se almacenan únicamente
  como hashes bcrypt, los JWT contienen identidad mínima y la autorización se valida en
  el backend.
- **Integridad concurrente de reservas**: PASS. La investigación exige no depender sólo
  de una consulta previa al insert; la creación se serializará por `spaceId` en memoria y
  validará solapamiento dentro del bloqueo.

**Limitación conocida**: la serialización en memoria aplica únicamente dentro de una
instancia del servidor. En despliegues con múltiples instancias, se requerirá un mecanismo
de bloqueo distribuido para mantener la misma garantía.

No se identifican violaciones que requieran Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-space-reservations/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── auth-api.md
│   ├── spaces-api.md
│   └── reservations-api.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── services/
│   ├── controllers/
│   ├── routes/
│   └── app.ts
├── tests/
│   ├── integration/
│   └── unit/
├── package.json
└── tsconfig.json

frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   ├── features/auth/
│   │   ├── features/availability/
│   │   ├── features/reservations/
│   │   └── features/spaces/
│   └── environments/
├── package.json
└── angular.json

.github/
└── workflows/
    └── pull-request.yml
```

**Structure Decision**: Se adopta un monorepo web con dependencias y pruebas separadas
por `backend/` y `frontend/`. El backend concentra la autoridad de negocio y persistencia;
el frontend consume exclusivamente los contratos REST definidos en `contracts/`.

## Complexity Tracking

No aplica: el diseño no introduce excepciones a la constitución.
