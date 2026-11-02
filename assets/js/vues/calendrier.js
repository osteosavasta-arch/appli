/* Calendrier saisonnier : un mois à la fois, le mois en cours par défaut.
   Adresse : #calendrier (mois en cours) ou #calendrier/3 (mars). */

import { chargerJSON, estVisible, marqueRelecture, echapper } from '../app.js';

export async function afficherCalendrier(parametre) {
  const calendrier = await chargerJSON('data/calendrier.json');
  const tousLesMois = calendrier.mois;

  // Mois demandé dans l'adresse, sinon le mois d'aujourd'hui (1 à 12)
  let numero = parseInt(parametre, 10);
  if (!(numero >= 1 && numero <= 12)) numero = new Date().getMonth() + 1;

  const precedent = numero === 1 ? 12 : numero - 1;
  const suivant = numero === 12 ? 1 : numero + 1;
  const mois = tousLesMois.find((m) => m.numero === numero);
  const nomDuMois = (n) => (tousLesMois.find((m) => m.numero === n) || {}).nom || '';

  let fiche;
  if (estVisible(mois)) {
    const marque = marqueRelecture(mois);
    fiche = `
      <div class="carte${marque.classe}">
        ${marque.etiquette}
        <span class="saison">${echapper(mois.saison)}</span>
        <h2>${echapper(mois.theme)}</h2>
        <h3>Conseils du mois</h3>
        <ul class="conseils">
          ${mois.conseils.map((c) => `<li>${echapper(c)}</li>`).join('')}
        </ul>
      </div>`;
  } else {
    fiche = '<div class="carte"><p class="vide">Les conseils de ce mois sont en cours de préparation.</p></div>';
  }

  // Emplacement réservé : les fruits et légumes du mois arrivent en phase 3
  const fruitsLegumes = `
    <div class="carte">
      <h3>Fruits et légumes du mois</h3>
      <p class="vide">Bientôt disponible.</p>
    </div>`;

  const listeMois = tousLesMois.map((m) => `
    <li><a href="#calendrier/${m.numero}" ${m.numero === numero ? 'aria-current="true"' : ''}>${echapper(m.nom)}</a></li>`).join('');

  return `
    <div class="navigation-mois">
      <a class="fleche" href="#calendrier/${precedent}" aria-label="Mois précédent : ${echapper(nomDuMois(precedent))}">‹</a>
      <h1>${echapper(nomDuMois(numero))}</h1>
      <a class="fleche" href="#calendrier/${suivant}" aria-label="Mois suivant : ${echapper(nomDuMois(suivant))}">›</a>
    </div>
    ${fiche}
    ${fruitsLegumes}
    <h2>Tous les mois</h2>
    <ul class="liste-mois">${listeMois}</ul>`;
}
