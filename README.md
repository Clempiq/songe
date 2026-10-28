# Songe

> Un jeu d'indices et d'images à jouer entre amis, chacun sur son téléphone, directement dans le navigateur.

**Site :** [songe-jeu.vercel.app](https://songe-jeu.vercel.app) (multijoueur en veille, voir Statut)

## Le concept

Un conteur choisit une carte de sa main et donne un indice. Les autres posent la carte de leur main qui pourrait le mieux correspondre, puis tout le monde vote pour retrouver celle du conteur. Le défi : un indice ni trop évident, ni trop obscur.

## Le problème

Les jeux d'ambiance de ce type demandent la boîte physique et que tout le monde soit autour de la même table. Les versions en ligne obligent souvent à créer un compte ou à installer une application.

**Pour qui :** des groupes d'amis ou de famille qui veulent lancer une partie en dix secondes, avec le téléphone qu'ils ont en poche, sur place ou à distance.

## Fonctionnalités clés

- **Salons** : création en un clic, code de 4 lettres ou lien direct (`?salon=XXXX`) à partager.
- **Multijoueur temps réel** via Supabase Realtime (présence et diffusion), sans aucune table en base : l'hôte fait autorité sur l'état de la partie.
- **Robustesse réseau** : surveillance de la connexion, reconnexion automatique et reprise de session après un rechargement.
- **Mode solo** contre des bots, qui choisissent et votent à partir des mots-clés et indices associés à chaque carte.
- **Carnet personnel** stocké sur l'appareil : cartes découvertes, parties, victoires et badges.
- **61 cartes illustrées** au format 9:16 (WebP 720x1280), chacune avec sa propre direction artistique.
- **Trois langues** : français, anglais, espagnol.
- **PWA installable**, sons générés dans le navigateur (Web Audio).
- **Générateur de vidéo promo** intégré (`promo.html`), qui produit un MP4 ou WebM directement dans le navigateur.

## Stack

| Catégorie | Technologie |
|---|---|
| Front | Vite, JavaScript sans framework |
| Temps réel | Supabase Realtime (presence + broadcast) |
| Médias | `sharp` au build (icônes et cartes), `mp4-muxer` / `webm-muxer` pour la vidéo promo |
| Hébergement | Vercel, déploiement automatique à chaque push sur `main` |
| Mesure d'audience | Vercel Web Analytics |

## Lancer en local

```bash
npm install
npm run dev
```

Le build (`npm run build`) génère les icônes de la PWA puis télécharge et convertit uniquement les images de cartes manquantes.

### Structure

- `src/main.js` : logique du jeu, salons, rendu
- `src/cards.json` : les cartes (id, image source, mots-clés, thèmes, indices pour les bots)
- `src/cards-i18n.js`, `src/i18n.js` : traductions
- `src/promo.js`, `promo.html` : générateur de la vidéo promo
- `scripts/icons.mjs`, `scripts/fetch-cards.mjs` : préparation des médias au build
- `public/cards/` : les images des cartes

### Ajouter une carte

1. Déposer l'image dans `public/cards/<id>.webp` (ou renseigner `src` avec l'URL de l'image : elle sera téléchargée et convertie au build).
2. Ajouter l'entrée dans `src/cards.json` et sa traduction dans `src/cards-i18n.js`.
3. Pousser sur `main` : Vercel redéploie tout seul.

## Statut

🌙 **Déployé, serveur temps réel en veille.** Le site est en ligne, mais le multijoueur repose sur un projet Supabase (offre gratuite) actuellement en pause : les salons ne fonctionnent pas tant qu'il n'est pas réactivé. Démo réactivable sur demande.

Premier jeu du studio [Cosmoth](https://cosmoth.vercel.app). Pistes suivantes : packs de cartes supplémentaires et diffusion à l'international.

## Ce que j'ai appris

- **Concevoir un multijoueur sans serveur de jeu** : un hôte qui fait autorité, des messages diffusés et la présence pour savoir qui est là.
- **Penser aux cas réels** : téléphone qui se met en veille, réseau qui coupe, joueur qui recharge la page. La reprise de session est devenue une fonctionnalité à part entière.
- **Soigner l'onboarding** : rejoindre une partie avec un simple lien, sans compte ni installation.
- **Internationaliser dès le départ** plutôt qu'après coup.
