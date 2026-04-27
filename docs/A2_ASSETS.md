# A2_ASSETS.md
## Catálogo de modelos GLTF para HEMS Runner

**Sub-bloque**: Fase 2 · A2 — Modelos GLTF (sourcing + integración)
**Sesión 1**: sourcing puro (sin código, sin descargas).
**Última actualización**: 2026-04-27
**Cobertura**: 20/25 candidatos. Pendientes: paciente en camilla (5), 3 landmarks Sketchfab (Casa Batlló, W Hotel, Torre Mapfre) y 2 skyboxes.

---

## Estilo y referencias visuales

- **Estilo objetivo**: low-poly tipo Crossy Road / Alto's Odyssey.
- **Paleta**: colores planos saturados, sin texturas fotorrealistas.
- **Animaciones**: estáticas en A2; animaciones esqueléticas quedan para Fase B6.

---

## Fuentes prioritarias

| Fuente | URL | Licencia típica | Notas |
|---|---|---|---|
| **Quaternius** | https://quaternius.com | CC0 | Packs temáticos enormes (Ultimate City, Modular Buildings, etc.). Ideal para cobertura múltiple. |
| **Kenney** | https://kenney.nl | CC0 | Packs arcade muy consistentes en estilo. City Kit, Vehicle Kit, etc. |
| **Poly Pizza** | https://poly.pizza | CC-BY / CC0 (verificar por modelo) | Buscador unificado, modelos sueltos. Verificar autor + licencia siempre. |
| **Sketchfab** | https://sketchfab.com | Filtrar por **Downloadable** + **Creative Commons** | Más variedad pero licencias dispares. Anotar autor y exact licencia (CC-BY, CC-BY-SA, CC0). |

**Regla de licencias**:
- CC0 → libre, no requiere atribución.
- CC-BY → libre, **requiere atribución** (anotar autor + URL en créditos del juego).
- CC-BY-SA → libre, **requiere atribución + obliga a compartir derivados con misma licencia**. Aceptable para HEMS Runner (proyecto abierto), pero anotarlo.
- CC-BY-NC → **NO USAR** (prohibe uso comercial; aunque HEMS Runner sea gratis, el proyecto puede tener flujo no-comercial dudoso → mejor evitar).

---

## Pipeline de integración (referencia, se aplica en Sesión 2+)

1. **Descarga** GLTF/GLB desde la fuente.
2. **Optimización**: `gltf-transform optimize input.glb output.glb`
   - Decimación de meshes redundantes.
   - Limpieza de attributes no usados.
   - Reduce tamaño 60-80% típicamente.
3. **Texturas a KTX2** con Basis Universal (compresión GPU-friendly).
4. **Carga** con `GLTFLoader` de Three.js + `KTX2Loader`.
5. **Reemplazo** de geometrías primitivas manteniendo lógica de física/colisión existente.
6. **InstancedMesh** para assets que aparecen muchas veces (monedas, conos, props decorativos) — ataca directamente la deuda de `draws=539` heredada de A1.

---

## Pipeline ajustado tras Sesión 1 — conversión FBX→glTF

**Hallazgo (2026-04-27)**: la mayoría de los packs de Quaternius candidatos para A2/A3 vienen sólo en **FBX, OBJ y Blend** — no en glTF directo. Concretamente afecta a `Q-Cars`, `Q-PT`, `Q-Build`, `Q-Streets`. Solo dos packs Quaternius dan **glTF directo**: `Q-Nature` (Ultimate Stylized Nature) y `Q-PlatU` (Ultimate Platformer Pack).

**Decisión**: en Sesión 2 se instalará **Blender CLI** y se montará un script bash de conversión batch FBX→GLB que se ejecutará antes de `gltf-transform optimize`. Es el modo más reproducible y escalable de homogeneizar el pipeline.

**Pipeline actualizado** (sustituye al de la sección anterior cuando empiece la Sesión 2):

