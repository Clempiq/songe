import './style.css';
import { createClient } from '@supabase/supabase-js';
import CARDS from './cards.json';
import CI18N from './cards-i18n.js';
import { t, tp, lang, setLang, LANGS } from './i18n.js';

const SUPABASE_URL = 'https://hcdbfkmzfjkzffkbdhke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZGJma216ZmpremZma2JkaGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NTk0OTksImV4cCI6MjEwNzEzNTQ5OX0.YB7RtbiWpHK4LTfC8RxkcpcNBXeI6LyGmY6Ccd2_d1Q';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { params: { eventsPerSecond: 20 } } });

const TARGET = 30;
const NCARDS = CARDS.length;
const MAXP = Math.max(3, Math.min(6, Math.floor(NCARDS / 3)));
const COLORS = ['#FFC93C', '#FF5C8A', '#4A6CF7', '#3DD6A3', '#F4F1FF', '#B79CFF'];
const BOTS = ['Lina', 'Malo', 'Inès', 'Yanis', 'Sacha'];
const AWAY_GRACE = 25000;
const META = Object.fromEntries(CARDS.map(c => [c.id, c]));
const REVEAL_STEP = 1500;
const BADGES = [
  { id: 'first', name: 'Premier rêve', desc: 'Termine ta première partie' },
  { id: 'lynx', name: 'Œil de lynx', desc: 'Trouve la carte du conteur 5 fois' },
  { id: 'illusion', name: 'Illusionniste', desc: 'Piège 2 joueurs avec une seule carte' },
  { id: 'gold', name: 'Conteur d’or', desc: 'Réussis 3 indices parfaits' },
  { id: 'collector', name: 'Collectionneur', desc: 'Découvre 25 cartes' },
  { id: 'champion', name: 'Champion', desc: 'Gagne une partie' },
];

/* ================= Utilitaires ================= */
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pick = a => a[Math.floor(Math.random() * a.length)];
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const STRIP = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g;
const cleanNick = s => String(s || '').replace(STRIP, '').replace(/\s+/g, ' ').trim().slice(0, 14);
const cleanClue = s => String(s || '').replace(STRIP, '').replace(/\s+/g, ' ').trim().slice(0, 60);
const rid = () => Math.random().toString(36).slice(2, 10);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
function genCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
function meta(id) { return META[id] || CARDS[0]; }
function clues(id) { const x = CI18N[lang()] && CI18N[lang()][id]; return x ? x.slice(0, 3) : meta(id).c; }
function words(id) { const m = meta(id), x = CI18N[lang()] && CI18N[lang()][id]; return m.w.concat(m.t, x ? x[3].split(' ') : []); }
function rel(a, b) { const x = meta(a), y = meta(b); let s = x.t.filter(t => y.t.includes(t)).length; if (a === b) s += 3; return s; }
function vib(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
const ls = {
  get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  json(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch (e) { return d; } },
  put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const ss = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { sessionStorage.removeItem(k); } catch (e) {} },
};
const BACK = `<svg viewBox="0 0 90 160" aria-hidden="true"><defs><radialGradient id="bg" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#3a3466"/><stop offset="1" stop-color="#1b1830"/></radialGradient></defs><rect width="90" height="160" fill="url(#bg)"/><rect x="6" y="6" width="78" height="148" rx="8" fill="none" stroke="#FFC93C" stroke-opacity=".55" stroke-width="1.2"/><circle cx="45" cy="80" r="17" fill="#FFC93C"/><circle cx="53" cy="73" r="15" fill="#2a2550"/><g fill="#fff" opacity=".7"><circle cx="22" cy="30" r="1"/><circle cx="68" cy="40" r="1.2"/><circle cx="30" cy="125" r="1"/><circle cx="64" cy="118" r="1"/></g></svg>`;
function face(id) { return `<img src="/cards/${id}.webp" alt="" draggable="false" decoding="async">`; }

/* ================= Sons (synthétisés, aucun fichier) ================= */
const SND = { on: ls.get('songe-mute') !== '1', ctx: null };
function ac() {
  if (!SND.ctx) { try { SND.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (SND.ctx.state === 'suspended') SND.ctx.resume().catch(() => {});
  return SND.ctx;
}
function tone(freq, dur, { type = 'sine', vol = .12, delay = 0, slide = 0 } = {}) {
  if (!SND.on) return; const c = ac(); if (!c) return;
  const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05);
}
const sfx = {
  tick: () => tone(1250, .035, { type: 'triangle', vol: .04 }),
  select: () => { tone(660, .08, { type: 'triangle', vol: .09 }); tone(990, .12, { type: 'triangle', vol: .07, delay: .05 }); },
  send: () => tone(380, .3, { vol: .1, slide: 2.2 }),
  flip: () => { tone(180, .1, { type: 'sawtooth', vol: .035, slide: 3 }); tone(900, .06, { type: 'triangle', vol: .05, delay: .08 }); },
  turn: () => [392, 523, 659].forEach((f, i) => tone(f, .3, { vol: .09, delay: i * .12 })),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .4, { type: 'triangle', vol: .1, delay: i * .09 })),
  lose: () => { tone(330, .25, { vol: .09 }); tone(247, .45, { vol: .09, delay: .18 }); },
  badge: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, .25, { type: 'triangle', vol: .08, delay: i * .07 })),
};

/* ================= Confettis ================= */
let confettiRun = null;
function confetti(n = 120) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let cv = document.getElementById('confetti');
  if (!cv) { cv = document.createElement('canvas'); cv.id = 'confetti'; document.body.appendChild(cv); }
  const dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = ['#FFC93C', '#FF5C8A', '#4A6CF7', '#3DD6A3', '#F4F1FF'];
  const ps = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .45, vx: (Math.random() - .5) * 14, vy: -Math.random() * 16 - 6, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4, w: 6 + Math.random() * 6, h: 3 + Math.random() * 5, col: pick(cols) }));
  const t0 = performance.now(); cancelAnimationFrame(confettiRun);
  const step = now => {
    const el = (now - t0) / 1000; c.clearRect(0, 0, innerWidth, innerHeight);
    ps.forEach(p => { p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; c.save(); c.globalAlpha = Math.max(0, 1 - el / 2.2); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore(); });
    if (el < 2.3) confettiRun = requestAnimationFrame(step); else c.clearRect(0, 0, innerWidth, innerHeight);
  };
  confettiRun = requestAnimationFrame(step);
}

/* ================= Carnet : collection, stats, badges ================= */
const BOOK = Object.assign({ seen: [], badges: [], games: 0, wins: 0, found: 0, gold: 0, counted: [] }, ls.json('songe-book', {}));
const seenSet = new Set(BOOK.seen);
function saveBook() { BOOK.seen = [...seenSet]; BOOK.counted = BOOK.counted.slice(-40); ls.put('songe-book', BOOK); }
function see(ids) { let n = 0; ids.forEach(id => { if (META[id] && !seenSet.has(id)) { seenSet.add(id); n++; } }); if (n) { if (seenSet.size >= 25) unlock('collector'); saveBook(); } }
function unlock(id) {
  if (BOOK.badges.includes(id)) return; BOOK.badges.push(id); saveBook();
  const b = BADGES.find(x => x.id === id); if (!b) return;
  toast(t('Badge débloqué : {b}', { b: t(b.name) }), t(b.desc)); sfx.badge(); vib([20, 40, 20]);
}
let toastTimer = null;
function toast(title, sub) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = `<span class="tstar" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.2l7.1-.6z" fill="currentColor"/></svg></span><span><strong>${esc(title)}</strong><br><small>${esc(sub || '')}</small></span>`;
  el.className = 'show'; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className = ''; }, 3600);
}
function recordRound() {
  const key = G.gid + ':' + G.round; if (BOOK.counted.includes(key)) return; BOOK.counted.push(key);
  const me = meIdx(); if (me < 0) { saveBook(); return; }
  const right = G.owners.indexOf(G.st);
  if (me === G.st) { if ((G.deltas[me] || 0) === 3) { BOOK.gold++; if (BOOK.gold >= 3) unlock('gold'); } }
  else {
    if (G.votes[me] === right) { BOOK.found++; if (BOOK.found >= 5) unlock('lynx'); }
    const mine = G.owners.indexOf(me); const fooled = G.votes.filter((v, k) => v === mine && k !== me).length;
    if (fooled >= 2) unlock('illusion');
  }
  saveBook();
}
function recordGame() {
  const key = 'end:' + G.gid; if (BOOK.counted.includes(key)) return; BOOK.counted.push(key);
  const me = meIdx(); if (me < 0) { saveBook(); return; }
  BOOK.games++; unlock('first');
  const best = Math.max(...G.players.map(p => p.s));
  if (G.players[me].s === best) { BOOK.wins++; unlock('champion'); }
  saveBook();
}

