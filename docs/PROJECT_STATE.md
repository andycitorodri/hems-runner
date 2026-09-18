# HEMS Runner — Estado del proyecto

**Última actualización**: 15 de septiembre de 2026 (tarde)
**Versión actual**: Fase 2 · A1 y A2 cerrados (A2 en rama `phase-2-a2`, sin mergear a `main` aún); A3 en curso (escenario instanciado, edificios Kenney, cielo/Ambience, carrusel de landmarks: Sagrada → Torre Glòries → Arc de Triomf → Tres Xemeneies → Hotel W con bioma costa). Idiomas CA/ES, dominio hems.jornadaimpacte.com, rendimiento móvil (LightPool, warm-up, DynamicRes)
**Archivos de producción**: `index.html` (~8.900 líneas) + `assets/models/<kit>/` (GLB con textura embebida + License.txt)

---

## URLs

| Entorno | URL |
|---|---|
| **Producción (dominio propio)** | `https://hems.jornadaimpacte.com` — subdominio de la web de la jornada, configurado el 15 sept 2026 como *custom domain* del Worker `app` |
| Producción (URL técnica, sigue activa) | `https://app.hems.workers.dev` |
| Web de la jornada | `https://jornadaimpacte.com` (Worker `jornada`, misma cuenta; enlaza al juego) |
| Repositorio GitHub | `https://github.com/andycitorodri/hems-runner` |
| Cloudflare Dashboard | `https://dash.cloudflare.com/` (cuenta `Luisrodriguezz1981@gmail.com`) |

**Subdomain de cuenta Cloudflare**: `hems.workers.dev` (era `luisrodriguezz1981.workers.dev`, cambiado en abril 2026).

---

## Despliegue actual

### Configuración Cloudflare

- **Tipo de proyecto**: Worker con assets estáticos (no Pages clásico)
- **Nombre del Worker**: `app`
- **Dominio**: `hems.jornadaimpacte.com` vía `routes` con `custom_domain: true` en `wrangler.jsonc` — Cloudflare creó DNS y certificado en el deploy (Version `ebae38f7`). `workers_dev: true` mantiene `app.hems.workers.dev`.
- **Modo de deploy**: `wrangler deploy` desde el repo local (desde 15 sept 2026, bloque R0). Config en `wrangler.jsonc` (assets desde la raíz del repo) y exclusiones en `.assetsignore` (solo se publican `index.html` y `assets/`).
- **Login**: OAuth de wrangler con la cuenta `luisrodriguezz1981@gmail.com`, credenciales en `~/Library/Preferences/.wrangler/config/default.toml`.
- **GitHub App**: instalado con acceso solo al repo `hems-runner`, pero no se usa auto-deploy (el flujo Pages → GitHub no funcionó bien; el deploy es manual desde el Mac).

### Proceso para actualizar el juego en producción

1. Guardar cambios en `index.html` y/o `assets/`
2. Doble clic en `SUBIR.command` (raíz del repo) — hace `git push` de la rama actual + `npx wrangler@4 deploy`. Equivalente en terminal: `npx wrangler@4 deploy`
3. Esperar a que diga `Deployed app triggers` + `Current Version ID`
4. **Hard reload** del navegador (Cmd+Shift+R / Ctrl+Shift+R) para evitar caché agresivo de Cloudflare
5. Si en móvil sigue mostrando versión vieja, abrir en modo incógnito (caché de navegador)

Detalle y casos de error en `DEPLOY_RUNBOOK.md`.

### Por qué se abandonó el drag & drop (R0, sept 2026)

El drag & drop de un único `index.html` en el dashboard funcionaba mientras el juego era autocontenido. Desde el spike de A2 (`1c608aa`) el juego carga `assets/models/coin-gold.glb` por ruta relativa, y ese GLB a su vez referencia `Textures/colormap.png`; con el método antiguo esos archivos no llegaban a producción y las monedas caían al fallback procedural. `wrangler deploy` sube el directorio entero (filtrado por `.assetsignore`) y solo transfiere los archivos nuevos o modificados.

**Primer deploy con wrangler** (15 sept 2026, Version ID `8929588f`): subió exactamente 4 archivos — `index.html`, `assets/models/coin-gold.glb`, `assets/models/Textures/colormap.png`, `assets/models/kenney-license.txt`. Verificado con `curl`: los 4 responden 200 y `docs/`, `wrangler.jsonc` responden 404. Hallazgo colateral: la carpeta temporal `.wrangler/` que crea el propio wrangler no estaba excluida y se habría subido — añadida a `.assetsignore` y `.gitignore` (`b73090f`).

