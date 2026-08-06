# Resumen para estudiar el código de musimo

Este documento describe la versión real entregada. No incluye funciones que sólo aparecieron en ideas o historias de usuario.

## 1. Arquitectura general

musimo está separado en dos aplicaciones:

```text
Navegador / PWA
      │
      │ fetch JSON + JWT
      ▼
Frontend React + Vite
      │
      │ HTTPS /api
      ▼
Backend Express
      │
      ├── MongoDB: usuarios, reseñas, listas, comentarios, follows y avisos
      └── Catálogo neutral: MusicBrainz y Cover Art Archive con caché/fallback
```

El frontend nunca se conecta directamente a MongoDB. Toda lectura o modificación persistente pasa por la API.

## 2. Carpetas del frontend

### `front/src/pages`

Cada archivo representa una pantalla:

- `home.jsx`: portada interna con lanzamientos, historias, listas, Por reseñar y sugerencias.
- `search.jsx`: búsqueda unificada y búsquedas recientes.
- `artist-detail.jsx`: artista, seguimiento y discografía.
- `album-detail.jsx`: lanzamiento, canciones, reseñas y acciones.
- `reviews.jsx`: formulario para crear o editar una reseña.
- `review-detail.jsx`: detalle, editar/eliminar, comentarios y Resonar.
- `release-reviews.jsx`: reseñas asociadas a un lanzamiento.
- `lists.jsx`: listado propio/comunitario y apertura del editor.
- `list-detail.jsx`: detalle, compartir, editar/eliminar, comentarios y Resonar.
- `profile.jsx`: redirección o acceso al perfil propio.
- `public-profile.jsx`: perfil único por handle, pestañas y edición cuando es propio.
- `feed.jsx`: Comunidad, filtros, audiencia y paginación.
- `notifications.jsx`: centro completo de avisos.
- `admin.jsx`: usuarios, roles y eliminación protegida.
- `login.jsx`, `register.jsx`, `forgot-password.jsx`, `reset-password.jsx`: autenticación.
- `notfound.jsx`: 404 interno.

### `front/src/components`

Componentes reutilizables importantes:

- `navbar.jsx`: navegación de escritorio, cabecera móvil, tab bar, creación y notificaciones.
- `page-header.jsx`: breadcrumb, `h1`, subtítulo y acción de página.
- `content-cards.jsx`: `ReleaseCard`, `ReviewCard`, `ListCard` y `Avatar`.
- `list-form.jsx`: creación/edición de listas y orden de lanzamientos.
- `comments.jsx`: publicar, editar, eliminar y resonar comentarios.
- `confirm-dialog.jsx`: confirmación accesible y reutilizable.
- `bottom-sheet.jsx`: hoja inferior móvil con control de foco.
- `action-sheet.jsx`: menú contextual de acciones.
- `protected-route.jsx`: impide entrar sin token.
- `admin-route.jsx`: además exige rol `admin`.
- `pwa-update-notice.jsx`: aplica un service worker nuevo.
- `app-icon.jsx`: capa común sobre Lucide.

### `front/src/services`

Los servicios separan la interfaz de las solicitudes HTTP:

- `api.js`: función común `apiRequest`.
- `usuarios.service.js`: registro, login, perfil, contraseña, follows y administración.
- `reviews.service.js`: CRUD, comentarios y Resonar de reseñas.
- `lists.service.js`: CRUD, comentarios y Resonar de listas.
- `community.service.js`: inicio, feed, avisos, artistas seguidos y comentarios.
- `catalog.service.js`: búsqueda y detalle del catálogo con caché de memoria/sesión.
- `to-review.service.js`: Por reseñar.
- `recent-searches.service.js`: historial de búsqueda.
- `album-link.service.js` y `artist-link.service.js`: generan URLs amigables y fallbacks por ID.
- `pwa.service.js`: registro y actualización del service worker.

### `front/src/context`

`AuthProvider` mantiene `usuario` y `token`, los sincroniza con `localStorage` y expone:

- `login(data)`;
- `logout()`;
- `updateUsuario(data)`;
- `refreshUsuario()`.

`use-auth.js` es el hook que consume ese contexto.

### Estilos

- `styles.css`: estilos históricos todavía necesarios.
- `design-system.css`: capa canónica de marca y componentes.
- `responsive-system.css`: reorganización para tablet y móvil.
- `mobile-polish.css`: ajustes finales específicos de teléfono.

Se importan en ese orden; la última capa puede corregir reglas anteriores sin romper pantallas existentes.

## 3. Navegación

`front/src/routes/router.jsx` usa `BrowserRouter`.

Flujo:

