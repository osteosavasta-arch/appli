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
      <p><a href="#journal">Journal technique</a> : les erreurs éventuelles de l'application, à transmettre au cabinet en cas de souci.</p>
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

/* ---------- Journal technique (#journal) ----------
   Erreurs notées par assets/js/journal.js, seulement sur ce téléphone.
   La personne peut copier le journal pour l'envoyer elle-même au cabinet, ou l'effacer. */
const DATE_JOURNAL = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });

function texteJournal(entrees) {
  const lignes = entrees.map((e) => `${DATE_JOURNAL.format(new Date(e.date))} | ${e.version || '?'} | ${e.ecran} | ${e.type}`
    + ` | ${e.message}${e.source ? ` (${e.source})` : ''}${e.fois ? ` ×${e.fois}` : ''} | ${e.navigateur}`);
  return `Journal technique Ostéo Savasta, copié le ${DATE_JOURNAL.format(new Date())}\n${lignes.join('\n') || 'Aucune erreur notée.'}\n`;
}

export async function afficherJournal() {
  const entrees = (window.JournalOsteo?.lire() || []).slice().reverse();
  const liste = entrees.length
    ? `<ul class="journal-liste">${entrees.map((e) => `
        <li>
          <p class="journal-entete"><strong>${echapper(DATE_JOURNAL.format(new Date(e.date)))}</strong>
            <span>${echapper([e.version, e.ecran, e.type].filter(Boolean).join(' · '))}${e.fois ? ` · ${e.fois} fois` : ''}</span></p>
          <p class="journal-message">${echapper(e.message)}${e.source ? ` <small>(${echapper(e.source)})</small>` : ''}</p>
        </li>`).join('')}</ul>`
    : '<p class="vide">Aucune erreur notée sur ce téléphone.</p>';
  return `<div class="journal-ecran">
    ${bandeau({ surtitre: 'Assistance', titre: 'Journal technique', retour: { adresse: '#infos', libelle: 'Infos' } })}
    <p>Si l'application rencontre une erreur technique, elle la note ici, seulement sur ce téléphone. Aucune donnée personnelle, rien n'est envoyé.</p>
    <p>En cas de souci, vous pouvez copier ce journal et le transmettre au cabinet.</p>
    ${liste}
    <div class="carnet-actions">
      <button type="button" class="bouton bouton-secondaire" data-copier-journal ${entrees.length ? '' : 'disabled'}>Copier le journal</button>
      <button type="button" class="bouton bouton-contour" data-effacer-journal ${entrees.length ? '' : 'disabled'}>Effacer le journal</button>
    </div>
    <p class="menu-copie" id="journal-message" role="status" hidden></p>
    <textarea class="menu-texte" id="journal-texte" readonly hidden aria-label="Journal à copier"></textarea>
  </div>`;
}

export function activerJournal(contenu) {
  const zone = contenu.querySelector('.journal-ecran');
  if (!zone) return;
  const message = zone.querySelector('#journal-message');
  zone.addEventListener('click', async (evenement) => {
    if (evenement.target.closest('[data-copier-journal]')) {
      const texte = texteJournal(window.JournalOsteo?.lire() || []);
      try {
        await navigator.clipboard.writeText(texte);
        message.textContent = 'Journal copié : collez-le dans un message au cabinet.';
        message.hidden = false;
      } catch (erreur) {
        const champ = zone.querySelector('#journal-texte');
        champ.value = texte;
        champ.hidden = false;
        champ.select();
      }
      return;
    }
    const effacer = evenement.target.closest('[data-effacer-journal]');
    if (effacer) {
      // Effacement en deux temps
      if (effacer.dataset.confirme !== 'oui') {
        effacer.dataset.confirme = 'oui';
        effacer.textContent = "Confirmer l'effacement";
        return;
      }
      window.JournalOsteo?.effacer();
      zone.querySelector('.journal-liste')?.replaceWith(Object.assign(document.createElement('p'), {
        className: 'vide', textContent: 'Aucune erreur notée sur ce téléphone.',
      }));
      zone.querySelectorAll('[data-copier-journal], [data-effacer-journal]').forEach((b) => { b.disabled = true; });
      effacer.textContent = 'Effacer le journal';
      message.textContent = 'Journal effacé.';
      message.hidden = false;
    }
  });
}
