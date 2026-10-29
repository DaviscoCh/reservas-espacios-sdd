# Reservas de espacios

Sistema web para consultar la disponibilidad de salas y canchas, reservarlas y administrarlas,
desarrollado con **Spec Driven Development** (GitHub Spec Kit), GitHub Actions y asistentes de IA.

- **Backend:** Node.js, Express 5, TypeScript, MongoDB (Mongoose) y JWT.
- **Frontend:** Angular 22 (componentes independientes, formularios reactivos y señales).
- **Pruebas:** Jest + Supertest en el backend; Vitest (ejecutor de Angular) en el frontend.
- **Zona horaria operativa:** `America/Guayaquil`, jornada 07:00–22:00.

## Roles y funciones

| Rol | Puede |
|---|---|
| `solicitante` | Consultar la disponibilidad por fecha, crear reservas, ver sus reservas y cancelarlas |
| `administrador` | Consultar la disponibilidad y crear, editar y desactivar espacios |

Un horario ocupado se detecta cuando `inicio existente < fin nuevo` y `fin existente > inicio nuevo`,
por lo que dos reservas consecutivas (10:00–11:00 y 11:00–12:00) no se solapan.

## Requisitos

- Node.js 24 y npm.
- MongoDB en ejecución (por defecto `mongodb://127.0.0.1:27017`).

## Puesta en marcha local

```bash
# 1. Dependencias
npm run install:all

# 2. Variables de entorno del backend
cp backend/.env.example backend/.env      # en Windows: copy backend\.env.example backend\.env
#    Edita JWT_SECRET con un valor propio (no uses "change-me").

# 3. Cuentas de demostración (solo desarrollo)
npm --prefix backend run seed

# 4. Backend (http://localhost:3000/api)
npm --prefix backend run dev

# 5. Frontend, en otra terminal (http://localhost:4200)
npm --prefix frontend start
```

El servidor de desarrollo de Angular redirige `/api` al backend mediante `frontend/proxy.conf.json`.

Cuentas creadas por el `seed` (no uses estas contraseñas fuera de desarrollo):

| Rol | Correo | Contraseña |
|---|---|---|
| Solicitante | `solicitante@organizacion.test` | `Solicitante123` |
| Administrador | `admin@organizacion.test` | `Admin12345` |

Los espacios los crea el administrador desde la pantalla **Espacios**.

## Variables de entorno del backend

| Variable | Descripción | Valor de ejemplo |
|---|---|---|
| `PORT` | Puerto del API | `3000` |
| `MONGODB_URI` | Conexión a MongoDB | `mongodb://127.0.0.1:27017/reservas-espacios` |
| `JWT_SECRET` | Secreto para firmar el JWT (obligatorio) | un valor largo y propio |
| `JWT_EXPIRES_IN` | Vigencia del token | `8h` |
| `APP_TIMEZONE` | Zona horaria operativa | `America/Guayaquil` |
| `OPERATING_DAY_START` / `OPERATING_DAY_END` | Jornada de atención | `07:00` / `22:00` |

El archivo `backend/.env` no se sube a Git.

## Pruebas y build

Las pruebas del backend que usan base de datos necesitan MongoDB y la variable `MONGODB_TEST_URI`.
Cada archivo de prueba crea su propia base (`<URI>-<sufijo>`) para evitar colisiones.

```powershell
# PowerShell
$env:MONGODB_TEST_URI="mongodb://127.0.0.1:27017/reservas-espacios-test"; npm run test:backend
npm run test:frontend
npm run build
```

```bash
# bash
MONGODB_TEST_URI=mongodb://127.0.0.1:27017/reservas-espacios-test npm run test:backend
```

Sin `MONGODB_TEST_URI`, las pruebas de integración con base de datos se omiten y el resto se ejecuta.

## Integración continua

El workflow [`.github/workflows/pull-request.yml`](.github/workflows/pull-request.yml) se ejecuta en
cada Pull Request, en cada push a `main` y de forma manual. Tiene dos trabajos independientes:

- **Backend:** levanta MongoDB 7 como servicio, instala con `npm ci`, ejecuta `npm run test:ci` y `npm run build`.
- **Frontend:** instala con `npm ci`, ejecuta `npm run test:ci` (`ng test --watch=false`) y `npm run build`.

## Estructura

```text
backend/    API Express (routes, controllers, services, models, middleware) y sus pruebas
frontend/   Aplicación Angular (core: sesión, guardas, interceptor; features: auth, availability, reservations, spaces)
specs/      Especificación, plan, contratos REST, modelo de datos, quickstart y tareas (Spec Kit)
.github/    Workflow de CI y skills de Spec Kit
```

## Limitaciones conocidas de esta versión

- El token JWT se guarda solo en memoria: recargar la página exige iniciar sesión de nuevo.
- La prevención de reservas dobles usa un bloqueo en memoria por espacio y protege solo una instancia
  del servidor; un despliegue con varias instancias necesitaría un bloqueo distribuido.
- Un espacio desactivado no puede reactivarse.

## Documentación de la especificación

- [Quickstart de validación](specs/001-space-reservations/quickstart.md)
- [Contratos REST](specs/001-space-reservations/contracts/)
- [Modelo de datos](specs/001-space-reservations/data-model.md)
