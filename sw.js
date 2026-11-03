/* =========================================================
   Service worker : garde une copie des pages sur le téléphone
   pour que l'application fonctionne sans connexion.

   IMPORTANT : après une modification du code (HTML, CSS, JS),
   augmentez le numéro de VERSION ci-dessous (v1 → v2…) pour que
   les téléphones récupèrent la nouvelle version.
   Les fichiers JSON et les pages texte, eux, sont toujours
   rechargés depuis Internet quand il y a du réseau.
   ========================================================= */

const VERSION = 'v22';
const CACHE = `osteo-savasta-${VERSION}`;

// Fichiers enregistrés dès l'installation
const FICHIERS_DE_BASE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/style.css',
  'assets/js/app.js',
  'assets/js/rappel.js',
  'assets/js/calcul-rappel.js',
  'assets/js/installation.js',
  'assets/js/renseignements.js',
  'assets/js/partage.js',
  'assets/js/vues/accueil.js',
  'assets/js/vues/dietetique.js',
  'assets/js/vues/etirements.js',
  'assets/js/vues/pages.js',
  'assets/icones/icone-192.png',
  'assets/icones/icone-512.png',
  'assets/icones/logo-entete.png',
  'assets/icones/qr-code-appli.svg',
  'config/liens.json',
  'config/cabinet.json',
  'config/rappel.json',
  'data/etirements.json',
  'data/complements.json',
  'data/fruits-legumes.json',
  'pages/confidentialite.md',
  'pages/mentions-legales.md',
];

// cache: 'reload' : chaque fichier est repris sur Internet, jamais dans le cache du
// navigateur (GitHub le garde 10 min), sinon une nouvelle version pourrait garder l'ancien code
self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(FICHIERS_DE_BASE.map((fichier) => new Request(fichier, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// Supprime les anciennes versions du cache
self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((nom) => nom !== CACHE).map((nom) => caches.delete(nom))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  const url = new URL(requete.url);

  // On ne s'occupe que des fichiers de l'application elle-même
  if (requete.method !== 'GET' || url.origin !== self.location.origin) return;

  // Contenus (JSON, Markdown) : réseau d'abord, copie locale si hors ligne
  if (url.pathname.endsWith('.json') || url.pathname.endsWith('.md')) {
    evenement.respondWith(
      fetch(requete)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put(requete, copie));
          return reponse;
        })
        .catch(() => caches.match(requete))
    );
    return;
  }

  // Code et images : copie locale d'abord (rapide), réseau sinon
  evenement.respondWith(
    caches.match(requete, { ignoreSearch: requete.mode === 'navigate' }).then((enCache) => {
      if (enCache) return enCache;
      return fetch(requete).then((reponse) => {
        if (reponse.ok) {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put(requete, copie));
        }
        return reponse;
      }).catch(() => (requete.mode === 'navigate' ? caches.match('index.html') : undefined));
    })
  );
});
