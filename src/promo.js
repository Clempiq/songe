import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4Target } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmTarget } from 'webm-muxer';

const W = 1080, H = 1920, FPS = 30, DUR = 21.5;
const C = { night: '#0E0D18', deep: '#1C1A2E', paper: '#F4F1FF', mute: '#A9A4C8', sun: '#FFC93C', rose: '#FF5C8A', blue: '#4A6CF7', mint: '#3DD6A3', ink: '#14131F' };
const DISPLAY = "800 {s}px Syne, 'Trebuchet MS', sans-serif";
const BODY = (w, s) => `${w} ${s}px Figtree, system-ui, sans-serif`;
const disp = s => DISPLAY.replace('{s}', s);

const REEL = [[1, 'Aquarelle'], [4, 'Estampe japonaise'], [12, 'Vitrail'], [14, 'Pâte à modeler'], [3, 'Gravure'], [11, 'Pop art'], [31, 'Origami'], [15, 'Enluminure'], [20, 'Cyanotype'], [25, 'Art déco'], [28, 'Plan technique'], [9, 'Art nouveau'], [33, 'Macro photo'], [24, 'Mosaïque'], [35, 'Bauhaus'], [17, 'Linogravure'], [10, 'Fusain'], [2, 'Art populaire']];
const TABLE = [12, 4, 22, 7];
const ENDF = [5, 30, 22, 12, 18];
const CLUE = '« Une faim de loup »';
const NCARDS = 37;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo = x => 1 - Math.pow(1 - x, 3);
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const back = x => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;

const imgs = {};
function loadImg(id) {
  return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `/cards/${id}.webp`; imgs[id] = im; });
}
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const stars = Array.from({ length: 140 }, () => ({ x: rnd() * W, y: rnd() * H, r: rnd() * 2 + .5, sp: rnd() * 30 + 10, ph: rnd() * 6.28 }));
const moonCv = document.createElement('canvas'); moonCv.width = moonCv.height = 300;
{ const m = moonCv.getContext('2d'); m.fillStyle = C.sun; m.beginPath(); m.arc(150, 150, 150, 0, 7); m.fill(); m.globalCompositeOperation = 'destination-out'; m.beginPath(); m.arc(240, 66, 158, 0, 7); m.fill(); }
const grainCv = document.createElement('canvas'); grainCv.width = grainCv.height = 256;
{ const g = grainCv.getContext('2d'); const d = g.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = rnd() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); }

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function card(ctx, id, cx, cy, { s = 1, r = 0, op = 1, blur = 0, w = 560, h = 996 } = {}) {
  if (op <= 0.003) return;
  ctx.save();
  ctx.globalAlpha = clamp(op);
  ctx.translate(cx, cy); ctx.rotate(r * Math.PI / 180); ctx.scale(s, s);
  if (blur > .05) ctx.filter = `blur(${blur}px)`;
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 90; ctx.shadowOffsetY = 45;
  rr(ctx, -w / 2, -h / 2, w, h, 40); ctx.fillStyle = '#2A2745'; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.clip();
  const im = imgs[id];
  if (im && im.complete && im.naturalWidth) {
    const k = Math.max(w / im.naturalWidth, h / im.naturalHeight);
    const iw = im.naturalWidth * k, ih = im.naturalHeight * k;
    ctx.drawImage(im, -iw / 2, -ih / 2, iw, ih);
  }
  ctx.restore();
}
function text(ctx, str, x, y, { font, color = C.paper, align = 'center', op = 1, dx = 0, dy = 0, s = 1, blur = 0, spacing = 0, glow = null, r = 0 }) {
  if (op <= 0.003) return;
  ctx.save();
  ctx.globalAlpha = clamp(op); ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = spacing + 'px';
  if (blur > .05) ctx.filter = `blur(${blur}px)`;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 70; }
  ctx.translate(x + dx, y + dy); ctx.rotate(r * Math.PI / 180); ctx.scale(s, s);
  ctx.fillText(str, 0, 0);
  ctx.restore();
}
function avatar(ctx, x, y, d, col, ch, { s = 1, op = 1, border = 0 } = {}) {
  if (op <= 0.003) return;
  ctx.save(); ctx.globalAlpha = clamp(op); ctx.translate(x, y); ctx.scale(s, s);
  if (border) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 0, d / 2 + border, 0, 7); ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, d / 2, 0, 7); ctx.fill();
  ctx.fillStyle = C.ink; ctx.font = BODY(800, d * .48); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, 0, d * .03);
  ctx.restore();
}

