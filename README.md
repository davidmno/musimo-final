# musimo

musimo es una PWA social para escribir reseñas musicales, conservar momentos, crear listas y descubrir lanzamientos a través de la comunidad.

## Arquitectura

```text
Navegador / PWA
      │
      │ JSON + JWT por HTTPS
      ▼
Frontend: React + Vite
      │
      ▼
Backend: Node.js + Express
      │
      ├── MongoDB Atlas
      └── MusicBrainz + Cover Art Archive
```

El frontend nunca accede directamente a MongoDB. Todas las operaciones pasan por la API del backend.

## Estructura del repositorio

```text
musimo/
├── front/
│   ├── public/              # PWA, iconos y recursos estáticos
│   └── src/
│       ├── components/      # Componentes reutilizables
│       ├── context/         # Sesión del usuario
│       ├── hooks/           # Hooks propios
│       ├── pages/           # Pantallas de la aplicación
│       ├── routes/          # React Router
│       └── services/        # API, caché y utilidades de navegación
├── back/
│   ├── api/                 # Rutas y controladores HTTP
│   ├── config/              # MongoDB
│   ├── middlewares/         # JWT, roles y validación
│   ├── schemas/             # Esquemas Yup
│   ├── services/            # Reglas de negocio
│   ├── tests/               # Pruebas con node:test
│   └── utils/               # Utilidades compartidas
└── netlify.toml             # Configuración de publicación del frontend
```

## Requisitos

- Node.js 20.19 o posterior.
- npm.
- MongoDB local o Atlas.

## Desarrollo local

### Backend

```bash
cd back
cp .env.example .env
npm ci
npm run check
npm test
npm run dev
```

La API queda en `http://localhost:3333/api` y el control de salud en `http://localhost:3333/api/health`.

Variables obligatorias:

```env
DB_URL=mongodb+srv://...
DB_NAME=musimo
JWT_SECRET=una-clave-larga-y-aleatoria
FRONTEND_URL=http://localhost:5173
MUSICBRAINZ_USER_AGENT=musimo/1.0 (correo@ejemplo.com)
```

Para recuperación de contraseña por correo se usan `BREVO_API_KEY` y un `EMAIL_FROM` verificado en Brevo.

### Frontend

```bash
cd front
cp .env.example .env.local
npm ci
npm run check
npm run dev
```

Variable requerida:

```env
VITE_API_URL=http://localhost:3333/api
```

## Decisiones técnicas importantes

- Las rutas se cargan de manera diferida con `React.lazy` para reducir el JavaScript inicial.
- La API centraliza timeout, JWT y mensajes de error en `front/src/services/api.js`.
- El catálogo usa caché en memoria, navegador y MongoDB para reducir llamadas externas.
- La selección final de nuevos lanzamientos se guarda en caché después de validar las portadas, evitando repetir ese trabajo en cada visita a Inicio.
- MongoDB incluye índices para los listados y ordenamientos más frecuentes de reseñas, listas, seguidores, artistas seguidos y búsquedas recientes.
- La imagen representativa de un artista se resuelve con una única regla: portadas de sus lanzamientos ordenadas de la más reciente a la más antigua. El componente `ArtistImage` reutiliza esa regla en Buscar, búsquedas recientes, Perfil, Comunidad y detalle de artista.
- Si una portada falla, se prueba automáticamente la siguiente candidata.
- El backend limita las solicitudes a MusicBrainz para respetar su frecuencia de uso.
- Las contraseñas se almacenan con bcrypt y la sesión se protege con JWT.
- Las rutas privadas validan token; las administrativas validan además el rol.

## Publicación

- Frontend: Netlify, con base `front` y comando `npm run build`.
- Backend: Render, con comando `npm start`.
- Base de datos: MongoDB Atlas.

En Netlify, `VITE_API_URL` debe apuntar a la URL HTTPS del backend y terminar en `/api`. En Render, `FRONTEND_URL` debe incluir el dominio público del frontend.

## Verificación antes de publicar

```bash
cd front
npm run check

cd ../back
npm run check
npm test
```

También conviene recorrer manualmente: registro, login, recuperación de contraseña, búsqueda, artistas, lanzamientos, reseñas, listas, comentarios, resonancias, perfiles, comunidad, administración, PWA y página 404.
