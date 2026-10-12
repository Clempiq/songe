// Prépare les images des cartes avant le build.
// Les images sont rangées dans public/cards/<id>.webp et versionnées avec le code.
// Une carte dont l'image existe déjà n'est pas retéléchargée.
// Pour une nouvelle carte : soit déposer son image dans public/cards/,
// soit renseigner "src" (URL de l'image) dans src/cards.json et elle sera
// téléchargée, redimensionnée en 720x1280 et convertie en WebP.
import fs from 'node:fs/promises';
import sharp from 'sharp';

const cards = JSON.parse(await fs.readFile('src/cards.json', 'utf8'));
await fs.mkdir('public/cards', { recursive: true });

const exists = (p) => fs.access(p).then(() => true, () => false);
let local = 0, fetched = 0;

for (const c of cards) {
  const out = `public/cards/${c.id}.webp`;
  if (await exists(out)) { local++; continue; }
  if (!c.src) throw new Error(`Carte ${c.id} : pas d'image dans public/cards/ et pas de "src" dans cards.json`);
  const r = await fetch(c.src, { redirect: 'follow' });
  if (!r.ok) throw new Error(`Carte ${c.id} : téléchargement impossible (HTTP ${r.status})`);
  const buf = Buffer.from(await r.arrayBuffer());
  await sharp(buf).resize({ width: 720, height: 1280, fit: 'cover' }).webp({ quality: 80 }).toFile(out);
  console.log(`carte ${c.id} téléchargée`);
  fetched++;
}
console.log(`cartes : ${local} déjà présentes, ${fetched} téléchargées`);
