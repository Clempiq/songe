import fs from 'node:fs/promises';
import sharp from 'sharp';

const cards = JSON.parse(await fs.readFile('src/cards.json', 'utf8'));
const FALLBACK = process.env.CARDS_FALLBACK || 'https://songe-jeu.vercel.app';
await fs.mkdir('public/cards', { recursive: true });

for (const c of cards) {
  const out = `public/cards/${c.id}.webp`;
  const sources = [c.src, FALLBACK && `${FALLBACK}/cards/${c.id}.webp`].filter(Boolean);
  let done = false;
  for (const url of sources) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      await sharp(buf).resize({ width: 720, height: 1280, fit: 'cover' }).webp({ quality: 80 }).toFile(out);
      console.log(`carte ${c.id} ok (${url.slice(0, 48)})`);
      done = true;
      break;
    } catch (e) {
      console.warn(`carte ${c.id} : echec depuis ${url.slice(0, 48)} (${e.message})`);
    }
  }
  if (!done) throw new Error(`Impossible de recuperer la carte ${c.id}`);
}
