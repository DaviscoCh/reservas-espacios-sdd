# Quickstart de validación

## Prerrequisitos

- Node.js LTS y npm instalados.
- MongoDB disponible para ejecución local, o la configuración de prueba con
  `mongodb-memory-server`.
- Variables de entorno configuradas:
  - `JWT_SECRET`
  - `APP_TIMEZONE=America/Guayaquil`
  - `OPERATING_DAY_START=07:00`
  - `OPERATING_DAY_END=22:00`
- El cliente conserva el JWT en memoria y lo envía como `Authorization: Bearer`; una
  recarga de la aplicación requiere autenticarse nuevamente en esta primera versión.

## Instalación

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Validación automatizada

```bash
cd backend
npm test
npm run build

cd ../frontend
npm test -- --watch=false
npm run build
```

La suite del backend debe levantar una base efímera y comprobar autenticación, autorización,
validación temporal, no solapamiento, cancelación y contratos HTTP. La suite del frontend
debe cubrir login, consulta de disponibilidad, alta de reserva, mis reservas y gestión de
espacios.

## Validación manual end-to-end

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
