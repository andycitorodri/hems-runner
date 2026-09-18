// HEMS Runner — Worker: ranking en servidor (D1) + assets estáticos.
//   POST /api/score                {name, email?, score, coins, patients, distance, device, lang}
//   GET  /api/top?n=10             top público (sin correos), una entrada por jugador (device+nombre)
//   GET  /admin?token=…            panel de administración (con correos, CSV, borrar)
//   GET  /api/admin/export.csv?token=…
//   POST /api/admin/delete?token=…&id=…
// Todo lo demás → assets (index.html, assets/…).

const NAME_MAX = 16, EMAIL_MAX = 80, SCORE_MAX = 5_000_000;
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/score' && request.method === 'POST') return postScore(request, env);
      if (url.pathname === '/api/top') return getTop(url, env);
      if (url.pathname === '/admin') return adminPage(url, env);
      if (url.pathname === '/api/admin/export.csv') return adminExport(url, env);
      if (url.pathname === '/api/admin/delete' && request.method === 'POST') return adminDelete(url, env);
      if (url.pathname.startsWith('/api/')) return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: 'server', detail: String(e && e.message || e) }, 500);
    }
    return env.ASSETS.fetch(request);
  }
};

// Sin caracteres de control ni < > (el nombre se pinta en HTML del juego y del panel)
function cleanName(s) { return String(s || '').replace(/[\x00-\x1f<>]/g, '').trim().slice(0, NAME_MAX); }
function cleanEmail(s) {
  const e = String(s || '').trim().toLowerCase().slice(0, EMAIL_MAX);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : '';
}
const int = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

