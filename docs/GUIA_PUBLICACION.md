# Guía de publicación — musimo

## 1. Preparar una copia limpia

No trabajes sobre una carpeta que todavía contenga `node_modules` copiado de otra computadora.

1. Descomprimí el ZIP final.
2. Abrí la carpeta raíz, la que contiene `front`, `back` y `netlify.toml`.
3. Confirmá que no existan `.env` privados dentro del repositorio.
4. Usá Node 20.19 o posterior:

```bash
node --version
npm --version
```

## 2. Probar el backend localmente

```bash
cd back
cp .env.example .env
npm ci
npm run check
npm test
npm run dev
```

En Windows PowerShell, la copia puede hacerse con:

```powershell
Copy-Item .env.example .env
```

Completá `back/.env`:

```env
PORT=3333
DB_URL=mongodb+srv://USUARIO:CONTRASENA@CLUSTER/
DB_NAME=musimo
JWT_SECRET=UNA_CLAVE_LARGA_ALEATORIA
FRONTEND_URL=http://localhost:5173
MUSICBRAINZ_USER_AGENT=musimo/1.0 (tu-email@dominio.com)
CONTACT_EMAIL=tu-email@dominio.com
RESEND_API_KEY=
EMAIL_FROM=musimo <noreply@tu-dominio.com>
ADMIN_EMAIL=tu-cuenta@dominio.com
SEED_OWNER_EMAIL=tu-cuenta@dominio.com
SEED_OWNER_NAME=David
```

Abrí:

```text
http://localhost:3333/api/health
```

Debe responder con estado `ok` y base conectada.

## 3. Probar el frontend localmente

En una segunda terminal:

```bash
cd front
cp .env.example .env.local
npm ci
npm run lint
npm run dev
```

`front/.env.local`:

```env
VITE_API_URL=http://localhost:3333/api
```

Abrí `http://localhost:5173` y recorré, como mínimo:

1. registro;
2. inicio y cierre de sesión;
3. recuperación y cambio de contraseña;
4. inicio;
5. Descubrir;
6. artista y lanzamiento;
7. creación, edición y eliminación de reseña;
8. Momento público y privado;
9. estrellas;
10. creación, edición, reordenamiento y eliminación de lista;
11. seguir usuario y artista;
12. comentarios y Resonar;
13. notificaciones;
14. perfil y edición;
15. administración con una cuenta admin;
16. URL inexistente;
17. vista móvil y navegación inferior.

## 4. Generar el build

Con dependencias instaladas de forma limpia en la computadora actual:

```bash
cd front
npm run lint
npm run build
npm run preview
```

Abrí `http://localhost:4173` y repetí un recorrido breve. `dist/` es un resultado temporal: no hace falta subirlo a GitHub porque Netlify lo genera.

## 5. Preparar GitHub

### Repositorio existente

La forma más segura es copiar el contenido del ZIP sobre una copia actualizada de tu repositorio, sin reemplazar su carpeta `.git`.

```bash
git status
git pull --rebase origin main
git add .
git status
git commit -m "Preparar versión final PWA de musimo"
git push origin main
```

Antes de confirmar, revisá:

```bash
git diff --cached --stat
git ls-files | grep -E '(^|/)\.env($|\.)|node_modules|(^|/)dist/'
```

El segundo comando no debe mostrar secretos, dependencias ni builds.

### Repositorio nuevo

```bash
git init
git branch -M main
git add .
git commit -m "Versión final de musimo"
git remote add origin URL_DE_TU_REPOSITORIO
git push -u origin main
```

## 6. Publicar primero el backend

Usá un proveedor que ejecute Node y permita variables de entorno y MongoDB. Configuración general:

- directorio raíz: `back`;
- instalación: `npm ci`;
- inicio: `npm start`;
- versión de Node: 20.19 o posterior;
- health check: `/api/health`.

Cargá todas las variables de `back/.env.example`. En producción:

```env
NODE_ENV=production
FRONTEND_URL=https://musimo.netlify.app
JWT_SECRET=una-clave-distinta-larga-y-aleatoria
```

No incluyas `/` al final de `FRONTEND_URL`. El backend también admite varios orígenes separados por comas si necesitás conservar una URL de preview.

