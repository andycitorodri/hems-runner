# DEPLOY_RUNBOOK.md
## Cómo actualizar HEMS Runner en producción

**Audiencia**: tú mismo en el futuro, cuando hayas olvidado los detalles. Este es un runbook **paso a paso**, sin teoría, solo acciones.

---

## Caso 1: Cambio rápido al juego (1-2 minutos)

**Cuando**: arreglaste un bug, ajustaste un valor, mejoraste un visual. Quieres que esté en producción YA.

**Desde septiembre 2026 el deploy es multi-archivo con `wrangler`** (antes era drag & drop de `index.html` en el dashboard; ya no vale porque el juego carga `assets/models/*.glb` por ruta relativa y esos archivos no llegaban).

**Opción A — doble clic (sin terminal)**:
```
1. Guarda los cambios en index.html / assets/
2. En el Finder, doble clic en SUBIR.command (raíz del repo)
3. Hace git push de la rama actual + wrangler deploy
4. La primera vez se abre el navegador para autorizar Cloudflare (login OAuth)
5. Cuando diga "✅ LISTO", abre https://hems.jornadaimpacte.com con Cmd+Shift+R
```

**Opción B — terminal**:
```bash
cd ~/hems-runner
git push origin $(git rev-parse --abbrev-ref HEAD)
npx wrangler@4 deploy
```

**Dónde queda**: `https://hems.jornadaimpacte.com` (dominio de la jornada) y `https://app.hems.workers.dev` (URL técnica, la misma app). Un solo deploy actualiza las dos.

**Qué sube**: `index.html` + todo lo que haya en `assets/`. Nada más — el resto (docs, .git, wrangler.jsonc, SUBIR.command, Claude outputs…) está excluido en `.assetsignore`. Wrangler solo sube los archivos nuevos o modificados desde el último deploy, así que un cambio en `index.html` sube 1 archivo.

**Para ver qué subiría sin desplegar**: `npx wrangler@4 deploy --dry-run`.

---

## Caso 2: La URL produce error 404 (o un asset da 404)

**Síntoma A**: "Cuidado. Parece que algo no está bien" — error 404 en la URL raíz.

**Causa habitual**: `index.html` no está en la raíz del repo o se ha renombrado. Wrangler sirve la raíz del repo (`"directory": "./"` en `wrangler.jsonc`) y espera `index.html` ahí.

**Síntoma B**: el juego carga pero un archivo de `assets/` da 404 en la consola del navegador (ej. `coin-gold.glb`).

**Causas** (orden de probabilidad):
```
1. Propagación: recién desplegado, un asset nuevo puede tardar 10-30 s en
   responder 200 en todas las regiones. Espera y recarga.
2. El archivo está excluido por .assetsignore → npx wrangler@4 deploy --dry-run
   y comprueba que aparece. Si no, revisa los patrones de .assetsignore.
3. Mayúsculas/minúsculas: las rutas son case-sensitive en producción
   (assets/models/Textures/colormap.png ≠ .../textures/...). El GLB de Kenney
   referencia "Textures/colormap.png" con T mayúscula.
```

---

## Caso 3: La URL da error SSL ("No seguro" / "no se puede crear conexión segura")

**Síntoma**: error de certificado en navegador móvil/desktop.

**Causa**: subdomain recién creado o cambiado, certificado SSL aún no provisionado.

**Solución**: **esperar 2-15 minutos**. Cloudflare provisiona certificados automáticamente pero no es instantáneo. Si después de 30 minutos sigue dando error → contactar soporte de Cloudflare.

---

## Caso 4: El navegador muestra una versión vieja del juego

**Síntoma**: actualizaste el juego pero ves la versión anterior.

**Causas posibles** (orden de probabilidad):
1. **Caché del navegador** (90% de las veces) → hard reload: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows). En móvil: cerrar pestaña y abrir nueva, o modo incógnito.
2. **Caché de Cloudflare** (puede tardar 1-2 min en propagar globalmente)
3. **Service Worker cacheando** (no aplicable, no usamos PWA por ahora)

---

## Caso 5: Quiero dar acceso a alguien específico

Es un sitio público, **no hay autenticación**. Cualquiera con el link accede. Si necesitas restringir:

