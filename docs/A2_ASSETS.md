# A2_ASSETS.md
## Catálogo de modelos GLTF para HEMS Runner

**Sub-bloque**: Fase 2 · A2 — Modelos GLTF (sourcing + integración)
**Sesión 1**: sourcing puro (sin código, sin descargas).
**Última actualización**: 2026-04-27

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

| # | Asset | Categoría | Fuente | URL | Autor | Licencia | Tris (~) | Estado | Notas |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Moneda/medalla | GENÉRICO_JUEGO | — | — | — | — | — | PENDIENTE | Prioridad #1 (InstancedMesh, ataca draw calls) |
| 2 | Cono de tráfico | GENÉRICO_JUEGO | — | — | — | — | — | PENDIENTE | Prioridad #2 (también InstancedMesh) |
| 3 | Helicóptero medicalizado | GENÉRICO_JUEGO | — | — | — | — | — | PENDIENTE | Prioridad #3 — HERO, más difícil de encontrar |
| 4 | Ambulancia low-poly | GENÉRICO_JUEGO | — | — | — | — | — | PENDIENTE | HERO del jugador |
| 5 | Paciente acostado en camilla | GENÉRICO_JUEGO | — | — | — | — | — | PENDIENTE | Estático en A2 |
| 6 | Caja sorpresa (cartón con lazo) | GENÉRICO_JUEGO | — | — | — | — | — | PENDIENTE | — |
| 7 | Coche civil 1 | GENÉRICO_JUEGO | — | — | — | — | — | PENDIENTE | Variante tráfico |
| 8 | Coche civil 2 | GENÉRICO_JUEGO | — | — | — | — | — | PENDIENTE | Variante tráfico |
| 9 | Coche civil 3 | GENÉRICO_JUEGO | — | — | — | — | — | PENDIENTE | Variante tráfico |
| 10 | Coche civil 4 (opcional) | GENÉRICO_JUEGO | — | — | — | — | — | PENDIENTE | Variante tráfico |
| 11 | Valla urbana | GENÉRICO_JUEGO | — | — | — | — | — | PENDIENTE | Obstáculo |
| 12 | Contenedor basura | GENÉRICO_JUEGO | — | — | — | — | — | PENDIENTE | Obstáculo |
| 13 | Sagrada Família low-poly | BIOMA_EIXAMPLE | — | — | — | — | — | PENDIENTE | HERO landmark |
| 14 | Casa Batlló | BIOMA_EIXAMPLE | — | — | — | — | — | PENDIENTE | HERO landmark |
| 15 | Edificio modernista 1 | BIOMA_EIXAMPLE | — | — | — | — | — | PENDIENTE | Reutilizable (balcones, fachada) |
| 16 | Edificio modernista 2 | BIOMA_EIXAMPLE | — | — | — | — | — | PENDIENTE | Reutilizable |
| 17 | Edificio modernista 3 | BIOMA_EIXAMPLE | — | — | — | — | — | PENDIENTE | Reutilizable |
| 18 | Edificio modernista 4 (opcional) | BIOMA_EIXAMPLE | — | — | — | — | — | PENDIENTE | Reutilizable |
| 19 | Edificio modernista 5 (opcional) | BIOMA_EIXAMPLE | — | — | — | — | — | PENDIENTE | Reutilizable |
| 20 | Skybox día Barcelona | BIOMA_EIXAMPLE | — | — | — | — | — | PENDIENTE | HDRI o gradient sólido |
| 21 | W Hotel "vela" | BIOMA_BARCELONETA | — | — | — | — | — | PENDIENTE | HERO landmark |
| 22 | Torre Mapfre | BIOMA_BARCELONETA | — | — | — | — | — | PENDIENTE | HERO landmark |
| 23 | Palmera | BIOMA_BARCELONETA | — | — | — | — | — | PENDIENTE | Reutilizable, varias instancias |
| 24 | Paseo marítimo / suelo baldosas | BIOMA_BARCELONETA | — | — | — | — | — | PENDIENTE | Tileable |
| 25 | Skybox costa abierta | BIOMA_BARCELONETA | — | — | — | — | — | PENDIENTE | Atardecer |

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

(Se irá llenando con observaciones durante el sourcing: packs descartados, autores recurrentes, paquetes que cubren múltiples assets, etc.)

---

## Créditos pendientes

(Lista de autores + URLs de los modelos CC-BY/CC-BY-SA finalmente integrados, para incluir en pantalla de créditos del juego cuando se cierre A2.)