### Histórico de deploys

1. Primer intento (abril 2026): subdomain `luisrodriguezz1981.workers.dev`, proyecto autogenerado `sparkling-voice-27cb`, archivo con nombre feo → URL solo funcionaba con ruta completa
2. Segundo intento: cambio a subdomain `hems.workers.dev`, proyecto `app` con `index.html` correcto → funciona en raíz `app.hems.workers.dev`
3. Abril 2026: re-deploys vía drag & drop con incrementales (ocultar debug, optimización móvil, rebalance fever, A1)
4. 15 sept 2026: primer deploy multi-archivo con `wrangler deploy` (R0)

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

## Fase 2 · Sub-bloque A2 — infraestructura de assets (15 septiembre 2026)

**Estado**: ✅ **Cerrado el 16 sept 2026** en rama `phase-2-a2` (Version `63d390ef`). Integrados: moneda, ambulancia, 8 vehículos de tráfico, cono, valla, patinete, helicóptero. Paciente y caja sorpresa se quedan procedurales por decisión (paciente mejorado: camilla atravesada, manta azul, pelo, cartel ✚ PACIENT). Ver `A2_ASSETS.md`.

### Commits de A2 (cronológico)

| SHA | Título |
|---|---|
| `1c608aa` | Spike: GLTFLoader + Kenney coin-gold sustituye al cilindro procedural |
| `d035cea` | AssetManager con precarga en pantalla de carga |
| `2873510` | Monedas con InstancedMesh (2 draw calls para todas) |
| `38372ab` | Centrar el GLB de la moneda en el origen del Group |
| `2d707f9` | Créditos de assets en el menú desde el manifest |
| `dc6accb` | Táctil: tap por zonas (lado de la ambulancia = carril, arriba = salto) |
| `b581aac` / `301e818` | Tutorial de la primera partida (anillos de toque, una sola vez) |
| `110b930` | Ambulancia Kenney en amarillo SEM + assets por kit + `tools/optimize-glb.sh` |
| `b380617` | i18n: català per defecte amb selector CAT · ESP |
| `c9e7df0` | Tráfico con el Car Kit (6 coches + 2 camiones, variante al azar) |
| `15c5421`…`bc7c3af` | Rendimiento: LightPool, warm-up, Lambert, perf-mobile, DynamicRes |
| `9352565` | Cono Kenney con `createInstancer` genérico + señales como sprites compartidos |
| `ec819bd` | Valla Quaternius (Poly Pizza, CC0) instanciada + `tools/preview-glb.html` |
| `cdff56a` … | Patinete (jeremy, CC-BY) y helicóptero (Poly by Google, CC-BY; se probó kazuma y se descartó) vía Poly Pizza |
| `0104280` | Banners de modo apilados cuando coinciden varios |
| `f6f26ea` / `f6d178a` | Paciente legible: camilla atravesada, +25 %, manta azul, pelo, cartel ✚ PACIENT |

### Cómo añadir un modelo nuevo

1. `tools/optimize-glb.sh original.glb assets/models/<kit>/nombre.glb` (embebe la textura; ver pipeline en `A2_ASSETS.md`). Un directorio por kit con su `License.txt`.
2. Añadir una entrada al `MANIFEST` de `Assets` en `index.html`: `{ url, scale, ground|center|offset, credit: { what: 'credit.<clave i18n>', author, url, license } }` (añadir la clave `credit.*` en los dos idiomas).
3. En la factoría del objeto (`makeX()`), pedir `Assets.clone(key)` y mantener el fallback procedural en el `else`.
4. Si el objeto aparece muchas veces (vallas, contenedores…), usar `createInstancer(buildLayers, ready, MAX)` como `ConeInstancer`: Group ligero para transform + capas `InstancedMesh` sincronizadas antes de `renderer.render()`. Los carteles/señales van con `SharedSprites.make()` (una textura para todos).
5. `npx wrangler@4 deploy` (o `SUBIR.command`).

### Decisiones clave

