---

description: "Task list template for feature implementation"
---

# Tasks: Sistema de Reservas de Espacios

**Input**: Design documents from `/specs/001-space-reservations/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Se aplica enfoque TDD por solicitud explícita: en cada historia, las pruebas van antes de la implementación.

**Organization**: Tareas agrupadas por historia de usuario para permitir implementación y validación independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencia directa de tareas incompletas)
- **[Story]**: Historia de usuario objetivo (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Todas las tareas incluyen rutas de archivos concretas

## Phase 1: Setup del monorepo (backend y frontend)

**Purpose**: Inicializar estructura y tooling base del monorepo.

- [X] T001 Crear estructura inicial de monorepo en `backend/`, `frontend/` y `.github/workflows/` según `specs/001-space-reservations/plan.md`
- [X] T002 Inicializar proyecto backend TypeScript con Express y scripts base en `backend/package.json` y `backend/tsconfig.json`
- [X] T003 [P] Inicializar proyecto frontend Angular con scripts base en `frontend/package.json` y `frontend/angular.json`
- [X] T004 [P] Definir archivos de entorno y configuración operativa (`APP_TIMEZONE`, `OPERATING_DAY_START`, `OPERATING_DAY_END`, `JWT_SECRET`) en `backend/.env.example` y `frontend/src/environments/environment.ts`
- [X] T005 [P] Configurar comandos raíz del monorepo para instalar, probar y compilar backend/frontend en `package.json`
- [X] T006 Configurar Jest en backend con TypeScript y Supertest en `backend/jest.config.ts` y `backend/tests/setup/jest.setup.ts`
- [X] T007 [P] Configurar pruebas de frontend con ejecutor Angular por defecto en `frontend/angular.json`
- [X] T008 [P] Configurar ESLint/format en backend y frontend en `backend/.eslintrc.*` y `frontend/.eslintrc.*`

---

## Phase 2: Foundational (bloqueante para todas las historias)

**Purpose**: Infraestructura común necesaria antes de cualquier historia.

**⚠️ CRITICAL**: Ninguna historia inicia implementación antes de completar esta fase.

- [X] T009 Configurar conexión Mongoose y arranque desacoplado (`app` vs `server`) en `backend/src/app.ts`, `backend/src/server.ts` y `backend/src/config/database.ts`
- [X] T010 [P] Implementar middleware de autenticación JWT y autorización por rol en `backend/src/middleware/authenticate-jwt.ts` y `backend/src/middleware/authorize-role.ts`
- [X] T011 [P] Implementar manejo de errores con códigos `400/401/403/404/409` y forma de error común en `backend/src/middleware/error-handler.ts`
- [X] T012 [P] Implementar utilidades de fecha/hora operativa (`America/Guayaquil`, jornada 07:00-22:00 configurable) en `backend/src/utils/datetime.ts`
- [X] T013 Definir modelo `Usuario` en `backend/src/models/user.model.ts` citando reglas: "`email` obligatorio, válido, único y normalizado", "`passwordHash` obligatorio; nunca se expone en respuestas", "`role` = `solicitante` o `administrador`"
- [X] T014 [P] Definir modelo `Espacio` en `backend/src/models/space.model.ts` citando reglas: "`name` obligatorio y no vacío", "`type` = `sala` o `cancha`", "`capacity` obligatorio y mayor que cero", "`location` obligatorio y no vacío", "`isActive` por defecto `true`"
- [X] T015 [P] Definir modelo `Reserva` en `backend/src/models/reservation.model.ts` citando reglas: "`userId` obligatorio y referencia a solicitante", "`spaceId` obligatorio y referencia a espacio", "`localDate` obligatoria en `YYYY-MM-DD`", "`startAt` obligatoria", "`endAt` obligatoria y posterior a `startAt`", "`status` = `activa` o `cancelada` (por defecto `activa`)"
- [X] T016 Crear índices de reservas y consultas por usuario en `backend/src/models/reservation.model.ts` con `{ spaceId, localDate, status, startAt, endAt }` y `{ userId, status, startAt }`
- [X] T017 Implementar utilidades de bloqueo en memoria por `spaceId` en `backend/src/services/locks/space-lock.service.ts` documentando limitación de instancia única
- [X] T018 Registrar rutas base `/api` y módulos `auth`, `spaces`, `reservations` en `backend/src/routes/index.ts` y `backend/src/app.ts`

**Checkpoint**: Base técnica lista; historias pueden ejecutarse en paralelo por equipo.

---

## Phase 3: User Story 1 - Consultar disponibilidad de espacios (Priority: P1) 🎯 MVP

**Goal**: Permitir al solicitante consultar espacios activos por fecha y ver horarios ocupados.

**Independent Test**: Con usuario autenticado, `GET /api/spaces/availability?date=YYYY-MM-DD` devuelve espacios activos y `occupiedSlots` sólo de reservas activas de esa fecha.

### Tests for User Story 1 (TDD primero)

- [X] T019 [P] [US1] Crear prueba de contrato para `GET /api/spaces/availability` en `backend/tests/contract/spaces-availability.contract.test.ts`
- [X] T020 [P] [US1] Crear prueba de integración de disponibilidad por fecha y espacios activos en `backend/tests/integration/spaces-availability.integration.test.ts`
- [X] T021 [P] [US1] Crear prueba de componente Angular de filtro por fecha y listado de disponibilidad en `frontend/src/app/features/availability/availability-page.component.spec.ts`

### Implementation for User Story 1

- [X] T022 [US1] Implementar servicio de consulta de disponibilidad (filtra espacios activos y excluye reservas canceladas) en `backend/src/services/spaces/availability.service.ts`
- [X] T023 [US1] Implementar endpoint `GET /api/spaces/availability` en `backend/src/controllers/spaces.controller.ts` y `backend/src/routes/spaces.routes.ts`
- [X] T024 [P] [US1] Implementar cliente Angular de disponibilidad en `frontend/src/app/features/availability/availability-api.service.ts`
- [X] T025 [US1] Implementar pantalla de disponibilidad por fecha en `frontend/src/app/features/availability/availability-page.component.ts` y `frontend/src/app/features/availability/availability-page.component.html`

**Checkpoint**: US1 funcional y verificable de forma independiente.

---

## Phase 4: User Story 2 - Crear y cancelar una reserva (Priority: P1)

**Goal**: Permitir crear y cancelar reservas propias con validación estricta de horario y no solapamiento.

**Independent Test**: Un solicitante crea reserva válida, se rechaza un solapamiento con `409`, puede cancelar su reserva y el horario queda libre.

### Tests for User Story 2 (TDD primero)

- [X] T026 [P] [US2] Crear prueba de contrato para `POST /api/reservations` con casos `201/400/404/409` en `backend/tests/contract/reservations-create.contract.test.ts`
- [X] T027 [P] [US2] Crear prueba de contrato para `PATCH /api/reservations/:id/cancel` y `GET /api/reservations/me` en `backend/tests/contract/reservations-own.contract.test.ts`
- [X] T027A [P] [US2] Verificar en pruebas de contrato que rechazos de reserva devuelven `code` y `message` claros en `backend/tests/contract/reservations-errors.contract.test.ts`
- [X] T028 [P] [US2] Crear prueba unitaria de solapamiento con regla `existing.startAt < new.endAt` y `existing.endAt > new.startAt` en `backend/tests/unit/reservations-overlap.unit.test.ts`
- [X] T028A [P] [US2] Crear prueba unitaria de adyacencia válida (fin==inicio) para confirmar que no se considera solapamiento en `backend/tests/unit/reservations-adjacent.unit.test.ts`
- [X] T029 [P] [US2] Crear prueba de concurrencia con dos solicitudes simultáneas al mismo `spaceId` validando éxito único en `backend/tests/integration/reservations-concurrency.integration.test.ts`
- [X] T030 [P] [US2] Crear prueba de integración de cancelación que libera horario en `backend/tests/integration/reservations-cancel-release.integration.test.ts`
- [ ] T031 [P] [US2] Crear pruebas de UI Angular para nueva reserva, conflicto y cancelación en `frontend/src/app/features/reservations/reservations-page.component.spec.ts`

### Implementation for User Story 2

- [X] T032 [US2] Implementar servicio de reservas con bloqueo en memoria por `spaceId` y validación de solapamiento dentro del bloqueo en `backend/src/services/reservations/reservations.service.ts`
- [X] T033 [US2] Implementar validaciones de reserva (fin posterior al inicio, no pasado, misma fecha operativa, jornada 07:00-22:00, espacio activo) en `backend/src/services/reservations/reservations-validation.service.ts`
- [X] T034 [US2] Implementar endpoints `POST /api/reservations`, `GET /api/reservations/me` y `PATCH /api/reservations/:id/cancel` en `backend/src/controllers/reservations.controller.ts` y `backend/src/routes/reservations.routes.ts`
- [ ] T035 [P] [US2] Implementar cliente Angular de reservas en `frontend/src/app/features/reservations/reservations-api.service.ts`
- [ ] T036 [US2] Implementar vistas de nueva reserva y mis reservas con cancelación en `frontend/src/app/features/reservations/reservations-page.component.ts` y `frontend/src/app/features/reservations/reservations-page.component.html`
- [X] T037 [US2] Documentar limitación de concurrencia (aplica a una sola instancia) en `specs/001-space-reservations/contracts/reservations-api.md`

**Checkpoint**: US2 funcional con énfasis TDD en no solapamiento.

---

## Phase 5: User Story 4 - Iniciar sesión según el rol (Priority: P1)

**Goal**: Autenticar por correo/contraseña y habilitar acciones según rol.

**Independent Test**: Login válido devuelve JWT y perfil mínimo; login inválido devuelve `401`; rutas protegidas responden `401/403` según token/rol.

### Tests for User Story 4 (TDD primero)

- [X] T038 [P] [US4] Crear prueba de contrato para `POST /api/auth/login` y `GET /api/auth/me` en `backend/tests/contract/auth.contract.test.ts`
- [X] T039 [P] [US4] Crear prueba de integración de autorización por rol en rutas de espacios/reservas en `backend/tests/integration/auth-roles.integration.test.ts`
- [X] T040 [P] [US4] Crear pruebas de UI Angular para login y guardas por rol en `frontend/src/app/features/auth/login-page.component.spec.ts` y `frontend/src/app/core/guards/role.guard.spec.ts`
- [X] T040A [P] [US4] Crear prueba de contrato para validación de payload inválido en login en `backend/tests/contract/auth-validation.contract.test.ts`

### Implementation for User Story 4

- [X] T041 [US4] Implementar servicio de autenticación con normalización de email y comparación bcrypt en `backend/src/services/auth/auth.service.ts`
- [X] T042 [US4] Implementar emisión/validación JWT con `sub`, `role`, `exp` y endpoint `GET /api/auth/me` en `backend/src/controllers/auth.controller.ts` y `backend/src/routes/auth.routes.ts`
- [X] T043 [US4] Implementar flujo Angular de login y almacenamiento de token en memoria en `frontend/src/app/features/auth/login-page.component.ts` y `frontend/src/app/core/auth/auth-session.service.ts`
- [X] T044 [US4] Proteger rutas Angular por rol y acoplar encabezado `Authorization: Bearer` en `frontend/src/app/core/guards/role.guard.ts` y `frontend/src/app/core/http/auth.interceptor.ts`

**Checkpoint**: US4 funcional de forma independiente.

---

## Phase 6: User Story 3 - Administrar espacios (Priority: P2)

**Goal**: Permitir al administrador crear, editar y desactivar espacios.

**Independent Test**: Administrador puede crear/editar/desactivar espacio; solicitante recibe `403`; espacio desactivado no se ofrece para nuevas reservas.

### Tests for User Story 3 (TDD primero)

- [X] T045 [P] [US3] Crear prueba de contrato para `POST /api/spaces` y `PATCH /api/spaces/:id` en `backend/tests/contract/spaces-admin.contract.test.ts`
- [X] T046 [P] [US3] Crear prueba de integración de restricciones por rol y desactivación efectiva en `backend/tests/integration/spaces-admin.integration.test.ts`
- [ ] T047 [P] [US3] Crear pruebas de UI Angular para alta/edición/desactivación de espacios en `frontend/src/app/features/spaces/spaces-admin-page.component.spec.ts`

### Implementation for User Story 3

- [X] T048 [US3] Implementar servicio de gestión de espacios con reglas de validación y desactivación lógica en `backend/src/services/spaces/spaces-admin.service.ts`
- [X] T049 [US3] Implementar endpoints `GET /api/spaces`, `POST /api/spaces` y `PATCH /api/spaces/:id` en `backend/src/controllers/spaces-admin.controller.ts` y `backend/src/routes/spaces.routes.ts`
- [ ] T050 [P] [US3] Implementar cliente Angular de administración de espacios en `frontend/src/app/features/spaces/spaces-admin-api.service.ts`
- [ ] T051 [US3] Implementar pantalla de administración de espacios en `frontend/src/app/features/spaces/spaces-admin-page.component.ts` y `frontend/src/app/features/spaces/spaces-admin-page.component.html`

**Checkpoint**: US3 funcional e independiente.

---

## Phase 7: Pipeline CI de GitHub Actions y polish final

**Purpose**: Cierre transversal con validación automática en Pull Request.

- [X] T052 Crear workflow de Pull Request que instala dependencias, ejecuta pruebas y build de backend/frontend en `.github/workflows/pull-request.yml`
- [X] T053 [P] Ajustar scripts de CI para backend (`test`, `build`) en `backend/package.json` y frontend (`test --watch=false`, `build`) en `frontend/package.json`
- [ ] T054 [P] Documentar ejecución local y en CI en `README.md` y `specs/001-space-reservations/quickstart.md`
- [ ] T055 Ejecutar validación end-to-end del quickstart y registrar resultado en `specs/001-space-reservations/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: inicia de inmediato.
- **Phase 2 (Foundational)**: depende de Phase 1 y bloquea historias.
- **Phase 3 (US1)**, **Phase 4 (US2)**, **Phase 5 (US4)**, **Phase 6 (US3)**: dependen de Phase 2.
- **Phase 7 (CI + Polish)**: depende de historias objetivo completadas.

