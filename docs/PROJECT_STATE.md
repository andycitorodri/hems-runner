# HEMS Runner — Estado del proyecto

**Última actualización**: 23 de abril de 2026
**Versión actual**: v4 con optimizaciones móvil y rebalance Fever
**Archivo de producción**: `index.html` (227 KB, ~6500 líneas)

---

## URLs

| Entorno | URL |
|---|---|
| Producción (Cloudflare Workers) | `https://app.hems.workers.dev` |
| Repositorio GitHub | `https://github.com/andycitorodri/hems-runner` |
| Cloudflare Dashboard | `https://dash.cloudflare.com/` (cuenta `Luisrodriguezz1981@gmail.com`) |

**Subdomain de cuenta Cloudflare**: `hems.workers.dev` (era `luisrodriguezz1981.workers.dev`, cambiado en abril 2026).

---

## Despliegue actual

### Configuración Cloudflare

- **Tipo de proyecto**: Worker con assets estáticos (no Pages clásico)
- **Nombre del proyecto**: `app`
- **Modo de deploy**: Drag & drop de archivo único `index.html` (no auto-deploy desde GitHub por bug del UI unificado de Cloudflare)
- **GitHub App**: instalado con acceso solo al repo `hems-runner` (autorizado pero el flujo de Pages → GitHub no funcionó bien y se optó por manual upload)

### Proceso para actualizar el juego en producción

1. Generar `index.html` actualizado
2. Cloudflare Dashboard → Workers & Pages → proyecto `app`
3. Botón **"New deployment"** (arriba derecha, junto a "Visit")
4. Arrastrar el `index.html` a la zona de upload
5. Click en **Deploy**
6. Esperar ~30 segundos
7. **Hard reload** del navegador (Cmd+Shift+R / Ctrl+Shift+R) para evitar caché agresivo de Cloudflare
8. Si en móvil sigue mostrando versión vieja, abrir en modo incógnito (caché de navegador)

### Histórico de deploys de esta sesión

1. Primer intento: subdomain `luisrodriguezz1981.workers.dev`, proyecto autogenerado `sparkling-voice-27cb`, archivo con nombre feo → URL solo funcionaba con ruta completa
2. Segundo intento: cambio a subdomain `hems.workers.dev`, proyecto `app` con `index.html` correcto → funciona en raíz `app.hems.workers.dev`
3. Versiones posteriores: re-deploys vía drag & drop con incrementales (ocultar debug, optimización móvil, rebalance fever)

---

## Cambios aplicados en esta sesión (22-23 abril 2026)

### 1. Panel de debug oculto

**Motivación**: los teclas 1-7 y el panel visible inferior derecho confundían a usuarios no técnicos en beta.

**Solución**: añadido `display: none !important` a las reglas CSS `.debug-panel` y `.debug-indicator`. La lógica JavaScript de las teclas 1-7 sigue intacta — si en el futuro se quiere reactivar el panel para testing interno, basta con quitar el `display:none` de los dos selectores. Los testers experimentados pueden seguir usando las teclas 1-7 sin ver el panel.

### 2. Optimización móvil (Nivel 1)

**Motivación**: en móviles de gama media-baja se notaban caídas de FPS, sobre todo durante caja sorpresa + fever simultáneos.

**Detección de móvil** (triple verificación, máxima fiabilidad):
```javascript
const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches)
  || ('ontouchstart' in window && navigator.maxTouchPoints > 1);
```

**Optimizaciones aplicadas solo en móvil**:

| Setting | Desktop | Móvil | Mejora estimada |
|---|---|---|---|
| `setPixelRatio` | min(devicePixelRatio, 2) | min(devicePixelRatio, 1.5) | +25% rendimiento |
| `antialias` | true | false | +15% rendimiento |
| `shadowMap.enabled` | true | false | +10-20% rendimiento |

**Total estimado**: +30-50% rendimiento en móvil sin pérdida visual significativa.

**Ubicación en código**: línea ~1841 (inicialización del renderer Three.js).

### 3. Rebalance del Fever Mode

**Motivación**: el fever salía constantemente (umbral combo 20 era muy fácil) y las llamas tapaban la visión.

**Cambios**:

**A) Umbral subido de combo 20 → combo 35**
- Toast intermedio nuevo a combo 20: "¡IMPARABLE! · 20 combo"
- A combo 35: toast "¡35 COMBO! · 🔥 prepárate..." durante 600ms, luego activa fever
- Build-up de 600ms con safety check: `setTimeout(() => { if (STATE.combo >= 35) activateFever(); }, 600)` — si pierdes combo en esos 600ms, no se activa
- Textos de banners actualizados: "Combo ×20" → "Combo ×35"

