# Sistema de diseño de musimo

## 1. Principios

1. **Editorial, no corporativo:** Fraunces aporta identidad en títulos y el resto de la interfaz permanece funcional con Inter.
2. **Una acción dominante:** cada pantalla debe tener una CTA principal naranja; las alternativas no compiten con ella.
3. **Oscuro cálido:** el fondo no es negro puro, sino `#151411`.
4. **Comunidad sin competencia:** las tarjetas priorizan historia, autor y contexto antes que métricas.
5. **Consistencia antes que novedad:** un mismo componente conserva tamaño, forma y comportamiento en todas las rutas.

## 2. Tokens canónicos

Definidos en `front/src/design-system.css`:

```css
--bg: #151411;
--surface: #1d1b18;
--surface-elevated: #25221e;
--surface-hover: #2d2924;
--surface-light: #e8e6e3;
--text: #fff8f5;
--text-on-light: #151411;
--muted: #aaa39d;
--muted-strong: #cec7c1;
--primary: #c0451b;
--primary-hover: #a83b17;
--secondary: #8d619f;
--secondary-hover: #765087;
--error: #e07169;
--success: #6fa57a;
--border: #3b3630;
```

El rojo semántico se reserva para mensajes de error. Las acciones destructivas utilizan el violeta secundario y texto explícito.

## 3. Tipografía

- `h1`, `h2`: Fraunces.
- `h3` a `h6`, párrafos, etiquetas, inputs, botones y navegación: Inter.
- `h1`: título único de la pantalla.
- `h2`: comienzo de sección.
- `h3`: título interno de card o grupo.
- `.eyebrow`: contexto breve en mayúsculas, nunca reemplaza el encabezado.
- textos secundarios: `--muted` o `--muted-strong` según contraste.

No se debe usar Fraunces en botones, inputs ni textos largos.

## 4. Botones

### Principal — `.btn.btn-primary`

Usos:

- publicar reseña;
- guardar cambios importantes;
- crear lista;
- seguir;
- volver al inicio en 404.

Sólo una acción principal por grupo o pantalla, salvo que la misma acción se duplique por responsive —por ejemplo, submit superior y sticky móvil—.

### Secundario — `.btn.btn-secondary`

Usos:

- editar;
- compartir;
- Resonar;
- explorar como alternativa.

### Terciario — `.btn.btn-tertiary` o `.btn.btn-ghost`

Usos:

- cancelar;
- cerrar;
- volver;
- acciones de baja prioridad.

### Destructivo — `.btn.btn-danger`

Usos:

- eliminar reseña;
- eliminar lista;
- eliminar usuario;
- confirmar vaciado.

Siempre debe estar acompañado por un `ConfirmDialog`. El color es secundario violeta; el significado destructivo se comunica también por el verbo y la confirmación.

### Texto — `.text-button`

Para acciones compactas dentro de headers o cards: Ver todos, Editar, Vaciar. No se usa como CTA principal de una página.

### Compacto — `.btn-sm`

Se permite en cards y controles secundarios. En móvil mantiene un área mínima de 44 px.

## 5. Estados

- `:hover`: cambio de superficie o intensidad, sin alterar el tamaño.
- `:focus-visible`: anillo claro de alto contraste.
- `:active`: feedback breve, sin movimiento excesivo.
- `disabled`: opacidad reducida y cursor bloqueado.
- `aria-busy="true"`: texto progresivo, por ejemplo “Guardando…”.
- error: `StatusMessage` / `.status-banner--error`.
- éxito: `StatusMessage` / `.status-banner--success`.
- carga: `.loading-text` o el fallback general de rutas.
- vacío: `.empty-state`, con acción sólo cuando existe un siguiente paso real.

## 6. Espaciado

Escala base:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 64px;
```

Reglas:

- título → subtítulo: 8 px;
- encabezado → contenido: token `--page-heading-gap`;
- elementos internos de card: 8 a 16 px;
- cards de una grilla: 16 a 24 px;
- secciones: 32 a 48 px;
- controles relacionados: 8 a 12 px.

Evitar valores nuevos cuando un token existente resuelve la necesidad.

## 7. Encabezados de página

Usar `PageHeader`:

```jsx
<PageHeader
  trail={[{ label: "Inicio", to: "/inicio" }, { label: "Comunidad" }]}
  title="Historias que resuenan"
  description="Descubrí reseñas y listas de toda la comunidad."
  action={<button className="btn btn-primary">Crear</button>}
/>
```

El componente mantiene breadcrumb, `h1`, subtítulo y acción alineados. No recrear esa estructura manualmente salvo páginas de detalle con composición propia.

## 8. Cards

- `ReleaseCard`: portada, lanzamiento, artista y metadatos.
- `ReviewCard`: autor, lanzamiento, estrellas cuando corresponden y extracto.
- `ListCard`: pila de portadas, título, autor y cantidad.

Las imágenes conservan proporción mediante `object-fit`. El fallback común es `/images/cover-placeholder.png`.

Una card navegable debe ser enlace. Un botón dentro de la card sólo se usa para una acción real que no navega, como quitar de Por reseñar.

## 9. Formularios

- Cada input tiene label visible.
- El placeholder complementa, no reemplaza, al label.
- Los errores se expresan en texto.
- Los formularios de autenticación usan `autocomplete` apropiado.
- El submit tiene `type="submit"`, estado ocupado y texto progresivo.
- Cancelar tiene `type="button"`.
- Los pares de campos sólo se presentan en dos columnas cuando el ancho lo permite.

## 10. Modales y hojas inferiores

`ConfirmDialog` se usa para decisiones irreversibles. `BottomSheet` se usa en móvil para acciones contextuales.

Ambos deben:

- tener título;
- describir el efecto;
- conservar foco dentro;
- cerrar con Escape cuando sea seguro;
- restaurar el foco anterior;
- bloquear el scroll de fondo;
- tener botón de cierre con nombre accesible.

## 11. Responsive

- Escritorio: navegación superior completa y contenido centrado.
- Móvil: cabecera compacta, tab bar inferior y bottom sheets.
- Los controles no deben desbordar y los textos deben poder envolver.
- Safe areas se contemplan en PWA instalada.
- No restringir orientación desde el manifest.

## 12. Accesibilidad mínima para nuevos componentes

Antes de agregar un componente, comprobar:

- elemento semántico correcto;
- orden de encabezados;
- navegación por Tab;
- foco visible;
- nombre accesible de iconos/botones;
- contraste sobre fondo oscuro;
- mínimo táctil de 44 px en móvil;
- mensaje no dependiente sólo de color;
- respeto por `prefers-reduced-motion`;
- alt descriptivo cuando la imagen aporta contenido y `alt=""` cuando es redundante.
