# Musimo — Final de Aplicaciones Híbridas

Musimo es una aplicación web Full Stack de reseñas y curaduría musical. El proyecto está dividido en un **Backend API REST** y un **Frontend React**, con autenticación JWT, MongoDB, FrontOffice y BackOffice.

## Estructura

```txt
Parcial 2/
├── back/   # Node.js, Express, MongoDB, JWT y Yup
├── front/  # React, Vite, React Router y Context API
├── netlify.toml
└── README.md
```

## Funcionalidades

### FrontOffice

- Registro e inicio de sesión.
- Perfil editable y Top 5 personal.
- Búsqueda de álbumes con Last.fm.
- Ficha de álbum, canciones y reseñas.
- Lista personal «Por reseñar».
- CRUD completo de reseñas.
- CRUD completo de listas, con búsqueda y agregado de álbumes.
- Valoración privada: solo puede verla el autor o un administrador.

### BackOffice

- Ruta privada `/admin`.
- Acceso exclusivo para usuarios con rol `admin`.
- Listado de usuarios, reseñas y listas.
- Cambio de roles.
- Moderación y eliminación de contenido.
- Eliminación de usuarios.

## Seguridad y permisos

- Las contraseñas se almacenan cifradas con bcrypt.
- La autenticación utiliza JWT.
- Las rutas privadas validan el token.
- Solo el propietario o un administrador puede editar o eliminar una reseña o lista.
- Las credenciales y secretos se configuran mediante variables de entorno.

## Instalación local

### Backend

```bash
cd back
npm install
```

Copiar `back/.env.example` como `back/.env` y completar:

```env
PORT=3333
DB_URL=mongodb+srv://...
DB_NAME=musimo
JWT_SECRET=...
LASTFM_API_KEY=...
FRONTEND_URL=http://localhost:5173
ADMIN_EMAIL=admin@musimo.com
```

Iniciar:

```bash
npm run dev
```

Comprobar la API:

```txt
http://localhost:3333/api/health
```

### Frontend

```bash
cd front
npm install
npm run dev
```

En desarrollo se utiliza `front/.env.development`:

```env
VITE_API_URL=http://localhost:3333/api
```

## Crear el usuario administrador

1. Registrar normalmente la cuenta que será administradora.
2. Desde `back/`, ejecutar:

```bash
npm run make-admin -- correo@ejemplo.com
```

3. Recargar la aplicación o volver a iniciar sesión para actualizar el rol en el frontend.
4. Ingresar en `/admin`.

## Actualizar datos creados con la versión del parcial

Si la base ya contiene reseñas o listas antiguas sin identificador de propietario, ejecutar una vez:

```bash
cd back
npm run migrate:ownership
```

El script relaciona los registros anteriores con los usuarios existentes usando el nombre con el que fueron creados.

## Endpoints principales

### Sesión y usuarios

```txt
POST   /api/usuarios/register
POST   /api/usuarios/login
GET    /api/usuarios/me
PATCH  /api/usuarios/me/profile
GET    /api/usuarios                 admin
GET    /api/usuarios/:id             admin
PATCH  /api/usuarios/:id/rol         admin
DELETE /api/usuarios/:id             admin
```

### Reseñas

```txt
GET    /api/reviews                   autenticado
GET    /api/reviews/:id               autenticado
POST   /api/reviews                   autenticado
PUT    /api/reviews/:id               propietario o admin
DELETE /api/reviews/:id               propietario o admin
```

### Listas

```txt
GET    /api/lists
GET    /api/lists/:id
POST   /api/lists                     autenticado
PUT    /api/lists/:id                 propietario o admin
DELETE /api/lists/:id                 propietario o admin
```

### Catálogo externo

```txt
GET /api/lastfm/albums?q=...
GET /api/lastfm/album-info?artist=...&album=...
GET /api/lastfm/artist-albums?artist=...
GET /api/covers/resolve
```

## Preparación para deploy

### Backend en Render

- Root directory: `back`
- Build command: `npm install`
- Start command: `npm start`
- Cargar en el panel las variables de `back/.env.example`.
- En `FRONTEND_URL`, colocar la URL final de Netlify.

### Frontend en Netlify

El archivo `netlify.toml` configura el directorio `front`, el build de Vite y el fallback de SPA.

En Netlify se debe crear:

```env
VITE_API_URL=https://URL-DEL-BACKEND/api
```

El archivo `front/public/_redirects` evita errores 404 al recargar rutas internas de React Router.

## Importante

- No subir `back/.env` al repositorio.
- No colocar `DB_URL`, `JWT_SECRET` ni `LASTFM_API_KEY` en variables `VITE_`.
- `VITE_API_URL` no es un secreto: es la dirección pública de la API.
