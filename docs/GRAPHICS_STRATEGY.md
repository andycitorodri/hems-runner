# GRAPHICS_STRATEGY.md
## Estrategia gráfica para HEMS Runner — Fase 2

**Propósito**: este documento es el **norte gráfico** durante el desarrollo de Fase 2 (assets reales, shaders, post-procesado). Su objetivo es evitar el "feature creep gráfico" que produce juegos preciosos en desktop pero injugables en móvil — precisamente lo contrario de lo que necesita HEMS Runner, ya que la mayoría de asistentes a la Jornada lo abrirán desde un QR en sus móviles.

**Regla de oro**: cada feature gráfica nueva debe medirse en al menos 3 dispositivos (desktop, móvil gama alta, móvil gama media) ANTES de mergear. Si baja >10 FPS en cualquiera, se optimiza o se gated detrás de tier 'high'.

---

## 1. Sistema de Quality Tiers

### Detección automática

```javascript
function detectQualityTier() {
  // Hardware
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4; // GB
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

  // GPU info (string del fabricante/modelo)
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
  const gpu = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';

  // Heurística de tier inicial
  let tier;
  if (!isMobile && cores >= 8 && memory >= 8) {
    tier = 'high';   // Desktop potente
  } else if (!isMobile || (memory >= 6 && cores >= 6)) {
    tier = 'medium'; // Desktop normal o móvil gama alta
  } else {
    tier = 'low';    // Móvil gama media-baja
  }

  // Excepción: GPUs Apple M1+/M2/M3 son bestiales aunque sea "móvil" (iPad)
  if (/Apple M\d/.test(gpu)) tier = 'high';

  return tier;
}

let QUALITY_TIER = detectQualityTier();
```

### Adaptación dinámica

Después de los primeros **3 segundos de juego**, medir FPS real. Si el FPS medio < 30, **bajar tier automáticamente** (high → medium → low). Avisar al jugador con un toast discreto: "Modo gráfico ajustado para fluidez".

```javascript
let fpsHistory = [];
function checkPerformanceAfterStart(elapsedMs, currentFPS) {
  fpsHistory.push(currentFPS);
  if (elapsedMs > 3000 && fpsHistory.length > 30) {
    const avgFPS = fpsHistory.slice(-60).reduce((a, b) => a + b) / 60;
    if (avgFPS < 30 && QUALITY_TIER !== 'low') {
      QUALITY_TIER = QUALITY_TIER === 'high' ? 'medium' : 'low';
      applyQualitySettings();
      showToast('⚙️ Modo gráfico ajustado', 'optimizando para tu dispositivo');
    }
  }
}
```

### Aplicación de tiers

Cada feature gráfica consulta `QUALITY_TIER`:

| Feature | Low | Medium | High |
|---|---|---|---|
| Pixel ratio | 1.0 | 1.5 | 2.0 (retina) |
| Antialias | OFF | ON | ON (MSAA 4x) |
| Sombras | OFF | Básicas | PCFSoft + cascada |
| Bloom (post) | OFF | OFF | Suave (threshold 0.85) |
| Motion blur | OFF | OFF | Sutil (3 frames) |
| DOF / Depth of field | OFF | OFF | OFF (no aporta) |
| Partículas (cantidad) | 30% | 60% | 100% |
| Geometría (LOD distancia) | LOD2 a 15m | LOD1 a 15m, LOD2 a 30m | LOD1 a 30m, LOD2 a 60m |
| Texturas | 512px | 1024px | 2048px |
| Anisotropic filtering | 1x | 4x | 16x |
| Niebla / fog | Lineal simple | Exponencial | Exponencial + scattering |
| Reflejos | OFF | Cubemap estático | Cubemap dinámico |
| Skybox | Color sólido | Cubemap baja res | Cubemap HDR |

---

## 2. Asset Budgets (presupuestos duros)

### Por modelo 3D