/* ================= État ================= */
let urlCode = (new URLSearchParams(location.search).get('salon') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
const S = {
  screen: 'home', nick: ls.get('songe-nick'), joinCode: urlCode, code: '', err: '', note: '', busy: false, solo: false,
  sel: null, vsel: null, draft: '', mine: null, sent: null, zoom: null, hostGone: false, copied: false,
  car: {}, phaseKey: '', rv: null, touching: false, pendingRender: false,
};
let myId = (ss.get('songe-id')) || rid(); ss.set('songe-id', myId);
let ch = null, myPres = {}, presTimer = null, peerSet = new Set();
let host = false, G = null, lastG = '', hostKey = null, joinTimer = null;
let deck = [], discard = [], pending = [], owners = [], stCard = null, understood = false, timers = {}, awaySince = {};

/* ================= Hôte : règles ================= */
function meIdx() { return G ? G.players.findIndex(p => p.p === myId) : -1; }
function reAvatar() { G.players.forEach((p, i) => p.a = i); }
function saveHost() { if (host && !S.solo) ss.set('songe-host', { G, deck, discard, pending, owners, stCard, understood }); }
function push() {
  if (!host || !G) return;
  lastG = JSON.stringify(G);
  saveHost();
  render();
  if (ch) setPresence({ nick: S.nick, g: G });
  hostTick();
}
function hostCreate(code) {
  G = { code, phase: 'lobby', round: 0, st: 0, hs: 6, clue: '', gid: '', players: [{ p: myId, n: S.nick, a: 0, s: 0, h: [] }], played: [], table: [], votes: [], owners: [], deltas: [] };
  push();
}
function addBot() {
  if (G.players.length >= MAXP) return;
  const used = G.players.map(p => p.n);
  const n = BOTS.find(b => !used.includes(b)) || ('Bot ' + G.players.length);
  G.players.push({ p: 'bot-' + rid(), n, a: 0, s: 0, h: [], b: 1 });
  reAvatar(); push();
}
function removePlayer(i) { if (i <= 0) return; G.players.splice(i, 1); reAvatar(); push(); }
function draw() { if (!deck.length) { deck = shuffle(discard); discard = []; } return deck.length ? deck.pop() : null; }
function hostStart() {
  if (G.players.length < 3) return;
  Object.values(timers).forEach(clearTimeout); timers = {};
  G.players = G.players.filter((p, i) => i === 0 || !p.away); reAvatar();
  const n = G.players.length;
  const hs = Math.max(2, Math.min(6, Math.floor(NCARDS / n)));
  deck = shuffle(CARDS.map(c => c.id)); discard = [];
  G.gid = rid(); G.hs = hs; G.round = 1; G.st = Math.floor(Math.random() * n);
  G.players.forEach(p => { p.s = 0; p.h = []; for (let k = 0; k < hs; k++) { const c = draw(); if (c != null) p.h.push(c); } });
  startRound();
}
function startRound() {
  const n = G.players.length;
  G.phase = 'tell'; G.clue = ''; G.table = []; G.owners = []; G.deltas = [];
  G.played = Array(n).fill(0); G.votes = Array(n).fill(-1);
  pending = []; owners = []; stCard = null; understood = false;
  push();
}
function takeFromHand(i, c) { const p = G.players[i]; if (!p) return false; const k = p.h.indexOf(c); if (k < 0) return false; p.h.splice(k, 1); return true; }
function applyTell(i, c, clue) {
  clue = cleanClue(clue);
  if (G.phase !== 'tell' || i !== G.st || !clue || typeof c !== 'number' || !takeFromHand(i, c)) return false;
  G.clue = clue; stCard = c; pending = [{ c, o: i }]; G.played[i] = 1;
  const m = meta(c);
  understood = !G.players[i].b && words(c).some(w => norm(clue).includes(w.slice(0, Math.max(4, w.length - 1))));
  G.phase = 'match';
  return true;
}
function applyPlay(i, c) {
  if (G.phase !== 'match' || i === G.st || G.played[i] || typeof c !== 'number' || !takeFromHand(i, c)) return false;
  pending.push({ c, o: i }); G.played[i] = 1;
  if (G.played.every(Boolean)) {
    shuffle(pending); G.table = pending.map(e => e.c); owners = pending.map(e => e.o); G.phase = 'vote';
  }
  return true;
}
function applyVote(i, t) {
  if (G.phase !== 'vote' || i === G.st || G.votes[i] >= 0 || typeof t !== 'number' || t < 0 || t >= G.table.length || owners[t] === i) return false;
  G.votes[i] = t;
  if (G.players.every((p, k) => k === G.st || G.votes[k] >= 0)) score();
  return true;
}
function score() {
  const n = G.players.length, d = Array(n).fill(0), right = owners.indexOf(G.st);
  const voters = G.players.map((p, i) => i).filter(i => i !== G.st);
  const finders = voters.filter(i => G.votes[i] === right);
  if (finders.length === 0 || finders.length === voters.length) voters.forEach(i => d[i] += 2);
  else { d[G.st] += 3; finders.forEach(i => d[i] += 3); }
  voters.forEach(i => { const o = owners[G.votes[i]]; if (o !== G.st) d[o] += 1; });
  G.players.forEach((p, i) => p.s += d[i]);
  G.deltas = d; G.owners = owners.slice(); G.phase = 'reveal';
  discard.push(...G.table);
}
function hostNext() {
  if (G.phase !== 'reveal') return;
  if (G.players.some(p => p.s >= TARGET)) { G.phase = 'end'; push(); return; }
  G.players.forEach(p => { while (p.h.length < G.hs) { const c = draw(); if (c == null) break; p.h.push(c); } });
  G.st = (G.st + 1) % G.players.length; G.round++;
  startRound();
}
function backToLobby() {
  Object.values(timers).forEach(clearTimeout); timers = {};
  G.phase = 'lobby'; G.round = 0;
  G.players = G.players.filter((p, i) => i === 0 || !p.away); G.players.forEach(p => { p.s = 0; p.h = []; }); reAvatar();
  push();
}
function isAuto(p) { return !!(p.b || p.away); }
function autoDelay(p, base) { return p.b ? base + Math.random() * 1600 : Math.max(800, AWAY_GRACE - (Date.now() - (awaySince[p.p] || Date.now()))); }
function sched(key, fn, ms) {
  if (timers[key]) return;
  timers[key] = setTimeout(() => { delete timers[key]; if (G && host && key.startsWith(G.round + ':' + G.phase + ':')) fn(); }, ms);
}
function botPlay(h) { let best = h[0], bs = -1; h.forEach(c => { const s = rel(c, stCard) + Math.random() * 1.6; if (s > bs) { bs = s; best = c; } }); return best; }
function botVote(i) {
  const right = owners.indexOf(G.st);
  const prob = G.players[G.st].b ? 0.5 : (understood ? 0.72 : 0.28);
  if (Math.random() < prob && owners[right] !== i) return right;
  const others = G.table.map((c, k) => k).filter(k => k !== right && owners[k] !== i);
  if (!others.length) return right;
  const w = others.map(k => rel(G.table[k], stCard) + 0.4); let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let k = 0; k < others.length; k++) { r -= w[k]; if (r <= 0) return others[k]; }
  return others[others.length - 1];
}
function hostTick() {
  if (!host || !G) return;
  const key = G.round + ':' + G.phase + ':';
  if (G.phase === 'tell') {
    const p = G.players[G.st];
    if (isAuto(p) && p.h.length) sched(key + 't' + p.p, () => { if (!isAuto(G.players[G.st])) return; const c = pick(p.h); if (applyTell(G.st, c, pick(clues(c)))) push(); }, autoDelay(p, 1800));
  } else if (G.phase === 'match') {
    G.players.forEach((p, i) => { if (i !== G.st && !G.played[i] && isAuto(p) && p.h.length) sched(key + p.p, () => { if (isAuto(G.players[i]) && applyPlay(i, botPlay(p.h))) push(); }, autoDelay(p, 1200)); });
  } else if (G.phase === 'vote') {
    G.players.forEach((p, i) => { if (i !== G.st && G.votes[i] < 0 && isAuto(p)) sched(key + p.p, () => { if (isAuto(G.players[i]) && applyVote(i, botVote(i))) push(); }, autoDelay(p, 1600)); });
  }
}