async function postScore(request, env) {
  let body; try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const name = cleanName(body.name);
  if (!name) return json({ error: 'name required' }, 400);
  const email = cleanEmail(body.email);
  if (body.email && String(body.email).trim() && !email) return json({ error: 'bad email' }, 400);
  const score = int(body.score, SCORE_MAX), coins = int(body.coins, 100000), patients = int(body.patients, 100000), distance = int(body.distance, 1000000);
  const device = String(body.device || '').slice(0, 40), lang = String(body.lang || '').slice(0, 5);
  const ua = (request.headers.get('user-agent') || '').slice(0, 200), ip = request.headers.get('cf-connecting-ip') || '';
  const ts = Date.now();
  const r = await env.DB.prepare('INSERT INTO scores (name, email, score, coins, patients, distance, device, lang, ua, ip, ts) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .bind(name, email || null, score, coins, patients, distance, device, lang, ua, ip, ts).run();
  // Posición entre jugadores distintos (mejor partida de cada uno), como en el top público
  const above = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM scores s WHERE score > ? AND id = (SELECT id FROM scores s2 WHERE s2.device = s.device AND lower(s2.name) = lower(s.name) ORDER BY score DESC, ts ASC LIMIT 1)`).bind(score).first('n');
  const total = await env.DB.prepare('SELECT COUNT(DISTINCT device || lower(name)) AS n FROM scores').first('n');
  const top = await topRows(env, 10);
  return json({ ok: true, id: r.meta.last_row_id, rank: (above || 0) + 1, total, top });
}

// Mejor puntuación por jugador (device + nombre en minúsculas): un mismo
// jugador no ocupa varias posiciones del top público.
async function topRows(env, n) {
  const { results } = await env.DB.prepare(
    `SELECT id, name, score, coins, patients, distance, ts FROM scores s
     WHERE id = (SELECT id FROM scores s2 WHERE s2.device = s.device AND lower(s2.name) = lower(s.name) ORDER BY score DESC, ts ASC LIMIT 1)
     ORDER BY score DESC, ts ASC LIMIT ?`).bind(n).all();
  return results;
}

async function getTop(url, env) {
  const n = int(url.searchParams.get('n') || 10, 100) || 10;
  const top = await topRows(env, n);
  return json({ top }, 200, { 'cache-control': 'public, max-age=10' });
}

// ---------- admin ----------
function authed(url, env) { const t = url.searchParams.get('token'); return !!(env.ADMIN_TOKEN && t && t === env.ADMIN_TOKEN); }
const esc = s => String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = ts => new Date(ts).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

async function adminPage(url, env) {
  if (!authed(url, env)) return new Response('Acceso denegado', { status: 403 });
  const token = url.searchParams.get('token');
  // Mejor puntuación por persona: por correo si lo dejó; si no, por dispositivo+nombre
  const { results: best } = await env.DB.prepare(
    `SELECT id, name, email, score, coins, patients, distance, ts, device FROM scores s
     WHERE id = (SELECT id FROM scores s2 WHERE COALESCE(s2.email, s2.device || '|' || lower(s2.name)) = COALESCE(s.email, s.device || '|' || lower(s.name)) ORDER BY score DESC, ts ASC LIMIT 1)
     ORDER BY score DESC, ts ASC LIMIT 100`).all();
  const { results: last } = await env.DB.prepare('SELECT id, name, email, score, coins, patients, distance, ts FROM scores ORDER BY ts DESC LIMIT 50').all();
  const total = await env.DB.prepare('SELECT COUNT(*) AS n, COUNT(DISTINCT COALESCE(email, device)) AS players, COUNT(DISTINCT email) AS emails FROM scores').first();
  const row = (e, i) => `<tr><td>${i + 1}</td><td>${esc(e.name)}</td><td>${e.email ? `<a href="mailto:${esc(e.email)}">${esc(e.email)}</a>` : '<span class="muted">—</span>'}</td><td class="num">${e.score.toLocaleString('es-ES')}</td><td class="num">${e.coins}</td><td class="num">${e.patients}</td><td class="num">${e.distance} m</td><td>${fmtDate(e.ts)}</td><td><button onclick="del(${e.id})">Borrar</button></td></tr>`;
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>HEMS Runner · Admin ranking</title>
<style>body{font:14px/1.4 system-ui,sans-serif;margin:24px;background:#111;color:#eee}h1{font-size:20px}h2{font-size:16px;margin-top:32px}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:6px 8px;border-bottom:1px solid #333;text-align:left;white-space:nowrap}th{color:#aaa;font-weight:600}.num{text-align:right;font-variant-numeric:tabular-nums}.muted{color:#666}.best tr:nth-child(-n+6) td:first-child{color:#f5a623;font-weight:700}a{color:#7ab}button{background:#333;color:#eee;border:0;border-radius:4px;padding:3px 8px;cursor:pointer}.wrap{overflow-x:auto}.kpi{display:flex;gap:24px;margin:12px 0 20px}.kpi b{font-size:22px;display:block}</style>
<h1>HEMS Runner · Rànquing (admin)</h1>
<div class="kpi"><div><b>${total.n}</b>partidas guardadas</div><div><b>${total.players}</b>jugadores distintos</div><div><b>${total.emails}</b>con correo</div></div>
<p><a href="/api/admin/export.csv?token=${esc(token)}">Descargar todo en CSV</a> (para Excel/Numbers; con correos)</p>
<h2>Top 100 · mejor partida por persona (top 5 en naranja)</h2>
<div class="wrap"><table class="best"><tr><th>#</th><th>Nombre</th><th>Correo</th><th>Puntos</th><th>Monedas</th><th>Pacientes</th><th>Distancia</th><th>Fecha</th><th></th></tr>${best.map(row).join('')}</table></div>
<h2>Últimas 50 partidas</h2>
<div class="wrap"><table><tr><th>#</th><th>Nombre</th><th>Correo</th><th>Puntos</th><th>Monedas</th><th>Pacientes</th><th>Distancia</th><th>Fecha</th><th></th></tr>${last.map(row).join('')}</table></div>
<script>async function del(id){ if(!confirm('¿Borrar la partida '+id+'?')) return; const r=await fetch('/api/admin/delete?token=${esc(token)}&id='+id,{method:'POST'}); if(r.ok) location.reload(); else alert('Error'); }</script></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

async function adminExport(url, env) {
  if (!authed(url, env)) return new Response('Acceso denegado', { status: 403 });
  const { results } = await env.DB.prepare('SELECT id, name, email, score, coins, patients, distance, lang, ts FROM scores ORDER BY score DESC, ts ASC').all();
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = ['id;nombre;correo;puntos;monedas;pacientes;distancia_m;idioma;fecha'];
  for (const e of results) lines.push([e.id, q(e.name), q(e.email), e.score, e.coins, e.patients, e.distance, e.lang, q(fmtDate(e.ts))].join(';'));
  // BOM para que Excel abra el UTF-8 con acentos
  return new Response('﻿' + lines.join('\r\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="hems-runner-ranking.csv"', 'cache-control': 'no-store' } });
}

async function adminDelete(url, env) {
  if (!authed(url, env)) return json({ error: 'forbidden' }, 403);
  const id = int(url.searchParams.get('id'), 1e12);
  await env.DB.prepare('DELETE FROM scores WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
