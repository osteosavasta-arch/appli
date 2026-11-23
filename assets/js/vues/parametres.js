/* =========================================================
   Écran « Paramètres » (#parametres), dans l'onglet Infos.
   Visible seulement sur l'ordinateur du cabinet (adresse localhost) :
   les patients ne le voient jamais.
   Chaque réglage s'applique tout de suite à l'appli (aperçu en direct).
   « Enregistrer » écrit config/apparence.json dans le dossier de l'appli ;
   le changement part en ligne, pour tous les patients, à la publication suivante.
   ========================================================= */

import { bandeau, echapper, surOrdinateurLocal } from '../app.js';
import { DEFAUTS, POLICES, completer, appliquerApparence, chargerApparence } from '../apparence.js';

let dossierAppli = null; // dossier choisi une fois par session pour enregistrer

/** Onglets en tête de l'écran Infos (seulement sur l'ordinateur du cabinet). */
export function ongletsInfos(actif) {
  if (!surOrdinateurLocal) return '';
  const onglet = (cle, adresse, libelle) =>
    `<a href="#${adresse}" class="onglet-diet" ${actif === cle ? 'aria-current="page"' : ''}>${libelle}</a>`;
  return `
    <nav class="onglets-diet" aria-label="Rubriques des infos">
      ${onglet('infos', 'infos', 'Infos pratiques')}
      ${onglet('parametres', 'parametres', 'Paramètres')}
    </nav>`;
}

const COULEURS = [
  ['principale', 'Couleur principale', 'bandeaux, boutons, liens, barre du téléphone'],
  ['accent', "Couleur d'accent", 'filet sous les titres, mois en cours'],
  ['plante', 'Couleur nature', 'picto Diététique, repères atteints'],
  ['texte', 'Texte', 'titres et paragraphes'],
  ['fond', 'Fond de page', ''],
  ['carte', 'Fond des cartes', 'cartes, listes, boutons de choix'],
  ['bordure', 'Filets et contours', ''],
];

function htmlFormulaire(r) {
  const couleurs = COULEURS.map(([cle, libelle, aide]) => `
    <label class="param-couleur">
      <input type="color" data-couleur="${cle}" value="${echapper(r.couleurs[cle])}">
      <span><strong>${libelle}</strong>${aide ? `<small>${aide}</small>` : ''}</span>
    </label>`).join('');
  const choixPolice = (cle) => Object.entries(POLICES).map(([id, p]) =>
    `<option value="${id}" ${r.polices[cle] === id ? 'selected' : ''}>${echapper(p.nom)}</option>`).join('');
  const curseur = (cle, libelle, min, max, unite) => `
    <label class="param-curseur">
      <span><strong>${libelle}</strong> <output data-valeur="${cle}">${r[cle]} ${unite}</output></span>
      <input type="range" min="${min}" max="${max}" step="1" data-nombre="${cle}" data-unite="${unite}" value="${r[cle]}">
    </label>`;
  return `
    <form class="param-formulaire" onsubmit="return false">
      <fieldset class="param-groupe"><legend>Couleurs</legend>${couleurs}</fieldset>
      <fieldset class="param-groupe"><legend>Polices</legend>
        <label class="param-choix"><strong>Titres</strong><select data-police="titres">${choixPolice('titres')}</select></label>
        <label class="param-choix"><strong>Texte</strong><select data-police="texte">${choixPolice('texte')}</select></label>
      </fieldset>
      <fieldset class="param-groupe"><legend>Tailles et formes</legend>
        ${curseur('tailleTexte', 'Taille du texte', 14, 22, 'px')}
        ${curseur('rayonCartes', 'Arrondi des cartes', 0, 32, 'px')}
        ${curseur('rayonBoutons', 'Arrondi des boutons', 0, 24, 'px')}
      </fieldset>
      <fieldset class="param-groupe"><legend>Accueil</legend>
        <label class="param-case"><input type="checkbox" data-case="photoAccueil" ${r.photoAccueil ? 'checked' : ''}>
          <span>Afficher la photo de la salle en haut de l'accueil</span></label>
      </fieldset>
    </form>`;
}