- **Precarga en pantalla de carga, no en gameplay**: `Assets.preload()` corre bajo el overlay `#loading` con barra de progreso real y el menú aparece cuando acaba (mínimo 600 ms de splash). Timeout de 8 s: si la red va lenta se arranca con fallbacks y los modelos que lleguen después se usan en los siguientes spawns. `generateTiles()` inicial pasa a ejecutarse tras la precarga para que el fondo del menú ya use los GLB.
- **Los clones comparten geometría y materiales con el template** (`Object3D.clone()` no los copia). `disposeObj()` liberaba los buffers del template en cada moneda recogida y Three.js los re-subía en el siguiente frame — funcionaba por accidente. Ahora los nodos de los templates llevan `userData.sharedAsset` y `disposeObj()` los salta.
- **Monedas con `InstancedMesh`**: `makeCoin()` devuelve un `Group` vacío con solo transform y `userData`; `CoinInstancer` dibuja cuerpo y halo con dos `InstancedMesh` (capacidad 320, `frustumCulled = false`) sincronizados justo antes de `renderer.render()`. El código de colisión, imán, vórtice y lluvia de monedas no cambió: sigue leyendo `mesh.position`/`rotation`. El fallback procedural también va instanciado. Si el primer frame llega antes que la precarga, el instancer se reconstruye al aparecer el GLB.
- **Modelo centrado en el origen del Group**: el cilindro antiguo estaba centrado; el GLB de Kenney iba de y=0 a 0.6 y dejaba el centro visual 0.3 por encima del punto de hitbox/imán/halo. Se centra el bounding box del template, de forma genérica.
- **Ambulancia: contenido, no referencia**. `const ambulance = makeAmbulance()` corre al cargar el script, antes de la precarga. `refreshAmbulanceModel()` vacía el Group y le mete los hijos de un `makeAmbulance()` nuevo cuando el GLB está listo — `ambulance` es una referencia usada por cámara, colisiones y efectos, y no se puede reasignar.
- **Orientación**: el GLB de Kenney mira a +z; el juego avanza hacia -z. Se gira π en Y: morro delante, puertas traseras hacia la cámara. El procedural antiguo tenía cabina y faros en +z — circulaba marcha atrás sin que nadie lo notara.
- **Sirenas**: el modelo trae su barra de luces (textura estática); nuestras dos cajas parpadeantes (`blueSiren`/`redSiren`, animadas en `animate()`) se apoyan sobre ella, más pequeñas que en el procedural. Las ruedas son los nodos `wheel-*` del GLB, giran igual que antes.
- **Amarillo SEM por paleta, no por tinte**: `material.color` multiplicaría toda la textura (cristales y barra azul incluidos). Se copia la muestra amarilla del kit sobre la blanca en el colormap de la ambulancia (`tools/png_swatch.py`); el resto de vehículos del Car Kit usarán la paleta original.
- **Quantización sin decoders**: `KHR_mesh_quantization` lo soporta el `GLTFLoader` de r128; Draco/meshopt habrían obligado a cargar decoders. Ojo: con atributos normalizados, `Box3.setFromObject` funciona pero leer `attributes.position` a mano exige dividir por 32767.
- **Modelo nuevo, nombre de archivo nuevo**: navegadores y CDN cachean por URL; al sustituir `helicopter.glb` por otro modelo con el mismo nombre el navegador siguió sirviendo el viejo. Renombrar (`helicopter-kazuma.glb`) en vez de sobrescribir.
- **Créditos desde el manifest**: `Assets.credits()` agrupa por autor y el menú los pinta bajo los botones. CC0 no lo exige; los CC-BY del catálogo (helicópteros Poly Pizza, Sagrada Família wareFLO) sí.

### Medido en local (Mac M3, Firefox, ~25-40 monedas en pantalla)

- Antes: cada moneda = 2 draw calls (cuerpo + halo) → ~50-80 draws solo de monedas.
- Ahora: 2 draw calls en total para todas las monedas. `draws` totales ~400-470 según escena; el resto es geometría de edificios/árboles/farolas no instanciada (siguiente candidato cuando entren los GLB de A3).
- Recogida de 65 monedas seguidas sin ningún `dispose()` sobre el template (verificado con spy).

### Rendimiento: luces y shaders (15 sept 2026, `15c5421`)

Tras integrar el tráfico el usuario notó micro-tirones. Medido con un probe de frames > 40 ms: coincidían con **compilaciones de shaders en mitad del frame** (7 → 39 programas en los primeros 500 m). Causa raíz: ~29 `PointLight` en escena (una por farola, más pacientes, power-ups, letras, cajas, auras y luces temporales) con el recuento cambiando constantemente — en Three.js cada cambio en el número de luces recompila todos los materiales, y cada luz se evalúa en todos los píxeles.

