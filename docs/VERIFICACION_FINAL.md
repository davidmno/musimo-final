# Verificación final — musimo PWA y catálogo

**Fecha:** 6 de agosto de 2026 (Argentina).

## Resultado de controles automáticos

| Control | Resultado |
|---|---|
| Lint del frontend | Aprobado, sin errores ni advertencias |
| Sintaxis del backend | Aprobada |
| Pruebas del backend | 11 de 11 aprobadas |
| Manifest | JSON válido |
| Service worker | Sintaxis válida y versión `v3` |
| Iconos PWA | 192, 512, maskable 192/512 y Apple 180 correctos |
| 404 interno | Ruta comodín y pantalla controlada presentes |
| Rutas SPA en Netlify | `_redirects` y redirect de `netlify.toml` presentes |
| Secretos en la entrega limpia | `.env` excluidos |
| Dependencias y builds en la entrega limpia | `node_modules` y `dist` excluidos |

## Controles del catálogo

Las pruebas agregadas verifican que:

- la coincidencia exacta de artista se prioriza;
- una consulta claramente asociada a un artista puede expandirse con su discografía;
- una consulta ambigua de una palabra no se confunde automáticamente con un artista cuando existe un lanzamiento de título exacto.

## Build de producción

El código JSX fue validado por ESLint. El build de Vite no pudo completarse dentro del contenedor Linux porque el ZIP de origen incluía `node_modules` instalado en Windows y no el binding Linux de Rolldown.

La entrega final no contiene esa carpeta. En la computadora del usuario y en Netlify debe realizarse una instalación limpia:

```bash
cd front
npm ci
npm run lint
npm run build
```

Netlify instala dependencias para Linux durante el deploy, por lo que no reutiliza el binding de Windows del ZIP original.

## Controles que requieren los servicios públicos

Deben probarse después del deploy:

- conexión con MongoDB y autenticación;
- respuesta del backend público en `/api/health`;
- búsqueda real contra MusicBrainz;
- instalación física en Android, escritorio e iPhone/iPad;
- actualización automática de `https://musimo.netlify.app/` desde GitHub.

El recorrido corto está en `PASOS_PUBLICAR_MANANA.md`.