**B) Visual de llamas reducido drásticamente**
- **ELIMINADAS**: 12 llamas laterales (6 a cada lado del vehículo) y 6 llamas frontales — eran las que tapaban la visión
- **ANILLO de fuego del suelo**: reducido de 24 a 12 conos, conos más pequeños (0.22 vs 0.35), opacidad bajada al 35-55% (vs 60-95%)
- **COLA TRASERA**: mantenida pero reposicionada (empieza en z=2.5 detrás del vehículo, antes empezaba en z=2.0 — solapaba con la ambulancia). Mantiene el efecto "trail" sin estorbar.
- **LUCES**: reducidas de 2 luces (8+5 intensity) a 1 sola (4 intensity, 18m radio) posicionada detrás
- **Total de objetos de llama**: 52 → 24 (reducción 54%)

**Tabla de combos visibles para el jugador (post-rebalance)**:

| Combo | Toast |
|---|---|
| 5 | "¡RACHA!" |
| 10 | "¡EN FUEGO!" |
| 20 | "¡IMPARABLE!" |
| **35** | "¡35 COMBO!" → 600ms → 🔥 FEVER MODE |
| 50 | "¡MEDIO CENTENAR!" |
| 100 | "¡100 COMBO!" |

---

## Pendiente / Próximos pasos

### Inmediato (esta semana)
- [ ] Beta test con 5-10 compañeros del SEM/UCI por WhatsApp
- [ ] Recopilar feedback de rendimiento en al menos 3 móviles distintos (gama alta, media, antigua)
- [ ] Si rendimiento sigue justo en móvil → aplicar optimización Nivel 2 (reducir partículas/llamas)

### Medio plazo (mayo-septiembre 2026)
- [ ] Migrar entorno de desarrollo a **Claude Code + VPS Hetzner**
- [ ] Empezar **Fase 2** siguiendo el documento `GRAPHICS_STRATEGY.md` (ver carpeta `docs/`)
- [ ] Sistema de quality tiers desde el día 1
- [ ] Assets reales GLTF, shaders custom, post-procesado opcional

### Lanzamiento (septiembre-octubre 2026)
- [ ] Comprar dominio propio `.com` o `.cat` (~12€/año) — ej. `hems-runner.com`, `hemsrunner.cat`, `traumarunner2026.com`
- [ ] Configurar dominio en Cloudflare con DNS
- [ ] Generar QR para materiales de la Jornada
- [ ] Lanzamiento oficial el **14 de octubre de 2026** en la I Jornada de Trauma de Parc Taulí

---

## Decisiones técnicas y trade-offs documentados

### Por qué Cloudflare Workers/Pages
- Hosting estático gratuito hasta 100k requests/día
- CDN global (latencia baja en cualquier parte del mundo)
- SSL automático
- Despliegue en segundos
- Alternativa considerada: Vercel/Netlify (similares pero con menor cuota gratuita)

### Por qué un solo HTML monolítico (en vez de proyecto multi-archivo)
- Simplifica deploy (un solo archivo a subir)
- Three.js + lógica + CSS + assets en base64 = autocontenido
- Trade-off: 222 KB iniciales vs lazy loading; aceptable porque todo es código JS, no assets pesados
- Para Fase 2 (con GLTF, texturas), habrá que romper a multi-archivo

### Por qué umbral fever a 35 (no 30 ni 50)
- 30 era todavía demasiado frecuente (alcanzable en 1 minuto fácil)
- 50 era frustrante (raramente se alcanzaba)
- 35 está en el sweet spot: requiere 1.5-2 minutos de juego limpio o aprovechar Lluvia de Monedas

### Por qué subdomain `hems.workers.dev` (no `andy.workers.dev`)
- El usuario eligió `hems` priorizando contexto del proyecto actual
- Trade-off: futuros proyectos no relacionados con HEMS quedarán raros (`bot-telegram.hems.workers.dev`)
- Cloudflare permite cambios de subdomain limitados (3-5), así que se puede revertir

---

## Archivos relacionados en este proyecto (`/home/claude/jornada/`)

- `hems-runner-3d-v4-clean.html` — versión de trabajo actual con todos los cambios
- `index.html` — copia para subir a Cloudflare (renombrada)
- `hems-runner-3d-v4.html` — versión "vieja" antes de los cambios de esta sesión (backup)
- `hems-runner-3d.html`, `hems-runner-v2.html`, `hems-runner.html` — versiones intermedias históricas
- `build_html.py` — script de build (poco uso, todo se edita directo en HTML)
- `docs/` — esta carpeta de documentación

---

## Contacto y contexto del proyecto

**Proyecto**: HEMS Runner — endless runner 3D para la **I Jornada de Trauma 2026** del Parc Taulí (Sabadell, Catalunya)
**Fecha del evento**: 14 de octubre de 2026
**Audiencia**: residentes y especialistas en medicina de urgencias, ICU, HEMS, trauma
**Objetivo del juego**: combinar entretenimiento con educación médica (códigos clínicos, palabras del día, mecánicas relacionadas con trauma/HEMS)