1. **Descargar** pack desde la fuente (manual, Sesión 2).
2. **(NUEVO) Conversión FBX/OBJ → GLB** con Blender CLI headless si el pack no trae glTF directo.
3. `gltf-transform optimize input.glb output.glb` (decimación + limpieza).
4. Texturas a **KTX2** con Basis Universal.
5. Carga con **`GLTFLoader` + `KTX2Loader`** en Three.js.
6. **`InstancedMesh`** para assets masivos (monedas, conos, edificios reutilizables).

**Alternativa rechazada**: conversión online 1 a 1 (CDN tipo "fbx2gltf online"). Motivos: no escala con un pack de 76 edificios, no es reproducible (no queda script en el repo), y dependencia externa no auditada para un proyecto que se desplegará públicamente.

---

## Packs verificados (Sesión 1 — 2026-04-27)

URLs verificadas con `WebFetch`. Cada pack se referencia en la tabla por **clave corta** para evitar repetir URL.

| Clave | Nombre completo | URL | Licencia | Modelos | Formato | Notas |
|---|---|---|---|---|---|---|
| `K-Cars` | Kenney — Car Kit | https://kenney.nl/assets/car-kit | CC0 | 45 archivos | (verificar al descargar — Kenney suele dar GLB) | Autor: Kenney. Cobertura sospechada: coches civiles, posible ambulancia. |
| `K-Plat` | Kenney — Platformer Kit | https://kenney.nl/assets/platformer-kit | CC0 | 150 archivos | (verificar al descargar) | Autor: Kenney. Candidato secundario para moneda. |
| `Q-Cars` | Quaternius — Cars Pack | https://quaternius.com/packs/cars.html | CC0 | 8 coches | FBX, OBJ, Blend (NO glTF directo) | Autor: Quaternius. Cobertura: 4 variantes de tráfico. |
| `Q-PT` | Quaternius — Public Transport | https://quaternius.com/packs/publictransport.html | CC0 | 12 modelos | FBX, OBJ, Blend | Autor: Quaternius. **Incluye ambulancia explícitamente** + autobús + tren. |
| `Q-Build` | Quaternius — Ultimate Buildings | https://quaternius.com/packs/ultimatetexturedbuildings.html | CC0 | 76 edificios | FBX, OBJ, Blend | Autor: Quaternius. Estilo no confirmado modernista; sirve como base genérica para Eixample. |
| `Q-Streets` | Quaternius — Modular Streets | https://quaternius.com/packs/modularstreets.html | CC0 | 25 modelos | FBX, OBJ, Blend | Autor: Quaternius. Carreteras modulares; props de calle (cono/valla/contenedor) **a verificar al descargar**, no listados explícitamente. |
| `Q-Nature` | Quaternius — Ultimate Stylized Nature | https://quaternius.com/packs/ultimatestylizednature.html | CC0 | 63 modelos | **FBX, OBJ, Blend, glTF** | Autor: Quaternius. Palmeras **no confirmadas explícitamente**, verificar al descargar. |
| `Q-PlatU` | Quaternius — Ultimate Platformer Pack | https://quaternius.itch.io/ultimate-platformer-pack | CC0 | >100 modelos | **FBX, OBJ, Blend, glTF** | Autor: Quaternius. "Powerups, Hazards, Animated mechanics" — candidato fuerte para moneda y caja sorpresa. |
| `PP-Heli-J` | Poly Pizza — Helicopter (jeremy, 2017) | https://poly.pizza/m/eb7b31pjGtQ | **CC-BY 3.0** | 1 modelo | OBJ, glTF | Autor: jeremy. Low-poly genérico, sin cruz roja (decal posterior). **Atribución obligatoria.** |
| `PP-Heli-G` | Poly Pizza — Helicopter (Poly by Google, 2017) | https://poly.pizza/m/cTzINMr0WdS | **CC-BY 3.0** | 1 modelo | OBJ, glTF | Autor: Poly by Google. Low-poly genérico, sin cruz roja. **Atribución obligatoria.** |

### Notas de pipeline derivadas