1. El usuario cambia de URL mediante `Link`, `NavLink` o `navigate`.
2. React Router busca la ruta.
3. Las pantallas privadas están envueltas por `ProtectedRoute`.
4. Si no hay token, se redirige a `/iniciar-sesion` y se guarda la URL original.
5. Al iniciar sesión, el formulario vuelve a esa URL.
6. Las rutas antiguas en inglés se traducen con `LegacyRedirect`.
7. Cualquier ruta no reconocida llega a `NotFound`.

Netlify siempre entrega `index.html`; después React Router decide qué pantalla mostrar. Por eso una recarga en `/buscar` funciona.

## 4. Autenticación

### Registro

1. `register.jsx` toma nombre, email y contraseña.
2. Llama a `registrarUsuario`.
3. El servicio hace `POST /usuarios/register`.
4. El backend valida con `registerSchema`.
5. `usuarios.services.js` hashea la contraseña con bcrypt y crea el usuario.
6. El controlador devuelve usuario y JWT.
7. `AuthProvider.login` guarda ambos y React navega al inicio.

### Login

1. `login.jsx` llama a `loginUsuario`.
2. La API busca el email y compara la contraseña con bcrypt.
3. Si coincide, firma un JWT.
4. El frontend lo guarda y `apiRequest` lo envía como `Authorization: Bearer ...`.

### Protección

`middlewares/token.validate.js` verifica firma y vigencia del JWT. `role.validate.js` agrega la comprobación de rol para administración.

### Recuperación

- `/usuarios/forgot-password` crea un token de un solo uso con vencimiento.
- MongoDB tiene un índice TTL para eliminar tokens vencidos.
- Si Resend está configurado, se envía el enlace por email.
- `/usuarios/reset-password` valida el token y guarda el nuevo hash.

## 5. Conexión frontend-backend

Toda petición usa:

```js
apiRequest("/ruta", {
  method: "POST",
  body: JSON.stringify(datos),
});
```

`apiRequest`:

1. arma la URL con `VITE_API_URL`;
2. recupera el JWT de `localStorage`;
3. agrega headers;
4. crea un `AbortController` y timeout;
5. ejecuta `fetch`;
6. convierte JSON;
7. transforma errores HTTP en objetos con `status` y detalles;
8. entrega datos a la página.

El backend monta todas las rutas debajo de `/api` en `back/main.js`.

## 6. Reseñas: crear, editar y eliminar

### Crear

1. Desde un lanzamiento se navega a `/resenas?nueva=1&lanzamiento=...`.
2. `reviews.jsx` carga datos del lanzamiento en el formulario.
3. El usuario completa texto, estrellas, significados y Momento.
4. `createReview` envía `POST /reviews`.
5. El backend valida con `reviewSchema`.
6. El servicio guarda en `reviews` con `userId`, autor y fechas.
7. Si el lanzamiento estaba en Por reseñar, la lógica lo elimina.
8. El frontend navega al detalle de la reseña.

### Editar

1. El detalle verifica `canManage`.
2. Navega al formulario con `editar=ID`.
3. `reviews.jsx` carga la reseña previa.
4. `updateReview` hace `PUT /reviews/:id`.
5. El backend vuelve a validar y comprueba autoría o rol admin.

### Eliminar

1. Se abre `ConfirmDialog`.
2. Sólo al confirmar se ejecuta `DELETE /reviews/:id`.
3. El backend verifica permisos y elimina también datos relacionados cuando corresponde.
4. El frontend redirige y muestra estado.

### Privacidad

`review-visibility.js` filtra datos según quién consulta:

- el autor conserva valoración y Momento;
- terceros nunca reciben la valoración personal;
- terceros reciben el Momento sólo si es público.

Este comportamiento está cubierto por tres pruebas unitarias.

## 7. Listas

`ListForm` administra:

- título;
- descripción;
- visibilidad pública/privada;
- lanzamientos incluidos;
- orden del array `albums`.

Crear usa `POST /lists`; editar usa `PUT /lists/:id`; eliminar usa `DELETE /lists/:id`. El backend valida con `listSchema`, limita 100 lanzamientos y verifica propietario o admin.

Las listas públicas aparecen en Comunidad y búsqueda. Una privada sólo es visible para su dueño o un administrador.

## 8. Búsqueda y catálogo

`search.jsx` espera al menos dos caracteres y demora 450 ms para no pedir en cada tecla. Ejecuta en paralelo:

- `searchCatalog`: artistas y lanzamientos;
- `searchCommunity`: usuarios y listas.

El resultado se filtra por Todo, Lanzamientos, Artistas, Usuarios o Listas. El historial se persiste por usuario.

`catalog.service.js` tiene tres defensas:

1. caché en memoria;
2. caché en `sessionStorage` con vencimiento;
3. deduplicación de solicitudes idénticas en curso.

