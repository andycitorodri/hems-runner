# PHASE_2_PLAN.md
## HEMS Runner — Plan ejecutivo de Fase 2

**Versión**: 1.0 · Generado el 24 abril 2026
**Lanzamiento objetivo**: 14 octubre 2026 (I Jornada de Trauma Parc Taulí)
**Filosofía**: prototipo completo end-to-end primero, expansión modular después
**Herramienta principal**: Claude Code en Mac M3 local
**Despliegue**: Cloudflare Pages (`app.hems.workers.dev`) — sin cambios
**Backend (sólo bloque final)**: Hetzner CX22 cuando se añada leaderboard

---

## 1. Filosofía: vertical slice primero

### El principio

En lugar de construir Fase 2 por módulos secuenciales (gráficos → escenarios → sonido → backend), vamos a construir **un prototipo completo que demuestre TODO trabajando junto**. Esto se llama "vertical slice" en desarrollo de juegos y es como trabajan los estudios profesionales.

### Por qué este enfoque

1. **Validación temprana**: en 3-4 semanas tienes algo demostrable a colegas del SEM/UCI antes de invertir más tiempo
2. **Prueba de la pipeline completa**: si los modelos GLTF funcionan en móviles antiguos, sabremos que el resto del plan funcionará
3. **Motivación**: ver el cambio visual radical es más motivador que avanzar invisiblemente en infraestructura
4. **Margen para pivotar**: si algo no convence (estilo visual, performance, sonido), pivotamos antes de invertir más
5. **Compatible con guardias HEMS**: trabajo modular, si una semana no puedes tocar nada, no rompes nada

### Lo que NO es Fase 2

- ❌ NO es Subway Surfers fotorrealista
- ❌ NO es un motor nativo (seguimos en web con Three.js)
- ❌ NO son modelos hechos por artistas profesionales (usaremos GLTFs licenciados de Sketchfab/Poly Pizza/Quaternius)
- ❌ NO es VR/AR

### Lo que SÍ es Fase 2

Pasar HEMS Runner de "primitivos geométricos coloridos" a un juego con **identidad visual fuerte estilo Alto's Adventure / Crossy Road**: modelos low-poly bonitos, escenarios geográficos cambiantes (Barcelona reconocible), iluminación con personalidad, sonido satisfactorio, y un sistema de competición online en la propia Jornada.

### Regla de oro inviolable

**Cada feature gráfica nueva debe medirse en 3 dispositivos antes de mergear**: Mac M3, móvil reciente, móvil 3 años. Si baja >10 FPS en cualquiera, se optimiza o se mete detrás del tier 'high'.

Esta regla está detallada en `GRAPHICS_STRATEGY.md`. Este documento la asume.

---

## 2. Estructura del plan

El plan tiene **2 grandes etapas**:

| Etapa | Duración estimada | Cuándo | Qué entregamos |
|---|---|---|---|
| **Etapa A — Prototipo "v5 Showcase"** | 3-4 semanas reales | Mayo 2026 | Versión completa con TODO trabajando junto |
| **Etapa B — Expansión modular** | A demanda, según feedback | Junio-Septiembre 2026 | Más biomas, leaderboard, analytics, login |
| **Buffer final** | 2 semanas | Primera quincena octubre | Pulido para la Jornada |

---

## 3. Etapa A — Prototipo "v5 Showcase"

### 3.1 Alcance del prototipo

El prototipo debe demostrar TODO el potencial visual y mecánico del juego completo, pero con scope acotado:

| Categoría | Incluido en prototipo |
|---|---|
| **Calidad gráfica** | Sistema quality tiers automático (low/medium/high) + bloom suave en tier high |
| **Modelos 3D** | Ambulancia, helicóptero, monedas, pacientes, cajas sorpresa, coches/obstáculos |
| **Biomas** | 2 biomas con transición: Eixample Barcelona + Costa Barceloneta |
| **Iluminación** | Sol direccional con sombras, luces ambiente por bioma |
| **Sonido** | 1 música arcade loopeable + 10 SFX clave + botón mute |
| **Mecánicas** | Todas las actuales (HEMS, SVA, Mastery, Fever, Rayo, Wormhole) |

