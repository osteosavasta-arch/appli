/* =========================================================
   Panneau « Contacter le cabinet » (fenêtre en bas de l'écran).
   Il s'ouvre uniquement quand on touche un bouton portant
   data-ouvrir="renseignements". Il ne collecte rien : chaque choix
   ouvre l'application du téléphone (appel, WhatsApp, e-mail).
   Textes et liens : config/liens.json → "renseignements"
   ========================================================= */

import { chargerJSON, echapper } from './app.js';

let panneau = null;

async function creerPanneau() {
  const r = (await chargerJSON('config/liens.json')).renseignements;
  const urlWhatsapp = `${r.whatsapp.url}?text=${encodeURIComponent(r.whatsapp.message)}`;

  panneau = document.createElement('dialog');
  panneau.className = 'panneau';
  panneau.setAttribute('aria-labelledby', 'titre-panneau');
  panneau.innerHTML = `
    <div class="panneau-entete">
      <h2 id="titre-panneau">${echapper(r.titrePanneau)}</h2>
      <button type="button" class="panneau-fermer" data-fermer aria-label="${echapper(r.boutonFermer)}">✕</button>
    </div>
    <a class="bouton bouton-secondaire" href="${echapper(r.appel.lien)}">${echapper(r.appel.libelle)} · ${echapper(r.appel.affichage)}</a>
    <a class="bouton bouton-secondaire" href="${echapper(urlWhatsapp)}" target="_blank" rel="noopener">${echapper(r.whatsapp.libelle)}</a>
    <button type="button" class="bouton bouton-secondaire" data-email>${echapper(r.email.libelle)}</button>
    <p class="panneau-mention">${echapper(r.mention)}</p>
    ${r.horairesReponse ? `<p class="panneau-horaires">${echapper(r.horairesReponse)}</p>` : ''}`;
  document.body.appendChild(panneau);

  // Adresse e-mail assemblée seulement au moment du clic
  panneau.querySelector('[data-email]').addEventListener('click', () => {
    const adresse = `${r.email.identifiant}@${r.email.domaine}`;
    location.href = `mailto:${adresse}?subject=${encodeURIComponent(r.email.objet)}`;
  });

  // Fermeture : bouton ✕, touche Échap (géré par le navigateur), ou toucher le fond
  panneau.querySelector('[data-fermer]').addEventListener('click', () => panneau.close());
  panneau.addEventListener('click', (evenement) => {
    if (evenement.target === panneau) panneau.close();
  });
}

export async function ouvrirRenseignements() {
  if (!panneau) await creerPanneau();
  if (!panneau.open) panneau.showModal();
}

// Tout bouton data-ouvrir="renseignements" (accueil, menu…) ouvre le panneau
document.addEventListener('click', (evenement) => {
  const declencheur = evenement.target.closest('[data-ouvrir="renseignements"]');
  if (!declencheur) return;
  evenement.preventDefault();
  ouvrirRenseignements().catch((erreur) => console.error(erreur));
});
