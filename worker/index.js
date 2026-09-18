// HEMS Runner — Worker: ranking en servidor (D1) + assets estáticos.
//   POST /api/score                {name, email?, score, coins, patients, distance, device, lang}
//   GET  /api/top?n=10             top público (sin correos), una entrada por jugador (device+nombre)
//   GET  /admin?token=…            panel de administración (con correos, CSV, borrar)
//   GET  /api/admin/export.csv?token=…
//   POST /api/admin/delete?token=…&id=…
//   POST /api/hit                  analítica: {kind: open|play|end, device, session, lang, screen, ref, score, distance, duration}
// Todo lo demás → assets (index.html, assets/…).

const NAME_MAX = 16, EMAIL_MAX = 80, SCORE_MAX = 5_000_000;
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/score' && request.method === 'POST') return postScore(request, env);
      if (url.pathname === '/api/top') return getTop(url, env);
      if (url.pathname === '/api/hit' && request.method === 'POST') return postHit(request, env);
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

// ---------- analítica ----------
function parseUA(ua) {
  const os = /iPhone|iPod/.test(ua) ? 'iOS' : /iPad|Macintosh.*Mobile/.test(ua) ? 'iPadOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'otro';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Chrome\//.test(ua) && !/Chromium/.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'otro';
  const kind = /iPhone|iPod|Android.*Mobile|Windows Phone/.test(ua) ? 'móvil' : /iPad|Android|Tablet/.test(ua) ? 'tablet' : 'ordenador';
  return { os, browser, kind };
}

async function postHit(request, env) {
  let body; try { body = JSON.parse(await request.text()); } catch { return json({ error: 'bad json' }, 400); }
  const kind = ['open', 'play', 'end'].includes(body.kind) ? body.kind : null;
  if (!kind) return json({ error: 'bad kind' }, 400);
  const cf = request.cf || {}, ua = parseUA(request.headers.get('user-agent') || '');
  const str = (v, n) => v == null ? null : String(v).slice(0, n);
  await env.DB.prepare('INSERT INTO events (ts, kind, device, session, country, city, region, ua_kind, os, browser, lang, ref, screen, score, distance, duration) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(Date.now(), kind, str(body.device, 40), str(body.session, 40), str(cf.country, 2), str(cf.city, 60), str(cf.region, 60), ua.kind, ua.os, ua.browser, str(body.lang, 5), str(body.ref, 120), str(body.screen, 20),
      body.score == null ? null : int(body.score, SCORE_MAX), body.distance == null ? null : int(body.distance, 1000000), body.duration == null ? null : int(body.duration, 100000)).run();
  return json({ ok: true });
}

// Agregados para el panel: fechas y horas en hora de Madrid (calculado aquí:
// SQLite no sabe de zonas horarias).
const dayFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' });
const hourFmt = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false });
const dayOf = ts => dayFmt.format(new Date(ts)), hourOf = ts => parseInt(hourFmt.format(new Date(ts)), 10) % 24;

