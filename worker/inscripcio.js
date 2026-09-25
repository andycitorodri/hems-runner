// Inscripciones a la I Jornada IMPACTE.
//
// Flujo: la persona rellena NUESTRO formulario (más cómodo, con modalidad) →
// se guarda en nuestra base de datos → se vuelca automáticamente al formulario
// del hospital (Inscripcioef.asp), que es el registro oficial.
//
// SEGURIDAD: mientras INSCRIPCIONS_MODE no sea "real", NADA se envía al
// hospital: se guarda como prueba y el panel muestra exactamente qué se
// enviaría. Desde /admin se puede enviar una inscripción concreta a mano para
// comprobar que llega. Así se valida sin ensuciar el registro del hospital.

export const CURS = {
  codi: '202662',
  titol: 'Jornada Impacte Intervenció en Medicina Prehospitalària i Atenció al Crític, Trauma i Emergències',
  inici: '27/10/2026',
  final: '27/10/2026',
  url: 'https://www.tauli.cat/tauli/joomla/cursosfpt/Inscripcioef.asp',
  referer: 'https://www.tauli.cat/tauli/joomla/cursosfpt/Inscripcio.asp',
};

// Modalidades de inscripción. Se envían al hospital dentro de "Professió/Servei"
// (p. ej. "Metge/essa - modalitat: Streaming") porque su formulario no tiene ese campo.
export const MODALITATS = [
  { id: 'streaming', label: 'Streaming', preu: 10, subtitol: "Des d'on vulguis",
    inclou: ['Les quatre taules de debat del matí, en directe', 'Sense desplaçament ni aforament limitat'] },
  { id: 'presencial-mati', label: 'Presencial · matí', preu: 20,
    inclou: ['Assistència presencial a les quatre taules de debat', "Cafè de l'esmorzar"] },
  { id: 'presencial-dinar', label: 'Presencial + dinar', preu: 35,
    inclou: ['Tot el de la modalitat de matí', 'Dinar de treball'] },
  { id: 'presencial-complet', label: 'Presencial complet', preu: 50, avis: 'Places limitades', destacat: true,
    inclou: ["Tot l'anterior: taules, cafè i dinar", 'Dos dels quatre tallers pràctics de la tarda'] },
];

const esc = s => String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, n) => String(v ?? '').replace(/[\x00-\x1f]/g, '').trim().slice(0, n);
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

// Texto que se manda en el campo Professió/Servei del hospital
export function professioAmbModalitat(professio, modalitatId) {
  const m = MODALITATS.find(x => x.id === modalitatId);
  return `${professio}${m ? ` - modalitat: ${m.label} (${m.preu} €)` : ''}`.slice(0, 120);
}

// Construye el cuerpo exacto que espera Inscripcioef.asp
export function tauliBody(r) {
  const p = new URLSearchParams();
  p.set('Nom', r.nom); p.set('Cognom1', r.cognom1); p.set('Cognom2', r.cognom2);
  p.set('dia', r.dia); p.set('mes', r.mes); p.set('any', r.any);
  p.set('Tel', r.tel); p.set('Movil', r.movil); p.set('Mail', r.mail);
  p.set('Domicili', r.domicili); p.set('CPostal', r.cpostal); p.set('Localitat', r.localitat);
  p.set('NIF', r.nif);
  p.set('Professio', professioAmbModalitat(r.professio, r.modalitat));
  p.set('Centre', r.centre);
  p.set('Curs', CURS.codi); p.set('Titol', CURS.titol);
  p.set('Inici', CURS.inici); p.set('Final', CURS.final);
  p.set('gdpr', 'SI'); p.set('B3', 'Enviar');
  return p;
}

export async function enviaAlTauli(r) {
  const body = tauliBody(r);
  const res = await fetch(CURS.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'referer': CURS.referer,
      'user-agent': 'Mozilla/5.0 (compatible; JornadaIMPACTE/1.0; +https://hems.jornadaimpacte.com)',
    },
    body: body.toString(),
  });
  const text = (await res.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { ok: res.ok, status: res.status, resum: text.slice(0, 300) };
}