/* ================= Temps réel ================= */
function setPresence(patch) {
  for (const k in patch) { if (patch[k] === null) delete myPres[k]; else myPres[k] = patch[k]; }
  if (presTimer) return;
  presTimer = setTimeout(() => { presTimer = null; if (ch) ch.track({ ...myPres }).catch(() => {}); }, 60);
}
function readPeers() {
  const st = ch ? ch.presenceState() : {};
  return Object.entries(st).map(([key, metas]) => {
    const m = metas[metas.length - 1] || {};
    const { presence_ref, ...presence } = m;
    return { key, presence };
  });
}
function onSync() {
  const peers = readPeers();
  const now = new Set(peers.map(p => p.key));
  const left = [...peerSet].filter(k => !now.has(k));
  peerSet = now;
  if (host) hostPeers(peers.filter(p => p.key !== myId), left); else clientPeers(peers, left);
}
function hostPeers(others, left) {
  if (!G) return;
  let changed = false;
  if (G.phase === 'lobby') {
    const live = new Set(others.map(p => p.key));
    const before = G.players.map(p => p.p + p.n).join();
    G.players = G.players.filter((p, i) => i === 0 || p.b || live.has(p.p));
    for (const p of others) {
      const pr = p.presence;
      if (typeof pr.nick !== 'string' || pr.g) continue;
      const nk = cleanNick(pr.nick) || 'Rêveur';
      const ex = G.players.find(x => x.p === p.key);
      if (ex) ex.n = nk;
      else if (G.players.length < MAXP) G.players.push({ p: p.key, n: nk, a: 0, s: 0, h: [] });
    }
    if (G.players.map(p => p.p + p.n).join() !== before) changed = true;
    if (changed) { reAvatar(); push(); }
    return;
  }
  for (const k of left) { const i = G.players.findIndex(x => x.p === k); if (i > 0 && !G.players[i].b && !G.players[i].away) { G.players[i].away = 1; awaySince[k] = Date.now(); changed = true; } }
  for (const p of others) {
    const pr = p.presence;
    let i = G.players.findIndex(x => x.p === p.key);
    if (i > 0 && G.players[i].away) { G.players[i].away = 0; delete awaySince[p.key]; changed = true; }
    if (i < 0 && typeof pr.nick === 'string') {
      const j = G.players.findIndex(x => x.away && x.n === cleanNick(pr.nick));
      if (j > 0) { G.players[j].p = p.key; G.players[j].away = 0; i = j; changed = true; }
    }
    if (i <= 0) continue;
    const a = pr.act;
    if (a && typeof a === 'object' && a.r === G.round && a.g === G.gid) {
      if (a.k === 'tell') changed = applyTell(i, a.c, a.clue) || changed;
      else if (a.k === 'play') changed = applyPlay(i, a.c) || changed;
      else if (a.k === 'vote') changed = applyVote(i, a.t) || changed;
    }
  }
  if (changed) push();
}
function clientPeers(peers, left) {
  const h = peers.find(p => p.key !== myId && p.presence.g && p.presence.g.code === S.code);
  if (h) {
    hostKey = h.key; clearTimeout(joinTimer);
    const wasGone = S.hostGone; S.hostGone = false;
    const js = JSON.stringify(h.presence.g);
    if (js !== lastG) { const prev = G; lastG = js; G = h.presence.g; onNewG(prev); S.screen = 'game'; render(); }
    else if (S.screen !== 'game' || wasGone) { S.screen = 'game'; render(); }
  } else if (hostKey && left.includes(hostKey) && G) {
    S.hostGone = true; render();
  }
}
function onNewG(prev) {
  if (!prev || prev.phase !== G.phase || prev.round !== G.round) { S.vsel = null; S.sent = null; }
  if (!prev || prev.round !== G.round) S.draft = '';
}
function openRoom(code) {
  return new Promise(resolve => {
    let settled = false;
    const done = ok => { if (!settled) { settled = true; resolve(ok); } };
    ch = sb.channel('songe-' + code.toLowerCase(), { config: { presence: { key: myId } } });
    ch.on('presence', { event: 'sync' }, onSync);
    ch.subscribe(status => {
      if (status === 'SUBSCRIBED') done(true);
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { if (!settled) done(false); }
    });
    setTimeout(() => done(false), 10000);
  });
}
/* Connexion : surveillance et reconnexion automatique */
let healthTimer = null, roomCode = '', reconnecting = false;
function chanOk() { return !!ch && (ch.state === undefined || ch.state === 'joined'); }
async function reconnect() {
  if (!roomCode || reconnecting) return;
  reconnecting = true;
  try {
    if (ch) { try { sb.removeChannel(ch); } catch (e) {} ch = null; }
    const ok = await openRoom(roomCode);
    if (ok && Object.keys(myPres).length) await ch.track({ ...myPres }).catch(() => {});
  } finally { reconnecting = false; }
}
function health() {
  if (!roomCode) return;
  const off = !chanOk();
  if (off !== !!S.offline) { S.offline = off; render(); }
  if (off) reconnect();
}
function watchRoom(code) { roomCode = code; clearInterval(healthTimer); healthTimer = setInterval(health, 4000); }
function checkNick() {
  S.nick = cleanNick(S.nick);
  if (!S.nick) { S.err = t('Choisis un pseudo pour que les autres te reconnaissent.'); render(); return false; }
  ls.set('songe-nick', S.nick); return true;
}
async function createSalon(resume) {
  if (!resume && (!checkNick() || S.busy)) return;
  S.err = ''; S.note = ''; S.busy = true; render();
  const code = resume ? resume.G.code : genCode();
  const ok = await openRoom(code);
  S.busy = false;
  if (!ok) { closeRoom(); S.err = t('Connexion au serveur impossible. Vérifie ta connexion et réessaie.'); render(); return; }
  host = true; S.solo = false; S.code = code; S.screen = 'game'; watchRoom(code);
  ss.set('songe-session', { code, host: true, nick: S.nick });
  setUrl(code);
  if (resume) {
    ({ G, deck, discard, pending, owners, stCard, understood } = resume);
    G.players.forEach(p => { if (!p.b && p.p !== myId) { p.away = 1; awaySince[p.p] = Date.now(); } });
    push();
    setTimeout(onSync, 1500);
  } else hostCreate(code);
}
async function joinSalon(codeArg) {
  if (!checkNick() || S.busy) return;
  const code = (codeArg || S.joinCode).toUpperCase().replace(/[^A-Z]/g, '');
  if (code.length !== 4) { S.err = t('Le code d’un salon fait 4 lettres.'); render(); return; }
  S.err = ''; S.note = ''; S.busy = true; render();
  host = false; G = null; lastG = ''; hostKey = null; S.hostGone = false;
  const ok = await openRoom(code);
  S.busy = false;
  if (!ok) { closeRoom(); S.err = t('Connexion au serveur impossible. Vérifie ta connexion et réessaie.'); render(); return; }
  S.code = code;
  ss.set('songe-session', { code, host: false, nick: S.nick });
  setUrl(code);
  setPresence({ nick: S.nick });
  S.screen = 'joining'; render();
  S.joinSlow = false; watchRoom(code);
  joinTimer = setTimeout(() => { if (!G) { S.joinSlow = true; render(); } }, 8000);
}
function startSolo() {
  if (!checkNick()) return;
  S.err = ''; S.note = ''; S.solo = true; host = true; S.code = ''; S.screen = 'game';
  hostCreate('');
  addBot(); addBot(); addBot();
}
function closeRoom() {
  roomCode = ''; clearInterval(healthTimer); S.offline = false;
  if (ch) { try { ch.untrack(); } catch (e) {} sb.removeChannel(ch); ch = null; }
  myPres = {}; peerSet = new Set();
}
function leave() {
  closeRoom();
  Object.values(timers).forEach(clearTimeout); timers = {};
  clearTimeout(joinTimer); clearTimeout(rvTimer);
  ss.del('songe-session'); ss.del('songe-host');
  host = false; G = null; lastG = ''; hostKey = null; S.hostGone = false;
  urlCode = ''; S.joinCode = ''; S.quitArm = false;
  S.screen = 'home'; S.solo = false; S.sel = null; S.vsel = null; S.sent = null; S.zoom = null; S.rv = null; S.phaseKey = ''; S.car = {};
  setUrl('');
  render();
}
function setUrl(code) { try { history.replaceState(null, '', code ? '?salon=' + code : location.pathname); } catch (e) {} }
function shareLink() { return location.origin + '/?salon=' + (G ? G.code : S.code); }
function act(a) {
  a.r = G.round; a.g = G.gid;
  const i = meIdx();
  sfx.send(); vib(25);
  if (host) {
    let ok = false;
    if (a.k === 'tell') ok = applyTell(i, a.c, a.clue);
    else if (a.k === 'play') ok = applyPlay(i, a.c);
    else if (a.k === 'vote') ok = applyVote(i, a.t);
    if (ok) push();
  } else if (ch) {
    S.sent = G.round + ':' + G.phase;
    setPresence({ nick: S.nick, act: a });
    render();
  }
}

