# Contrato REST: Autenticación

Base URL: `/api`

Implementación de referencia: backend en TypeScript (Node.js LTS + Express).

## `POST /api/auth/login`

Autentica una cuenta.

**Request**

```json
{
  "email": "solicitante@organizacion.test",
  "password": "secreto"
}
```

**Respuesta 200**

```json
{
  "token": "<jwt>",
  "user": {
    "id": "user-id",
    "email": "solicitante@organizacion.test",
    "role": "solicitante"
  }
}
```

Credenciales inválidas responden `401` con un mensaje genérico. Los campos inválidos
responden `400`.

## `GET /api/auth/me`

Requiere autenticación y devuelve la identidad mínima del usuario autenticado:
`id`, `email` y `role`.

## Autorización

Las operaciones protegidas envían `Authorization: Bearer <jwt>`. Un token ausente o
inválido responde `401`; un rol insuficiente responde `403`.