// ---------- alta desde nuestro formulario ----------
export async function handleInscripcio(request, env) {
  let b; try { b = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const r = {
    nom: clean(b.nom, 60), cognom1: clean(b.cognom1, 60), cognom2: clean(b.cognom2, 60),
    dia: clean(b.dia, 2), mes: clean(b.mes, 2), any: clean(b.any, 4),
    tel: clean(b.tel, 20), movil: clean(b.movil, 20), mail: clean(b.mail, 120).toLowerCase(),
    domicili: clean(b.domicili, 120), cpostal: clean(b.cpostal, 10), localitat: clean(b.localitat, 80),
    nif: clean(b.nif, 20).toUpperCase(), professio: clean(b.professio, 80),
    modalitat: clean(b.modalitat, 40), centre: clean(b.centre, 100), gdpr: b.gdpr ? 1 : 0,
  };
  // Validación: los mismos campos obligatorios que el hospital + modalidad + consentimiento
  const falten = [];
  for (const [k, etiqueta] of [['nom', 'Nom'], ['cognom1', 'Primer cognom'], ['mail', 'E-mail'], ['nif', 'NIF'],
    ['tel', 'Telèfon'], ['domicili', 'Domicili'], ['cpostal', 'Codi postal'], ['localitat', 'Localitat'],
    ['professio', 'Professió/Servei'], ['centre', 'Centre'], ['modalitat', 'Modalitat']]) {
    if (!r[k]) falten.push(etiqueta);
  }
  if (!/^\d{1,2}$/.test(r.dia) || !/^\d{1,2}$/.test(r.mes) || !/^\d{4}$/.test(r.any)) falten.push('Data de naixement');
  if (r.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.mail)) falten.push('E-mail (format)');
  if (!MODALITATS.some(m => m.id === r.modalitat)) falten.push('Modalitat');
  if (!r.gdpr) falten.push('Acceptar la política de privacitat');
  if (falten.length) return json({ error: 'incomplet', falten }, 400);

  const mode = env.INSCRIPCIONS_MODE === 'real' ? 'real' : 'prova';
  const ts = Date.now();
  const ins = await env.DB.prepare(
    `INSERT INTO inscripcions (ts, mode, nom, cognom1, cognom2, dia, mes, any, tel, movil, mail, domicili, cpostal, localitat, nif, professio, modalitat, centre, gdpr, ip, ua)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(ts, mode, r.nom, r.cognom1, r.cognom2, r.dia, r.mes, r.any, r.tel, r.movil, r.mail, r.domicili, r.cpostal,
      r.localitat, r.nif, r.professio, r.modalitat, r.centre, r.gdpr,
      request.headers.get('cf-connecting-ip') || '', (request.headers.get('user-agent') || '').slice(0, 200)).run();
  const id = ins.meta.last_row_id;

  if (mode !== 'real') {
    return json({ ok: true, id, mode, avis: 'Mode de proves: la inscripció NO s\'ha enviat al Taulí.', enviaria: tauliBody(r).toString() });
  }
  let enviat = 0, resposta = '';
  try {
    const res = await enviaAlTauli(r);
    enviat = res.ok ? 1 : 0;
    resposta = `HTTP ${res.status} · ${res.resum}`;
  } catch (e) {
    resposta = 'error: ' + String(e && e.message || e);
  }
  await env.DB.prepare('UPDATE inscripcions SET enviat = ?, enviat_ts = ?, resposta = ? WHERE id = ?')
    .bind(enviat, Date.now(), resposta.slice(0, 500), id).run();
  return json({ ok: true, id, mode, enviat: !!enviat });
}

// Reenvío manual desde /admin (para probar una inscripción concreta)
export async function reenviaInscripcio(url, env) {
  const id = parseInt(url.searchParams.get('id'), 10);
  const r = await env.DB.prepare('SELECT * FROM inscripcions WHERE id = ?').bind(id).first();
  if (!r) return json({ error: 'no existeix' }, 404);
  let enviat = 0, resposta = '';
  try {
    const res = await enviaAlTauli(r);
    enviat = res.ok ? 1 : 0;
    resposta = `HTTP ${res.status} · ${res.resum}`;
  } catch (e) { resposta = 'error: ' + String(e && e.message || e); }
  await env.DB.prepare('UPDATE inscripcions SET enviat = ?, enviat_ts = ?, resposta = ? WHERE id = ?')
    .bind(enviat, Date.now(), resposta.slice(0, 500), id).run();
  return json({ ok: true, enviat: !!enviat, resposta });
}

// ---------- panel ----------
export async function adminInscripcions(env, token) {
  const { results: rows } = await env.DB.prepare('SELECT * FROM inscripcions ORDER BY ts DESC LIMIT 500').all();
  const tot = await env.DB.prepare(`SELECT COUNT(*) n, SUM(mode='real') reals, SUM(enviat=1) enviades, COUNT(DISTINCT lower(mail)) persones FROM inscripcions`).first();
  const perMod = {};
  for (const r of rows) { const m = MODALITATS.find(x => x.id === r.modalitat); const k = m ? `${m.label} (${m.preu} €)` : (r.modalitat || '—'); perMod[k] = (perMod[k] || 0) + 1; }
  const fmt = ts => new Date(ts).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  const fila = r => `<tr data-s="${esc((r.nom + ' ' + r.cognom1 + ' ' + (r.cognom2 || '') + ' ' + r.mail + ' ' + r.centre + ' ' + r.professio).toLowerCase())}">
    <td>${r.id}</td><td>${esc(r.nom)} ${esc(r.cognom1)} ${esc(r.cognom2 || '')}</td>
    <td><a href="mailto:${esc(r.mail)}">${esc(r.mail)}</a></td><td>${esc(r.nif)}</td>
    <td>${esc(r.tel)}${r.movil ? ' / ' + esc(r.movil) : ''}</td>
    <td>${esc(r.professio)}</td><td>${esc((MODALITATS.find(m => m.id === r.modalitat) || {}).label || r.modalitat)}</td>
    <td>${esc(r.centre)}</td><td>${esc(r.localitat)}</td>
    <td>${r.mode === 'real' ? (r.enviat ? '<b style="color:#0ca30c">enviada</b>' : '<b style="color:#e34948">error</b>') : '<span class="muted">prova</span>'}</td>
    <td>${fmt(r.ts)}</td>
    <td><button onclick="reenvia(${r.id})" title="Enviar esta inscripción al formulario del hospital">Enviar al Taulí</button></td>
  </tr>`;
  return `
<h2>Inscripcions (${tot.n || 0})</h2>
<div class="kpi"><div><b>${tot.n || 0}</b>inscripcions</div><div><b>${rows.reduce((a, r) => a + ((MODALITATS.find(m => m.id === r.modalitat) || {}).preu || 0), 0)} €</b>import previst (totes)</div><div><b>${tot.persones || 0}</b>persones (correus únics)</div><div><b>${tot.reals || 0}</b>en mode real</div><div><b>${tot.enviades || 0}</b>volcades al Taulí</div></div>
<div class="kpi">${Object.entries(perMod).map(([k, v]) => `<div><b>${v}</b>${esc(k)}</div>`).join('') || '<div class="muted">Encara no hi ha inscripcions</div>'}</div>
<div class="tools">
  <input id="qi" type="search" placeholder="Buscar per nom, correu, centre o professió…" oninput="filtraIns(this.value)" autocomplete="off">
  <span class="muted" id="qiinfo"></span>
  <a class="btn" href="/api/admin/inscripcions.csv?token=${esc(token)}">Descarregar CSV</a>
  <a class="btn" href="/inscripcio?token=${esc(token)}" target="_blank">Obrir el formulari de proves</a>
</div>
<div class="wrap"><table id="tins"><thead><tr><th>#</th><th>Nom</th><th>Correu</th><th>NIF</th><th>Telèfon</th><th>Professió</th><th>Modalitat</th><th>Centre</th><th>Localitat</th><th>Estat</th><th>Data</th><th></th></tr></thead><tbody>
${rows.map(fila).join('') || '<tr><td colspan="12" class="muted">Cap inscripció encara.</td></tr>'}
</tbody></table></div>
<script>
function filtraIns(q){ q=q.trim().toLowerCase(); let n=0;
  document.querySelectorAll('#tins tbody tr[data-s]').forEach(tr=>{ const ok=!q||tr.dataset.s.includes(q); tr.classList.toggle('hide',!ok); if(ok)n++; });
  document.getElementById('qiinfo').textContent = q ? n+' coincideixen' : ''; }
async function reenvia(id){ if(!confirm('Enviar aquesta inscripció al formulari del Taulí?')) return;
  const r = await fetch('/api/admin/inscripcio/reenvia?token=${esc(token)}&id='+id, {method:'POST'});
  const j = await r.json(); alert(j.enviat ? 'Enviada correctament' : 'No enviada: ' + (j.resposta||j.error)); location.reload(); }
</script>`;
}

export async function exportInscripcionsCsv(env) {
  const { results } = await env.DB.prepare('SELECT * FROM inscripcions ORDER BY ts DESC').all();
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const fmt = ts => new Date(ts).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  const head = 'id;data;mode;enviat;nom;cognom1;cognom2;naixement;telefon;mobil;correu;domicili;cp;localitat;nif;professio;modalitat;centre';
  const lines = [head];
  for (const r of results) lines.push([r.id, q(fmt(r.ts)), r.mode, r.enviat, q(r.nom), q(r.cognom1), q(r.cognom2),
    q(`${r.dia}/${r.mes}/${r.any}`), q(r.tel), q(r.movil), q(r.mail), q(r.domicili), q(r.cpostal), q(r.localitat),
    q(r.nif), q(r.professio), q((MODALITATS.find(m => m.id === r.modalitat) || {}).label || r.modalitat), q(r.centre)].join(';'));
  return new Response('﻿' + lines.join('\r\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="inscripcions-jornada-impacte.csv"', 'cache-control': 'no-store' } });
}

// ---------- formulario público ----------
export function inscripcioPage(mode) {
  const proves = mode !== 'real';
  return `<!doctype html><html lang="ca"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Inscripció · I Jornada IMPACTE</title>
<style>
 :root{--bg:#0d0c0b;--card:#17151300;--ink:#f4efe6;--muted:#8d8a83;--amber:#f5a623;--line:rgba(244,239,230,.18)}
 *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
 .wrap{max-width:760px;margin:0 auto;padding:28px 18px 60px}
 h1{font:600 26px/1.2 Georgia,serif;margin:0 0 4px} .sub{color:var(--muted);margin:0 0 22px;font-size:14px}
 .avis{border:1px solid #6b5a1f;background:#241f10;color:#f5d98a;border-radius:8px;padding:10px 14px;margin-bottom:20px;font-size:14px}
 fieldset{border:1px solid var(--line);border-radius:10px;padding:16px;margin:0 0 18px}
 legend{padding:0 8px;color:var(--amber);font-size:13px;letter-spacing:.08em;text-transform:uppercase}
 label{display:block;font-size:13px;color:var(--muted);margin:10px 0 4px}
 input,select{width:100%;background:rgba(244,239,230,.05);border:1px solid var(--line);border-radius:6px;color:var(--ink);padding:11px 12px;font:15px system-ui}
 input:focus,select:focus{outline:none;border-color:var(--amber)}
 .row{display:flex;gap:12px;flex-wrap:wrap}.row>*{flex:1 1 200px}
 .data{display:flex;gap:8px;max-width:260px}.data input{text-align:center}
 .mods{display:grid;gap:10px}
 .mod{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:14px;cursor:pointer;transition:border-color .15s,background .15s}
 .mod:hover{border-color:var(--amber)} .mod input{width:auto;flex:0 0 auto;margin-top:3px}
 .mod:has(input:checked){border-color:var(--amber);background:rgba(245,166,35,.07)}
 .mod.destacat{border-left:3px solid var(--amber)}
 .mod__body{flex:1} .mod__head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
 .mod__head b{font-size:16px} .mod__preu{color:var(--amber);font-weight:700;font-size:17px;white-space:nowrap}
 .mod__sub,.mod__avis{display:block;font-size:13px;color:var(--muted);margin-top:2px}
 .mod__avis{color:var(--amber)}
 .mod__inclou{display:block;margin-top:8px}
 .mod__inclou span{display:block;font-size:13px;color:var(--muted);padding-left:14px;position:relative;margin-top:3px}
 .mod__inclou span::before{content:'';position:absolute;left:0;top:7px;width:5px;height:5px;border-radius:50%;background:var(--amber);opacity:.8}
 .hint{font-size:12.5px;color:var(--muted);margin:6px 0 0;line-height:1.5}
 .avis-mail{color:#e0b062}
 .pagament{border:1px solid #6b5a1f;background:#241f10;color:#f5d98a;border-radius:8px;padding:11px 13px;margin:14px 0 0;font-size:13.5px;line-height:1.6}
 .gdpr{display:flex;gap:10px;align-items:flex-start;font-size:14px;margin-top:8px}.gdpr input{width:auto;margin-top:3px}
 .legal{font-size:12px;color:var(--muted);line-height:1.6;border:1px solid var(--line);border-radius:8px;padding:12px;max-height:180px;overflow:auto}
 button.send{width:100%;background:var(--amber);color:#14110e;border:0;border-radius:8px;padding:15px;font:600 16px system-ui;cursor:pointer;margin-top:8px}
 button.send:disabled{opacity:.5;cursor:not-allowed}
 a{color:var(--amber)} .err{color:#ff6b5c;font-size:14px;margin-top:10px} .ok{border:1px solid #2e6b34;background:#132a17;padding:18px;border-radius:10px}
</style>
<div class="wrap">
 <h1>I Jornada IMPACTE</h1>
 <p class="sub">Intervenció en Medicina Prehospitalària i Atenció al Crític, Trauma i Emergències · 27 d'octubre de 2026 · Parc Taulí, Sabadell</p>
 ${proves ? '<div class="avis"><b>Entorn de proves.</b> Aquesta pàgina no és pública i les dades <b>no</b> s\'envien encara al registre del Taulí: queden desades per comprovar que tot funciona.</div>' : ''}
 <form id="f" novalidate>
  <fieldset><legend>Dades personals</legend>
    <div class="row">
      <div><label for="nom">Nom *</label><input id="nom" name="nom" autocomplete="given-name"></div>
      <div><label for="cognom1">Primer cognom *</label><input id="cognom1" name="cognom1" autocomplete="family-name"></div>
      <div><label for="cognom2">Segon cognom</label><input id="cognom2" name="cognom2"></div>
    </div>
    <label>Data de naixement *</label>
    <div class="data"><input id="dia" name="dia" inputmode="numeric" maxlength="2" placeholder="dd" aria-label="dia">
      <input id="mes" name="mes" inputmode="numeric" maxlength="2" placeholder="mm" aria-label="mes">
      <input id="any" name="any" inputmode="numeric" maxlength="4" placeholder="aaaa" aria-label="any"></div>
    <div class="row">
      <div><label for="nif">NIF *</label><input id="nif" name="nif" autocomplete="off"></div>
      <div><label for="mail">Correu electrònic *</label><input id="mail" name="mail" type="email" inputmode="email" autocomplete="email">
        <p class="hint avis-mail">És molt important que l'e-mail que ens indiqui estigui actiu, ja que l'utilitzarem per contactar amb vostè.</p></div>
    </div>
    <div class="row">
      <div><label for="tel">Telèfon *</label><input id="tel" name="tel" inputmode="tel" autocomplete="tel"></div>
      <div><label for="movil">Mòbil</label><input id="movil" name="movil" inputmode="tel"></div>
    </div>
    <div class="row">
      <div style="flex:2 1 320px"><label for="domicili">Domicili *</label><input id="domicili" name="domicili" autocomplete="street-address"></div>
      <div><label for="cpostal">Codi postal *</label><input id="cpostal" name="cpostal" inputmode="numeric" autocomplete="postal-code"></div>
      <div><label for="localitat">Localitat *</label><input id="localitat" name="localitat" autocomplete="address-level2"></div>
    </div>
  </fieldset>

  <fieldset><legend>Dades professionals</legend>
    <div class="row">
      <div><label for="professio">Professió / Servei *</label><input id="professio" name="professio" placeholder="p. ex. Metge/essa d'urgències"></div>
      <div><label for="centre">Centre de treball *</label><input id="centre" name="centre" placeholder="p. ex. Parc Taulí"></div>
    </div>
  </fieldset>

  <fieldset><legend>Modalitat d'inscripció *</legend>
    <p class="hint" style="margin-top:0">Tria com vols viure la jornada.</p>
    <div class="mods">
      ${MODALITATS.map((m, i) => `<label class="mod${m.destacat ? ' destacat' : ''}">
        <input type="radio" name="modalitat" value="${m.id}"${i === 0 ? ' checked' : ''}>
        <span class="mod__body">
          <span class="mod__head"><b>${esc(m.label)}</b><span class="mod__preu">${m.preu} €</span></span>
          ${m.subtitol ? `<span class="mod__sub">${esc(m.subtitol)}</span>` : ''}
          ${m.avis ? `<span class="mod__avis">${esc(m.avis)}</span>` : ''}
          <span class="mod__inclou">${m.inclou.map(x => `<span>${esc(x)}</span>`).join('')}</span>
        </span>
      </label>`).join('')}
    </div>
    <p class="pagament"><b>No facis cap transferència encara.</b> Quan rebis el correu de confirmació de la secretaria de la Jornada, amb les instruccions de pagament, podràs fer l'ingrés. Fins llavors, no cal que paguis res.</p>
  </fieldset>

  <fieldset><legend>Protecció de dades</legend>
    <div class="legal">
      <p>El responsable del tractament és el <b>Consorci Corporació Sanitària Parc Taulí</b> (Parc Taulí 1, 08208 Sabadell). Delegat de Protecció de Dades: Antoni Llamas.</p>
      <p>Les dades que facilita en aquest formulari s'utilitzen únicament per gestionar la seva inscripció a la Jornada i per contactar amb vostè en relació amb aquesta activitat formativa, i es traslladen al registre de formació del Parc Taulí. Es conservaran durant un període aproximat de vint anys des de la seva recepció; passat aquest període es procedirà a la seva eliminació.</p>
      <p>Pot exercir els drets d'accés, rectificació, supressió, oposició, portabilitat, limitació i traçabilitat dirigint-se per escrit al Delegat de Protecció de Dades, i presentar una reclamació davant l'Autoritat Catalana de Protecció de Dades.</p>
      <p>Pot consultar la <a href="https://www.tauli.cat/tauli/politica-de-privacitat" target="_blank" rel="noopener">política de privacitat completa del Parc Taulí</a>. Per a qualsevol consulta: <a href="mailto:efreixa@tauli.cat">efreixa@tauli.cat</a>.</p>
    </div>
    <label class="gdpr"><input type="checkbox" id="gdpr" name="gdpr"><span>He llegit i accepto la política de privacitat *</span></label>
  </fieldset>

  <button class="send" id="btn" type="submit">Enviar la inscripció</button>
  <p class="err" id="err" hidden></p>
 </form>
 <div id="ok" class="ok" hidden></div>
</div>
<script>
const f = document.getElementById('f'), err = document.getElementById('err'), btn = document.getElementById('btn');
f.addEventListener('submit', async e => {
  e.preventDefault(); err.hidden = true;
  const d = Object.fromEntries(new FormData(f).entries());
  d.gdpr = document.getElementById('gdpr').checked;
  btn.disabled = true; btn.textContent = 'Enviant…';
  try {
    const r = await fetch('/api/inscripcio' + location.search, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) });
    const j = await r.json();
    if (!r.ok) { err.textContent = j.falten ? 'Falten camps: ' + j.falten.join(', ') : (j.error || 'Error en enviar'); err.hidden = false; btn.disabled = false; btn.textContent = 'Enviar la inscripció'; return; }
    f.hidden = true;
    const ok = document.getElementById('ok');
    ok.innerHTML = '<h2 style="margin:0 0 8px">Inscripció rebuda</h2><p style="margin:0">Gràcies, ' + (d.nom || '') + '. Rebràs la confirmació a <b>' + (d.mail || '') + '</b>.</p><p style="margin:10px 0 0">No facis cap transferència encara: la secretaria de la Jornada enviarà un correu amb les instruccions de pagament.</p>' + (j.mode !== 'real' ? '<p style="color:#f5d98a;margin:10px 0 0"><b>Mode de proves:</b> desada a la nostra base de dades, no enviada al Taulí (id ' + j.id + ').</p>' : '');
    ok.hidden = false; window.scrollTo(0, 0);
  } catch (e2) {
    err.textContent = 'No s\\'ha pogut enviar: ' + e2.message; err.hidden = false;
    btn.disabled = false; btn.textContent = 'Enviar la inscripció';
  }
});
</script></html>`;
}
