# Informe de cambios — Tesis Iteración 05

## Alcance

Se revisó la versión entregada de musimo desde cuatro frentes: estabilidad funcional, consistencia UX/UI, preparación para PWA y limpieza técnica. Se mantuvieron React, Vite, Express y MongoDB; no se migró de framework ni se reemplazaron funciones reales por simulaciones.

La revisión fue deliberadamente conservadora. Se centralizaron decisiones repetidas y se corrigieron problemas de alto impacto sin reescribir de forma masiva las páginas que ya funcionaban.

## Problemas principales encontrados

1. La identidad visual estaba distribuida entre varias capas de CSS con valores oscuros y colores de acción casi iguales, pero no idénticos.
2. Había botones equivalentes con alturas, bordes, colores y jerarquías diferentes. La acción destructiva todavía utilizaba rojo en algunos componentes.
3. La página 404 no contemplaba correctamente el estado sin sesión y tenía una presentación genérica.
4. Los cuadros de confirmación no administraban por completo el foco, Escape ni la restauración del scroll. La administración todavía usaba una confirmación nativa del navegador.
5. Los formularios de autenticación tenían diferencias de estructura y atributos incompletos para autocompletado, estados ocupados y navegación asistida.
6. La capa HTTP no tenía timeout propio ni mensajes claros para caída de red o solicitudes canceladas.
7. La PWA existente tenía colores que no correspondían a la marca, ruta inicial heredada, un mismo icono declarado como normal y maskable, caché demasiado general y actualización inmediata sin decisión del usuario.
8. Había dependencias declaradas que no se importaban, un componente de búsqueda rápida sin referencias, imágenes demo sin uso, documentación vieja de iteraciones anteriores y un `.env` privado dentro del proyecto original.
9. La configuración de Netlify sólo resolvía la redirección SPA; faltaban políticas específicas para actualizar el service worker y el manifest.
10. Los errores 500 podían exponer detalles internos en producción.

## Cambios realizados

### 1. Identidad y sistema visual

Se consolidaron tokens canónicos en `front/src/design-system.css` y se alineó la capa histórica de `front/src/styles.css`:

- fondo general: `#151411`;
- texto claro principal: `#FFF8F5`;
- color principal: `#C0451B`;
- color secundario: `#8D619F`;
- superficie clara de contraste: `#E8E6E3`;
- Fraunces para `h1` y `h2`;
- Inter para interfaz, párrafos, formularios y controles.

También se definieron escalas reutilizables de espacios, radios, sombras, anchos y alturas. La capa `design-system.css`, cargada al final, funciona como fuente visual canónica mientras conserva compatibilidad con estilos históricos todavía usados.

### 2. Botones y acciones

Se unificaron las variantes:

- `btn-primary`: acción principal en naranja musimo;
- `btn-secondary`: acción complementaria en violeta o borde violeta;
- `btn-tertiary` / `btn-ghost`: cancelar, cerrar y acciones de bajo énfasis;
- `btn-danger`: acción destructiva violeta, nunca rojo de alerta;
- `btn-sm`: variante compacta, con área táctil mínima de 44 px en móvil;
- estados `hover`, `focus-visible`, `active`, `disabled` y `aria-busy`.

“Editar reseña” quedó en la misma familia visual que “Escribir reseña”. “Eliminar” conserva texto explícito, confirmación previa y una jerarquía destructiva, pero utiliza `#8D619F`.

Se agregaron tipos explícitos a los botones para impedir envíos involuntarios de formularios y se marcaron como `submit` los controles que sí publican datos.

### 3. Encabezados, espaciado y componentes

`PageHeader` y `PageTrail` continúan siendo el patrón para las páginas principales. El sistema canónico fija:

- ancho máximo de contenido;
- altura y separación del encabezado;
- margen entre título, subtítulo y contenido;
- separación de secciones y cards;
- composición de escritorio y adaptación móvil.

Se preservaron `ReleaseCard`, `ReviewCard`, `ListCard` y `Avatar` como componentes compartidos, evitando resolver estilos equivalentes de forma aislada en cada pantalla.

### 4. Página 404 y rutas

Se reconstruyó `front/src/pages/notfound.jsx` con identidad musimo, mensaje cercano, código 404, acción primaria para volver y acceso a Descubrir cuando existe sesión.