### User Story Dependencies

- **US1 (P1)**: independiente tras Phase 2.
- **US2 (P1)**: independiente tras Phase 2; reutiliza autenticación/base de reservas.
- **US4 (P1)**: independiente tras Phase 2; refuerza experiencia de login y control de rol.
- **US3 (P2)**: independiente tras Phase 2; se integra con listado de disponibilidad/reservas.

### Dependency Graph (story completion order)

`Setup -> Foundational -> (US1 || US2 || US4 || US3) -> CI/Polish`

### Within Each User Story (TDD)

- Pruebas primero (deben fallar inicialmente)
- Servicios/modelos antes de controladores y rutas
- Endpoints/API antes de integración final en frontend

---

## Parallel Execution Examples

### US1

```bash
T019 + T020 + T021 en paralelo
T024 en paralelo con T023 cuando T022 esté listo
```

### US2

```bash
T026 + T027 + T028 + T029 + T030 + T031 en paralelo
T035 en paralelo con T034 cuando T032 y T033 estén listos
```

### US4

```bash
T038 + T039 + T040 en paralelo
T043 en paralelo con T042 cuando T041 esté listo
```

### US3

```bash
T045 + T046 + T047 en paralelo
T050 en paralelo con T049 cuando T048 esté listo
```

---

## Implementation Strategy

### MVP First (US1)

1. Completar Phase 1 y Phase 2.
2. Entregar US1 completa (consulta de disponibilidad).
3. Validar métricas de SC-001 y base de navegación.

### Incremental Delivery

1. Añadir US2 con foco en regla de no solapamiento y cancelación.
2. Añadir US4 para flujo completo de autenticación/roles en UI.
3. Añadir US3 para administración operativa de espacios.
4. Cerrar con pipeline CI y documentación final.
