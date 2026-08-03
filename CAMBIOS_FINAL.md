# Cambios realizados para el examen final

## Backend

- Agregado `GET /api/reviews/:id` y `GET /api/lists/:id`.
- Agregados permisos de propietario para reseñas y listas.
- Agregado middleware de roles.
- Agregada administración de usuarios y roles.
- Agregado script para promover una cuenta a administrador.
- La valoración de una reseña se oculta para otros usuarios.
- Agregado endpoint de salud `/api/health`.
- CORS configurable mediante `FRONTEND_URL`.
- Servidor preparado para utilizar el puerto asignado por el host.

## Frontend

- Agregado BackOffice en `/admin`.
- Agregada ruta exclusiva para administradores.
- CRUD completo de listas desde la interfaz.
- Búsqueda de álbumes con Last.fm dentro del formulario de listas.
- Controles de edición y eliminación visibles solo para propietario o administrador.
- Detalle de reseña conectado a un endpoint individual.
- URL de API configurable mediante `VITE_API_URL`.
- Configuración SPA para Netlify.

## Apariencia

La identidad visual y la estructura principal de Musimo se conservaron. Los cambios visibles se limitan a controles funcionales de listas, mensajes de estado y el panel de administración.
