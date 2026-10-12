# Songe

Jeu d'indices et d'images à jouer entre amis, chacun sur son téléphone, directement dans le navigateur (installable en PWA). Un conteur choisit une carte et donne un indice, les autres posent une carte de leur main qui pourrait correspondre, puis tout le monde vote.

En ligne : https://songe-jeu.vercel.app

## Stack

- Vite, JavaScript sans framework
- Multijoueur en temps réel via Supabase Realtime (présence et diffusion, sans table en base)
- Interface en français, anglais et espagnol
- Hébergement Vercel, déploiement automatique à chaque push sur `main`

## Lancer en local

```bash
npm install
npm run dev
```

## Structure

- `src/main.js` : logique du jeu, salons, rendu
- `src/cards.json` : les cartes (id, image source, mots-clés, thèmes, indices pour les bots)
- `src/cards-i18n.js`, `src/i18n.js` : traductions
- `src/promo.js`, `promo.html` : générateur de la vidéo promo
- `scripts/icons.mjs` : génère les icônes de la PWA au build
- `public/cards/` : les images des 61 cartes (WebP 720x1280)
- `scripts/fetch-cards.mjs` : au build, télécharge seulement les images de cartes qui manquent dans `public/cards/`

## Ajouter une carte

1. Déposer l'image dans `public/cards/<id>.webp` (ou renseigner `src` avec l'URL de l'image : elle sera téléchargée et convertie au build).
2. Ajouter l'entrée dans `src/cards.json` (id, mots-clés, thèmes, indices pour les bots) et sa traduction dans `src/cards-i18n.js`.
3. Pousser sur `main` : Vercel redéploie tout seul.