export async function afficherParametres() {
  const retour = { adresse: '#infos', libelle: 'Infos' };
  if (!surOrdinateurLocal) {
    return `${bandeau({ titre: 'Paramètres', retour })}<p class="vide">Les paramètres se règlent seulement sur l'ordinateur du cabinet.</p>`;
  }
  const r = await chargerApparence();
  return `<div class="param-ecran">
    ${bandeau({ surtitre: 'Cabinet', titre: 'Paramètres' })}
    ${ongletsInfos('parametres')}
    <p>Réglez l'apparence de l'appli : chaque changement s'affiche tout de suite, partout dans l'appli. Les patients ne voient rien tant que vous n'avez pas enregistré puis publié.</p>
    <p class="menu-aide">Cet onglet n'existe que sur cet ordinateur ; il n'apparaît jamais sur les téléphones des patients.</p>
    ${htmlFormulaire(r)}
    <div class="duo-boutons">
      <button type="button" class="bouton bouton-secondaire" data-param="enregistrer">Enregistrer</button>
      <button type="button" class="bouton bouton-contour" data-param="origine">Réglages d'origine</button>
    </div>
    <p class="menu-copie" id="param-message" role="status" hidden></p>
    <p class="menu-aide">« Enregistrer » écrit le fichier config/apparence.json dans le dossier de l'appli (choisissez le dossier « ostéo appli » la première fois). Pour que les patients voient le changement : validez puis publiez, comme d'habitude.</p>
  </div>`;
}

export function activerParametres(contenu) {
  const zone = contenu.querySelector('.param-ecran');
  if (!zone) return;
  const message = zone.querySelector('#param-message');
  let reglages = null;
  chargerApparence().then((r) => { reglages = r; });

  const lire = () => {
    const r = completer(reglages || DEFAUTS);
    zone.querySelectorAll('[data-couleur]').forEach((c) => { r.couleurs[c.dataset.couleur] = c.value; });
    zone.querySelectorAll('[data-police]').forEach((s) => { r.polices[s.dataset.police] = s.value; });
    zone.querySelectorAll('[data-nombre]').forEach((n) => {
      r[n.dataset.nombre] = Number(n.value);
      zone.querySelector(`[data-valeur="${n.dataset.nombre}"]`).textContent = `${n.value} ${n.dataset.unite}`;
    });
    zone.querySelectorAll('[data-case]').forEach((c) => { r[c.dataset.case] = c.checked; });
    return r;
  };

  // Aperçu en direct, dans toute l'appli
  zone.addEventListener('input', () => {
    reglages = lire();
    appliquerApparence(reglages);
    message.hidden = true;
  });

  const dire = (texte) => { message.textContent = texte; message.hidden = false; };

  async function enregistrer() {
    const texte = `${JSON.stringify({
      _aide: "Apparence de l'appli, réglée depuis Infos → Paramètres sur l'ordinateur du cabinet. Couleurs au format #rrggbb ; polices : lora, lato, georgia ou systeme ; tailles en pixels.",
      ...lire(),
    }, null, 2)}\n`;
    // Écriture directe dans le dossier de l'appli (Chrome, Edge) ; sinon téléchargement du fichier
    if ('showDirectoryPicker' in window) {
      try {
        if (!dossierAppli) dossierAppli = await window.showDirectoryPicker({ id: 'osteo-appli', mode: 'readwrite' });
        const config = await dossierAppli.getDirectoryHandle('config');
        await config.getFileHandle('cabinet.json'); // vérifie que c'est bien le dossier de l'appli
        const fichier = await config.getFileHandle('apparence.json', { create: true });
        const flux = await fichier.createWritable();
        await flux.write(texte);
        await flux.close();
        dire('Enregistré dans config/apparence.json. Il reste à valider puis publier pour les patients.');
        return;
      } catch (erreur) {
        if (erreur.name === 'AbortError') return;
        dossierAppli = null;
        if (erreur.name === 'NotFoundError') {
          dire("Ce dossier n'est pas celui de l'appli : choisissez le dossier « ostéo appli » (celui qui contient config).");
          return;
        }
      }
    }
    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(new Blob([texte], { type: 'application/json' }));
    lien.download = 'apparence.json';
    lien.click();
    URL.revokeObjectURL(lien.href);
    dire('Fichier apparence.json téléchargé : placez-le dans le dossier config de l\'appli.');
  }

  zone.addEventListener('click', (evenement) => {
    const action = evenement.target.closest('[data-param]')?.dataset.param;
    if (action === 'enregistrer') enregistrer();
    if (action === 'origine') {
      reglages = completer();
      appliquerApparence(reglages);
      zone.querySelector('.param-formulaire').outerHTML = htmlFormulaire(reglages);
      dire("Réglages d'origine affichés. Enregistrez pour les garder.");
    }
  });
}
