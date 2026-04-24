# DEPLOY_RUNBOOK.md
## Cómo actualizar HEMS Runner en producción

**Audiencia**: tú mismo en el futuro, cuando hayas olvidado los detalles. Este es un runbook **paso a paso**, sin teoría, solo acciones.

---

## Caso 1: Cambio rápido al juego (1-2 minutos)

**Cuando**: arreglaste un bug, ajustaste un valor, mejoraste un visual. Quieres que esté en producción YA.

```
1. Genera el index.html actualizado (en /home/claude/jornada/index.html o donde esté)
2. Descárgalo a tu Mac
3. Abre https://dash.cloudflare.com/
4. Workers & Pages → click en proyecto "app"
5. Botón "New deployment" (arriba derecha, junto a "Visit")
6. Arrastra el index.html nuevo
7. Click "Deploy"
8. Espera ~30 segundos
9. Abre https://app.hems.workers.dev en MODO INCÓGNITO (evita caché)
10. Verifica que funciona
11. Si OK, manda el link por WhatsApp a quien necesite
```

---

## Caso 2: La URL produce error 404

**Síntoma**: "Cuidado. Parece que algo no está bien" — error 404 en la URL raíz.

**Causa habitual**: el archivo subido no se llama `index.html`.

**Solución**:
```
1. En tu Mac, renombra el archivo a EXACTAMENTE: index.html
   (sin paréntesis, sin números de versión, sin nada extra)
2. Confirma "Mantener .html" si sale alerta
3. Vuelve a Cloudflare → New deployment → arrastra el archivo bien nombrado
4. Espera 30s + hard reload
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

## Caso 7: Quiero borrar el deploy actual y empezar de cero

**Cuando**: algo se ha roto y prefieres reiniciar limpio.

```
1. Cloudflare → Workers & Pages → proyecto "app"
2. Tab "Settings"
3. Scroll abajo del todo
4. Sección "Delete" (en rojo)
5. Click "Delete"
6. Escribe el nombre del worker para confirmar: "app"
7. Confirmar borrado
8. Volver a Workers & Pages → "Create application"
9. "Upload your static files"
10. Project name: poner "app" otra vez (o cambiar a otro nombre)
11. Subir index.html
12. Deploy
```

**ADVERTENCIA**: la URL `app.hems.workers.dev` deja de funcionar inmediatamente. Si has compartido el link con gente, todos verán error hasta que el nuevo deploy esté activo.

---

## Caso 8: Comprar dominio propio (cuando llegue el momento)

**Cuándo**: 1-2 meses antes del 14 octubre 2026, para tener URL pro tipo `hemsrunner.com`.

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

## Estructura mental: ¿Qué hago si X?

| Problema | Acción inmediata |
|---|---|
| El juego no carga (404) | Verificar que archivo se llama `index.html` |
| Error SSL | Esperar 2-15 minutos, no es problema tuyo |
| Versión vieja sigue apareciendo | Hard reload + modo incógnito |
| Cambios no se ven | Verificar que el deploy nuevo terminó (ver Deployments tab) |
| Quiero rollback | Cloudflare → Deployments → click en deploy anterior → "Rollback" |
| Quiero ver versiones anteriores | Tab "Deployments", lista cronológica |

---

## Contactos importantes

- **Cloudflare account**: `Luisrodriguezz1981@gmail.com`
- **GitHub account**: `andycitorodri`
- **Repositorio**: `https://github.com/andycitorodri/hems-runner`

**Si pierdes acceso a la cuenta Cloudflare**: el GitHub conserva todo el código fuente. Se puede redeployar en otro hosting (Netlify, Vercel, GitHub Pages) en 5 minutos.