- **`LightPool`**: 8/6/4 luces según tier, creadas al arrancar (número constante → cero recompilaciones). `LightPool.acquire(owner, color, intensidad, distancia, offset)` devuelve una luz que sigue al dueño; se devuelve sola cuando el dueño sale de la escena (`LightPool.update()` cada frame). Pool agotado → luz dummy fuera de escena (el objeto funciona, no ilumina). Las farolas ya no llevan luz (bombilla emisiva).
- **`warmUpRenderer()`**: bajo la pantalla de carga instancia una vez cada objeto del juego y renderiza un frame oculto → compila shaders (incluidos los de sombras) y sube texturas antes de jugar (~300 ms en Mac).
- **Segunda pasada (`d943b56`)**: al activar el modo HEMS seguía habiendo un tirón de 43 ms. Diff de claves de programa: `numPointLights 9 → 8`. El faro de la ambulancia era hijo del grupo y `ambulance.visible = false` lo sacaba del recuento → recompilación general. Ahora `ambulanceHeadLight` es una luz fija de la escena que sigue a la ambulancia. Y el warm-up crea/destruye todos los efectos (auras, helicóptero+sombra, líneas) **sin liberar materiales** al desmontar (`Material.dispose` anulado durante el teardown), porque Three.js borra un programa cuando se libera el último material que lo usa.
- **Reglas para código nuevo**: (1) nunca `new THREE.PointLight` en gameplay — pedirla a `LightPool`; (2) nunca cambiar `visible` de un objeto que contenga una luz (cambia el recuento); (3) todo objeto o efecto nuevo que pueda aparecer en partida, añadirlo a `warmUpRenderer()`; (4) para comprobar: `renderer.info.programs.length` debe mantenerse constante durante la partida (11 hoy).
- **Tercera pasada, móvil (`ef38803`, `ab6d79f`, `bc7c3af`)** — medido con `?metrics=1` en el iPhone 16 Pro Max (tier high): 60 FPS en juego normal; ~30 FPS solo cuando coincidían SVA + Mastery + escudo (capas transparentes a pantalla completa → fill rate), y el PerfWatchdog bajaba el tier a medium para toda la partida. Cambios:
  - GLB en `MeshLambertMaterial` (iluminación por vértice) en vez de PBR — mismo aspecto con paletas Kenney.
  - Móvil: preset high a ×1,5 (era ×2), `PCFShadowMap` en vez de PCFSoft, pool de 6 luces.
  - Móvil (`body.perf-mobile`): sin `backdrop-filter` en el HUD (~13 cajas con blur sobre el canvas, muy caro en Safari iOS) y sin la capa de grano `mix-blend-mode`. Fondos algo más opacos a cambio.
  - **`DynamicRes`**: resolución dinámica — si los FPS de 1 s bajan de 48 durante 1 s, baja un escalón (×0,85, ×0,7 sobre el cap del tier); con 3 s por encima de 57 recupera. `applyQualitySettings` aplica el factor. Resultado en el iPhone: "mucho mejor" (usuario, 15 sept).
  - `?metrics=1` en la URL muestra el panel de métricas en móvil (fila `res` = pixel ratio y escalón).
- Bug latente visto de paso: `createTraumaItemMesh()` usa `THREE.CapsuleGeometry`, que no existe en r128 (llegó en r138). Es código muerto — nadie lo llama — pero si se activa la "lluvia de material" habrá que cambiarlo por `CylinderGeometry`.
- Resultado local: 640 m con todos los efectos, 0 frames > 40 ms; luces 29 → 9. **Pendiente medir en el XCover5**: menos luces por píxel debería notarse mucho ahí.

### Pendiente en A2

- (Opcional, no bloqueante) Helicóptero: cruz roja / logo SEM como decal.
- Helicóptero (CC-BY), caja sorpresa (`Q-PlatU`), paciente (sin candidato).
- Volver a probar en Galaxy XCover5 tras instanciar más geometría.

---

## Fase 2 · Sub-bloque A3 — biomas (iniciado 16 septiembre 2026)

**Estado**: ✅ Cerrado (18 sep 2026) en rama `phase-2-a2`, sin mergear a `main` aún. Base técnica (`fb398f9`): **escenario instanciado**.