También se corrigieron:

- título de documento según la ruta;
- desplazamiento al inicio al cambiar de pantalla;
- conservación de `pathname`, query y hash al redirigir al login;
- rutas canónicas en español;
- compatibilidad con URLs heredadas en inglés;
- fallback SPA tanto en `netlify.toml` como en `front/public/_redirects`.

### 5. Accesibilidad

Se mejoraron:

- foco visible global;
- reducción de animaciones cuando el sistema solicita menos movimiento;
- semántica de iconos decorativos e informativos;
- nombres accesibles de botones sólo con icono;
- asociación entre títulos, descripciones y diálogos;
- trampa de foco, Escape, bloqueo de scroll y restauración de foco en confirmaciones y bottom sheets;
- `autocomplete`, `inputMode`, `aria-busy` y estados comprensibles en autenticación;
- áreas táctiles móviles;
- señales de error y éxito que no dependen sólo del color.

No se agregaron roles ARIA cuando un elemento HTML nativo ya resolvía la semántica.

### 6. Administración y confirmaciones

`front/src/pages/admin.jsx` dejó de depender de `window.confirm`. Ahora utiliza `ConfirmDialog`, el mismo patrón accesible que reseñas, listas, comentarios y perfil. Los botones Ver, Editar y Eliminar respetan la jerarquía común.

### 7. Capa HTTP y manejo de errores

`front/src/services/api.js` ahora:

- toma `VITE_API_URL` y falla de forma explícita en producción si falta;
- agrega JWT sólo cuando existe;
- respeta `FormData` sin forzar un `Content-Type` incorrecto;
- limita cada solicitud a 15 segundos;
- integra señales externas de cancelación;
- distingue timeout, cancelación, error HTTP y caída de red;
- conserva `status`, detalles, código y `retryAfter` cuando la API los envía.

En `back/main.js`, los errores 500 de producción devuelven un mensaje genérico y dejan el detalle sólo en el log del servidor.

### 8. PWA

Se implementó una configuración completa y conservadora:

- `manifest.webmanifest` con nombre, descripción, idioma, alcance, ruta inicial, colores de marca, categorías y shortcuts;
- iconos separados `any` y `maskable` en 192 y 512 px;
- `apple-touch-icon.png` de 180 px;
- metadatos Android/iOS en `index.html`;
- `display: standalone` sin restringir la orientación del dispositivo;
- registro del service worker sólo en producción;
- comprobación periódica de actualizaciones y al volver a la aplicación;
- aviso “Actualizar ahora / Más tarde” cuando hay un worker en espera;
- limpieza de cachés de versiones anteriores;
- navegación `network first`;
- recursos estáticos del mismo origen `cache first`;
- exclusión de API, autorización, otros orígenes y métodos distintos de `GET`;
- página `offline.html` que explica que las acciones de cuenta necesitan conexión.

El cache offline es intencionalmente mínimo. No se almacenan respuestas autenticadas, perfiles, reseñas, listas, tokens ni datos dinámicos sensibles.

### 9. Netlify y producción

`netlify.toml` quedó configurado para:

- usar `front` como base;
- ejecutar `npm run build`;
- publicar `dist`;
- usar Node 20.19;
- reescribir cualquier ruta hacia `index.html`;
- evitar caché persistente de `sw.js` y `manifest.webmanifest`;
- aplicar caché inmutable a los assets con hash;
- enviar cabeceras básicas de seguridad.

### 10. Organización y limpieza

Se eliminaron:

- `front/src/components/review-modal.jsx`, sin referencias;
- `front/src/components/quick-search-panel.jsx`, sin referencias;
- `front/public/icons.svg`, sin referencias;
- diez portadas y una foto demo sin ninguna referencia en frontend, backend ni seeds;
- `repomix-output.xml`;
- `back/.env` privado;
- ejemplos de entorno redundantes o engañosos;
- documentación vieja de fases y parches, reemplazada por la documentación consolidada de `docs/`.

Se conservaron las imágenes que todavía utilizan la landing o los seeds.

Dependencias eliminadas por no estar importadas:

- frontend: `axios`, `jwt-decode`, `yup`;
- backend: `swagger-autogen`, `swagger-ui-express`.