**Opciones**:
- **Cloudflare Access** (Zero Trust): gratis hasta 50 usuarios, puedes restringir por email o Google login. Settings → Cloudflare Access → Add application.
- **Token en URL**: añadir `?token=xxx` y validar en JavaScript. Inseguro pero suficiente para "ofuscación" temporal.
- **Mejor solución**: cuando se necesite auth real, integrar Supabase magic link o Google OAuth en Fase 2.

Por ahora **el link es público y compartible libremente**.

---

## Caso 6: Quiero ver estadísticas / analytics

Cloudflare Workers Analytics:
1. Dashboard → Workers & Pages → proyecto `app`
2. Tab **Metrics**

Te muestra:
- Requests por hora/día
- Errores
- Tiempo de respuesta
- Geografía de visitantes

**Limitación**: para juego con assets estáticos, las métricas detalladas (CPU time) no aplican. Solo verás cuántas visitas hubo.

Si quieres analytics más detalladas (qué hacen los usuarios dentro del juego), habría que integrar Plausible o Umami (gratis, privacidad-friendly).

---

## Caso 7: Wrangler pide login o da error de autenticación

**Síntoma**: `npx wrangler@4 deploy` abre el navegador, o falla con "not authenticated" / "Unable to authenticate".

```
1. npx wrangler@4 login          → se abre el navegador, acepta con la cuenta
                                   Luisrodriguezz1981@gmail.com
2. npx wrangler@4 whoami         → debe mostrar ese email y la cuenta
                                   "Luisrodriguezz1981@gmail.com's Account"
3. npx wrangler@4 deploy
```

Las credenciales quedan en `~/Library/Preferences/.wrangler/config/default.toml`. Si algún día hay que cerrar sesión: `npx wrangler@4 logout`.

---

## Caso 7b: Quiero borrar el Worker y empezar de cero

**Cuando**: algo se ha roto y prefieres reiniciar limpio.

```
1. Cloudflare → Workers & Pages → Worker "app"
2. Tab "Settings" → scroll abajo → sección "Delete" (en rojo)
3. Click "Delete", escribe "app" para confirmar
4. En el Mac: npx wrangler@4 deploy
   (wrangler recrea el Worker "app" desde wrangler.jsonc y sube los assets)
5. Si la URL app.hems.workers.dev no responde: Settings → Domains & Routes →
   activar "workers.dev"
```

**ADVERTENCIA**: la URL `app.hems.workers.dev` deja de funcionar en cuanto borras. Si has compartido el link con gente, todos verán error hasta que el nuevo deploy esté activo.

---

## Caso 8: Dominio propio

**Hecho (15 sept 2026)**: el juego vive en `hems.jornadaimpacte.com`, subdominio del dominio de la jornada (zona en la misma cuenta Cloudflare). Está declarado en `wrangler.jsonc`:
```jsonc
"routes": [{ "pattern": "hems.jornadaimpacte.com", "custom_domain": true }]
```
Cloudflare creó el registro DNS y el certificado solos en el `wrangler deploy`. Para cambiar el subdominio basta con editar el `pattern` y redesplegar (el viejo se puede borrar en Worker `app` → Settings → Domains & Routes).

**Si algún día se quiere otro dominio distinto** (lo que sigue es la guía original):

**Cuándo**: 1-2 meses antes del 27 octubre 2026, para tener URL pro tipo `hemsrunner.com`.

**Pasos**:
```
1. Comprar dominio en Cloudflare directamente:
   Dashboard → Domain Registration → Register Domain
   (~9-12€/año los .com, .cat suele ser ~25€/año en Cloudflare)
   ALTERNATIVA: Namecheap, Porkbun (más barato pero más pasos)

2. Si compras EN Cloudflare:
   - Auto-configuración de DNS, SSL, CDN
   - En proyecto "app" → Settings → Domains & Routes → "Set up custom domain"
   - Selecciona el dominio comprado
   - Click "Activate"
   - 1-5 minutos y la URL nueva funciona

3. Si compras FUERA de Cloudflare:
   - En Cloudflare: Add a Site → escribe el dominio
   - Sigue instrucciones para cambiar nameservers en el registrador
   - Una vez activo en Cloudflare → mismo proceso de "Set up custom domain"
```