- **Quaternius mayoritariamente NO da glTF directo** (Cars, Public Transport, Ultimate Buildings, Modular Streets vienen en FBX/OBJ/Blend). Sesión 2 deberá añadir paso de conversión vía Blender CLI o `obj2gltf` antes de `gltf-transform optimize`. Los dos packs que sí dan glTF directo son `Q-Nature` y `Q-PlatU`.
- **Poly Pizza CC-BY**: ambos helicópteros candidatos requieren atribución. Anotar en pantalla de créditos del juego cuando se elija el final.
- **Kenney**: el formato exacto no aparece en la página del pack pero históricamente Kenney da GLB. Verificar al descargar en Sesión 2.

---

## Tabla de assets

Categorías:
- **GENÉRICO_JUEGO** — usados en gameplay nuclear (A2).
- **BIOMA_EIXAMPLE** — escenario Eixample Barcelona (A3).
- **BIOMA_BARCELONETA** — escenario Costa Barceloneta (A3).

Estados:
- **PENDIENTE** — aún no se ha buscado candidato.
- **CANDIDATO** — URL identificada, licencia verificada, pendiente decisión final.
- **DESCARGADO** — archivo en `/assets/models/` (Sesión 2+).
- **OPTIMIZADO** — pasado por `gltf-transform` + KTX2 (Sesión 2+).
- **INTEGRADO** — ya carga en el juego sustituyendo primitiva (Sesión 3+).