async function stats(env) {
  const since = Date.now() - 30 * 86400000;
  const { results: ev } = await env.DB.prepare('SELECT ts, kind, device, session, country, city, ua_kind, os, browser, lang, ref, score, distance, duration FROM events WHERE ts > ? ORDER BY ts').bind(since).all();
  const tot = await env.DB.prepare(`SELECT
      SUM(kind='open') AS opens, SUM(kind='play') AS plays, SUM(kind='end') AS ends,
      COUNT(DISTINCT device) AS devices, COUNT(DISTINCT session) AS sessions, MIN(ts) AS first
    FROM events`).first();
  // Repetidores: dispositivos con visitas en ≥ 2 días distintos (toda la historia)
  const { results: devDays } = await env.DB.prepare(`SELECT device, COUNT(DISTINCT CAST((ts + 7200000) / 86400000 AS INTEGER)) AS days, COUNT(*) AS n FROM events WHERE kind='open' AND device IS NOT NULL GROUP BY device`).all();
  const returning = devDays.filter(d => d.days >= 2).length;
  const { results: playsPerDev } = await env.DB.prepare(`SELECT device, COUNT(*) AS n FROM events WHERE kind='play' AND device IS NOT NULL GROUP BY device`).all();
  const buckets = { '1': 0, '2-5': 0, '6-20': 0, '21+': 0 };
  for (const d of playsPerDev) buckets[d.n === 1 ? '1' : d.n <= 5 ? '2-5' : d.n <= 20 ? '6-20' : '21+']++;

  const today = dayOf(Date.now());
  const days = []; for (let i = 29; i >= 0; i--) days.push(dayOf(Date.now() - i * 86400000));
  const byDay = Object.fromEntries(days.map(d => [d, { opens: 0, plays: 0, devices: new Set() }]));
  const byHour = Array(24).fill(0);
  const count = (map, key) => { if (key == null || key === '') key = '—'; map[key] = (map[key] || 0) + 1; };
  const countries = {}, cities = {}, kinds = {}, oss = {}, browsers = {}, langs = {}, refs = {}, screens = {};
  let endN = 0, distSum = 0, durSum = 0, scoreSum = 0, best = 0;
  for (const e of ev) {
    const d = dayOf(e.ts);
    if (e.kind === 'open') {
      if (byDay[d]) { byDay[d].opens++; byDay[d].devices.add(e.device); }
      byHour[hourOf(e.ts)]++;
      count(countries, e.country); count(cities, e.city ? `${e.city} (${e.country})` : null); count(kinds, e.ua_kind); count(oss, e.os); count(browsers, e.browser); count(langs, e.lang); count(screens, e.screen);
      count(refs, e.ref ? e.ref.replace(/^https?:\/\//, '').split('/')[0] : 'directo');
    } else if (e.kind === 'play') { if (byDay[d]) byDay[d].plays++; }
    else if (e.kind === 'end') { endN++; distSum += e.distance || 0; durSum += e.duration || 0; scoreSum += e.score || 0; best = Math.max(best, e.score || 0); }
  }
  const todayRow = byDay[today] || { opens: 0, plays: 0, devices: new Set() };
  return { tot, returning, devicesEver: devDays.length, buckets, days, byDay, byHour, countries, cities, kinds, oss, browsers, langs, refs, screens, today: { opens: todayRow.opens, plays: todayRow.plays, devices: todayRow.devices.size }, end: { n: endN, avgDist: endN ? Math.round(distSum / endN) : 0, avgDur: endN ? Math.round(durSum / endN) : 0, avgScore: endN ? Math.round(scoreSum / endN) : 0, best } };
}

// ---- gráficas SVG (sin librerías): barras finas, extremos redondeados, rejilla recesiva ----
const C = { blue: '#3987e5', orange: '#d95926', aqua: '#199e70', ink: '#ffffff', ink2: '#c3c2b7', muted: '#898781', grid: '#2c2c2a', axis: '#383835' };
function barChart({ labels, series, width = 900, height = 220, legend = true, xEvery = 1 }) {
  const padL = 40, padR = 12, padT = legend ? 28 : 12, padB = 30, W = width - padL - padR, H = height - padT - padB;
  const max = Math.max(1, ...series.flatMap(s => s.values));
  const nice = Math.pow(10, Math.floor(Math.log10(max))); const top = Math.ceil(max / nice) * nice;
  const n = labels.length, slot = W / n, gap = 2, bw = Math.max(2, (slot - 6) / series.length - gap);
  let out = `<svg viewBox="0 0 ${width} ${height}" width="100%" style="max-width:${width}px;font:11px system-ui,sans-serif" role="img">`;
  const ticks = top <= 4 ? top : 4;  // con máximos pequeños, una marca por entero (sin repetir etiquetas)
  for (let i = 0; i <= ticks; i++) { const y = padT + H - H * i / ticks; out += `<line x1="${padL}" x2="${width - padR}" y1="${y}" y2="${y}" stroke="${C.grid}"/><text x="${padL - 6}" y="${y + 4}" text-anchor="end" fill="${C.muted}">${Math.round(top * i / ticks)}</text>`; }
  out += `<line x1="${padL}" x2="${width - padR}" y1="${padT + H}" y2="${padT + H}" stroke="${C.axis}"/>`;
  labels.forEach((lab, i) => {
    series.forEach((s, k) => {
      const v = s.values[i] || 0, h = H * v / top, x = padL + slot * i + 3 + k * (bw + gap), y = padT + H - h;
      const title = `${lab} · ${s.name}: ${v}`;
      out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, bw / 2)}" fill="${s.color}"><title>${esc(title)}</title></rect>`;
      if (h < 4 && v) out += `<rect x="${x.toFixed(1)}" y="${(padT + H - 2).toFixed(1)}" width="${bw.toFixed(1)}" height="2" fill="${s.color}"/>`;
    });
    if (i % xEvery === 0) out += `<text x="${(padL + slot * i + slot / 2).toFixed(1)}" y="${height - 10}" text-anchor="middle" fill="${C.muted}">${esc(lab)}</text>`;
  });
  if (legend) series.forEach((s, k) => { out += `<rect x="${padL + k * 130}" y="6" width="10" height="10" rx="2" fill="${s.color}"/><text x="${padL + 16 + k * 130}" y="15" fill="${C.ink2}">${esc(s.name)}</text>`; });
  return out + '</svg>';
}
function hBars(map, { top = 10, color = C.blue, width = 440 } = {}) {
  const rows = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, top);
  const total = Object.values(map).reduce((a, b) => a + b, 0) || 1, max = rows[0] ? rows[0][1] : 1;
  const rowH = 22, padL = 140, W = width - padL - 60, height = rows.length * rowH + 4;
  let out = `<svg viewBox="0 0 ${width} ${height}" width="100%" style="max-width:${width}px;font:12px system-ui,sans-serif" role="img">`;
  rows.forEach(([k, v], i) => {
    const y = i * rowH + 3, w = Math.max(2, W * v / max);
    out += `<text x="${padL - 8}" y="${y + 13}" text-anchor="end" fill="${C.ink2}">${esc(k)}</text><rect x="${padL}" y="${y}" width="${w.toFixed(1)}" height="16" rx="4" fill="${color}"><title>${esc(k)}: ${v}</title></rect><text x="${padL + w + 6}" y="${y + 13}" fill="${C.muted}">${v} · ${Math.round(100 * v / total)}%</text>`;
  });
  return out + '</svg>' + (rows.length ? '' : '<p class="muted">Sin datos todavía</p>');
}
const kpi = (v, label) => `<div><b>${typeof v === 'number' ? v.toLocaleString('es-ES') : v}</b>${label}</div>`;
const fmtDur = s => s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`;

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
  const st = await stats(env);
  const row = (e, i) => `<tr><td>${i + 1}</td><td>${esc(e.name)}</td><td>${e.email ? `<a href="mailto:${esc(e.email)}">${esc(e.email)}</a>` : '<span class="muted">—</span>'}</td><td class="num">${e.score.toLocaleString('es-ES')}</td><td class="num">${e.coins}</td><td class="num">${e.patients}</td><td class="num">${e.distance} m</td><td>${fmtDate(e.ts)}</td><td><button onclick="del(${e.id})">Borrar</button></td></tr>`;
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>HEMS Runner · Admin ranking</title>
<style>body{font:14px/1.4 system-ui,sans-serif;margin:24px;background:#111;color:#eee}h1{font-size:20px}h2{font-size:16px;margin-top:32px}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:6px 8px;border-bottom:1px solid #333;text-align:left;white-space:nowrap}th{color:#aaa;font-weight:600}.num{text-align:right;font-variant-numeric:tabular-nums}.muted{color:#666}.best tr:nth-child(-n+6) td:first-child{color:#f5a623;font-weight:700}a{color:#7ab}button{background:#333;color:#eee;border:0;border-radius:4px;padding:3px 8px;cursor:pointer}.wrap{overflow-x:auto}.kpi{display:flex;gap:24px;margin:12px 0 20px;flex-wrap:wrap}.kpi b{font-size:22px;display:block}.kpi div{color:#898781;font-size:12px}.kpi b{color:#fff}h3{font-size:13px;color:#c3c2b7;margin:22px 0 6px;font-weight:600}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(440px,1fr));gap:8px 32px}</style>
<h1>HEMS Runner · Admin</h1>
<h2 style="margin-top:8px">Visitas y partidas</h2>
<div class="kpi">${kpi(st.tot.opens || 0, 'visitas totales')}${kpi(st.devicesEver, 'dispositivos distintos')}${kpi(st.returning, 'repetidores (≥ 2 días)')}${kpi(st.tot.plays || 0, 'partidas empezadas')}${kpi(st.tot.ends || 0, 'partidas acabadas')}${kpi(st.today.opens, 'visitas hoy')}${kpi(st.today.devices, 'dispositivos hoy')}${kpi(st.today.plays, 'partidas hoy')}</div>
<div class="kpi">${kpi(st.end.avgDist + ' m', 'distancia media (30 días)')}${kpi(fmtDur(st.end.avgDur), 'duración media')}${kpi(st.end.avgScore, 'puntuación media')}${kpi(st.end.best, 'mejor puntuación (30 días)')}${kpi(st.tot.first ? fmtDate(st.tot.first).split(',')[0] : '—', 'primera visita registrada')}</div>
<h3>Últimos 30 días · visitas y partidas por día</h3>
${barChart({ labels: st.days.map(d => d.slice(8) + '/' + d.slice(5, 7)), series: [{ name: 'Visitas', color: C.blue, values: st.days.map(d => st.byDay[d].opens) }, { name: 'Partidas', color: C.orange, values: st.days.map(d => st.byDay[d].plays) }], xEvery: 2 })}
<h3>Dispositivos distintos por día</h3>
${barChart({ labels: st.days.map(d => d.slice(8) + '/' + d.slice(5, 7)), series: [{ name: 'Dispositivos', color: C.aqua, values: st.days.map(d => st.byDay[d].devices.size) }], legend: false, xEvery: 2 })}
<h3>Visitas por hora del día (hora de Madrid, 30 días)</h3>
${barChart({ labels: st.byHour.map((_, h) => `${h}h`), series: [{ name: 'Visitas', color: C.blue, values: st.byHour }], legend: false, height: 160 })}
<div class="grid">
  <div><h3>Países</h3>${hBars(st.countries)}</div>
  <div><h3>Ciudades</h3>${hBars(st.cities, { color: C.aqua })}</div>
  <div><h3>Tipo de dispositivo</h3>${hBars(st.kinds, { color: C.orange })}</div>
  <div><h3>Sistema</h3>${hBars(st.oss, { color: C.orange })}</div>
  <div><h3>Navegador</h3>${hBars(st.browsers, { color: C.orange })}</div>
  <div><h3>Idioma del juego</h3>${hBars(st.langs, { color: C.aqua })}</div>
  <div><h3>De dónde vienen (referer)</h3>${hBars(st.refs)}</div>
  <div><h3>Partidas por dispositivo</h3>${hBars(st.buckets, { color: C.aqua })}</div>
</div>
<h2>Rànquing</h2>
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
