/* Écran « Infos » et pages texte (confidentialité, mentions légales).
   Les pages texte sont écrites en Markdown simple dans le dossier pages/ :
   # Titre, ## Sous-titre, - élément de liste, **gras**, [texte](adresse). */

import { chargerJSON, echapper, bandeau } from '../app.js';
import { blocInstallation } from '../installation.js';
import { icone } from '../icones.js';

export async function afficherInfos() {
  const cabinet = await chargerJSON('config/cabinet.json');

  // Infos pratiques de config/cabinet.json (une ligne vide n'est pas affichée)
  const infos = cabinet.infosPratiques || {};
  const libelles = {
    horaires: 'Horaires', lieu: 'Lieu', urgence: 'Urgence', tarif: 'Tarif',
    paiement: 'Paiement', stationnement: 'Accès', communes: 'Communes desservies',
  };
  const lignes = Object.keys(libelles)
    .filter((cle) => infos[cle])
    .map((cle) => `<div><dt>${libelles[cle]}</dt><dd>${echapper(infos[cle])}</dd></div>`)
    .join('');

  // Adresse cliquable : ouvre Google Maps (l'application si elle est installée) sur la fiche
  // du cabinet (config/cabinet.json → rechercheGoogleMaps), à défaut sur l'adresse
  const urlPlan = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cabinet.rechercheGoogleMaps || cabinet.adresse || '')}`;
  const adresse = cabinet.adresse
    ? `<p class="infos-adresse"><strong>Adresse</strong><br>
         <a href="${echapper(urlPlan)}" target="_blank" rel="noopener">${echapper(cabinet.adresse)}</a></p>
       <a class="bouton bouton-contour" href="${echapper(urlPlan)}" target="_blank" rel="noopener">${icone('epingle', 'icone-petite')}Voir sur Google Maps</a>`
    : '';

  return `
    ${bandeau({ titre: 'Infos pratiques' })}
    ${adresse}
    <dl class="infos-liste">${lignes}</dl>

    <div class="carte">
      <h2 class="carte-titre">Installer l'application</h2>
      ${blocInstallation() || "<p>L'application est installée sur ce téléphone.</p>"}
      <p>Une fois ouverte, l'application reste consultable sans connexion pour les pages déjà visitées.</p>
    </div>

    <div class="carte">
      <h2 class="carte-titre">Vos données</h2>
      <p>Aucun compte, aucun cookie, aucune statistique : l'application ne recueille aucune donnée personnelle.</p>
    </div>`;
}

export async function afficherPageTexte(chemin) {
  const reponse = await fetch(chemin);
  if (!reponse.ok) throw new Error(`Fichier introuvable : ${chemin}`);
  return `<article class="page-texte">${markdownVersHtml(await reponse.text())}</article>`;
}

/** Transforme un Markdown très simple en HTML (titres, listes, paragraphes). */
function markdownVersHtml(texte) {
  // Gras et liens, appliqués après protection du texte
  const enLigne = (ligne) => echapper(ligne)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((https?:\/\/[^)\s]+|#[^)\s]*)\)/g, '<a href="$2">$1</a>');

  const blocs = texte.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  return blocs.map((bloc) => {
    const lignes = bloc.trim().split('\n');
    if (!lignes[0]) return '';
    const titre = lignes[0].match(/^(#{1,3})\s+(.*)$/);
    if (titre && lignes.length === 1) {
      const niveau = titre[1].length;
      return `<h${niveau}>${enLigne(titre[2])}</h${niveau}>`;
    }
    if (lignes.every((l) => /^\s*-\s+/.test(l))) {
      return `<ul>${lignes.map((l) => `<li>${enLigne(l.replace(/^\s*-\s+/, ''))}</li>`).join('')}</ul>`;
    }
    if (lignes.every((l) => /^>\s?/.test(l))) {
      return `<div class="bandeau-relecture">${lignes.map((l) => enLigne(l.replace(/^>\s?/, ''))).join('<br>')}</div>`;
    }
    return `<p>${lignes.map(enLigne).join('<br>')}</p>`;
  }).join('\n');
}