El backend encapsula al proveedor en `catalog.services.js`, normaliza nombres, tipos, imágenes, fechas y IDs, y evita que la interfaz dependa de la forma original de MusicBrainz.

## 9. Comunidad, seguimiento y notificaciones

- `follows`: relación usuario → usuario.
- `artist_follows`: relación usuario → artista.
- `resonances`: relación usuario → reseña/lista/comentario.
- `comments`: comentarios asociados por `targetType` y `targetId`.
- `notifications`: avisos privados para follow, comentario y resonancia.

`feed.jsx` solicita `/feed` con tipo, audiencia, página y límite. La API devuelve publicaciones y metadatos de paginación.

La campana del `Navbar` consulta avisos cada 30 segundos, muestra hasta cuatro en escritorio y lleva al centro completo en móvil.

## 10. PWA

### Manifest

`front/public/manifest.webmanifest` define identidad, iconos, colores, `start_url`, `scope`, modo standalone y shortcuts.

### Registro

`main.jsx` llama a `registerPwa()`. Sólo se registra en producción y después del evento `load`.

### Service worker

`front/public/sw.js`:

- precarga carcasa, offline, manifest, iconos y recursos esenciales;
- usa red primero para navegaciones;
- usa caché primero para scripts, CSS, fuentes e imágenes del mismo origen;
- ignora `/api`, autorización, otros orígenes y métodos de escritura;
- elimina cachés de versiones viejas.

### Actualización

Cuando el navegador instala una versión nueva y la deja esperando, el servicio dispara `musimo:pwa-update`. `PwaUpdateNotice` permite aplicar `SKIP_WAITING` y recarga cuando cambia el controlador.

## 11. Backend por capas

Una solicitud típica pasa por:

```text
route → middleware → controller → service → MongoDB
```

- **route**: URL y método.
- **middleware**: token, rol o validación.
- **controller**: traduce HTTP a parámetros y respuesta.
- **service**: regla de negocio y consultas.
- **schema**: forma válida del dato.
- **utils**: funciones compartidas.

Ejemplo de reseña:

```text
POST /api/reviews
→ validateToken
→ validateSchema(reviewSchema)
→ createReview controller
→ reviews service
→ colección reviews
```

## 12. Funciones que conviene saber explicar en la defensa

### `apiRequest`

Es el punto único de comunicación. Evita repetir URL, token, parseo y manejo de errores en cada pantalla.

### `ProtectedRoute`

No “protege” la base por sí solo; mejora la navegación del frontend. La protección real se repite en el backend con `validateToken`.

### `AuthProvider`

Centraliza sesión para que Navbar, rutas y páginas vean el mismo usuario sin pasar props por todo el árbol.

### `searchCatalog` y `cachedRequest`

Evitan solicitudes repetidas y mejoran búsqueda sin incorporar una librería extra.

### `createReview` / `updateReview` / `deleteReview`

El frontend sólo inicia la acción. El backend valida contenido, identidad y permisos antes de modificar MongoDB.

### `sanitizeReviewForViewer`

Es la regla que cumple la privacidad de valoración y Momento según el usuario que mira.

### `ConfirmDialog`

Es un componente compartido. Controla confirmación, teclado, foco y estado ocupado, en lugar de repetir `window.confirm`.

### `registerPwa` y el evento `SKIP_WAITING`

Separan instalar una nueva versión de aplicarla. Así la actualización no cambia la app en mitad de una tarea sin informar.

## 13. Preguntas probables y respuestas breves

**¿Por qué React Router necesita una redirección en Netlify?**  
Porque la URL la interpreta primero el servidor. Netlify debe entregar `index.html`; después React Router resuelve la pantalla.

**¿Dónde se valida una reseña?**  
En el backend con Yup. Los atributos del formulario ayudan al usuario, pero la API es la autoridad.

**¿Cómo sabe el backend quién puede editar?**  
El JWT identifica al usuario y el service compara su ID con el propietario; un admin tiene una excepción controlada.

**¿Por qué hay services en el frontend?**  
Para que las páginas manejen interfaz y estado, mientras los services concentran las llamadas a la API.

**¿Qué se guarda offline?**  
Sólo carcasa y recursos estáticos. Las respuestas autenticadas y operaciones dinámicas no se cachean.

**¿Qué diferencia hay entre `PUT`, `PATCH` y `DELETE` en el proyecto?**  
`PUT` reemplaza el conjunto editable de una reseña o lista; `PATCH` modifica una parte, como rol, perfil o lectura; `DELETE` elimina.

**¿Qué es un middleware?**  
Una función que corre antes del controlador. En musimo verifica token, rol o esquema.

**¿Por qué el token en frontend no alcanza para seguridad?**  
Porque el usuario puede modificar el frontend. Cada permiso se vuelve a validar en la API.