| # | Asset | Categoría | Pack candidatos | Licencia | Estado | Notas |
|---|---|---|---|---|---|---|
| 1 | Moneda/medalla | GENÉRICO_JUEGO | `Q-PlatU` (1ª), `K-Plat` (2ª) | CC0 / CC0 | CANDIDATO | InstancedMesh — ataca draw calls. Verificar al descargar que existe modelo de coin/gem. |
| 2 | Cono de tráfico | GENÉRICO_JUEGO | `Q-Streets` (1ª) | CC0 | CANDIDATO | InstancedMesh. Props de calle no listados explícitamente — verificar al descargar; si no, buscar pack alternativo en Sesión 2. |
| 3 | Helicóptero medicalizado | GENÉRICO_JUEGO | `PP-Heli-J` (1ª), `PP-Heli-G` (2ª) | CC-BY 3.0 / CC-BY 3.0 | CANDIDATO | Sin cruz roja en el modelo — añadir decal/textura emisiva en integración. Atribución obligatoria. |
| 4 | Ambulancia low-poly | GENÉRICO_JUEGO | `Q-PT` (1ª), `K-Cars` (2ª) | CC0 / CC0 | CANDIDATO | `Q-PT` confirma "ambulance" explícitamente. |
| 5 | Paciente acostado en camilla | GENÉRICO_JUEGO | — | — | PENDIENTE | No cubierto por packs verificados. Buscar en Poly Pizza ("patient", "stretcher", "medical bed") en próxima ronda. |
| 6 | Caja sorpresa (cartón con lazo) | GENÉRICO_JUEGO | `Q-PlatU` (1ª) | CC0 | CANDIDATO | "Powerups" del pack es el candidato; verificar variante con lazo o aplicar textura. |
| 7 | Coche civil 1 | GENÉRICO_JUEGO | `K-Cars` (1ª), `Q-Cars` (2ª) | CC0 / CC0 | CANDIDATO | Cobertura múltiple de un solo pack. |
| 8 | Coche civil 2 | GENÉRICO_JUEGO | `K-Cars` / `Q-Cars` | CC0 | CANDIDATO | Idem. |
| 9 | Coche civil 3 | GENÉRICO_JUEGO | `K-Cars` / `Q-Cars` | CC0 | CANDIDATO | Idem. |
| 10 | Coche civil 4 (opcional) | GENÉRICO_JUEGO | `K-Cars` / `Q-Cars` | CC0 | CANDIDATO | Idem. |
| 11 | Valla urbana | GENÉRICO_JUEGO | `Q-Streets` (1ª) | CC0 | CANDIDATO | Verificar al descargar (ver nota fila 2). |
| 12 | Contenedor basura | GENÉRICO_JUEGO | `Q-Streets` (1ª) | CC0 | CANDIDATO | Verificar al descargar (ver nota fila 2). |
| 13 | Sagrada Família low-poly | BIOMA_EIXAMPLE | Sketchfab — wareFLO | CC-BY | CANDIDATO | URL: https://sketchfab.com/3d-models/sagrada-familia-1e6a870501584df28a328d1278b96b97 — 42.7k tris, 21.2k verts. HERO landmark Eixample. Low-poly monocromo limpio, torres bien diferenciadas, encaja con Quaternius/Kenney. Colores vía materiales Three.js. **Atribución obligatoria.** |
| 14 | Casa Batlló | BIOMA_EIXAMPLE | — | — | PENDIENTE | Sketchfab manual con criterio visual (sesión final, junto al usuario). |
| 15 | Edificio modernista 1 | BIOMA_EIXAMPLE | `Q-Build` (1ª) | CC0 | CANDIDATO | Base genérica; se "modernizará" con texturas custom (balcones, ocres) en A3. |
| 16 | Edificio modernista 2 | BIOMA_EIXAMPLE | `Q-Build` | CC0 | CANDIDATO | Idem. |
| 17 | Edificio modernista 3 | BIOMA_EIXAMPLE | `Q-Build` | CC0 | CANDIDATO | Idem. |
| 18 | Edificio modernista 4 (opcional) | BIOMA_EIXAMPLE | `Q-Build` | CC0 | CANDIDATO | Idem. |
| 19 | Edificio modernista 5 (opcional) | BIOMA_EIXAMPLE | `Q-Build` | CC0 | CANDIDATO | Idem. |
| 20 | Skybox día Barcelona | BIOMA_EIXAMPLE | — | — | PENDIENTE | A3: empezar con gradient sólido procedural en shader (sin asset). HDRIs caros; opcional buscar en Poly Haven. |
| 21 | W Hotel "vela" | BIOMA_BARCELONETA | — | — | PENDIENTE | Sketchfab manual con criterio visual (sesión final, junto al usuario). |
| 22 | Torre Mapfre | BIOMA_BARCELONETA | — | — | PENDIENTE | Sketchfab manual con criterio visual (sesión final, junto al usuario). |
| 23 | Palmera | BIOMA_BARCELONETA | `Q-Nature` (1ª) | CC0 | CANDIDATO | Palmera no confirmada explícitamente; pack tiene 63 modelos de naturaleza, alta probabilidad. Verificar al descargar. |
| 24 | Paseo marítimo / suelo baldosas | BIOMA_BARCELONETA | — | — | PENDIENTE | Probable solución vía textura tileable + plano (no asset GLTF). Tratar en A3. |
| 25 | Skybox costa abierta | BIOMA_BARCELONETA | — | — | PENDIENTE | Idem fila 20: gradient procedural primero. |

---

## Lista a sourcear (orden de prioridad)

### GENÉRICO_JUEGO — prioridad ALTA (A2 los usa todos)

1. **Moneda/medalla** ← empezar por aquí (InstancedMesh, ataca draw calls).
2. **Cono de tráfico** (mismo motivo: InstancedMesh).
3. **Helicóptero medicalizado HEMS**.
4. **Ambulancia low-poly**.
5. **Paciente acostado en camilla**.
6. **Caja sorpresa** (cartón con lazo).
7. **3-4 coches civiles** (variantes tráfico).
8. **Valla y contenedor** (obstáculos urbanos).

### BIOMA_EIXAMPLE — prioridad MEDIA (A3 los usa)

- **Sagrada Família** low-poly (HERO).
- **Casa Batlló** (HERO).
- **3-5 edificios modernistas** reutilizables (balcones, fachadas).
- **Skybox día Barcelona** (HDRI o solid color con gradient).

### BIOMA_BARCELONETA — prioridad MEDIA

- **W Hotel "vela"** (HERO).
- **Torre Mapfre** (HERO).
- **Palmeras**.
- **Paseo marítimo** / suelo de baldosas.
- **Skybox costa abierta**.