Se actualizaron `package.json`, `package-lock.json`, descripciones, versión del frontend y requisito de Node.

## Archivos importantes modificados

### Frontend

- `front/src/design-system.css`
- `front/src/styles.css`
- `front/src/routes/router.jsx`
- `front/src/main.jsx`
- `front/src/services/api.js`
- `front/src/services/pwa.service.js`
- `front/src/components/pwa-update-notice.jsx`
- `front/src/components/confirm-dialog.jsx`
- `front/src/components/bottom-sheet.jsx`
- `front/src/components/app-icon.jsx`
- `front/src/components/protected-route.jsx`
- `front/src/pages/notfound.jsx`
- `front/src/pages/admin.jsx`
- `front/src/pages/login.jsx`
- `front/src/pages/register.jsx`
- `front/src/pages/forgot-password.jsx`
- `front/src/pages/reset-password.jsx`
- `front/public/manifest.webmanifest`
- `front/public/sw.js`
- `front/public/offline.html`
- `front/index.html`
- `front/vite.config.js`

### Backend y despliegue

- `back/main.js`
- `back/package.json`
- `back/package-lock.json`
- `back/.env.example`
- `netlify.toml`
- `.gitignore`

## Pruebas realizadas

Completadas correctamente:

- `npm run lint` en frontend;
- `npm run check` en backend;
- `npm test` en backend: 8 de 8 pruebas aprobadas;
- validación sintáctica de `sw.js`, `pwa.service.js` y `vite.config.js`;
- parseo de `package.json`, lockfiles y manifest;
- parseo de las cuatro hojas CSS sin errores de sintaxis;
- comprobación de dimensiones de los cinco iconos PWA;
- comprobación de que todos los módulos JS/JSX locales son alcanzables desde `main.jsx`;
- inventario de recursos y eliminación sólo de archivos sin referencias;
- búsqueda de secretos y archivos excluidos antes de generar el ZIP;
- prueba de integridad del ZIP final.

## Puntos no verificados completamente

### Build del frontend en este entorno

El ZIP original incluía `node_modules` instalado en Windows. Este entorno de revisión es Linux y esa copia contiene el binding nativo de Rolldown para Windows, no `@rolldown/binding-linux-x64-gnu`. Por eso `npm run build` no puede ejecutarse aquí reutilizando esas dependencias.

No es un error identificado en el código de musimo: el lockfile declara el paquete opcional correcto para cada plataforma. Debe ejecutarse `npm ci` en una carpeta limpia o dejar que Netlify instale las dependencias para Linux antes de compilar. El build no debe considerarse confirmado hasta completar ese paso.

### Pruebas integrales conectadas

No se ejecutaron de punta a punta, por falta de una base y servicios de producción dentro del entorno:

- registro, login y recuperación con email real;
- CRUD contra MongoDB Atlas;
- catálogo externo en todos sus estados;
- instalación física en Android e iPhone;
- prueba real sobre `musimo.netlify.app` y la URL pública de la API;
- auditoría visual automatizada en una matriz completa de dispositivos.

El código, rutas y validaciones de esos flujos sí fueron inspeccionados y el backend aprobó sus pruebas unitarias existentes.

## Riesgos y pendientes

1. El JWT continúa en `localStorage`, porque migrarlo a cookies `httpOnly` exigiría cambiar autenticación, CORS y despliegue. Es una mejora futura de seguridad, no una modificación segura para la noche de publicación.
2. La aplicación depende de MongoDB, MusicBrainz/Cover Art Archive y, opcionalmente, Resend. Sus caídas no pueden eliminarse desde el frontend.
3. El modo offline permite abrir la carcasa de la aplicación, no publicar ni consultar contenido dinámico sin conexión.
4. Al modificar de manera sustancial `sw.js`, conviene incrementar su constante `VERSION` para forzar la limpieza de cachés antiguas y mostrar el aviso de actualización.
5. Login con Google, push de lanzamientos, estadísticas personales y drag-and-drop completo no están implementados en esta iteración. No se simularon porque exceden el alcance seguro de esta entrega.
6. Antes de la defensa debe ejecutarse la lista de comprobación real de `docs/GUIA_PUBLICACION.md` con la API pública y dos cuentas de prueba.