Cuando termine, comprobá:

```text
https://TU-API/api/health
```

## 7. Actualizar Netlify

El repositorio contiene `netlify.toml`, por lo que las opciones esperadas son:

- base: `front`;
- build: `npm run build`;
- publicación: `dist`;
- Node: `20.19.0`.

En **Site configuration → Environment variables**, cargá:

```env
VITE_API_URL=https://TU-API/api
```

No agregues JWT, contraseñas, claves de MongoDB ni claves de Resend a Netlify para el frontend.

Si el sitio existente ya está conectado al repositorio, hacer push a la rama de producción debe iniciar el deploy. También podés usar **Deploys → Trigger deploy → Clear cache and deploy site** para la primera publicación de esta versión.

## 8. Comprobar rutas en producción

Probá primero una navegación normal y después pegá cada URL directamente en una pestaña nueva o recargala con `Ctrl+F5`:

```text
https://musimo.netlify.app/iniciar-sesion
https://musimo.netlify.app/inicio
https://musimo.netlify.app/buscar
https://musimo.netlify.app/comunidad
https://musimo.netlify.app/perfil
https://musimo.netlify.app/una-ruta-que-no-existe
```

Las rutas válidas deben cargar React, no el 404 de Netlify. La última debe mostrar el 404 diseñado dentro de musimo.

## 9. Comprobar la PWA

### Chrome o Edge de escritorio

1. Abrí el sitio mediante HTTPS.
2. DevTools → Application → Manifest.
3. Confirmá nombre, iconos y ausencia de errores de instalación.
4. Application → Service Workers: el worker debe estar activo para `/`.
5. Instalá desde el icono de la barra de direcciones.
6. Abrí la versión instalada y verificá que no tenga la interfaz del navegador.
7. En DevTools, activá Offline y recargá: debe aparecer la carcasa o la página offline, nunca datos privados inventados.

### Android

1. Abrí el sitio en Chrome.
2. Menú → **Instalar aplicación** o **Agregar a pantalla principal**.
3. Abrí el icono instalado.
4. Probá login, navegación inferior y al menos una acción real conectada.

### iPhone/iPad

1. Abrí el sitio en Safari.
2. Compartir → **Agregar a inicio**.
3. Confirmá nombre e icono.
4. Abrí desde la pantalla de inicio.
5. Probá navegación, teclado, safe areas y scroll.

## 10. Verificar la actualización de una PWA ya instalada

1. Publicá una modificación.
2. Cerrá por completo la PWA instalada y volvé a abrirla con conexión.
3. La navegación utiliza red primero, por lo que debe recibir el HTML actual y sus assets con hash nuevo.
4. Cuando existe un service worker nuevo en espera, musimo muestra **“Hay una nueva versión”**. Elegí **Actualizar ahora**.
5. Al cambiar de forma importante `front/public/sw.js`, aumentá `VERSION`, por ejemplo de `v2` a `v3`.

Para una comprobación extrema en un dispositivo de prueba:

- desinstalá la PWA;
- borrá los datos del sitio en el navegador;
- abrí de nuevo `https://musimo.netlify.app`;
- instalala otra vez.

Ese borrado no debe ser el procedimiento normal para los docentes; se usa sólo para diagnosticar una caché previa problemática.

## 11. Checklist final de defensa

- [ ] API `/api/health` en verde.
- [ ] Netlify terminó el build sin errores.
- [ ] `VITE_API_URL` apunta a HTTPS y termina en `/api`.
- [ ] `FRONTEND_URL` del backend coincide con Netlify.
- [ ] Registro, login y logout probados.
- [ ] Dos cuentas de prueba listas.
- [ ] Crear/editar/eliminar reseña probado.
- [ ] Crear/editar/eliminar lista probado.
- [ ] Búsqueda y catálogo responden.
- [ ] Recargas directas no generan 404 de Netlify.
- [ ] 404 interno visible en una ruta inválida.
- [ ] Instalación Android o escritorio probada.
- [ ] Instalación Safari/iPhone probada si hay un dispositivo disponible.
- [ ] QR apunta a `https://musimo.netlify.app/`.
- [ ] No hay `.env`, claves ni tokens en GitHub.
- [ ] Hay una copia local de la versión publicada.
