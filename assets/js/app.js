/* =========================================================
   Cœur de l'application :
   - lit les fichiers JSON (config/ et data/) ;
   - applique la règle de relecture : seul ce qui est "validee" s'affiche ;
   - affiche le bon écran selon l'adresse (#accueil, #dietetique…) ;
   - active le mode hors ligne (service worker).
   ========================================================= */

import { afficherAccueil } from './vues/accueil.js';
import { afficherEtirements } from './vues/etirements.js';
import { afficherDietetique } from './vues/dietetique.js';
import { afficherInfos, afficherPageTexte } from './vues/pages.js';
import { activerRappel } from './rappel.js';
import './renseignements.js';
import './partage.js';

/* ---------- Mode relecture ----------
   Sur votre ordinateur uniquement (adresse « localhost »), ajouter
   ?relecture à l'adresse affiche aussi les contenus « a-relire »,
   surlignés en jaune. Sur le site en ligne, ce mode est impossible :
   rien n'est montré au public sans votre validation. */
const surOrdinateurLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
export const modeRelecture = surOrdinateurLocal && new URLSearchParams(location.search).has('relecture');

/** Règle centrale : un contenu ne s'affiche que s'il est validé. */
export function estVisible(element) {
  if (!element) return false;
  if (element.statut === 'validee') return true;
  return modeRelecture;
}

/** Ajoute la classe et l'étiquette « À relire » en mode relecture. */
export function marqueRelecture(element) {
  if (element && element.statut !== 'validee') {
    return { classe: ' a-relire', etiquette: '<span class="etiquette-relire">À RELIRE</span><br>' };
  }
  return { classe: '', etiquette: '' };
}

/** Protège le texte avant de l'insérer dans la page (évite tout code caché). */
export function echapper(texte) {
  return String(texte ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Lit un fichier JSON ; garde le résultat en mémoire pour ne pas le relire. */
const memoire = {};
export async function chargerJSON(chemin) {
  if (!memoire[chemin]) {
    memoire[chemin] = fetch(chemin).then((reponse) => {
      if (!reponse.ok) throw new Error(`Fichier introuvable : ${chemin}`);
      return reponse.json();
    });
  }
  return memoire[chemin];
}

/* ---------- Liste des écrans ---------- */
const ecrans = {
  'accueil': afficherAccueil,
  // Calendrier saisonnier désactivé pour le moment (fichiers conservés :
  // assets/js/vues/calendrier.js et data/calendrier.json). Pour le remettre,
  // réimporter afficherCalendrier et ajouter : 'calendrier': afficherCalendrier,
  'etirements': afficherEtirements,
  'dietetique': afficherDietetique,
  'infos': afficherInfos,
  'confidentialite': () => afficherPageTexte('pages/confidentialite.md'),
  'mentions-legales': () => afficherPageTexte('pages/mentions-legales.md'),
};

// Écrans qui ont des boutons à brancher après affichage
const apresAffichage = {
  'accueil': activerRappel,
};

const zone = document.getElementById('contenu');

async function afficherEcran() {
  // « #etirements/dos » → écran « etirements », paramètre « dos »
  const [nom, parametre] = location.hash.replace('#', '').split('/');
  const route = ecrans[nom] ? nom : 'accueil';

  // Met en évidence l'onglet actif du menu
  document.querySelectorAll('.menu a[data-route]').forEach((lien) => {
    if (lien.dataset.route === route) lien.setAttribute('aria-current', 'page');
    else lien.removeAttribute('aria-current');
  });

  try {
    let html = await ecrans[route](parametre);
    if (modeRelecture) {
      html = '<div class="bandeau-relecture">Mode relecture : les contenus surlignés en jaune ne sont PAS visibles en ligne.</div>' + html;
    }
    zone.innerHTML = html;
    if (apresAffichage[route]) await apresAffichage[route](zone);
  } catch (erreur) {
    console.error(erreur);
    zone.innerHTML = '<p class="vide">Ce contenu n\'a pas pu être chargé. Vérifiez votre connexion puis réessayez.</p>';
  }
  window.scrollTo(0, 0);
}

/** Recopie le lien de rendez-vous de config/liens.json dans le menu. */
async function preparerMenu() {
  try {
    const liens = await chargerJSON('config/liens.json');
    document.querySelectorAll('.js-lien-rdv').forEach((a) => { a.href = liens.rendezVous.url; });
  } catch (erreur) {
    console.error(erreur); // le lien écrit dans index.html reste utilisable
  }
}

window.addEventListener('hashchange', () => {
  afficherEcran();
  zone.focus({ preventScroll: true }); // aide les lecteurs d'écran
});

preparerMenu();
afficherEcran();

/* ---------- Mode hors ligne ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((erreur) => console.error(erreur));
  });
}