---

## Easter eggs (A3, no requieren sourcing — son texturas)

- **Grafiti "ANDREY"** para fachadas Eixample.
- **Slot reservado para marca futura** (placeholder hasta que el nombre esté definido).

---

## Notas de búsqueda

### Sesión 1 — 2026-04-27

**Packs descartados (404 / no existentes)**:
- Kenney "Transportation Kit" — URL `https://kenney.nl/assets/transportation-kit` da 404. No aparece tampoco en el listado actual de packs 3D de Kenney; helicóptero hay que sourcearlo en Poly Pizza.
- Quaternius "Ultimate Modular City" — URL antigua sugerida da 404. Web reorganizada; el pack equivalente actual es `Q-Streets` + `Q-Build` combinados.
- Quaternius "Modular Buildings" (URL antigua) — 404. Reemplazado por `Q-Build` (Ultimate Buildings, 76 modelos).

**Autor recurrente**: Quaternius (laulhet@gmail.com) — todos sus packs CC0; máxima cobertura para A2/A3 con un solo autor a citar (aunque CC0 no obliga).

**Cobertura múltiple confirmada**:
- `Q-PT` cubre ambulancia (4) y potencialmente otros vehículos de emergencia.
- `Q-Build` cubre todos los edificios genéricos de Eixample (15-19) base.
- `Q-PlatU` cubre moneda (1) y caja sorpresa (6) en un solo pack glTF.
- `Q-Streets` aspira a cubrir cono (2), valla (11), contenedor (12) — pendiente verificar al descargar.

**Pendientes para próxima ronda de sourcing** (antes de Sesión 2):
- Paciente acostado en camilla (5) — no encontrado en packs verificados.
- Verificar visualmente landmarks Sketchfab restantes: Casa Batlló, W Hotel, Torre Mapfre.
- Skyboxes: confirmar enfoque (gradient procedural primero, HDRI Poly Haven después si hace falta).

**Plan B landmarks restantes** (Casa Batlló, W Hotel, Torre Mapfre): si no aparecen modelos Sketchfab utilizables tras filtrar (CC-BY/CC0 + Downloadable + peso razonable), modelar como cajas estilizadas low-poly directamente en Three.js durante A3 (5-10 min por landmark). La silueta general es reconocible y mantiene coherencia con el estilo del juego.

### Sesión 1 — landmark Sagrada Família (decisión)

**Modelo elegido**: wareFLO (CC-BY, 42.7k tris) — fila 13.

Se compararon 4 candidatos Sketchfab (filtro CC-BY + CC0 + Downloadable):

| Candidato | Tris | Licencia | Decisión |
|---|---|---|---|
| **wareFLO** | 42.7k | CC-BY | **ELEGIDO** — peso óptimo (<50k target) + estilo low-poly compatible con catálogo. |
| danirocha02 "Templo Epiatório" | 966.7k | CC-BY | Descartado — peso 23× target. |
| Roberto Domínguez | 930.4k | CC-BY | Descartado — peso excesivo + topología sucia ("Generated with AI"). |
| MaaB "SAGRADA FAMILIA" | 47k | CC-BY | Descartado — STL para impresión 3D con peana decorativa; requeriría limpieza extra en Blender no justificada. |

**Observación general sobre búsqueda Sketchfab**: el filtro CC-BY + CC0 + Downloadable es muy restrictivo si se incluye "low poly" en el término (1 resultado para "sagrada familia low poly"). Funciona mejor sin ese término (12 resultados, de los cuales solo 1-2 son utilizables tras filtrar fotogrametrías y modelos pesados). **Aplicar este criterio para los 3 landmarks restantes.**

---

## Créditos pendientes

(Lista de autores + URLs de los modelos CC-BY/CC-BY-SA finalmente integrados, para incluir en pantalla de créditos del juego cuando se cierre A2.)

- **wareFLO** — Sagrada Família — https://sketchfab.com/3d-models/sagrada-familia-1e6a870501584df28a328d1278b96b97 — CC-BY (Attribution).