function draw(ctx, t) {
  const g = ctx.createRadialGradient(540, 576, 0, 540, 576, 1500);
  g.addColorStop(0, '#241f45'); g.addColorStop(.45, '#14122a'); g.addColorStop(1, '#0a0914');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  for (const s of stars) { const y = ((s.y - t * s.sp) % H + H) % H; ctx.globalAlpha = clamp(.35 + .4 * Math.sin(t * 2 + s.ph)); ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;

  {
    const m1 = eo(seg(t, 0, .9)), mv = eio(seg(t, 2.1, 2.8)), mo = eio(seg(t, 16.4, 17.2));
    const mx = lerp(390, 820, mv), my = lerp(330, -40, mv), ms = lerp(lerp(.2, 1, m1), .55, mv);
    const x = lerp(mx, 390, mo) + 150, y = lerp(my, 250, mo) + 150, s = lerp(ms, .9, mo);
    ctx.save(); ctx.shadowColor = 'rgba(255,201,60,.6)'; ctx.shadowBlur = 60;
    ctx.translate(x, y); ctx.scale(s, s); ctx.drawImage(moonCv, -150, -150); ctx.restore();
  }

  {
    ctx.font = disp(250); ctx.letterSpacing = '-7px';
    const L = [...'SONGE']; const ws = L.map(c => ctx.measureText(c).width - 7); const tot = ws.reduce((a, b) => a + b, 0);
    let x = 540 - tot / 2; const out = seg(t, 2.1, 2.5);
    L.forEach((c, i) => {
      const p = eo(seg(t, .35 + i * .09, .95 + i * .09));
      text(ctx, c, x + ws[i] / 2, 920, { font: disp(250), dy: lerp(160, 0, p) - out * 120, op: p * (1 - out), blur: (1 - p) * 18 + out * 14 });
      x += ws[i];
    });
    ctx.letterSpacing = '0px';
    const p = eo(seg(t, 1.15, 1.7)), o = seg(t, 2.1, 2.4);
    text(ctx, 'Le jeu des rêves qu’on raconte', 540, 1045, { font: BODY(700, 52), color: C.mute, dy: lerp(40, 0, p), op: p * (1 - o) });
  }

  {
    const r0 = 2.6, step = .19;
    const cIn = seg(t, 2.6, 3.0), cOut = seg(t, 6.1, 6.5);
    const n = Math.round(lerp(0, NCARDS, eo(seg(t, 2.6, 5.8))));
    text(ctx, String(n), 540, 315, { font: disp(190), dy: lerp(-60, 0, eo(cIn)) - cOut * 80, op: cIn * (1 - cOut) });
    text(ctx, `cartes · ${n} univers`.toUpperCase(), 540, 420, { font: BODY(800, 56), color: C.sun, spacing: 7, dy: lerp(-60, 0, eo(cIn)) - cOut * 80, op: cIn * (1 - cOut) });
    const shown = clamp(Math.floor((t - r0) / step) + 1, 0, REEL.length);
    REEL.forEach(([id], i) => {
      const ti = r0 + i * step; if (t < ti || t > 6.6) return;
      const p = seg(t, ti, ti + .22);
      const rot = ((i * 47) % 17) - 8, dx = ((i * 61) % 90) - 45;
      const fan = eio(seg(t, 5.9, 6.5)); const fi = i - (REEL.length - 1) / 2; const st = back(p);
      card(ctx, id, 540 + lerp(dx * .6, fi * 44, fan), 1058 + lerp(lerp(260, 0, st), Math.abs(fi) * 14, fan) - fan * 40, {
        r: lerp(lerp(rot * 2.4, rot, st), fi * 4.2, fan), s: lerp(lerp(1.25, .92, st), .6, fan) * (1 - cOut * .3), op: clamp(p * 3) * (1 - seg(t, 6.25, 6.6))
      });
    });
    if (t > 2.7 && t < 5.95) text(ctx, REEL[clamp(shown - 1, 0, REEL.length - 1)][1].toUpperCase(), 540, 1700, { font: BODY(800, 44), color: C.sun, spacing: 9 });
  }

  const head = (l1, l2, a, b, from) => {
    const pi = eo(seg(t, a, a + .5)), po = seg(t, b, b + .4);
    text(ctx, l1.toUpperCase(), 70, 254, { font: disp(118), align: 'left', dx: lerp(from, 0, pi), op: pi * (1 - po), spacing: -3 });
    text(ctx, l2.toUpperCase(), 70, 358, { font: disp(118), align: 'left', color: C.sun, dx: lerp(from, 0, pi), op: pi * (1 - po), spacing: -3 });
  };
  head('Un conteur.', 'Un indice.', 6.5, 9.8, -120);
  head('Les autres', 'bluffent.', 10.2, 13.6, 120);
  head('À toi de', 'trouver.', 13.9, 16.2, -120);
  {
    const tIn = back(seg(t, 6.6, 7.3)), gridP = eio(seg(t, 10.1, 10.9)), shuffleP = eio(seg(t, 11.9, 12.7));
    const pos = [[-270, -250], [270, -250], [-270, 560], [270, 560]], shuf = [3, 0, 2, 1];
    const order = [1, 2, 3, 0];
    for (const i of order) {
      let x, y, s, r, op;
      if (i === 0) { x = 0; y = lerp(900, -95, tIn); s = lerp(.8, 1, tIn); r = lerp(-8, 0, tIn); op = seg(t, 6.6, 6.9); }
      else { x = i === 1 ? -900 : i === 2 ? 900 : 0; y = i === 3 ? 1300 : 0; s = .5; r = (i - 2) * 10; op = 0; }
      if (t >= 10.1) {
        const a = pos[i], b = pos[shuf[i]];
        const gx = lerp(a[0], b[0], shuffleP), gy = lerp(a[1], b[1], shuffleP) - Math.sin(shuffleP * Math.PI) * (i % 2 ? 120 : -120);
        const fx = i === 0 ? 0 : x, fy = i === 0 ? -95 : y;
        const gp = i === 0 ? gridP : eo(seg(t, 10.2 + i * .12, 10.9 + i * .12));
        x = lerp(fx, gx, gp); y = lerp(fy, gy, gp); s = lerp(i === 0 ? 1 : .5, .46, gp); r = lerp(r, ((i * 13) % 7) - 3, gp); op = i === 0 ? 1 : clamp(gp * 3);
      }
      if (t < 6.6 || t > 17) continue;
      const end = seg(t, 16.3, 16.9);
      card(ctx, TABLE[i], 540 + x, 978 + y, { r, s: s * (1 - end * .2), op: op * (1 - end) });
    }
  }
  {
    const ci = eo(seg(t, 7.4, 7.9)), co = seg(t, 9.9, 10.3), op = ci * (1 - co);
    if (op > 0) {
      ctx.save(); ctx.globalAlpha = op; ctx.translate(0, lerp(80, 0, ci));
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 25;
      rr(ctx, 110, 1500, 860, 250, 44); ctx.fillStyle = 'rgba(28,26,46,.94)'; ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,201,60,.5)'; ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.font = BODY(700, 36); const lbl = 'Léa souffle un indice'; const lw = ctx.measureText(lbl).width; ctx.restore();
      const sx = 540 - (lw + 82) / 2;
      avatar(ctx, sx + 32, 1580 + lerp(80, 0, ci), 64, C.rose, 'L', { op });
      text(ctx, lbl, sx + 82, 1593, { font: BODY(700, 36), color: C.mute, align: 'left', dy: lerp(80, 0, ci), op });
      const chars = Math.floor(clamp((t - 7.9) / 1.1) * CLUE.length);
      const caret = t > 7.9 && t < 9.6 && Math.floor(t * 4) % 2 ? '|' : '';
      text(ctx, CLUE.slice(0, chars) + caret, 540, 1700, { font: disp(76), dy: lerp(80, 0, ci), op });
    }
  }
  {
    const wcx = 540 + 270, wcy = 978 + 560, cw = 560 * .46, chh = 996 * .46;
    const rp = back(seg(t, 14.5, 15.0)), ro = seg(t, 16.2, 16.6);
    const rs = lerp(1.3, 1, rp), rop = clamp(rp) * (1 - ro);
    if (rop > 0) {
      ctx.save(); ctx.globalAlpha = rop; ctx.translate(wcx, wcy); ctx.scale(rs, rs);
      ctx.shadowColor = 'rgba(255,92,138,.8)'; ctx.shadowBlur = 50; ctx.lineWidth = 10; ctx.strokeStyle = C.rose;
      rr(ctx, -(cw + 40) / 2, -(chh + 40) / 2, cw + 40, chh + 40, 30); ctx.stroke(); ctx.restore();
    }
    [[C.sun, 'C'], [C.blue, 'T'], [C.mint, 'M']].forEach(([col, ch], i) => {
      const p = back(seg(t, 14.9 + i * .18, 15.3 + i * .18));
      avatar(ctx, wcx - 100 + i * 100, wcy + chh / 2 + 18 + lerp(60, 0, clamp(p)), 96, col, ch, { s: clamp(p, 0, 1.3), op: clamp(p) * (1 - ro), border: 6 });
    });
    const p = back(seg(t, 15.5, 15.9)), o = seg(t, 16.2, 16.5);
    text(ctx, '+3', 300, 1250, { font: disp(330), color: C.mint, glow: 'rgba(61,214,163,.7)', s: lerp(.3, 1, clamp(p, 0, 1.2)), op: clamp(p * 2) * (1 - o), r: -6 });
  }

  {
    const e0 = 16.8;
    ENDF.forEach((id, i) => { const p = eo(seg(t, e0 + i * .06, e0 + .7 + i * .06)); const fi = i - 2; card(ctx, id, 540 + fi * 190, 1018 + lerp(900, 560, p) + Math.abs(fi) * 50, { r: fi * 9, s: .55, op: p * .28, blur: 10 }); });
    { const p = eo(seg(t, e0 + .3, e0 + .9)); text(ctx, 'Songe', 540, 850, { font: disp(260), s: lerp(1.4, 1, p), op: p, blur: (1 - p) * 20, spacing: -8 }); }
    {
      const p = eo(seg(t, e0 + .8, e0 + 1.3));
      if (p > 0) {
        ctx.save(); ctx.font = disp(84); const parts = [['Raconte. ', C.paper], ['Bluffe.', C.sun], [' Devine.', C.paper]];
        const ws = parts.map(([s]) => ctx.measureText(s).width); ctx.restore();
        let x = 540 - ws.reduce((a, b) => a + b, 0) / 2;
        parts.forEach(([s, col], i) => { text(ctx, s, x, 975, { font: disp(84), color: col, align: 'left', dy: lerp(50, 0, p), op: p }); x += ws[i]; });
      }
    }
    {
      const p = back(seg(t, e0 + 1.2, e0 + 1.7)); const op = clamp(p * 2);
      if (op > 0) {
        ctx.save(); ctx.font = disp(64); const url = 'songe-jeu.vercel.app'; const uw = ctx.measureText(url).width;
        ctx.globalAlpha = op; ctx.translate(540, 1178); const s = lerp(.6, 1, clamp(p, 0, 1.1)); ctx.scale(s, s);
        ctx.shadowColor = 'rgba(255,201,60,.45)'; ctx.shadowBlur = 50;
        rr(ctx, -uw / 2 - 60, -68, uw + 120, 136, 68); ctx.fillStyle = C.sun; ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(url, 0, 4); ctx.restore();
      }
    }
    { const p = eo(seg(t, e0 + 1.6, e0 + 2.1)); text(ctx, 'Gratuit · 3 à 6 joueurs · Sur ton téléphone', 540, 1330, { font: BODY(700, 44), color: C.mute, dy: lerp(30, 0, p), op: p }); }
  }

  const fl = Math.max(1 - Math.abs(t - 6.5) / .12, 1 - Math.abs(t - 2.6) / .1, 0);
  if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${fl * .55})`; ctx.fillRect(0, 0, W, H); }
  ctx.save(); ctx.globalAlpha = .06; ctx.globalCompositeOperation = 'overlay';
  const ox = (Math.floor(t * 24) * 37) % 256, oy = (Math.floor(t * 24) * 53) % 256;
  ctx.fillStyle = ctx.createPattern(grainCv, 'repeat'); ctx.translate(-ox, -oy); ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore();
}

const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
cv.width = W; cv.height = H;
const btn = document.getElementById('dl'), status = document.getElementById('status');
let playing = true, t0 = 0;

async function ready() {
  const ids = new Set([...REEL.map(r => r[0]), ...TABLE, ...ENDF]);
  await Promise.all([...ids].map(loadImg));
  try { await Promise.all([document.fonts.load(disp(100)), document.fonts.load(BODY(800, 40)), document.fonts.load(BODY(700, 40))]); } catch (e) {}
}
function loop(now) {
  if (playing) draw(ctx, ((now - t0) / 1000) % DUR);
  requestAnimationFrame(loop);
}

async function pickEncoder() {
  if (!('VideoEncoder' in window)) return null;
  const base = { width: W, height: H, bitrate: 10_000_000, framerate: FPS };
  for (const codec of ['avc1.640033', 'avc1.640028', 'avc1.4d0033', 'avc1.42003e']) {
    try { const s = await VideoEncoder.isConfigSupported({ ...base, codec }); if (s.supported) return { kind: 'mp4', config: { ...base, codec } }; } catch (e) {}
  }
  for (const codec of ['vp09.00.40.08', 'vp8']) {
    try { const s = await VideoEncoder.isConfigSupported({ ...base, codec }); if (s.supported) return { kind: 'webm', config: { ...base, codec } }; } catch (e) {}
  }
  return null;
}
async function exportVideo() {
  btn.disabled = true; playing = false;
  const enc = await pickEncoder();
  if (!enc) { status.textContent = 'Ton navigateur ne sait pas encoder de vidéo. Ouvre cette page dans Chrome sur ordinateur.'; btn.disabled = false; playing = true; return; }
  const mp4 = enc.kind === 'mp4';
  const muxer = mp4
    ? new Mp4Muxer({ target: new Mp4Target(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory' })
    : new WebmMuxer({ target: new WebmTarget(), video: { codec: enc.config.codec.startsWith('vp09') ? 'V_VP9' : 'V_VP8', width: W, height: H, frameRate: FPS } });
  let failed = null;
  const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { failed = e; } });
  encoder.configure(enc.config);
  const N = Math.round(DUR * FPS);
  for (let i = 0; i < N && !failed; i++) {
    draw(ctx, i / FPS);
    const frame = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
    encoder.encode(frame, { keyFrame: i % 60 === 0 });
    frame.close();
    if (i % 10 === 0) { status.textContent = `Fabrication de la vidéo… ${Math.round(i / N * 100)} %`; await new Promise(r => setTimeout(r, 0)); }
    while (encoder.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 5));
  }
  if (failed) { status.textContent = 'L’encodage a échoué. Réessaie dans Chrome sur ordinateur.'; btn.disabled = false; playing = true; return; }
  await encoder.flush(); muxer.finalize();
  const blob = new Blob([muxer.target.buffer], { type: mp4 ? 'video/mp4' : 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = mp4 ? 'songe-promo.mp4' : 'songe-promo.webm'; document.body.appendChild(a); a.click(); a.remove();
  status.textContent = `Vidéo prête : ${a.download} (${(blob.size / 1e6).toFixed(1)} Mo). Elle se trouve dans tes téléchargements.`;
  window.__lastExport = { kind: enc.kind, size: blob.size };
  btn.disabled = false; playing = true; t0 = performance.now();
}
btn.addEventListener('click', exportVideo);
window.__draw = t => draw(ctx, t);

ready().then(() => { status.textContent = 'Aperçu en boucle. La vidéo fait 21 secondes en 1080×1920.'; btn.disabled = false; t0 = performance.now(); requestAnimationFrame(loop); });
