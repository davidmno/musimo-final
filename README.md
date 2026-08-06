# musimo

musimo es una red social y bitácora musical para escribir reseñas, conservar recuerdos y descubrir música a través de otras personas. Esta entrega mantiene la identidad definida para la tesis —música, significado y momentos— y prepara la aplicación para publicación como PWA.

## Estructura

```text
musimo/
├── front/                  # React 19 + React Router + Vite
│   ├── public/             # Manifest, service worker, iconos y recursos estáticos
│   └── src/                # Páginas, componentes, contexto, servicios y estilos
├── back/                   # Node.js + Express + MongoDB
│   ├── api/                # Rutas y controladores HTTP
│   ├── services/           # Reglas de negocio y acceso a datos
│   ├── schemas/            # Validaciones Yup
│   ├── middlewares/        # JWT, roles y validación
│   └── tests/              # Pruebas unitarias con node:test
├── docs/                   # Informe, publicación, estudio, diseño y verificación
└── netlify.toml            # Build, redirecciones y cabeceras de Netlify
```

## Requisitos

- Node.js 20.19 o posterior.
- npm.
- MongoDB local o MongoDB Atlas.
- Una URL HTTPS pública para el backend al publicar el frontend.

## Inicio local

### Backend

```bash
cd back
cp .env.example .env
npm ci
npm run check
npm test
npm run dev
```

Completá `back/.env` antes de iniciar. La API queda, por defecto, en `http://localhost:3333/api` y su control de salud en `http://localhost:3333/api/health`.

### Frontend

En otra terminal:

```bash
cd front
cp .env.example .env.local
npm ci
npm run lint
npm run dev
```

La aplicación queda, por defecto, en `http://localhost:5173`.

## Variables de entorno

### Frontend

```env
VITE_API_URL=http://localhost:3333/api
```

En Netlify debe apuntar a la API pública HTTPS, siempre terminada en `/api`.

### Backend

Las variables disponibles están documentadas en `back/.env.example`. Las obligatorias para iniciar son:

```env
PORT=3333
DB_URL=mongodb+srv://...
DB_NAME=musimo
JWT_SECRET=una-clave-larga-y-aleatoria
FRONTEND_URL=http://localhost:5173
MUSICBRAINZ_USER_AGENT=musimo/1.0 (contacto@ejemplo.com)
CONTACT_EMAIL=contacto@ejemplo.com
```

`RESEND_API_KEY` y `EMAIL_FROM` habilitan el envío real de correos de recuperación. Ningún secreto debe guardarse en variables que comiencen con `VITE_`, porque esas variables se incorporan al frontend.

## Verificación

```bash
cd front
npm run lint
npm run build

cd ../back
npm run check
npm test
```

En esta revisión se validaron el lint del frontend, la sintaxis del backend, las once pruebas existentes, los JSON, el CSS, el service worker y las dimensiones de los iconos. La recompilación de producción debe ejecutarse después de un `npm ci` limpio en el sistema de destino; ver la limitación técnica detallada en `docs/INFORME_CAMBIOS.md`.


## Cambios de esta versión

- Botón **Instalar app** prominente en la landing, con instalación nativa cuando está disponible e instrucciones específicas para iPhone/iPad.
- Iconos PWA regenerados desde la identidad blanca elegida para celulares.
- Búsqueda de artistas separada de la búsqueda de lanzamientos.
- Reutilización de la discografía individual del artista para completar resultados en Descubrir y Nueva lista.
- Eliminación de solicitudes de discografía por cada tarjeta de artista, reduciendo la cola de consultas externas.

## Publicación

El repositorio incluye `netlify.toml` y `front/public/_redirects`. Netlify debe:

- tomar `front` como base;
- ejecutar `npm run build`;
- publicar `front/dist`;
- recibir `VITE_API_URL` como variable de entorno.

Publicá primero el backend y configurá allí `FRONTEND_URL=https://musimo.netlify.app`. Después desplegá el frontend.

## Documentación de esta entrega

- [Informe de cambios](docs/INFORME_CAMBIOS.md)
- [Guía de publicación](docs/GUIA_PUBLICACION.md)
- [Resumen para estudiar el código](docs/RESUMEN_CODIGO.md)
- [Sistema de diseño](docs/SISTEMA_DISENO.md)
- [Verificación final](docs/VERIFICACION_FINAL.md)
- [Publicar mañana](docs/PASOS_PUBLICAR_MANANA.md)
- [Informe PWA y búsqueda](docs/INFORME_PWA_Y_BUSQUEDA.md)

## Seguridad y privacidad implementadas

- Las contraseñas se procesan con bcrypt en el backend.
- Las rutas privadas exigen JWT y las administrativas también verifican el rol.
- La API valida la autoría antes de editar o eliminar contenido.
- El Momento privado y la valoración personal se filtran para terceros.
- Las listas privadas sólo se entregan a su propietario o a un administrador.
- El service worker no intercepta solicitudes de API, solicitudes autenticadas ni operaciones que no sean `GET`.
- El ZIP de entrega no incluye `.env`, `node_modules`, `dist`, `.git`, logs ni cachés.
