# Publicar musimo mañana — pasos rápidos

Este ZIP está preparado para reemplazar el contenido del repositorio actual sin copiar dependencias, builds ni secretos.

## 1. Reemplazar los archivos del repositorio

1. Descomprimí este ZIP en una carpeta nueva.
2. Abrí tu carpeta del repositorio de GitHub, la que contiene la carpeta oculta `.git`.
3. Copiá dentro de esa carpeta todo el contenido de este ZIP y aceptá reemplazar los archivos.
4. No borres ni reemplaces la carpeta `.git` del repositorio existente.

## 2. Verificación rápida en Git Bash

Desde la raíz, donde están `front`, `back` y `netlify.toml`:

```bash
git status

cd front
npm ci
npm run lint
VITE_API_URL="https://URL-DE-TU-BACKEND/api" npm run build
cd ..

cd back
npm ci
npm run check
npm test
cd ..
```

En Windows, si ya tenés `front/.env.local` con `VITE_API_URL`, el build puede ejecutarse simplemente con `npm run build`.

## 3. Commit y push

```bash
git add .
git status
git commit -m "Preparar PWA y mejorar búsqueda de artistas"
git push origin main
```

Si tu rama de producción no se llama `main`, reemplazala por el nombre que muestre:

```bash
git branch --show-current
```

## 4. Netlify

El archivo `netlify.toml` ya indica:

- base: `front`;
- comando: `npm run build`;
- publicación: `dist`;
- Node: `20.19.0`.

En Netlify revisá una sola vez:

**Project configuration → Environment variables**

```env
VITE_API_URL=https://URL-DE-TU-BACKEND/api
```

Si `musimo.netlify.app` está conectado a ese repositorio, el push inicia el deploy automáticamente. Esperá a que figure **Published**.

## 5. El backend también cambió

La mejora de búsqueda está en `back/services/catalog.services.js`. Por eso el backend público debe recibir el mismo push.

- Si Render, Railway u otro proveedor ya está conectado al mismo repositorio y usa `back` como directorio raíz, debería desplegarse automáticamente.
- Si no está conectado, ejecutá un deploy manual desde el panel de ese proveedor.
- En producción, el backend debe tener:

```env
FRONTEND_URL=https://musimo.netlify.app
NODE_ENV=production
```

Comprobá su estado en:

```text
https://URL-DE-TU-BACKEND/api/health
```

## 6. Prueba de cinco minutos

1. Abrí `https://musimo.netlify.app/` en una ventana privada.
2. Confirmá que **Instalar app** se vea más prominente que **Entrar**.
3. Instalá en Chrome/Edge o seguí las instrucciones de Safari en iPhone.
4. Iniciá sesión.
5. Buscá `Kylie Minogue`, `Tame Impala`, `Ariana Grande` y `Björk` en Descubrir.
6. Creá una lista y repetí una búsqueda por artista dentro del selector de lanzamientos.
7. Recargá directamente `/buscar`, `/comunidad` y una URL inventada. La última debe mostrar el 404 de musimo.

## 7. Si Netlify no se actualiza

En el panel de Netlify:

**Deploys → Trigger deploy → Clear cache and deploy site**

Esto no cambia la URL. El QR que apunte a `https://musimo.netlify.app/` seguirá funcionando.
