/* Écran « Infos » et pages texte (confidentialité, mentions légales).
   Les pages texte sont écrites en Markdown simple dans le dossier pages/ :
   # Titre, ## Sous-titre, - élément de liste, **gras**, [texte](adresse). */

import { chargerJSON, echapper } from '../app.js';
import { blocInstallation } from '../installation.js';

export async function afficherInfos() {
  const [cabinet, liens] = await Promise.all([
    chargerJSON('config/cabinet.json'),
    chargerJSON('config/liens.json'),
  ]);

  // Infos pratiques de config/cabinet.json (une ligne vide n'est pas affichée)
  const infos = cabinet.infosPratiques || {};
  const libelles = {
    horaires: 'Horaires', lieu: 'Lieu', urgence: 'Urgence', tarif: 'Tarif',
    paiement: 'Paiement', stationnement: 'Accès', communes: 'Communes desservies',
  };
  const lignes = Object.keys(libelles)
    .filter((cle) => infos[cle])
    .map((cle) => `<p><strong>${libelles[cle]} :</strong> ${echapper(infos[cle])}</p>`)
    .join('');

  // Adresse cliquable : ouvre Google Maps (l'application si elle est installée)
  const urlPlan = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cabinet.adresse || '')}`;
  const adresse = cabinet.adresse
    ? `<p><strong>Adresse :</strong> <a href="${echapper(urlPlan)}" target="_blank" rel="noopener">${echapper(cabinet.adresse)}</a>
         <br><a href="${echapper(urlPlan)}" target="_blank" rel="noopener">📍 Voir sur Google Maps</a></p>`
    : '';

  return `
    <h1>Infos pratiques</h1>

    <div class="carte">
      <h2>Le cabinet</h2>
      ${adresse}
      ${lignes}
    </div>

    <div class="carte">
      <h2>Rendez-vous et contact</h2>
      <a class="bouton bouton-accueil" href="${echapper(liens.rendezVous.url)}" target="_blank" rel="noopener">
        ${echapper(liens.rendezVous.libelle)}
      </a>
      <button type="button" class="bouton bouton-accueil bouton-espace" data-ouvrir="renseignements">
        ${echapper(liens.renseignements.libelle)}
      </button>
    </div>

    <div class="carte">
      <h2>${echapper(liens.avis.titreSection)}</h2>
      <p>${echapper(liens.avis.texte)}</p>
      <a class="bouton bouton-accueil" href="${echapper(liens.avis.url)}" target="_blank" rel="noopener">⭐ ${echapper(liens.avis.libelle)}</a>
    </div>

    <div class="carte">
      <h2>Installer l'application</h2>
      ${blocInstallation() || '<p>L\'application est installée sur ce téléphone.</p>'}
      <p>Une fois ouverte, l'application reste consultable sans connexion pour les pages déjà visitées.</p>
    </div>

    <div class="carte">
      <h2>Vos données</h2>
      <p>Aucun compte, aucun cookie, aucune statistique : l'application ne recueille aucune donnée personnelle.</p>
      <p><a href="#confidentialite">Confidentialité</a> · <a href="#mentions-legales">Mentions légales</a></p>
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