- `Props` (index.html): cada tipo de prop (edificio, tejado, ventana, tronco, copa, poste, brazo, bombilla) es un `InstancedMesh` con geometría unitaria; cada prop es `{x,y,z,sx,sy,sz,ry,color}` y `Props.update(moveZ)` mueve, recicla (mismos umbrales que antes) y reescribe matrices cada frame. Color por instancia en edificios y copas; `changeScenario()` recolorea por instancia.
- Resultado: **draws 380-480 → 94-143** (media 128) sin cambio visual. Objetivo `GRAPHICS_STRATEGY.md`: <100.
- Nota r128: `InstancedMesh.setColorAt()` crea `instanceColor` con tamaño `mesh.count` (0 al crear) → crear el buffer a mano con capacidad máxima.
- **A3.1 (`8fc1149`, `50dea1a`)**: edificios Kenney City Kit Commercial (CC0, `~/Downloads/kenney_city-kit-commercial.zip`, 8 variantes en `assets/models/kenney-city-kit/`) como capas GLB de `Props` (`Props.defineGltfLayer`), fachada hacia la calle, tinte cálido por instancia (`EIXAMPLE_TINTS`). Cielo: cúpula con degradado (`skyDome`) + `Ambience` (sol, hemisferio, ambiente, niebla, suelo) con presets = momentos del día (Migdia, Capvespre, Nit, Alba) cada 1000 m y transición de 3 s. Arranque y partida nueva: mediodía. Draws ~110-130; tris ~100k (antes 20k) — pendiente variante low-detail (el kit las trae, `low-detail-building-*`) para tier low.
- **Landmark (`8533f11`, `4411aff`)**: `Landmark` recoloca cada frame un objeto a 260 m por delante de la cámara (sin niebla, color mezclado con el horizonte). Primero silueta procedural (18 torres, 2 InstancedMesh); luego el modelo real de Sketchfab (wareFLO, CC-BY, decimado a 11k tris) vía `Landmark.useGltf()`. Modelos de Sketchfab: los descarga el usuario (cuenta), formato GLB.
- **Ajustes de A3.1** (`f7018c0`…`471ff5c`): asfalto oscuro y luz de cielo menos azul (la carretera se veía celeste); Sagrada ocre `0xa88a62`, escala 0.7, a la derecha (x+58) y apartada de los bloques; fix carretera (desaparecía a ~110 m: se movía sin reciclarse → estática); HUD: rango y palabra del día al lateral izquierdo, `← MENÚ` y pausa en fila superior propia.
- **Carrusel de landmarks (`b654358`)**: `Landmark` es una lista de siluetas y `changeScenario()` (cada 1000 m) llama `Landmark.show(i)` con fundido de opacidad (1,4 s fuera, cambio, 1,4 s dentro); `Landmark.set(0)` al reiniciar. Orden: **Sagrada Família** (GLB o torres procedurales) → **Torre Glòries** (procedural: bala de 100 m en 4 tramos rojo→azul, un color por tramo para no añadir programa `vertexColors`) → **Camp Nou** (Sketchfab, Alvxrez, CC-BY; `tools/node/flatten-glb.mjs` con `BUCKETS` = 3 colores planos (hormigón, estructura oscura, césped) y `DROP_OUTSIDE` para quitar la placa de suelo; weld + simplify → 16k tris, 328 KB). Camp Nou es bajo (27 m a escala 0.45) y la fila de edificios lo taparía: mientras está activo, `Props.setMask()` oculta la fila derecha (escala 0 en la matriz, evaluado al reciclar → la fila se acaba con la distancia sin saltos; los que ya están en plena niebla se ocultan al instante). Probado inclinarlo hacia la cámara para enseñar el césped: parece un platillo volante → a ras de suelo. Todos los landmarks son Lambert `fog:false, transparent:true` (mismo programa; `renderer.info.programs` no cambia al conmutar).
- **Arc de Triomf (`39c933b`)**: 3.º del carrusel (Sagrada → Torre Glòries → **Arc** → Camp Nou). Blockout de Sketchfab (SC-03, CC-BY, 8,5k tris, unidades diminutas: escala 340 → 38 m), un color ladrillo `0x9c4f3a`. Va **de frente sobre la calzada** a 170 m (`x: 0`), con `Props.setMask` ocultando las dos filas de edificios: el arco queda enmarcado al fondo del paseo, visible también en vertical (centrado).
- **Torre Glòries v2 + Tres Xemeneies (`1f22106`)**: la torre lleva ahora ranuras en cada planta (34) por las que asoma un cilindro interior oscuro → líneas de forjado; rojo solo en la base, azul grisáceo/verdoso arriba, cilindro hasta el 72 %. **Tres Xemeneies** de Sant Adrià (Sketchfab, novusod, CC-BY; 3 colores planos, 7k tris, 244 KB, escala 0.55 → 112 m) como 5.º landmark a la derecha (x 64, z −270). Orden: Sagrada → Glòries → Arc → Camp Nou → Xemeneies.
- **Camp Nou retirado** (`1f446a9` → quitado en el siguiente commit): desde la calzada (cámara a 5 m) un estadio es una pared curva; se probó pintar gradas blaugrana por niveles (`flatten-glb.mjs UPFACING`), añadir césped, inclinarlo hacia la cámara y ponerlo sobre una loma — platillo volante. Decisión del usuario: fuera. Carrusel definitivo: **Sagrada → Torre Glòries → Arc de Triomf → Tres Xemeneies** (teclas debug Z X C V; N = siguiente escenario).
- **Bioma costa + Hotel W (`54a2c2b`)**: `Props` admite capas con `def.biome` que solo se ven cuando `Props.setBiome(b)` coincide (mismo mecanismo que la máscara: se evalúa al reciclar → entran y salen por la niebla). Capas `sea`/`sand` (2 franjas de 260 m a la derecha, recicladas a 520 m; el suelo lateral solo llega a x 64, el mar hasta x 328) y `ptrunk`/`frond` (33 palmeras × 6 hojas, la hoja lleva la caída de 30° en la geometría y por instancia solo gira). **Hotel W** procedural (vela = cuarto de elipse extruido 100 m + podio), 5.º landmark, x 72 z −285; su entrada esconde edificios y árboles de la derecha y activa `costa`. Carrusel completo: Sagrada → Glòries → Arc → Xemeneies → Hotel W (teclas Z X C V B; N = siguiente escenario).
- **Hotel W real (`f5ecea3`)**: modelo Sketchfab (sgallartm, **CC-BY-SA** — la versión reducida se comparte con la misma licencia, ver License.txt), `flatten-glb.mjs DROP_NODES` para quitar el edificio Desigual, suelos y escaleras que traía; 7 colores planos por material, 9,5k tris, 300 KB; unidades en pies → escala 0.24 (78 m), `center` + `ground`, ry −0.6 (vela de frente), x 78 z −270. La vela procedural queda de fallback.
- **Props de costa (`823668c`, `347332e`)**: en la arena, sombrillas (2 modelos), toallas (2), tumbonas y pelotas (40 grupos) + 3 torres de socorrista; en el mar 8 veleros y un crucero al fondo. Todos GLB de Sketchfab (CC-BY, `assets/models/sketchfab/costa/`, 336 KB en total) pasados a colores planos e instanciados con `Props.defineGltfLayers` (una capa por malla/color, `Props.addSet` añade la instancia a todas), `biome: 'costa'`. `flatten-glb.mjs` ganó `KEEP_NODES` (sacar un objeto de un pack), `KEEP_COLORS` (colores originales sin texturas) y `NO_JOIN`. **Gaviotas** procedurales (`Gulls`): 8 pájaros en V con 2 InstancedMesh (ala izquierda/derecha) que aletean y vuelan en círculos, relativas a la cámara — el modelo animado con esqueleto de Sketchfab no se puede instanciar, descartado. El chiringuito (Beachhouse, Suushimi) se descartó: es un diorama con rocas y agua imposible de separar. Coste del tramo: draws ~160 (Eixample ~130), tris ~155k.
- **Toques catalanes (`54e0f26`, `745f4de`)**: senyeres colgadas de los balcones (capa instanciada `bld_flag`, textura canvas, 45 % de los bloques; el prefijo `bld_` hace que la máscara de edificios las oculte con ellos); aceras con **panot** (dos franjas estáticas 4,5 m con textura canvas de la baldosa de la flor, repetida cada 0,5 m); **Collserola** como fondo permanente a la izquierda (5 lomas + Tibidabo con torre y cúpula + Torre de Collserola con plataforma y aguja; `backdrop` en `Landmark.update`, lerp 0,35 con la niebla); **Montserrat** como 6.º landmark (12 agujas cilindro+casquete sobre loma, piedra rosada; tecla M); **Torre de Sant Sebastià** (celosía roja + cable + cabina) dentro del grupo del Hotel W. Descartado: taxi negro y amarillo (el taxi Kenney usa un solo swatch de la paleta para la carrocería, no se pueden hacer puertas de otro color), bus TMB (no hay bus en el kit), castellers/gegants/sardana (en Sketchfab solo hay fotogrametrías de cientos de miles de caras).
- **Relieve real (`889553b`)**: en Sketchfab no hay ningún Montserrat, Tibidabo ni Collserola descargable (solo fotogrametrías enormes o cosas sin relación), y las siluetas procedurales parecían tubos. Solución: **datos de elevación reales** (SRTM vía `api.open-elevation.com`): `tools/terrain/fetch_heightmap.py nombre lat0 lat1 lon0 lon1 paso_m` → `assets/terrain/<nombre>.json`; `tools/node/heightmap-glb.mjs` → GLB con normales, UV y textura PNG de color por altura/pendiente (bosque → roca gris a partir de `rockFrom` m) y bordes a 0 (isla, sin paredes). Montserrat 41.583-41.614 / 1.790-1.870 a 100 m (68×36, 4,7k tris, 206 KB); Collserola 41.400-41.450 / 2.030-2.190 a 150 m (90×38, 6,6k tris, 192 KB). `Assets` admite `scaleY` (Montserrat 0.15/0.15, Collserola 0.2/0.4: la ciudad del juego es tan compacta que a escala real todo queda bajo la línea de tejados — un objeto a distancia D solo asoma si mide > ~0,175·D). Montserrat como landmark a z −590 (x 0, centrado al fondo de la avenida); Collserola como fondo con la llanura del Eixample hundida bajo el suelo (y −30), bruma por emisivo (`emissive = niebla × 0,5`, `color × 0,55`), y oculta mientras Montserrat está activo. Tibidabo y Torre de Collserola en sus coordenadas (lat/lon → placa). Siluetas procedurales de fallback si el GLB no carga.
- **Lecciones del relieve (`321915e`, `816f13e`)**: (1) la placa de Collserola no puede llegar por delante de los landmarks — la primera (con la llanura) llegaba a z −84 y su ladera, del color del cielo por la bruma, "cortaba" la Sagrada por abajo con un borde irregular; ahora es solo la sierra (`collserola-v2.glb`, lat 41.412-41.452) con borde sur a z −411 y Tibidabo a (−80, −640). (2) `camera.far` era 400: todo lo que está a más de 400 m (Collserola a −865, la mitad de atrás de Montserrat) desaparecía; ahora 1400. (3) Para diagnosticar estas cosas: fila `lm` del panel de métricas (`Landmark.debug()`: landmark, y, base real de la malla dequantizada, cámara) y comprobar por vértices qué hay por delante de qué — el `Raycaster` de r128 no sirve con mallas cuantizadas (usa las posiciones sin normalizar).
- **Publicidad (`ac7d2a8`)**: `ADS` al principio del script (`{ img, name, url }` o `{ text, sub }`; instrucciones en `assets/ads/LLEGIR.md`). `Billboards`: 3 vallas 4×2 en la acera (|x| 6,05, delante de los edificios que empiezan en |x| ≈ 7), giradas 0,55 rad hacia el tráfico, en el bucle de 400 m; textura de imagen (`TextureLoader`) o texto (canvas 512×256); al reciclarse rotan al siguiente anuncio. Menú: franja "Amb el suport de" (`#menu-sponsors`) con logos/textos y enlace. Lambert + map: sin programas nuevos (21 constantes en escritorio).
- **A3 cerrado el 18 de septiembre de 2026**: validado por el usuario en iPhone y ordenador ("el juego va perfecto"). Ideas pendientes (no comprometidas): variante low-detail de edificios para tier low; preset de cielo propio para la costa.
- Herramienta nueva: `tools/node/flatten-glb.mjs` (gltf-transform 4 + meshoptimizer; `npm i` en `tools/node`, `node_modules` ignorado). Previsualizar: `tools/preview-glb.html?m=&s=&view=side|top` — ojo, con modelos cuantizados (`optimize-glb.sh`) `Box3.setFromObject` en r128 da tamaños inflados; los tamaños reales los da `gltf-transform inspect`.