### 3.2 Sub-bloques del prototipo

Trabajamos en este orden secuencial. Cada sub-bloque debe quedar funcional antes de pasar al siguiente.

#### A1 — Cimientos técnicos (Quality Tiers + Métricas)

**Objetivo**: que el juego actual funcione exactamente igual visualmente, pero internamente esté preparado para escalar gráficos sin romper móviles antiguos.

**Entregables**:
- Función `detectQualityTier()` que asigna automáticamente low/medium/high según hardware
- Sistema de adaptación dinámica: si los FPS reales bajan de 30, el tier baja solo y se notifica
- Cada feature gráfica del juego actual queda parametrizada por tier (pixelRatio, sombras, partículas, antialias, etc.)
- Panel de métricas oculto (Cmd+D o tecla F2) que muestra: FPS actual, FPS promedio últimos 5s, draw calls, triángulos en pantalla, tier actual, razón del tier
- Botón en menú de pausa "Calidad gráfica: Auto / Baja / Media / Alta" (sobreescribe el auto si el usuario quiere)

**Tiempo estimado**: 4-6 días de trabajo real

**Riesgos**: bajo. Es código nuevo encapsulado que no rompe lo existente.

##### A1 — Cierre (25 abril 2026)

**Estado**: ✅ Cerrado y mergeado a `main` tras validación en los 3 dispositivos de referencia.

**Tiempo real**: ~3 sesiones cortas en 2 días (24-25 abril). Estimación original 4-6 días; los 2 fixes post-validación móvil fueron sesión única el mismo 25.

**Commits** (cronológico):

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

**Decisiones que se desviaron o concretaron del plan original**:
- Hotkey del panel: **F2** únicamente (Cmd+D entra en conflicto con bookmark del navegador).
- Override manual leído **en boot antes del renderer** (necesario para `antialias`, que no es hot-swappable).
- **Antialias requiere recarga** cuando cambia el tier en runtime — el toast lo avisa explícitamente, no se recrea el renderer en caliente.
- "Auto" mantiene su etiqueta tras downgrade dinámico, mostrando el tier real al lado: `auto (medium)`.
- **iOS clasifica por pantalla + dpr** en rama dedicada anterior a la heurística cores/memory, porque Safari iOS bloquea `hardwareConcurrency`/`deviceMemory` por privacidad. Sin esto, todo iPhone caía en `low`.
- **Ultra-low mode como suelo bajo `low`**: el watchdog ya no hace return temprano si está en `low`; activa recortes adicionales (partículas ×0.5, niebla 25/90, trail HEMS off, pixelRatio 0.85). Override manual lo resetea.
- **Sin postpro hoy**: verificado antes de bajar pixelRatio < 1.0. Cuando entre `EffectComposer` en A4 (Bloom), revisar que `composer.setPixelRatio()` también respete `ULTRA_PIXEL_RATIO`.

**Tests realizados** (validación móvil completa, 25 abril 2026):
- ✅ Mac M3 / Firefox: tier=high estable (Apple M-series), no-regresión confirmada tras los 2 fixes.
- ✅ iPhone 16 Pro Max / Safari: tier=high asignado correctamente por la heurística iOS (antes caía en low). 3 micro-stutters casi imperceptibles en 2 min — el watchdog no actúa porque no llega a `<30 FPS sostenidos`, comportamiento correcto. **Bug 1 RESUELTO.**
- ✅ Galaxy XCover5 / Chrome: boot en `low`, ultra-low se activa nada más empezar, toast y recortes verificados visualmente. **Bug 2 RESUELTO.**