| Tipo de objeto | Triángulos máx | Texturas | Notas |
|---|---|---|---|
| Vehículo principal (ambulancia) | 20.000 | Color 2K + Normal 1K + Roughness 1K | Modelo "hero", merece detalle |
| Helicóptero HEMS | 25.000 | Color 2K + Normal 1K | Aparece en momentos clave (modo HEMS) |
| Pacientes (NPCs) | 5.000 c/u | Color 1K compartida (atlas) | 3-4 variantes, atlas único |
| Monedas / coleccionables | 500 | Color 256px shared | Centenares en pantalla, baratas |
| Escenario base (carretera, edificios) | 50.000 total | 2K modulares | Repetir módulos, no único |
| Props decorativos | 1.000 c/u | 512px | Conos, postes, señales |

### Por nivel completo

| Métrica | Target | Crítico |
|---|---|---|
| Triángulos en pantalla simultáneos | <150.000 | <250.000 |
| Draw calls por frame | <100 | <200 |
| Texturas únicas en VRAM | <30 | <50 |
| **VRAM total** | **<300 MB** | **<500 MB** |
| **Tamaño de descarga inicial** | **<15 MB** | **<30 MB** |
| Tamaño total con todo cargado | <80 MB | <150 MB |

### Reglas para texturas

- **Compresión obligatoria**: KTX2 con Basis Universal (Three.js soporta nativo). Reduce 4-8x sin pérdida visual perceptible.
- **Mipmaps**: siempre activos
- **Atlas**: agrupar texturas pequeñas (UI, partículas, props) en atlas para reducir draw calls
- **Naming convention**: `<model>_<tipo>_<resolución>.ktx2` → ej. `ambulance_color_2k.ktx2`

---

## 3. Estrategia de carga (Progressive Loading)

### Pre-carga durante menú principal

Mientras el usuario ve el menú/título, ya cargar:
1. Modelos del jugador (ambulancia)
2. Texturas del escenario base
3. Audio principal (música de juego)

Así, al pulsar "Jugar", **no hay pantalla negra de carga** — todo está listo.

### Carga lazy de assets secundarios

Estos pueden cargar en background mientras el usuario juega los primeros segundos:
- Modelo del helicóptero (no aparece hasta que activas modo HEMS)
- Variantes de pacientes (carga al completar primera oleada)
- Efectos especiales del Fever Mode

### Loader con feedback

Si la carga inicial supera 2 segundos, mostrar barra de progreso real (no fake spinner). Three.js tiene `LoadingManager` para esto:

```javascript
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = (url, loaded, total) => {
  const percent = (loaded / total * 100).toFixed(0);
  document.getElementById('loading-bar').style.width = percent + '%';
};
```

---

## 4. Lista priorizada de features gráficas para Fase 2

### Must have (impacto alto, coste razonable)

1. **Modelos GLTF reales** del vehículo y helicóptero con materiales PBR (color + normal + roughness/metallic)
2. **Texturas modulares** del escenario (carretera, edificios urbanos repetibles)
3. **Sistema de partículas GPU** (instanced rendering) — 10x más eficiente que las partículas CPU actuales para monedas/explosiones
4. **Iluminación diferida** o cluster shading si hay >5 luces dinámicas
5. **Ambient occlusion** baked (en texturas) — gratis en runtime, da mucha sensación de profundidad

### Nice to have (impacto medio, coste medio)

6. **Bloom sutil** (solo tier high) para luces emisivas (rojo/azul ambulancia, lights del HEMS)
7. **Reflejos en cubemap estático** del cielo
8. **Skybox HDR** con scattering atmosférico
9. **Animaciones esqueléticas** de pacientes (ahora son figuras estáticas)
10. **Sistema de daño/wear** en la ambulancia tras choques (decals)

### Skip / no aporta para este juego

- ❌ **Ray tracing** — coste astronómico, no aporta para estilo arcade
- ❌ **Depth of field** — pantalla pequeña en móvil, no se aprecia
- ❌ **Motion blur agresivo** — provoca mareo en endless runners
- ❌ **Tessellation** — overkill para los modelos planeados
- ❌ **Volumetric lighting** — coste enorme, poco beneficio en exterior diurno