---

## Idiomas (15 septiembre 2026)

**Català por defecto, castellano seleccionable** (commit `b380617`). Selector `CAT · ESP` en la cabecera del menú; la elección se guarda en `localStorage` (`hems_runner_lang`).

### Cómo funciona

- `I18N_STRINGS` (principio del script de `index.html`): dos diccionarios planos `es` y `ca` con las **mismas claves** (~300), agrupadas por prefijo: `menu.*`, `hud.*`, `banner.*`, `toast.*`, `mission.<id>`, `codigo.<ID>.*`, `death.<tipo>.<n>`, `rank.*`, `milestone.*`, `item.*`, `gameover.*`, `lb.*`, `pause.*`, `tutorial.*`.
- `t(clave, {vars})` devuelve el texto en el idioma activo con interpolación `{var}`; si falta la clave en `ca` cae a `es` y avisa por consola (`[i18n] falta la clave`).
- **HTML estático**: atributos `data-i18n` (textContent), `data-i18n-html` (innerHTML, para títulos con `<em>`) y `data-i18n-placeholder`. `I18N.apply()` los repinta y llama a los listeners registrados con `I18N.onChange()` (misiones del menú, HUD, pistas táctiles, índice de palabras).
- **Estructuras de datos** (`MISSION_POOL`, `CODIGOS`, `TRAUMA_ITEMS`, `SPEED_MILESTONES`, rangos): *getters* que llaman a `t()`; el código que las consume no sabe de idiomas.
- **Palabras del día por idioma**: `CODIGOS[id].words` viene del diccionario. Solo cambia SÈPSIA (`SEPSIA, LACTAT, QSOFA, XOC, NORA, FOCUS`); el resto son acrónimos comunes. `WORD_TO_CODIGO` se reconstruye al cambiar de idioma.
- El cambio de idioma solo está en el menú; el contenido generado durante la partida (toasts, banners) usa `t()` en el momento de generarse.

