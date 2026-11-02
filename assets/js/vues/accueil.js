/* Écran d'accueil (variante A) : rappel replié, puis une liste verticale
   de boutons tous identiques (même taille, même style, même espacement),
   puis la présentation du cabinet. */

import { chargerJSON, estVisible, marqueRelecture, echapper } from '../app.js';
import { blocRappel } from '../rappel.js';

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

  const adresse = cabinet.adresse ? `<p>${echapper(cabinet.adresse)}</p>` : '';

  // Rubriques pas encore disponibles : même bouton, mais inactif et marqué « bientôt »
  const bientot = (libelle) => `
    <li><span class="bouton bouton-accueil" aria-disabled="true">${echapper(libelle)} <small>(bientôt)</small></span></li>`;

  return `
    ${rappel}

    <nav aria-label="Accès rapide">
      <ul class="liste-boutons">
        <li><a class="bouton bouton-accueil" href="${echapper(liens.rendezVous.url)}" target="_blank" rel="noopener">${echapper(liens.rendezVous.libelle)}</a></li>
        <li><button type="button" class="bouton bouton-accueil" data-ouvrir="renseignements">${echapper(liens.renseignements.libelle)}</button></li>
        <li><a class="bouton bouton-accueil" href="#etirements">Étirements</a></li>
        <li><a class="bouton bouton-accueil" href="#dietetique">Diététique</a></li>
        ${bientot('Ressources')}
      </ul>
    </nav>

    <h1>${echapper(cabinet.nom)}</h1>
    <p class="sous-titre">${echapper(cabinet.profession)} · ${echapper(cabinet.ville)}</p>
    ${adresse}
    ${presentation}`;
}
