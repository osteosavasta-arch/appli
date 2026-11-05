/* Écran d'accueil (direction « La salle de soins ») : photo de la salle, identité,
   rendez-vous, quatre tuiles, rappel replié, puis la présentation du cabinet. */

import { chargerJSON, estVisible, marqueRelecture, echapper } from '../app.js';
import { blocRappel } from '../rappel.js';
import { blocInstallation } from '../installation.js';
import { icone } from '../icones.js';

export async function afficherAccueil() {
  const [cabinet, liens, rappel] = await Promise.all([
    chargerJSON('config/cabinet.json'),
    chargerJSON('config/liens.json'),
    blocRappel(),
  ]);

  // La présentation ne s'affiche que si elle est validée
  let presentation = '';
  if (estVisible(cabinet.presentation)) {
    const marque = marqueRelecture(cabinet.presentation);
    presentation = `
      <div class="carte${marque.classe}">
        ${marque.etiquette}
        ${cabinet.presentation.texte.map((p) => `<p>${echapper(p)}</p>`).join('')}
      </div>`;
  }

  return `
    <div class="ouverture">
      <img class="ouverture-photo" src="assets/images/salle-de-soins.webp" width="800" height="360"
           alt="La salle de soins du cabinet : mur bleu, toile de Miyajima et plantes">
    </div>

    <div class="identite">
      <img src="assets/icones/logo-entete.png" alt="Logo du cabinet" width="56" height="56">
      <div>
        <span class="surtitre">Pôle Santé de Chirens</span>
        <h1>${echapper(cabinet.nom)}</h1>
      </div>
    </div>
    <div class="filet-torii"></div>
    <p class="accueil-qualite">${echapper(cabinet.profession)} · ${echapper(cabinet.ville)}</p>

    <nav aria-label="Accès rapide">
      <a class="bouton bouton-secondaire" href="${echapper(liens.rendezVous.url)}" target="_blank" rel="noopener">${echapper(liens.rendezVous.libelle)}</a>
      <ul class="tuiles">
        <li><button type="button" class="tuile" data-ouvrir="renseignements">${icone('bulle')}${echapper(liens.renseignements.libelle)}</button></li>
        <li><a class="tuile" href="#etirements">${icone('corps')}Étirements</a></li>
        <li><a class="tuile tuile-verte" href="#dietetique">${icone('feuille')}Diététique</a></li>
        <li><span class="tuile tuile-bientot" aria-disabled="true">${icone('document')}<span>Ressources <small>(bientôt)</small></span></span></li>
      </ul>
    </nav>

    ${rappel}

    <div class="actions-liens">
      <a href="${echapper(liens.avis.url)}" target="_blank" rel="noopener">${echapper(liens.avis.libelle)}</a>
      <button type="button" class="lien-discret" data-ouvrir="partage">${echapper(liens.partage.libelle)}</button>
    </div>

    ${blocInstallation()}
    ${presentation}
    ${cabinet.adresse ? `<p class="accueil-adresse">${echapper(cabinet.adresse)}</p>` : ''}`;
}