**Deuda colateral apuntada durante A1**:
- **Draws=539** vs target <100 (`GRAPHICS_STRATEGY.md` §2). No es bug — es geometría no instanciada que se aborda en **A2** con `InstancedMesh` al integrar los GLTFs (especialmente para monedas, props decorativos y módulos de escenario).
- **`makeWarningSign` undefined** — pre-existente de v4.7, arreglado en commit bonus. Sin más rastro.
- **Galaxy XCover5 — dispositivo bajo target**: rugged industrial de gama baja de 2021 con Mali-G52. El cuello de botella es geometría/draw calls (no efectos), por lo que ultra-low ayuda pero no llega a fluido. Queda **fuera de los 3 dispositivos de referencia oficiales** del `GRAPHICS_STRATEGY.md`. Volver a probarlo tras A2 (`InstancedMesh` + GLTFs optimizados) — debería mejorar significativamente.

#### A2 — Modelos GLTF (sourcing + integración)

**Objetivo**: reemplazar las geometrías primitivas de Three.js por modelos GLTF low-poly licenciados.

**Lista de assets a sourcear**:
- 1 ambulancia low-poly (estilo Crossy Road/Alto's)
- 1 helicóptero medicalizado
- 3-4 modelos de coches civiles (variantes para tráfico)
- 1 modelo de paciente acostado
- 1 modelo de moneda/medalla
- 1 modelo de caja sorpresa (caja de cartón con lazo)
- 2-3 obstáculos urbanos (cono de tráfico, valla, contenedor)

**Fuentes a explorar (gratuitas o low-cost)**:
- **Poly Pizza** (poly.pizza) — banco gratuito de modelos low-poly
- **Sketchfab** (sketchfab.com) — filtrar por "Downloadable" + Creative Commons
- **Quaternius** (quaternius.com) — packs gratuitos de assets low-poly
- **Kenney** (kenney.nl) — packs CC0 perfectos para juegos arcade
- **Sketchfab Store** — comprar packs específicos si hace falta (~10-30€)

**Pipeline de integración**:
1. Descargar GLTF
2. Optimizar con `gltf-transform` (reduce tamaño 60-80%): `gltf-transform optimize input.glb output.glb`
3. Convertir texturas a KTX2 con Basis Universal
4. Cargar con `GLTFLoader` de Three.js
5. Reemplazar la geometría primitiva en el código manteniendo la lógica de física/colisión

**Entregables**:
- Carpeta `/assets/models/` con todos los GLTFs optimizados
- Carpeta `/assets/textures/` con KTX2
- Código actualizado para cargar modelos en lugar de primitivas
- Sistema de cache: precargar modelos en menú principal, no durante gameplay

**Tiempo estimado**: 5-7 días de trabajo real

**Riesgos**: medio. El sourcing puede llevar más tiempo del esperado si no encontramos buenos assets. Backup: si un modelo concreto no aparece, usar primitivas con materiales mejorados.

#### A3 — Sistema de biomas (Eixample + Costa Barceloneta)

**Objetivo**: implementar el sistema de regiones cambiantes y los 2 primeros biomas.

**Arquitectura**:
- Cada bioma es un módulo intercambiable con: skybox, lista de prefabs de edificios reutilizables, landmarks "hero", iluminación específica, paleta de colores
- Solo 1 bioma cargado a la vez en memoria
- Transición: cuando el jugador cruza el umbral de distancia, el siguiente bioma carga en background con `LoadingManager`. Cuando está listo, fade de 3 segundos con niebla densa que oculta el cambio. Bioma anterior se libera de memoria.

**Bioma 1 — Eixample Barcelona (0-1500m)**
- Edificios cuadriculados con balcones modernistas (5-8 prefabs reutilizables)
- Cielo azul Barcelona con nubes ligeras
- Sol cálido del mediterráneo (color #fef3c7)
- Landmarks "hero": Sagrada Família visible al fondo, Casa Batlló (ocasional)
- Tráfico: coches modernos urbanos
- Paleta: ocres, terracotas, blancos modernistas

**Bioma 2 — Costa Barceloneta (1500-3000m)**
- Carretera con palmeras a un lado, mar al otro
- Cielo azul intenso, sol bajo del atardecer (color #fde68a)
- Landmarks "hero": W Hotel (forma de vela), Torre Mapfre, ondas de mar
- Tráfico: coches deportivos descapotables ocasionales
- Paleta: azules turquesa, dorados de atardecer, verdes de palmeras

**Entregables**:
- Función `BiomeManager` que gestiona carga/descarga
- Bioma Eixample con todos sus assets
- Bioma Costa con todos sus assets
- Transición funcional con fade
- Skyboxes para cada bioma
- Sistema de iluminación por bioma

**Tiempo estimado**: 7-10 días de trabajo real

**Riesgos**: alto. Es la pieza más compleja y la que más tiempo va a llevar. Si surge algún problema de performance en móvil, hay que iterar.

#### A4 — Iluminación + post-procesado

**Objetivo**: que el juego tenga "glow" visual de calidad sin tirar performance abajo.

**Entregables**:
- Sombras con `PCFSoftShadowMap` (solo tier medium/high, nunca low)
- Bloom suave con `UnrealBloomPass` para luces emisivas (rojo ambulancia, azul SVA, ámbar HEMS) — solo tier high
- Ambient Occlusion baked en texturas (no SSAO en runtime)
- Niebla atmosférica suave para profundidad
- Color grading sutil por bioma (Eixample cálido, Costa azulado)

**Tiempo estimado**: 3-5 días de trabajo real

**Riesgos**: medio. Bloom es caro, hay que monitorizar FPS en cada test.

**Pendiente arrastrado de A1**: implementar **MSAA 4x explícito** para tier `high`. En A1 se usa `antialias: true` del WebGLRenderer (AA por defecto del navegador, normalmente FXAA o MSAA según GPU). MSAA 4x explícito requiere `WebGLRenderTarget` con `samples: 4` y un pipeline de render-to-target — encaja aquí porque ya estaremos montando el `EffectComposer` para Bloom.

#### A5 — Sonido y música

**Objetivo**: añadir capa auditiva que multiplique la sensación de polish.

**Música**:
- 1 track principal loopeable, estilo synthwave/retrowave instrumental, ~3 minutos
- Fuentes: Pixabay Music (gratis), Freesound (gratis CC), o Suno/Udio (suscripción si se quiere algo personalizado)
- Streaming progresivo (no descarga completa antes de empezar)

**SFX iniciales (10 sonidos clave)**:
1. Recoger moneda (tinkle metálico)
2. Recoger paciente (chime suave)
3. Salto (whoosh corto)
4. Choque/muerte (crash)
5. Caja sorpresa (apertura mágica)
6. Activación HEMS (rotor + whoosh)
7. Activación SVA (sirena breve)
8. Activación Fever (llamarada)
9. Game over (caída melódica)
10. UI clicks (tap suave)

**Implementación técnica**: Web Audio API simple, sin librerías externas. Manager con precarga al iniciar.

**Botón mute obligatorio** visible en HUD (icono de altavoz en esquina superior).

**Tiempo estimado**: 3-4 días de trabajo real

**Riesgos**: bajo. La parte técnica es directa, lo más laborioso es seleccionar buenos assets de audio.

#### A6 — Pulido + testing

**Objetivo**: que el prototipo esté estable y se vea bien en los 3 dispositivos de referencia.

**Entregables**:
- Testing en Mac M3 → debe ir 60 FPS estables
- Testing en móvil reciente del equipo SEM → debe ir 60 FPS estables
- Testing en móvil 3 años → debe ir 30 FPS estables mínimo
- Lista de bugs encontrados y arreglados
- Métricas finales documentadas
- Despliegue del prototipo en `app.hems.workers.dev`
- Decisión: continuar a Etapa B o ajustar prototipo

**Tiempo estimado**: 4-5 días de trabajo real

**Riesgos**: bajo si los anteriores se han hecho bien. Alto si hemos roto algo en el camino.

### 3.3 Resumen de tiempos de la Etapa A

| Sub-bloque | Días reales |
|---|---|
| A1 — Cimientos técnicos | 4-6 |
| A2 — Modelos GLTF | 5-7 |
| A3 — Biomas | 7-10 |
| A4 — Iluminación | 3-5 |
| A5 — Sonido | 3-4 |
| A6 — Pulido + testing | 4-5 |
| **Total** | **26-37 días reales** |

Con tiempo variable según guardias HEMS, esto se traduce en aproximadamente **3-5 semanas de calendario**, con margen razonable. Objetivo orientativo: **prototipo terminado entre finales de mayo y mediados de junio**.

---

## 4. Etapa B — Expansión modular

Una vez el prototipo está terminado y aprobado, se decide qué expandir y en qué orden. Esta etapa es **opcional según feedback** del prototipo.

### Posibles bloques de expansión

| Bloque | Descripción | Tiempo estimado |
|---|---|---|
| **B1 — Más biomas** | Montjuïc + Pirineos + Costa Brava + Bardenas + Eixample noche | 1-2 semanas por bioma |
| **B2 — Backend + Auth** | Servidor Hetzner CX22, login Google/email, base datos usuarios | 1 semana |
| **B3 — Leaderboard tiempo real** | Top 10 global con actualizaciones live, ranking por bioma | 4-5 días |
| **B4 — Analytics dashboard** | Visitas a landing, sesiones de juego, dispositivos, conversión, tier asignado | 4-5 días |
| **B5 — Música variante por bioma** | Tracks específicos para cada bioma con crossfade en transiciones | 3-4 días |
| **B6 — Animaciones esqueléticas** | Pacientes con animación realista (ahora estáticos) | 1 semana |
| **B7 — Sistema de daño visual** | Decals/abolladuras en ambulancia tras choques | 3-4 días |

### Orden recomendado post-prototipo

Mi recomendación, sujeta a tu decisión cuando llegue el momento:

1. **Primero**: 1-2 biomas más (B1) → demuestra escalabilidad del sistema
2. **Segundo**: Backend + Auth + Leaderboard (B2 + B3) → bloque cohesionado para la Jornada
3. **Tercero**: Analytics (B4) → para tener datos durante la Jornada
4. **Después**: música por bioma, animaciones, daño visual → polish

---

## 5. Setup de Claude Code en Mac local

### Pre-requisitos

- Mac M3 (ya lo tienes)
- Repo `andycitorodri/hems-runner` clonado en local
- Node.js instalado
- Git configurado
- Cuenta de Claude con plan que incluya Claude Code

### Pasos de inicio

1. Instalar Claude Code: `npm install -g @anthropic-ai/claude-code`
2. Abrir terminal, ir a la carpeta del repo: `cd ~/proyectos/hems-runner`
3. Lanzar Claude Code: `claude`
4. Primer mensaje al iniciar: pegar contexto del proyecto + objetivos + apuntar a este `PHASE_2_PLAN.md`

### Cómo trabajar con Claude Code

- **Sesión por sub-bloque**: cada vez que abras Claude Code, decid en qué sub-bloque (A1, A2, etc.) estás trabajando
- **Commits frecuentes**: cada feature funcional → commit + push a GitHub
- **Probar localmente** antes de desplegar: usar `npx serve` o similar para servir el HTML
- **Despliegue**: cuando algo está listo, subir manualmente a Cloudflare como hasta ahora (drag & drop), o configurar auto-deploy desde GitHub

---

## 6. Restricciones técnicas inviolables

Estas reglas vienen de `GRAPHICS_STRATEGY.md` y se aplican durante TODA la Fase 2:

### Asset budgets duros

| Métrica | Límite |
|---|---|
| Triángulos en pantalla simultáneos | <150.000 |
| Draw calls por frame | <100 |
| VRAM total | <300 MB |
| Tamaño descarga inicial | <15 MB |
| Tamaño total con todo cargado | <80 MB |

### Performance objetivo por dispositivo

| Dispositivo | Categoría | Target FPS |
|---|---|---|
| Mac M3 | Desktop high-end | 60 estables |
| Móvil reciente (iPhone 14+, Snapdragon 8 gen 2+) | Mobile high-end | 60 estables |
| Móvil 3-4 años | Mobile mid | 30 estables mínimo |

### Anti-patterns prohibidos

- ❌ "Lo subimos a alta y ya veremos" → empezar siempre desde tier 'low'
- ❌ "Es solo un detalle" → cada partícula/luz/draw call cuenta
- ❌ "En mi máquina va perfecto" → testing obligatorio en móvil 3 años
- ❌ "Lo optimizamos al final" → respetar budgets desde día 1

---

## 7. Riesgos identificados y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Modelos GLTF no encontrados o de mala calidad | Media | Alto | Backup: usar primitivas mejoradas con materiales si no hay assets |
| Performance en móvil 3 años cae por debajo de 30 FPS | Media | Alto | Sistema de adaptación dinámica de tier + recortes selectivos |
| Sourcing de música/SFX gratis no convence | Baja | Medio | Backup: pagar 30-50€ en AudioJungle por pack profesional |
| Guardias HEMS bloquean varias semanas seguidas | Alta | Medio | Estructura modular permite pausas largas sin perder progreso |
| Algo del prototipo no convence (estilo visual) | Media | Medio | Vertical slice permite pivotar antes de invertir más |
| Sistema de biomas más complejo de lo esperado | Alta | Alto | Empezar con bioma simple (Eixample), iterar antes de añadir Costa |

---

## 8. Definición de "prototipo terminado"

El prototipo se considera terminado cuando:

✅ Funciona en los 3 dispositivos de referencia con FPS objetivo
✅ La transición entre Eixample y Costa es suave y sin glitches
✅ Los modelos GLTF se cargan correctamente sin pop-in visible
✅ La música suena con loop sin corte audible
✅ Todos los SFX se disparan en el momento correcto
✅ El bloom funciona en tier high y se desactiva en low/medium
✅ El sistema de tiers detecta correctamente al menos en los 3 dispositivos de testing
✅ No hay regresiones en mecánicas del juego (todo lo actual sigue funcionando)
✅ Está desplegado en `app.hems.workers.dev`
✅ Andy lo ha probado y dado el OK

---

## 9. Próximos pasos inmediatos

### Esta semana (24-30 abril)

1. ✅ Plan generado (este documento)
2. ✅ Migrar a Claude Code en Mac local *(24 abril)*
3. ✅ Crear rama `phase-2` en el repo *(24 abril)*
4. ✅ Empezar **y cerrar** A1 — Cimientos técnicos (quality tiers) *(24-25 abril)*
5. ✅ Validar A1 en móvil real (Mac M3, iPhone 16 Pro Max, Galaxy XCover5) *(25 abril)*
6. ✅ Mergear `phase-2` → `main` *(25 abril)*

### Semana 2 (1-7 mayo)

- ✅ A1 cerrado y mergeado antes de tiempo
- Desplegar `index.html` actualizado a Cloudflare Workers (drag & drop manual)
- Empezar A2 — Sourcing de modelos GLTF

### A partir de ahí

Avance modular según disponibilidad por guardias.

---

## 10. Checklist al cerrar el prototipo

Cuando A1-A6 estén completados, hacer en este orden:

1. Tag de release en Git: `git tag v5.0-prototype`
2. Documentar métricas reales finales en este mismo plan
3. Probar con 3-5 personas de confianza (colegas SEM/UCI)
4. Recoger feedback estructurado (qué les gustó, qué no, performance percibida)
5. Decidir prioridad de Etapa B basándose en feedback
6. Actualizar `PROJECT_STATE.md` con el nuevo estado del proyecto

---

**Documento vivo**: actualizar este `PHASE_2_PLAN.md` después de cada sub-bloque completado, anotando tiempo real invertido, problemas encontrados y decisiones tomadas.