**Sugerencia de nombres** (verificar disponibilidad):
- `hemsrunner.com` (corto, descriptivo)
- `hems-runner.com` (con guión, igual de bueno)
- `traumarunner2026.com` (vinculado al evento)
- `jornadatrauma.cat` (más institucional)
- `parctauliruner.cat` (vinculado al hospital)

---

## Caso 9: Ranking en servidor (desde el 18 de septiembre de 2026)

El ranking ya no vive en el navegador de cada jugador: lo guarda el Worker en una base de datos **Cloudflare D1** (`hems-leaderboard`, gratis). Código en `worker/index.js`; esquema en `worker/schema.sql`.

- **Ver el ranking con correos (admin)**: `https://hems.jornadaimpacte.com/admin?token=TU_TOKEN`. (Ojo: `/api/top` es el JSON en crudo que usa el juego, no el panel.) Contiene: estadísticas de visitas con gráficas; aviso de partidas a revisar; **buscador** por nombre o correo; **tabla de jugadores** (una fila por persona, con columnas ordenables al pulsar la cabecera); top 100 por persona (top 5 en naranja); últimas 50 partidas; botón **Borrar** en cada partida; **Copiar los N correos** al portapapeles y **Descargar CSV** (Excel/Numbers, con correos).
- **El token** está guardado como secreto del Worker (`ADMIN_TOKEN`). No está en el repo ni en los docs. Si lo pierdes o quieres cambiarlo: `npx wrangler@4 secret put ADMIN_TOKEN` (te pide el valor nuevo) y listo.
- **Estadísticas de visitas**: en la misma página `/admin`, arriba del rànquing (visitas por día y hora, dispositivos, repetidores, países, etc.). Para vaciarlas: `npx wrangler@4 d1 execute hems-leaderboard --remote --command "DELETE FROM events"`.
- **Teclas de prueba**: bloqueadas para el público; se activan tecleando **Q Q W W** seguidas durante el juego (sale "MASTER").
- **Sin token** (`/admin` a secas) responde "Acceso denegado". El top público (`/api/top`) nunca incluye correos.
- **Borrar todas las partidas** (p. ej. antes de la jornada, para empezar de cero): `npx wrangler@4 d1 execute hems-leaderboard --remote --command "DELETE FROM scores"`.
- **Consultas sueltas**: `npx wrangler@4 d1 execute hems-leaderboard --remote --command "SELECT name, email, score FROM scores ORDER BY score DESC LIMIT 20"`.
- **Deploy**: igual que siempre (`npx wrangler@4 deploy`); sube el Worker y los assets a la vez. Para probar en local con base de datos local: `npx wrangler@4 dev --port 8787 --var ADMIN_TOKEN:devtoken` (la primera vez: `npx wrangler@4 d1 execute hems-leaderboard --local --file worker/schema.sql`).
- **Si el servidor falla** (sin conexión, Worker caído), el juego guarda la partida solo en el dispositivo y lo avisa en el rànquing; no se pierde la jugabilidad.

## Estructura mental: ¿Qué hago si X?

| Problema | Acción inmediata |
|---|---|
| El juego no carga (404) | Verificar que `index.html` está en la raíz del repo (Caso 2) |
| Error SSL | Esperar 2-15 minutos, no es problema tuyo (el custom domain tardó 15 s) |
| Versión vieja sigue apareciendo | Hard reload + modo incógnito |
| Cambios no se ven | Verificar que `wrangler deploy` acabó con "Deployed app triggers" y un Version ID |
| Un asset da 404 | Esperar 30 s; si sigue, `--dry-run` y revisar `.assetsignore` (Caso 2) |
| Wrangler pide login | `npx wrangler@4 login` (Caso 7) |
| Quiero rollback | Cloudflare → Worker `app` → Deployments → deploy anterior → "Rollback" (o `npx wrangler@4 rollback`) |
| Quiero ver versiones anteriores | Tab "Deployments", lista cronológica (o `npx wrangler@4 deployments list`) |

---

## Contactos importantes

- **Cloudflare account**: `Luisrodriguezz1981@gmail.com`
- **GitHub account**: `andycitorodri`
- **Repositorio**: `https://github.com/andycitorodri/hems-runner`

**Si pierdes acceso a la cuenta Cloudflare**: el GitHub conserva todo el código fuente. Se puede redeployar en otro hosting (Netlify, Vercel, GitHub Pages) en 5 minutos.