### Cómo añadir un texto nuevo

1. Añadir la clave en **los dos** diccionarios de `I18N_STRINGS`.
2. En HTML: `<span data-i18n="mi.clave">texto en castellano</span>` (el texto inicial es solo el fallback antes de `apply()`).
3. En JS: `t('mi.clave')` o `t('mi.clave', { n: 3 })`.
4. Comprobar en consola que no aparece `[i18n] falta la clave`.

### Pendiente de decidir

- ~~Fecha de la jornada~~: confirmada el **27 de octubre de 2026** (15 sept 2026); actualizada en `menu.fomo` y `lb.subtitle` en los dos idiomas.

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
- [x] ~~Comprar dominio propio~~ → se usa el de la jornada: `hems.jornadaimpacte.com` *(15 sept 2026)*
- [x] Configurar dominio en Cloudflare con DNS *(custom domain del Worker, automático)*
- [ ] Generar QR para materiales de la Jornada
- [ ] Lanzamiento oficial el **27 de octubre de 2026** en la I Jornada IMPACTE de Parc Taulí (fecha cambiada del 14 al 27 de octubre)

---

## Decisiones técnicas y trade-offs documentados

### Por qué Cloudflare Workers/Pages
- Hosting estático gratuito hasta 100k requests/día
- CDN global (latencia baja en cualquier parte del mundo)
- SSL automático
- Despliegue en segundos
- Alternativa considerada: Vercel/Netlify (similares pero con menor cuota gratuita)

### Por qué un solo HTML monolítico (en vez de proyecto multi-archivo)
- Simplificaba el deploy (un solo archivo a subir) mientras no había assets externos
- Three.js + lógica + CSS + assets en base64 = autocontenido
- Trade-off: 222 KB iniciales vs lazy loading; aceptable porque todo es código JS, no assets pesados
- **Actualizado sept 2026**: el código sigue en un único `index.html`, pero los modelos/texturas de Fase 2 viven en `assets/` y se despliegan con `wrangler deploy` (ver "Despliegue actual")

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
**Fecha del evento**: 27 de octubre de 2026 (antes 14 de octubre; web: jornadaimpacte.com)
**Audiencia**: residentes y especialistas en medicina de urgencias, ICU, HEMS, trauma
**Objetivo del juego**: combinar entretenimiento con educación médica (códigos clínicos, palabras del día, mecánicas relacionadas con trauma/HEMS)
