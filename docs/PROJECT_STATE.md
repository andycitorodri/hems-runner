# HEMS Runner — Estado del proyecto

**Última actualización**: 25 de abril de 2026
**Versión actual**: Fase 2 · A1 cerrado y mergeado a `main` (incluye 2 fixes post-validación móvil)
**Archivo de producción**: `index.html` (~8.400 líneas)

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

## Fase 2 · Sub-bloque A1 cerrado (25 abril 2026)

**Estado**: ✅ Mergeado a `main` tras validación en los 3 dispositivos de referencia.

### Commits de A1 (cronológico)

| SHA | Título |
|---|---|
| `40d1025` | Quality tier detection + apply at boot |
| `1ea292b` | Hidden metrics panel (F2 toggle) |
| `a2a3ccf` | Relocate metrics panel to top-right (no HUD overlap) |
| `34f22d0` | Dynamic FPS-based tier downgrade + toast |
| `545056b` | Quality selector in pause menu + localStorage |
| `0688156` | (bonus) Fix ReferenceError makeWarningSign on cone spawn |
| `d93a202` | docs: close Fase 2 sub-bloque A1 |
| `fa94596` | A1 fix: iOS-aware quality tier detection (screen+dpr heuristic) |
| `50bb258` | A1 fix: ultra-low mode within low tier (watchdog floor) |

**Tiempo real invertido**: ~3 sesiones cortas en 2 días (24-25 abril). La estimación original era 4-6 días; los 2 fixes post-validación fueron sesión única el mismo día 25.

### Decisiones clave tomadas

- **Override manual leído en boot antes del renderer**: el único modo de que `antialias` (no hot-swappable sin recrear el renderer) se aplique correctamente desde el primer frame cuando el usuario tiene una preferencia guardada.
- **F2 sustituye a Cmd+D para el panel de métricas**: Cmd+D conflicta con el bookmark del navegador.
- **"Auto" mantiene su etiqueta tras downgrade dinámico**, mostrando el tier real al lado: `auto (medium)`. Cambiarlo a `medium` duro perdería la intención del usuario en futuros dispositivos.
- **Watchdog sólo mide en gameplay activo** (`STATE.running && !STATE.paused`); pausar resetea el warmup para no contaminar muestras.
- **Cooldown de 5s + mínimo 30 muestras** entre downgrades evitan thrashing por hipos puntuales.
- **Antialias requiere recargar** cuando el tier cambia en runtime — el toast lo avisa explícitamente; no se recrea el renderer en caliente.
- **iOS clasifica por pantalla, no por hardware**: Safari iOS bloquea `hardwareConcurrency` y `deviceMemory` por privacidad (siempre 4c/4GB), por lo que TODOS los iPhones caían en `low`. Rama dedicada anterior a la heurística cores/memory que usa `screen.width × screen.height × devicePixelRatio` + detección iPadOS por `maxTouchPoints`. iPhone 16 Pro Max ahora se clasifica `high`.
- **Ultra-low mode como suelo bajo `low`**: el watchdog no podía ayudar a dispositivos ya en `low` (return temprano). Ahora activa recortes adicionales sin cambiar de tier — partículas ×0.5, niebla 25/90, trail HEMS off, pixelRatio 0.85. Toast `"Modo rendimiento máximo activado"` (deliberadamente neutro, no alarmista). Override manual desde el menú de pausa lo resetea siempre — el usuario retoma el control y el watchdog volverá a activarlo si los tirones reaparecen.
- **No postpro hoy**: verificado antes de bajar pixelRatio < 1.0. Cuando entre el `EffectComposer` en A4 (Bloom), revisar que `composer.setPixelRatio()` también respete `ULTRA_PIXEL_RATIO`.

### Bugs colaterales encontrados

- **`makeWarningSign` ReferenceError** (pre-existente de v4.7) — arreglado en commit bonus `0688156`. Antes spamea ~31 errores en pocos segundos al aparecer conos; ahora consola limpia.
- **draws=539 vs target <100** (`GRAPHICS_STRATEGY.md`) — no es bug, es deuda de geometría no instanciada. Anotada en `PHASE_2_PLAN.md` para abordar en Fase 2 con `InstancedMesh` cuando entren los GLTFs (sub-bloque A2).
- **iOS detection rota** (descubierto en validación móvil del 25 abril) — `hardwareConcurrency`/`deviceMemory` mienten en Safari iOS. Arreglado en `fa94596`.
- **Watchdog inútil en `low`** (descubierto en validación móvil del 25 abril en Galaxy XCover5) — no podía bajar más, dejaba al usuario sufriendo tirones sin avisar. Arreglado en `50bb258`.

### Tests realizados (validación móvil completa, 25 abril 2026)

- ✅ **Mac M3 / Firefox**: tier=high (Apple M-series), no-regresión confirmada tras los 2 fixes. Panel F2, selector, persistencia, bug bonus → todo OK.
- ✅ **iPhone 16 Pro Max / Safari**: tier=high asignado correctamente por la heurística iOS (antes caía erróneamente en low por `hardwareConcurrency=4`/`deviceMemory=4`). 3 micro-stutters casi imperceptibles en 2 min de juego — el watchdog no actúa porque no llega a `<30 FPS sostenidos`, comportamiento correcto. **Bug 1 RESUELTO.**
- ✅ **Galaxy XCover5 / Chrome**: boot en tier `low`, ultra-low se activa nada más empezar (FPS bajos sostenidos), toast aparece, recortes verificados visualmente (niebla más cercana, imagen blanda por subsampling 0.85). **Bug 2 RESUELTO.** El XCover5 sigue siendo lento incluso en ultra-low — el cuello de botella está en geometría/draw calls (deuda de A2 con `InstancedMesh`), no en efectos. Documentado como **"dispositivo bajo el target razonable"**: rugged industrial de gama baja de 2021 con Mali-G52, queda **fuera de los 3 dispositivos de referencia oficiales** del `GRAPHICS_STRATEGY.md`. El sistema hace todo lo que puede y avisa al usuario.

---

## Pendiente / Próximos pasos

### Inmediato (esta semana)
- [ ] Beta test con 5-10 compañeros del SEM/UCI por WhatsApp
- [ ] Recopilar feedback de rendimiento en al menos 3 móviles distintos (gama alta, media, antigua)
- [ ] Si rendimiento sigue justo en móvil → aplicar optimización Nivel 2 (reducir partículas/llamas)
- [x] Validar rama `phase-2` en móvil real antes de mergear a `main` *(25 abril 2026, 3 dispositivos)*
- [x] Mergear `phase-2` a `main` y desplegar a Cloudflare Workers *(25 abril 2026)*

### Medio plazo (mayo-septiembre 2026)
- [ ] Migrar entorno de desarrollo a **Claude Code + VPS Hetzner** *(parcialmente hecho: Claude Code en Mac M3 local desde 24 abril 2026)*
- [x] Empezar **Fase 2** siguiendo el documento `GRAPHICS_STRATEGY.md` *(en marcha: A1 cerrado el 25 abril 2026)*
- [x] Sistema de quality tiers desde el día 1 *(implementado en A1)*
- [ ] Assets reales GLTF, shaders custom, post-procesado opcional *(A2-A4)*

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