/* ================= Changements de phase : sons, révélation ================= */
let rvTimer = null;
function revealOrder() {
  const idx = G.table.map((c, i) => i);
  const right = G.owners.indexOf(G.st);
  const votesOn = i => G.votes.filter(v => v === i).length;
  return idx.filter(i => i !== right).sort((a, b) => votesOn(a) - votesOn(b)).concat([right]);
}
function startReveal(key) {
  const order = revealOrder();
  S.rv = { key, order, step: -1, done: false };
  S.car.reveal = 0;
  const next = () => {
    if (!S.rv || S.rv.key !== key) return;
    S.rv.step++;
    if (S.rv.step >= order.length) { finishReveal(); return; }
    const last = S.rv.step === order.length - 1;
    S.car.reveal = S.rv.step; sfx.flip(); vib(15);
    if (last) setTimeout(() => { if (S.rv && S.rv.key === key) celebrate(); }, 350);
    render(true);
    rvTimer = setTimeout(next, last ? REVEAL_STEP + 600 : REVEAL_STEP);
  };
  rvTimer = setTimeout(next, 500);
}
function celebrate() {
  const me = meIdx(); const right = G.owners.indexOf(G.st);
  const voters = G.players.map((p, i) => i).filter(i => i !== G.st);
  const finders = voters.filter(i => G.votes[i] === right).length;
  const good = me === G.st ? (G.deltas[me] || 0) > 0 : G.votes[me] === right;
  if (finders > 0 && finders < voters.length) confetti(good ? 140 : 70);
  if (good) { sfx.win(); vib([30, 50, 30]); } else sfx.lose();
}
function finishReveal() {
  if (!S.rv) return; clearTimeout(rvTimer);
  S.rv.done = true; S.rv.step = S.rv.order.length - 1; S.rv.countUp = true;
  recordRound(); render();
}
function phaseChanged() {
  const me = meIdx();
  S.scrollTop = true;
  if (G.phase === 'tell' && me === G.st) { sfx.turn(); vib([30, 40, 30]); }
  if (G.phase === 'vote') sfx.flip();
  if (G.phase === 'reveal') startReveal(S.phaseKey);
  if (G.phase === 'end') { recordGame(); const best = Math.max(...G.players.map(p => p.s)); if (me >= 0 && G.players[me].s === best) { confetti(180); sfx.win(); } }
  if (G.phase === 'tell' || G.phase === 'match') { S.car.hand = 0; S.sel = null; }
  if (G.phase === 'vote') { S.car.vote = 0; S.vsel = null; }
}

