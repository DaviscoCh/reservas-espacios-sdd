# Quickstart de validación

## Prerrequisitos

- Node.js LTS y npm instalados.
- MongoDB en ejecución local (`mongodb://127.0.0.1:27017`). Las pruebas con base de datos usan
  la variable `MONGODB_TEST_URI`.
- Variables de entorno configuradas:
  - `JWT_SECRET` (copia `backend/.env.example` a `backend/.env`)
  - `APP_TIMEZONE=America/Guayaquil`
  - `OPERATING_DAY_START=07:00`
  - `OPERATING_DAY_END=22:00`
- El cliente conserva el JWT en memoria y lo envía como `Authorization: Bearer`; una
  recarga de la aplicación requiere autenticarse nuevamente en esta primera versión.

## Instalación

```bash
npm run install:all
```

Cuentas de demostración (solo desarrollo): `npm --prefix backend run seed` crea
`solicitante@organizacion.test` / `Solicitante123` y `admin@organizacion.test` / `Admin12345`.
Para ejecutar el sistema: `npm --prefix backend run dev` y, en otra terminal,
`npm --prefix frontend start` (http://localhost:4200).

## Validación automatizada

```bash
# PowerShell; en bash usa MONGODB_TEST_URI=... npm run test:backend
$env:MONGODB_TEST_URI="mongodb://127.0.0.1:27017/reservas-espacios-test"; npm run test:backend
npm run test:frontend
npm run build
```

En CI el mismo flujo corre con `.github/workflows/pull-request.yml`.

La suite del backend usa bases de pruebas dedicadas (una por archivo) y comprueba autenticación, autorización,
validación temporal, no solapamiento, cancelación y contratos HTTP. La suite del frontend
debe cubrir login, consulta de disponibilidad, alta de reserva, mis reservas y gestión de
espacios.

## Validación manual end-to-end

0. Como `administrador`, crear al menos un espacio (pantalla Espacios).
1. Iniciar sesión con un usuario `solicitante`.
2. Consultar disponibilidad para una fecha futura.
3. Crear una reserva entre 08:00 y 10:00 y confirmar que aparece en mis reservas.
4. Intentar crear otra reserva del mismo espacio entre 09:00 y 11:00 y confirmar el rechazo
   por conflicto.
5. Crear una reserva consecutiva entre 10:00 y 11:00 y confirmar que es aceptada.
6. Cancelar la primera reserva y confirmar que 08:00-10:00 vuelve a estar disponible.
7. Iniciar sesión con un usuario `administrador`, crear y editar un espacio, y desactivarlo.
8. Confirmar que el espacio desactivado no puede recibir reservas nuevas y que sus reservas
   históricas permanecen visibles.

## Referencias

- Entidades y reglas: [data-model.md](./data-model.md)
- Autenticación: [contracts/auth-api.md](./contracts/auth-api.md)
- Espacios: [contracts/spaces-api.md](./contracts/spaces-api.md)
- Reservas: [contracts/reservations-api.md](./contracts/reservations-api.md)
