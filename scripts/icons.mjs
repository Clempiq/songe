// Génère les icônes de l'application (PWA) à partir d'un SVG.
import fs from 'node:fs/promises';
import sharp from 'sharp';
const svg = (pad) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" ${pad ? '' : 'rx="112"'} fill="#14131F"/><g transform="translate(256 256) scale(${pad ? 0.72 : 1}) translate(-256 -256)"><circle cx="236" cy="262" r="150" fill="#FFC93C"/><circle cx="306" cy="208" r="132" fill="#14131F"/><circle cx="372" cy="356" r="9" fill="#F4F1FF"/><circle cx="398" cy="300" r="6" fill="#F4F1FF" opacity=".7"/><circle cx="120" cy="130" r="7" fill="#F4F1FF" opacity=".8"/></g></svg>`);
await fs.mkdir('public/icons', { recursive: true });
await sharp(svg(false)).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(svg(false)).resize(512, 512).png().toFile('public/icons/icon-512.png');
await sharp(svg(true)).resize(512, 512).png().toFile('public/icons/maskable-512.png');
console.log('icônes ok');
