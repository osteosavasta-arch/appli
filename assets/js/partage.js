/* =========================================================
   Panneau « Partager l'application » (fenêtre en bas de l'écran).
   Deux choix :
   - afficher le QR code, à scanner avec un autre téléphone ;
   - envoyer le lien : fenêtre de partage du téléphone (WhatsApp,
     SMS, e-mail…) ; si le navigateur n'en a pas, boutons WhatsApp,
     e-mail, SMS et « Copier le lien ».
   Rien n'est collecté ni envoyé par l'application elle-même.
   Textes et adresse : config/liens.json → "partage"
   ========================================================= */

import { chargerJSON, echapper } from './app.js';

let panneau = null;

async function creerPanneau() {
  const p = (await chargerJSON('config/liens.json')).partage;
  const texteComplet = `${p.message} ${p.url}`;
  const lienWhatsapp = `https://wa.me/?text=${encodeURIComponent(texteComplet)}`;
  const lienEmail = `mailto:?subject=${encodeURIComponent(p.objetEmail)}&body=${encodeURIComponent(texteComplet)}`;
  const lienSms = `sms:?&body=${encodeURIComponent(texteComplet)}`;

  panneau = document.createElement('dialog');
  panneau.className = 'panneau';
  panneau.setAttribute('aria-labelledby', 'titre-partage');
  panneau.innerHTML = `
    <div class="panneau-entete">
      <h2 id="titre-partage">${echapper(p.titrePanneau)}</h2>
      <button type="button" class="panneau-fermer" data-fermer aria-label="Fermer">✕</button>
    </div>
    <button type="button" class="bouton bouton-secondaire" data-partage="qr" aria-expanded="false">${echapper(p.boutonQr)}</button>
    <div class="partage-qr" hidden>
      <img src="assets/icones/qr-code-appli.svg" alt="QR code de l'application" width="240" height="240">
      <p>${echapper(p.aideQr)}</p>
    </div>
    <button type="button" class="bouton bouton-secondaire" data-partage="lien">${echapper(p.boutonLien)}</button>
    <div class="partage-choix" hidden>
      <a class="bouton bouton-secondaire" href="${echapper(lienWhatsapp)}" target="_blank" rel="noopener">${echapper(p.boutonWhatsapp)}</a>
      <a class="bouton bouton-secondaire" href="${echapper(lienEmail)}">${echapper(p.boutonEmail)}</a>
      <a class="bouton bouton-secondaire" href="${echapper(lienSms)}">${echapper(p.boutonSms)}</a>
      <button type="button" class="bouton bouton-secondaire" data-partage="copier">${echapper(p.boutonCopier)}</button>
      <p class="partage-adresse">${echapper(p.url)}</p>
    </div>
    <p class="partage-confirmation" role="status" hidden>${echapper(p.lienCopie)}</p>`;
  document.body.appendChild(panneau);

  const qr = panneau.querySelector('.partage-qr');
  const choix = panneau.querySelector('.partage-choix');
  const confirmation = panneau.querySelector('.partage-confirmation');

  panneau.addEventListener('click', async (evenement) => {
    if (evenement.target === panneau || evenement.target.closest('[data-fermer]')) {
      panneau.close();
      return;
    }
    const action = evenement.target.closest('[data-partage]')?.dataset.partage;

    if (action === 'qr') {
      qr.hidden = !qr.hidden;
      evenement.target.closest('[data-partage]').setAttribute('aria-expanded', String(!qr.hidden));
    } else if (action === 'lien') {
      // Fenêtre de partage du téléphone si elle existe, sinon les boutons de secours
      if (navigator.share) {
        try {
          await navigator.share({ title: p.titreMessage, text: p.message, url: p.url });
        } catch (erreur) {
          if (erreur.name !== 'AbortError') choix.hidden = false; // partage refusé : on propose les boutons
        }
      } else {
        choix.hidden = !choix.hidden;
      }
    } else if (action === 'copier') {
      try {
        await navigator.clipboard.writeText(p.url);
        confirmation.hidden = false;
        setTimeout(() => { confirmation.hidden = true; }, 2500);
      } catch (erreur) {
        // Copie impossible : l'adresse reste affichée et sélectionnable
        window.getSelection()?.selectAllChildren(panneau.querySelector('.partage-adresse'));
      }
    }
  });

}

// Le panneau s'ouvre toujours dans son état de départ (QR code et boutons repliés)
function reinitialiser() {
  panneau.querySelectorAll('.partage-qr, .partage-choix, .partage-confirmation').forEach((bloc) => { bloc.hidden = true; });
  panneau.querySelector('[data-partage="qr"]').setAttribute('aria-expanded', 'false');
}

export async function ouvrirPartage() {
  if (!panneau) await creerPanneau();
  if (panneau.open) return;
  reinitialiser();
  panneau.showModal();
}

// Tout bouton data-ouvrir="partage" ouvre le panneau
document.addEventListener('click', (evenement) => {
  const declencheur = evenement.target.closest('[data-ouvrir="partage"]');
  if (!declencheur) return;
  evenement.preventDefault();
  ouvrirPartage().catch((erreur) => console.error(erreur));
});