/* ================= Vues ================= */
function av(p, size) { return `<span class="av s${p.a % 5} ${size || ''} ${p.away ? 'away' : ''}" style="background:${COLORS[p.a % COLORS.length]}" aria-hidden="true">${esc((p.n || '?').charAt(0).toUpperCase())}</span>`; }
function nameOf(i) { const p = G.players[i]; return i === meIdx() ? t('{n} (toi)', { n: esc(p.n) }) : esc(p.n); }
const ICON = {
  sound: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  mute: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.2l7.1-.6z" fill="currentColor"/></svg>',
  home: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  zoom: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6"/><line x1="20" y1="20" x2="15.5" y2="15.5"/><line x1="11" y1="8.5" x2="11" y2="13.5"/><line x1="8.5" y1="11" x2="13.5" y2="11"/></svg>',
};
const quitBtn = () => `<button class="iconbtn ${S.quitArm ? 'armed' : ''}" data-act="quit" aria-label="${t('Quitter la partie')}">${S.quitArm ? t('Quitter ?') : ICON.home}</button>`;
const soundBtn = () => `<button class="iconbtn" data-act="sound" aria-label="${SND.on ? t('Couper le son') : t('Activer le son')}">${SND.on ? ICON.sound : ICON.mute}</button>`;
function topBar() {
  return (S.hostGone ? `<p class="banner" role="status">${t('{n} (l’hôte) s’est déconnecté. La partie reprend dès son retour.', { n: esc(G.players[0].n) })}</p>` : '')
    + (S.offline && !S.solo ? `<p class="banner" role="status">${t('Connexion perdue, reconnexion en cours…')}</p>` : '')
    + `<div class="top ${S.quitArm ? 'armed' : ''}">${quitBtn()}<div class="chips"><span class="chip">${S.solo ? t('Solo') : t('Salon {c}', { c: esc(G.code) })}</span><span class="chip">${t('Manche {n}', { n: G.round })}</span></div><div class="scores" aria-label="${t('Scores')}">${G.players.map((p, i) => `<div class="sc ${i === G.st ? 'isst' : ''}" title="${esc(p.n)}">${av(p, 'sm')}<span>${shownScore(i)}</span></div>`).join('')}</div>${soundBtn()}</div>`;
}
function shownScore(i) {
  const p = G.players[i];
  const hide = G.phase === 'reveal' && S.rv && !S.rv.done;
  return hide ? p.s - (G.deltas[i] || 0) : p.s;
}
function clueBox(compact) {
  const st = G.players[G.st];
  return `<section class="clue ${compact ? 'compact' : ''}"><div class="who">${av(st, 'sm')}<span>${G.st === meIdx() ? t('Ton indice') : t('{n} a soufflé', { n: esc(st.n) })}</span></div><q>${esc(G.clue)}</q></section>`;
}
/* Carrousel 3D : la carte au centre est la carte choisie */
function carousel(key, items, opts = {}) {
  const idx = clamp(S.car[key] || 0, 0, Math.max(0, items.length - 1));
  return `<div class="carousel ${opts.small ? 'small' : ''}" data-car="${key}" ${opts.label ? `aria-label="${esc(opts.label)}"` : ''}>
    ${items.length > 1 ? `<button class="navbtn prev" data-nav="-1" aria-label="${t('Carte précédente')}">‹</button><button class="navbtn next" data-nav="1" aria-label="${t('Carte suivante')}">›</button>` : ''}
    <div class="track" tabindex="0">${items.map((it, i) => `<div class="slide" data-i="${i}"><div class="c3d ${it.cls || ''}">${it.html}</div>${it.under || ''}</div>`).join('')}</div>
  </div>${items.length > 1 ? `<div class="dots" data-dots="${key}">${items.map((_, i) => `<i class="${i === idx ? 'on' : ''}"></i>`).join('')}</div>` : ''}`;
}
function cardFace(id, extra = '') { return `<div class="cardface">${face(id)}${extra}</div>`; }
function waitBlock(p, title, sub) { return `<div class="wait">${p ? av(p, 'lg pulse') : ''}<p class="disp" style="font-size:22px">${title}</p>${sub ? `<p class="mute small">${sub}</p>` : ''}</div>`; }
function dotsRow(label, doneFn) {
  const ids = G.players.map((p, i) => i).filter(i => i !== G.st);
  const n = ids.filter(doneFn).length;
  return `<div class="voters"><span>${label(n, ids.length)}</span><div class="vrow">${ids.map(i => `<span class="av sm s${G.players[i].a % 5} ${doneFn(i) ? 'done' : ''}" style="background:${COLORS[G.players[i].a % COLORS.length]}" title="${esc(G.players[i].n)}">${esc(G.players[i].n.charAt(0))}</span>`).join('')}</div></div>`;
}
const pkey = () => G.round + ':' + G.phase;
function handCarousel(selectable) {
  const p = G.players[meIdx()];
  see(p.h);
  return carousel('hand', p.h.map(c => ({ html: cardFace(c), cls: selectable ? 'pickable' : '' })), { label: t('Ta main') });
}
function focusCard(key, list) { const i = clamp(S.car[key] || 0, 0, list.length - 1); return list[i]; }
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const V = {
  home() {
    const sample = [12, 4, 22].filter(id => META[id]);
    const pct = Math.round(seenSet.size / NCARDS * 100);
    return `<div class="langs" role="group" aria-label="Langue / Language">${Object.keys(LANGS).map(k => `<button class="lang ${k === lang() ? 'on' : ''}" data-act="lang" data-l="${k}" aria-pressed="${k === lang()}" title="${LANGS[k]}">${k.toUpperCase()}</button>`).join('')}</div>
    <section class="hero"><div class="moon"></div><p class="eyebrow">${t('Jeu d’indices et d’images')}</p><h1 class="disp">Songe</h1><p>${t('Raconte une carte en quelques mots. Fais deviner, mais pas trop.')}</p></section>
    <div class="fan">${sample.map(c => `<div class="card static">${face(c)}</div>`).join('')}</div>
    <div class="field"><label for="nick">${t('Ton pseudo')}</label><input id="nick" type="text" maxlength="14" placeholder="${t('Ex. Clem')}" autocomplete="off" value="${esc(S.nick)}"></div>
    ${S.err ? `<p class="err" role="alert">${esc(S.err)}</p>` : ''}${S.note ? `<p class="note">${esc(S.note)}</p>` : ''}
    ${urlCode ? `<button class="btn" data-act="join" ${S.busy ? 'disabled' : ''}>${S.busy ? t('Connexion…') : t('Rejoindre le salon {c}', { c: esc(urlCode) })}</button><div class="or">${t('ou')}</div>` : ''}
    <button class="btn ${urlCode ? 'ghost' : ''}" data-act="create" ${S.busy ? 'disabled' : ''}>${S.busy && !urlCode ? t('Connexion…') : t('Créer un salon')}</button>
    ${urlCode ? '' : `<div class="or">${t('ou rejoindre des amis')}</div>
    <div class="field"><label for="joincode">${t('Code du salon')}</label><div class="row-in"><input id="joincode" class="code" type="text" maxlength="4" placeholder="ABCD" autocomplete="off" autocapitalize="characters" value="${esc(S.joinCode)}"><button class="btn small" data-act="join" ${S.busy ? 'disabled' : ''}>${t('Rejoindre')}</button></div></div>`}
    <button class="btn ghost" data-act="solo">${t('Jouer seul contre des bots')}</button>
    ${S.installable ? `<button class="btn ghost small" data-act="install">${t('Installer Songe sur ce téléphone')}</button>` : ''}
    ${isIOS && !standalone() ? `<p class="mute small center">${t('Sur iPhone, touche Partager puis « Sur l’écran d’accueil » pour installer Songe comme une app.')}</p>` : ''}
    <section class="book">
      <div class="bookhead"><h2 class="disp">${t('Ton carnet de rêves')}</h2><button class="linkbtn" data-act="collection">${t('Voir la collection')}</button></div>
      <div class="progress" role="img" aria-label="${t('{a} cartes découvertes sur {b}', { a: seenSet.size, b: NCARDS })}"><i style="width:${pct}%"></i></div>
      <p class="mute small">${t('{a} / {b} cartes découvertes', { a: seenSet.size, b: NCARDS })} · ${tp(BOOK.games, '{n} partie', '{n} parties')} · ${tp(BOOK.wins, '{n} victoire', '{n} victoires')}</p>
      <div class="badges">${BADGES.map(b => { const on = BOOK.badges.includes(b.id); return `<div class="badge2 ${on ? 'on' : ''}" title="${esc(t(b.desc))}"><span class="bico">${on ? ICON.star : ICON.lock}</span><span><strong>${esc(t(b.name))}</strong><small>${esc(t(b.desc))}</small></span></div>`; }).join('')}</div>
    </section>
    <details><summary>${t('Comment jouer')}</summary><ol class="steps">
      <li>${t('À tour de rôle, un joueur devient <strong>conteur</strong> : il choisit une carte de sa main et souffle un indice.')}</li>
      <li>${t('Les autres posent la carte de leur main qui colle le mieux à l’indice, pour brouiller les pistes.')}</li>
      <li>${t('Tout le monde vote pour retrouver la carte du conteur. Si tous trouvent, ou personne, le conteur marque 0 et les autres 2.')}</li>
      <li>${t('Sinon le conteur et ceux qui ont trouvé marquent 3. Chaque vote reçu par ta carte piège te rapporte 1. Premier à {n} points.', { n: TARGET })}</li>
    </ol></details>`;
  },
  collection() {
    return `<div class="top"><button class="btn ghost small backbtn" data-act="home">${t('Retour')}</button>${soundBtn()}</div>
    <header style="display:flex;flex-direction:column;gap:6px"><p class="eyebrow">${t('Ton carnet de rêves')}</p><h1 class="disp" style="font-size:34px">${t('{a} / {b} cartes', { a: seenSet.size, b: NCARDS })}</h1><p class="mute small">${t('Chaque carte que tu vois en partie rejoint ta collection. Touche une carte pour l’agrandir.')}</p></header>
    <div class="progress"><i style="width:${Math.round(seenSet.size / NCARDS * 100)}%"></i></div>
    <div class="grid3">${CARDS.map(c => seenSet.has(c.id) ? `<button class="card" data-act="zoom" data-c="${c.id}" aria-label="${t('Agrandir la carte {n}', { n: c.id })}">${face(c.id)}</button>` : `<div class="card locked" aria-label="${t('Carte pas encore découverte')}">${BACK}<span class="q">?</span></div>`).join('')}</div>`;
  },
  joining() {
    const slow = S.joinSlow;
    return `<div class="grow"></div>${waitBlock(null, t('Connexion au salon {c}…', { c: esc(S.code) }), slow ? '' : t('On cherche la partie de l’hôte.'))}
    ${slow ? `<p class="note">${t('Le salon {c} ne répond pas encore. Vérifie le code. Si la personne qui l’a créé a quitté Songe pour t’envoyer le lien, demande-lui de revenir sur la page : tu entreras automatiquement.', { c: esc(S.code) })}</p><button class="btn small" data-act="retry">${t('Réessayer')}</button>` : ''}
    <div class="grow"></div><button class="btn ghost" data-act="leave">${t('Annuler')}</button>`;
  },
  lobby() {
    const me = meIdx(), n = G.players.length, h = esc(G.players[0].n);
    if (me < 0) {
      const full = n >= MAXP;
      return `<div class="top"><p class="eyebrow">${t('Salon {c}', { c: esc(G.code) })}</p>${soundBtn()}</div><div class="grow"></div>`
        + waitBlock(G.players[0], full ? t('Le salon est complet') : t('Presque dedans…'), full ? t('Il y a déjà {n} joueurs. Demande à {h} de faire de la place.', { n, h }) : t('{h} doit avoir Songe ouvert pour t’accepter. S’il a changé d’appli pour t’envoyer le lien, demande-lui de revenir sur la page.', { h }))
        + `<div class="grow"></div><button class="btn ghost small" data-act="leave">${t('Quitter')}</button>`;
    }
    const rows = G.players.map((p, i) => `<li class="pop" style="--d:${i * .05}s">${av(p)}<span class="nm">${esc(p.n)}</span>${i === 0 ? `<span class="badge h">${t('Hôte')}</span>` : ''}${p.b ? `<span class="badge">${t('Bot')}</span>` : ''}${i === me ? `<span class="badge">${t('Toi')}</span>` : ''}${host && p.b ? `<button class="x" data-act="rm" data-i="${i}" aria-label="${t('Retirer {n}', { n: esc(p.n) })}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>` : ''}</li>`).join('');
    const codeBlock = S.solo ? '' : `<section class="codebox"><div style="display:flex;flex-direction:column;gap:6px"><span class="eyebrow">${t('Code du salon')}</span><span class="big" id="codeval">${esc(G.code)}</span></div></section>
      ${S.linkShown ? `<input type="text" readonly value="${esc(shareLink())}" aria-label="${t('Lien du salon')}" onclick="this.select()">` : ''}<div class="share"><button class="btn small" data-act="copy">${S.copied ? t('Lien copié') : t('Copier le lien')}</button>${navigator.share ? `<button class="btn ghost small" data-act="share">${t('Partager…')}</button>` : ''}</div>
      ${host ? `<p class="note">${t('Reste sur cette page pendant que tes amis arrivent : le salon vit sur ton téléphone. Si tu changes d’appli pour envoyer le lien, reviens ici ensuite.')}</p>` : ''}
      <p class="mute small">${t('Tes amis ouvrent le lien, ou vont sur {h} et tapent le code.', { h: esc(location.host) })}</p>`;
    return `<div class="top"><p class="eyebrow">${S.solo ? t('Partie solo') : t('Salon')}</p>${soundBtn()}</div><h1 class="disp" style="font-size:34px;margin-top:-8px">${host ? t('Prépare la table') : t('Tu es dans le salon')}</h1>
    ${codeBlock}
    <section style="display:flex;flex-direction:column;gap:10px"><div class="voters"><h2 class="disp" style="font-size:20px;color:var(--paper)">${t('Rêveurs')}</h2><span>${n} / ${MAXP}</span></div><ul class="plist">${rows}</ul>
    ${host && n < MAXP ? `<button class="btn ghost small" data-act="bot">${t('Ajouter un bot')}</button>` : ''}</section>
    ${S.err ? `<p class="err" role="alert">${esc(S.err)}</p>` : ''}
    <div class="grow"></div>
    ${host ? `${n < 3 ? `<p class="mute small center">${t('Il faut au moins 3 joueurs. Ajoute des bots pour tester.')}</p>` : ''}<button class="btn" data-act="start" ${n < 3 ? 'disabled' : ''}>${t('Lancer la partie')}</button>`
      : `<p class="mute center">${t('En attente du lancement par {n}…', { n: h })}</p>`}
    <button class="btn ghost small" data-act="leave">${t('Quitter le salon')}</button>`;
  },
  spectate() {
    return topBar() + waitBlock(null, t('Partie en cours'), t('Tu pourras jouer à la prochaine partie, quand l’hôte reviendra au salon.')) + `<div class="grow"></div><button class="btn ghost small" data-act="leave">${t('Quitter')}</button>`;
  },
  tell() {
    const me = meIdx(), p = G.players[me], st = G.players[G.st];
    if (me !== G.st) {
      return topBar() + `<div class="waitline">${av(st, 'pulse')}<div><p class="disp" style="font-size:20px">${t('{n} est le conteur', { n: esc(st.n) })}</p><p class="mute small">${t('Choix de la carte et de l’indice en cours… Feuillette ta main en attendant.')}</p></div></div>` + handCarousel(false);
    }
    const sent = S.sent === pkey();
    S.sel = focusCard('hand', p.h);
    return topBar() + `<header class="phasehead"><p class="eyebrow">${t('Ton tour')}</p><h1 class="disp gold">${t('Tu es le conteur')}</h1><p class="mute small">${t('Fais glisser tes cartes, garde au centre celle qui t’inspire, puis souffle un indice.')}</p></header>`
      + handCarousel(!sent)
      + `<div class="field"><label for="indice">${t('Ton indice')}</label><input id="indice" type="text" maxlength="60" placeholder="${t('Un mot, une phrase, un titre de chanson…')}" autocomplete="off" value="${esc(S.draft)}" ${sent ? 'disabled' : ''}></div>
      ${sent ? `<p class="mute center">${t('Indice envoyé…')}</p>` : `<button class="btn" id="tellbtn" data-act="tell" ${cleanClue(S.draft) ? '' : 'disabled'}>${t('Souffler l’indice pour cette carte')}</button>`}
      <p class="mute small center">${t('Trop évident, tout le monde trouve et tu marques 0. Trop flou, personne ne trouve et c’est pareil.')}</p>`;
  },
  match() {
    const me = meIdx(), p = G.players[me];
    const done = me === G.st || G.played[me] || S.sent === pkey();
    if (done) {
      const n = G.players.length - 1;
      return topBar() + clueBox() + `<div class="wait"><div class="backs">${Array.from({ length: n }).map((_, i) => `<div class="minicard ${G.played[(i >= G.st ? i + 1 : i)] ? 'in' : ''}">${BACK}</div>`).join('')}</div><p class="mute">${me === G.st ? t('Les autres cherchent une carte qui colle à ton indice…') : t('Ta carte est posée. On attend les autres…')}</p></div><div class="grow"></div>`
        + dotsRow((n, tot) => tp(n, '{n} carte posée sur {t}', '{n} cartes posées sur {t}', { t: tot }), i => !!G.played[i]);
    }
    S.sel = focusCard('hand', p.h);
    return topBar() + clueBox(true) + `<p class="mute small center">${t('Choisis la carte de ta main qui colle le mieux. Chaque vote qu’elle attire te rapporte 1 point.')}</p>`
      + handCarousel(true) + `<button class="btn" data-act="play">${t('Poser cette carte')}</button>`;
  },
  vote() {
    const me = meIdx(), amVoter = me !== G.st;
    const voted = G.votes[me] >= 0 || S.sent === pkey();
    const mine = S.mine && S.mine.r === G.round && S.mine.g === G.gid ? S.mine.c : null;
    see(G.table);
    const fi = clamp(S.car.vote || 0, 0, G.table.length - 1);
    S.vsel = fi;
    const items = G.table.map((c, i) => {
      const isMine = c === mine;
      const chosen = voted && G.votes[me] === i;
      return { html: cardFace(c, `${isMine ? `<span class="tag ${!amVoter ? 'st' : ''}">${t('Ta carte')}</span>` : ''}${chosen ? `<span class="tag vote">${t('Ton vote')}</span>` : ''}`), cls: (isMine ? 'dim ' : '') + (chosen ? 'voted' : '') + (amVoter && !voted && !isMine ? ' pickable' : '') };
    });
    const focusMine = G.table[fi] === mine;
    let foot;
    if (!amVoter) foot = `<p class="mute small center">${t('Les autres cherchent ta carte… Personne ne sait à qui sont les cartes.')}</p>`;
    else if (!voted) foot = `<button class="btn rose" data-act="vote" ${focusMine ? 'disabled' : ''}>${focusMine ? t('C’est ta carte, choisis-en une autre') : t('Voter pour cette carte')}</button>`;
    else foot = `<p class="mute small center">${t('Vote enregistré. On attend les autres…')}</p>`;
    return topBar() + clueBox(true) + carousel('vote', items, { label: t('Cartes posées') }) + foot + dotsRow((n, tot) => tp(n, '{n} vote sur {t}', '{n} votes sur {t}', { t: tot }), i => G.votes[i] >= 0);
  },
  reveal() {
    const me = meIdx(), right = G.owners.indexOf(G.st);
    const rv = S.rv || { order: revealOrder(), step: 99, done: true };
    const order = rv.order;
    see(G.table);
    const voters = G.players.map((p, i) => i).filter(i => i !== G.st);
    const finders = voters.filter(i => G.votes[i] === right).length;
    const cardTxt = G.st === me ? t('ta carte') : t('la carte de {n}', { n: esc(G.players[G.st].n) });
    let msg;
    if (finders === 0) msg = t('Trop flou : personne n’a trouvé {c}.', { c: cardTxt });
    else if (finders === voters.length) msg = t('Trop clair : tout le monde a trouvé {c}.', { c: cardTxt });
    else msg = tp(finders, '{n} rêveur a trouvé {c}.', '{n} rêveurs ont trouvé {c}.', { c: cardTxt });
    const items = order.map((ti, k) => {
      const c = G.table[ti], o = G.players[G.owners[ti]], isRight = ti === right;
      const up = k <= rv.step, now = k === rv.step && !rv.done;
      const vs = G.votes.map((v, j) => v === ti ? j : -1).filter(j => j >= 0);
      const under = up ? `<div class="rvinfo ${now ? 'pop' : ''}"><div class="owner">${av(o, 'sm')}<span>${G.owners[ti] === me ? t('Ta carte') : t('Carte de {n}', { n: esc(o.n) })}</span>${isRight ? `<span class="badge h">${t('Conteur')}</span>` : ''}</div><div class="minivotes">${vs.length ? vs.map((j, q) => `<span class="pop" style="--d:${.25 + q * .12}s">${av(G.players[j], 'sm')}</span>`).join('') : `<span class="mute small">${t('Aucun vote')}</span>`}</div></div>` : '<div class="rvinfo"></div>';
      return { html: `<div class="flipper ${up ? (now ? 'flipnow' : 'up') : ''}"><div class="fback">${BACK}</div><div class="ffront">${cardFace(c)}</div></div>`, cls: (isRight && up ? 'winner ' : '') + (up ? '' : 'down'), under };
    });
    const header = `<section class="clue compact"><div class="who">${av(G.players[G.st], 'sm')}<span>${t('Révélation de l’indice')}</span></div><q>${esc(G.clue)}</q></section>`;
    if (!rv.done) {
      return topBar() + header + carousel('reveal', items, { label: t('Révélation des cartes') })
        + `<p class="mute small center">${t('Carte {i} sur {n}', { i: Math.max(1, rv.step + 1), n: order.length })}</p><button class="btn ghost small" data-act="skip">${t('Passer l’animation')}</button>`;
    }
    const ord = G.players.map((p, i) => i).sort((a, b) => G.players[b].s - G.players[a].s);
    const board = ord.map(i => {
      const p = G.players[i], d = G.deltas[i] || 0;
      return `<div class="brow">${av(p)}<div style="min-width:0"><strong>${nameOf(i)}</strong><div class="track2"><i style="width:${Math.min(100, p.s / TARGET * 100)}%;background:${COLORS[p.a % COLORS.length]}"></i></div></div><span class="pts"><span class="${d ? 'plus pop' : 'zero'}">+${d}</span> <span class="count" data-from="${p.s - d}" data-to="${p.s}">${rv.countUp ? p.s - d : p.s}</span></span></div>`;
    }).join('');
    const last = G.players.some(p => p.s >= TARGET);
    const myd = me >= 0 ? (G.deltas[me] || 0) : 0;
    return topBar() + `<section class="result"><p class="eyebrow">${t('Fin de la manche {n}', { n: G.round })}</p><p class="disp" style="font-size:24px;line-height:1.12">${msg}</p>${me >= 0 ? `<p class="gain ${myd ? 'plus' : 'zero'}">${myd ? t('+{d} pour toi', { d: myd }) : t('Pas de point cette fois')}</p>` : ''}</section>`
      + carousel('reveal', items, { label: t('Cartes de la manche'), small: true })
      + `<section class="board"><p class="eyebrow">${t('Vers {n} points', { n: TARGET })}</p>${board}</section>`
      + (host ? `<button class="btn" data-act="next">${last ? t('Voir le classement') : t('Manche suivante')}</button>` : `<p class="mute center">${t('{n} lance la manche suivante…', { n: esc(G.players[0].n) })}</p>`);
  },
  end() {
    const order = G.players.map((p, i) => i).sort((a, b) => G.players[b].s - G.players[a].s);
    const w = order[0], me = meIdx();
    return `<section class="hero"><div class="moon"></div><p class="eyebrow">${t('Partie terminée en {n} manches', { n: G.round })}</p><h1 class="disp" style="font-size:50px">${w === me ? t('Tu gagnes !') : t('{n} gagne', { n: esc(G.players[w].n) })}</h1><p>${w === me ? t('Tes rêves ont trouvé leur public.') : t('La prochaine nuit sera la tienne.')}</p></section>
    <div class="podium">${order.map((i, r) => `<div class="brow pop ${r === 0 ? 'first' : ''}" style="--d:${r * .12}s">${av(G.players[i])}<div><strong>${nameOf(i)}</strong><div class="small mute">#${r + 1}</div></div><span class="pts">${t('{n} pts', { n: G.players[i].s })}</span></div>`).join('')}</div>
    <p class="mute small center">${t('Collection : {a} / {b} cartes découvertes', { a: seenSet.size, b: NCARDS })}</p>
    <div class="grow"></div>${host ? `<button class="btn" data-act="again">${t('Revenir au salon')}</button>` : `<p class="mute center">${t('{n} peut relancer une partie.', { n: esc(G.players[0].n) })}</p>`}<button class="btn ghost small" data-act="leave">${t('Quitter')}</button>`;
  }
};

/* ================= Rendu ================= */
const app = document.getElementById('app');
function render(force) {
  if (S.touching && !force) { S.pendingRender = true; return; }
  S.pendingRender = false;
  if (G && S.screen === 'game') {
    const k = G.gid + ':' + G.round + ':' + G.phase;
    if (k !== S.phaseKey) { S.phaseKey = k; phaseChanged(); }
  }
  const ae = document.activeElement, fid = ae && ae.id, s0 = ae && ae.selectionStart, s1 = ae && ae.selectionEnd;
  const view = S.screen + ':' + (G ? G.phase : '');
  if (view !== S.lastView) { S.lastView = view; S.scrollTop = true; }
  let html;
  if (S.screen === 'home') html = V.home();
  else if (S.screen === 'collection') html = V.collection();
  else if (S.screen === 'joining' || !G) html = V.joining();
  else if (G.phase === 'lobby') html = V.lobby();
  else if (meIdx() < 0) html = V.spectate();
  else html = V[G.phase]();
  if (S.zoom != null) html += `<div class="lightbox" role="dialog" aria-label="${t('Carte agrandie')}" data-act="unzoom"><img src="/cards/${S.zoom}.webp" alt=""><button class="btn ghost" data-act="unzoom">${t('Fermer')}</button></div>`;
  document.documentElement.lang = lang();
  keepAwake(S.screen === 'game' && !!G);
  app.innerHTML = html;
  if (fid) { const el = document.getElementById(fid); if (el && !el.disabled) { el.focus({ preventScroll: true }); try { if (s0 != null) el.setSelectionRange(s0, s1); } catch (e) {} } }
  setupCarousels();
  if (S.scrollTop) { S.scrollTop = false; window.scrollTo(0, 0); }
  if (S.rv && S.rv.done && S.rv.countUp) { S.rv.countUp = false; countUp(); }
}
function countUp() {
  const els = [...document.querySelectorAll('.count')]; const t0 = performance.now();
  const step = now => { const p = Math.min(1, (now - t0) / 900); const e = 1 - Math.pow(1 - p, 3); els.forEach(el => { const a = +el.dataset.from, b = +el.dataset.to; el.textContent = Math.round(a + (b - a) * e); }); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* Carrousels : position, effet 3D, choix de la carte au centre */
function setupCarousels() {
  document.querySelectorAll('.carousel').forEach(car => {
    const key = car.dataset.car, track = car.querySelector('.track'), slides = [...track.children];
    if (!slides.length) return;
    const sw = () => slides[0].offsetWidth;
    const idx = clamp(S.car[key] || 0, 0, slides.length - 1);
    track.scrollLeft = idx * sw();
    const paint = () => {
      const w = sw(), center = track.scrollLeft + track.clientWidth / 2;
      slides.forEach((s, i) => {
        const d = (s.offsetLeft + w / 2 - center) / w, ad = Math.min(Math.abs(d), 1.6);
        const c = s.firstElementChild;
        c.style.transform = `perspective(900px) rotateY(${clamp(-d * 32, -40, 40)}deg) scale(${1 - ad * .16}) translateZ(0)`;
        c.style.opacity = String(1 - ad * .38);
        s.style.zIndex = String(100 - Math.round(ad * 10));
        const u = s.querySelector('.rvinfo'); if (u) u.style.opacity = ad < .5 ? '1' : '0';
      });
      const ni = clamp(Math.round(track.scrollLeft / w), 0, slides.length - 1);
      if (ni !== S.car[key]) {
        S.car[key] = ni;
        if (key === 'hand') { S.sel = focusList('hand')[ni]; }
        if (key === 'vote') { S.vsel = ni; refreshVoteBtn(); }
        if (!(key === 'reveal' && S.rv && !S.rv.done)) { sfx.tick(); vib(6); }
        const dots = document.querySelector(`[data-dots="${key}"]`);
        if (dots) [...dots.children].forEach((d, i) => d.classList.toggle('on', i === ni));
      }
    };
    let raf = 0;
    track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); }, { passive: true });
    track.addEventListener('pointerdown', () => { S.touching = true; }, { passive: true });
    const release = () => { setTimeout(() => { S.touching = false; if (S.pendingRender) render(); }, 350); };
    track.addEventListener('pointerup', release, { passive: true });
    track.addEventListener('pointercancel', release, { passive: true });
    track.addEventListener('touchend', release, { passive: true });
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const ni = clamp((S.car[key] || 0) + (e.key === 'ArrowRight' ? 1 : -1), 0, slides.length - 1); track.scrollTo({ left: ni * sw(), behavior: 'smooth' }); }
    });
    car.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation(); const ni = clamp((S.car[key] || 0) + +b.dataset.nav, 0, slides.length - 1); track.scrollTo({ left: ni * sw(), behavior: 'smooth' });
    }));
    slides.forEach((s, i) => s.addEventListener('click', ev => {
      if (i !== (S.car[key] || 0)) { ev.stopPropagation(); track.scrollTo({ left: i * sw(), behavior: 'smooth' }); return; }
      if (s.querySelector('.down')) return;
      const img = s.querySelector('img'); if (img) { const m = img.getAttribute('src').match(/(\d+)\.webp/); if (m) { S.zoom = +m[1]; render(); } }
    }));
    paint();
    if (key === 'reveal' && S.rv && !S.rv.done) requestAnimationFrame(() => track.scrollTo({ left: S.rv.step * sw(), behavior: 'smooth' }));
  });
}
function focusList(key) { if (key === 'hand') { const me = meIdx(); return me >= 0 ? G.players[me].h : []; } return []; }
function refreshVoteBtn() {
  const b = document.querySelector('[data-act="vote"]'); if (!b) return;
  const mine = S.mine && S.mine.r === G.round && S.mine.g === G.gid ? S.mine.c : null;
  const isMine = G.table[S.vsel] === mine;
  b.disabled = isMine; b.textContent = isMine ? t('C’est ta carte, choisis-en une autre') : t('Voter pour cette carte');
}

/* ================= Événements ================= */
let quitTimer = null;
app.addEventListener('click', e => {
  ac();
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const a = el.dataset.act;
  if (a === 'unzoom') { S.zoom = null; render(); return; }
  if (a === 'zoom') { S.zoom = +el.dataset.c; render(); return; }
  if (a === 'sound') { SND.on = !SND.on; ls.set('songe-mute', SND.on ? '0' : '1'); if (SND.on) sfx.select(); render(); return; }
  if (a === 'collection') { S.screen = 'collection'; render(); window.scrollTo(0, 0); return; }
  if (a === 'home') { S.screen = 'home'; render(); return; }
  if (a === 'create') return void createSalon();
  if (a === 'join') return void joinSalon(S.joinCode || urlCode);
  if (a === 'solo') return void startSolo();
  if (a === 'leave') return void leave();
  if (a === 'quit') {
    clearTimeout(quitTimer);
    if (S.quitArm) { leave(); return; }
    S.quitArm = true; render(); quitTimer = setTimeout(() => { S.quitArm = false; render(); }, 3000);
    return;
  }
  if (a === 'bot' && host) { sfx.select(); return void addBot(); }
  if (a === 'rm' && host) return void removePlayer(+el.dataset.i);
  if (a === 'start' && host) return void hostStart();
  if (a === 'next' && host) return void hostNext();
  if (a === 'again' && host) return void backToLobby();
  if (a === 'skip') { finishReveal(); return; }
  if (a === 'lang') { setLang(el.dataset.l); render(); return; }
  if (a === 'retry') { S.joinSlow = false; render(); reconnect(); clearTimeout(joinTimer); joinTimer = setTimeout(() => { if (!G) { S.joinSlow = true; render(); } }, 8000); return; }
  if (a === 'install') { if (installEvt) { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; S.installable = false; render(); }); } return; }
  if (a === 'copy') {
    const url = shareLink();
    const done = () => { S.copied = true; render(); setTimeout(() => { S.copied = false; render(); }, 2500); };
    try { navigator.clipboard.writeText(url).then(done, () => { S.linkShown = true; render(); }); } catch (err) {}
    return;
  }
  if (a === 'share') {
    navigator.share({ title: 'Songe', text: t('Rejoins ma partie de Songe, code {c}', { c: G.code }), url: shareLink() }).catch(() => {});
    return;
  }
  if (a === 'tell') { const clue = cleanClue(S.draft); const c = S.sel; if (c == null || !clue) return; S.mine = { r: G.round, g: G.gid, c }; act({ k: 'tell', c, clue }); return; }
  if (a === 'play') { const c = S.sel; if (c == null) return; S.mine = { r: G.round, g: G.gid, c }; act({ k: 'play', c }); return; }
  if (a === 'vote') { if (S.vsel == null) return; act({ k: 'vote', t: S.vsel }); return; }
});
app.addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'nick') { S.nick = e.target.value; S.err = ''; }
  else if (id === 'joincode') { S.joinCode = e.target.value.toUpperCase(); e.target.value = S.joinCode; }
  else if (id === 'indice') { S.draft = e.target.value; const b = document.getElementById('tellbtn'); if (b) b.disabled = !cleanClue(S.draft); }
});
app.addEventListener('keydown', e => {
  if (e.key === 'Escape' && S.zoom != null) { S.zoom = null; render(); return; }
  if (e.key !== 'Enter') return;
  const id = e.target.id;
  if (id === 'indice') { const b = document.getElementById('tellbtn'); if (b && !b.disabled) b.click(); }
  else if (id === 'joincode') joinSalon(S.joinCode);
  else if (id === 'nick') e.target.blur();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (roomCode && !chanOk()) reconnect();
  else if (ch && Object.keys(myPres).length) ch.track({ ...myPres }).catch(() => {});
  if (ch) setTimeout(onSync, 300);
  keepAwake(S.screen === 'game' && !!G);
});
addEventListener('online', () => { if (roomCode) health(); });
/* Garder l'écran allumé pendant une partie */
let wake = null;
async function keepAwake(on) {
  try {
    if (on && !wake && 'wakeLock' in navigator && document.visibilityState === 'visible') { wake = 1; const w = await navigator.wakeLock.request('screen'); wake = w; w.addEventListener('release', () => { if (wake === w) wake = null; }); }
    else if (!on && wake && wake.release) { wake.release(); wake = null; }
  } catch (e) { wake = null; }
}
/* Application installable */
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; S.installable = true; if (S.screen === 'home') render(); });
addEventListener('appinstalled', () => { installEvt = null; S.installable = false; render(); });
if ('serviceWorker' in navigator && !/^(localhost|127\.)/.test(location.hostname)) navigator.serviceWorker.register('/sw.js').catch(() => {});
window.addEventListener('resize', () => { if (!S.touching) render(); });

const sess = ss.get('songe-session');
render();
if (sess && sess.code) {
  S.nick = sess.nick || S.nick;
  if (sess.host) { const h = ss.get('songe-host'); if (h && h.G) createSalon(h); else ss.del('songe-session'); }
  else joinSalon(sess.code);
}