---

## 5. Dispositivos de referencia para testing

Mantener estos 3 dispositivos como **benchmark obligatorio** antes de cada release:

| Dispositivo | Categoría | Target FPS | Uso |
|---|---|---|---|
| Mac M3 (desktop) | High end | 60 estables | Desarrollo + tope superior |
| Móvil reciente del equipo SEM (iPhone 14+/Android Snapdragon 8 gen 2+) | Mid-high | 60 estables | Audiencia mayoritaria |
| Móvil 3-4 años (iPhone X / Android gama media 2022) | Low-mid | 30 estables | Edge case crítico, no debe sufrir |

**Si en el dispositivo "low-mid" hay momentos <30 FPS, revisar antes de release.**

---

## 6. Anti-patterns a evitar

### "Lo subimos a alta y ya veremos"
La causa #1 de juegos web injugables. Empezar siempre desde el tier 'low' como base, añadir features gradualmente.

### "Es solo un detalle"
Cada partícula extra, cada luz extra, cada draw call extra suma. Si tienes 60 monedas con micro-explosiones de 5 partículas cada una al recogerlas... son 300 partículas potenciales en 1 segundo. Calcular siempre el peor caso.

### "En mi máquina va perfecto"
Tu Mac M3 es el percentil 95 de hardware. La media de tus usuarios va con un móvil 2-3 años más viejo y batería al 30%. El feedback de "va lento" siempre llega tarde.

### "Lo optimizamos al final"
La optimización al final es tirar trabajo a la basura. Establecer budgets desde el inicio y respetarlos durante todo el desarrollo.

---

## 7. Métricas a trackear durante Fase 2

Implementar un panel oculto (Cmd+D o similar) que muestre en tiempo real:

- FPS actual y promedio últimos 5 segundos
- Draw calls por frame
- Triángulos en pantalla
- Memoria texturas (estimada)
- Tier actual
- Razón del tier (auto / forzado / degradado)

Esto se queda en builds de desarrollo, **NO en producción**. En producción se puede dejar telemetría anónima opcional para ver qué tier se asigna a usuarios reales.

---

## 8. Calendario sugerido para Fase 2

| Hito | Mes | Entregable |
|---|---|---|
| Setup quality tiers + métricas | Mayo 2026 | Sistema de tiers funcionando con assets actuales |
| Modelos GLTF + texturas reales | Junio 2026 | Ambulancia y helicóptero modelados |
| Escenario modular | Julio 2026 | Carretera + edificios urbanos repetibles |
| Iluminación + post-procesado | Agosto 2026 | Bloom (tier high) + cubemap reflexiones |
| Pulido + optimización exhaustiva | Septiembre 2026 | Testing en 5+ dispositivos reales |
| Buffer / contingencia | Primera mitad octubre 2026 | Fixes finales |
| **LAUNCH** | **14 octubre 2026** | I Jornada de Trauma Parc Taulí |

---

## 9. Recursos y referencias

### Three.js performance docs
- https://threejs.org/manual/#en/optimize-lots-of-objects
- https://threejs.org/manual/#en/performance

### Herramientas de optimización
- **gltf-transform**: CLI para optimizar GLTFs (compresión, drop unused, simplify mesh)
- **Basis Universal**: convertir texturas a KTX2
- **Spector.js**: extensión de navegador para debug WebGL
- **Stats.js**: monitor FPS en desarrollo

### Inspiración de juegos web bien optimizados
- **Slither.io**: simplicidad visual, scaling perfecto
- **Hexagonal.io / Agar.io**: 2D pero con gestión de muchos objetos eficiente
- **Krunker.io**: 3D shooter en navegador con tiers de calidad bien hechos

---

**Documento vivo**: actualizar este `GRAPHICS_STRATEGY.md` cada vez que se tome una decisión importante de diseño gráfico durante Fase 2.
