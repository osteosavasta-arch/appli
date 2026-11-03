/* =========================================================
   Bloc « Votre dernière consultation » (accueil, facultatif).
   - Tout est calculé dans le téléphone : rien n'est envoyé.
   - La date n'est enregistrée (localStorage) QUE si la personne
     coche « Garder cette date sur mon téléphone ».
   - Le rappel est un fichier .ics ouvert par l'agenda du téléphone.
   - Tout est recalculé à chaque affichage de l'accueil : une date gardée
     fait apparaître toute seule le message « 6 mois ou plus » le jour venu.
     Aucune notification, aucune fenêtre : seulement dans l'appli ouverte.
   Réglages et textes : config/rappel.json — calcul : calcul-rappel.js
   ========================================================= */

import { chargerJSON, echapper, estVisible, marqueRelecture } from './app.js';
import { verifierSaisie, situationRappel, versJour } from './calcul-rappel.js';

const CLE_STOCKAGE = 'osteo-savasta-derniere-consultation';
const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// État de la visite en cours (rien n'est gardé après fermeture sans la case cochée).
// Modes : 'replie' (une ligne, par défaut), 'formulaire', 'resultat'.
let etat = { mode: 'replie', date: null, conserver: false, erreur: '' };
let etatInitialise = false;

/* ---------- Stockage facultatif (protégé : peut être bloqué par le navigateur) ---------- */
function lireStockage() {
  try {
    const valeur = JSON.parse(localStorage.getItem(CLE_STOCKAGE));
    if (valeur && valeur.mois && valeur.annee) return valeur;
  } catch (e) { /* stockage indisponible : on continue sans */ }
  return null;
}
function ecrireStockage(date) {
  try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(date)); } catch (e) { /* ignoré */ }
}
function effacerStockage() {
  try { localStorage.removeItem(CLE_STOCKAGE); } catch (e) { /* ignoré */ }
}

/* ---------- Date lisible ---------- */
// Jour inconnu : l'échéance est le dernier jour du mois, d'où « fin … »
function dateEnClair(d, jourConnu) {
  const moisAnnee = `${NOMS_MOIS[d.mois - 1]} ${d.annee}`;
  if (!jourConnu) return `fin ${moisAnnee}`;
  return `${d.jour === 1 ? '1er' : d.jour} ${moisAnnee}`;
}

/* ---------- Fichier .ics (format agenda standard) ---------- */
const deuxChiffres = (n) => String(n).padStart(2, '0');
const dateIcs = (d) => `${d.annee}${deuxChiffres(d.mois)}${deuxChiffres(d.jour)}`;

// Caractères spéciaux à protéger dans un fichier agenda
const texteIcs = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Les lignes d'un .ics ne doivent pas dépasser 75 octets : on les replie
function replier(ligne) {
  const octets = new TextEncoder();
  const morceaux = [];
  let courant = '';
  for (const caractere of ligne) {
    const limite = morceaux.length === 0 ? 75 : 74; // la ligne repliée commence par un espace
    if (octets.encode(courant + caractere).length > limite) {
      morceaux.push(courant);
      courant = caractere;
    } else {
      courant += caractere;
    }
  }
  morceaux.push(courant);
  return morceaux.join('\r\n ');
}

export function creerIcs(bilan, reglages, maintenant = new Date()) {
  const lendemain = new Date(bilan.annee, bilan.mois - 1, bilan.jour + 1);
  const fin = { annee: lendemain.getFullYear(), mois: lendemain.getMonth() + 1, jour: lendemain.getDate() };
  const horodatage = maintenant.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const identifiant = `${dateIcs(bilan)}-${Math.random().toString(36).slice(2)}@osteo-savasta.fr`;
  const heure = reglages.heureAlerte;
  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Osteo Savasta//Appli//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${identifiant}`,
    `DTSTAMP:${horodatage}`,
    `DTSTART;VALUE=DATE:${dateIcs(bilan)}`,
    `DTEND;VALUE=DATE:${dateIcs(fin)}`,
    `SUMMARY:${texteIcs(reglages.evenement.titre)}`,
    `DESCRIPTION:${texteIcs(reglages.evenement.description)}`,
    'TRANSP:TRANSPARENT',
    // Alerte la veille à l'heure choisie (24 h − heure avant minuit du jour J)
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${texteIcs(reglages.evenement.titre)}`,
    `TRIGGER:-PT${24 - heure}H`, 'END:VALARM',
    // Alerte le jour même à l'heure choisie
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${texteIcs(reglages.evenement.titre)}`,
    `TRIGGER:PT${heure}H`, 'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lignes.map(replier).join('\r\n') + '\r\n';
}

function telechargerIcs(contenu, nomFichier) {
  const fichier = new Blob([contenu], { type: 'text/calendar;charset=utf-8' });
  const adresse = URL.createObjectURL(fichier);
  const lien = document.createElement('a');
  lien.href = adresse;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(adresse), 10000);
}

/* ---------- Affichage ---------- */
function options(debut, fin, libelle, selection, vide) {
  let html = vide ? `<option value="">${vide}</option>` : '';
  for (let i = debut; i <= fin; i++) {
    html += `<option value="${i}" ${Number(selection) === i ? 'selected' : ''}>${libelle(i)}</option>`;
  }
  return html;
}

function htmlFormulaire(t, date) {
  const anneeCourante = new Date().getFullYear();
  const d = date || {};
  return `
    <h2 class="rappel-titre">${echapper(t.titreBloc)}</h2>
    <p class="rappel-aide">${echapper(t.aide)}</p>
    <div class="rappel-selects">
      <label>Jour<select name="jour">${options(1, 31, (i) => i, d.jour, '—')}</select></label>
      <label>Mois<select name="mois">${options(1, 12, (i) => NOMS_MOIS[i - 1], d.mois, '—')}</select></label>
      <label>Année<select name="annee">${options(anneeCourante - 3, anneeCourante, (i) => i, d.annee, '—')}</select></label>
    </div>
    <label class="rappel-case">
      <input type="checkbox" name="conserver" ${etat.conserver ? 'checked' : ''}>
      <span>${echapper(t.caseConserver)}</span>
    </label>
    ${etat.erreur ? `<p class="rappel-erreur" role="alert">${echapper(etat.erreur)}</p>` : ''}
    <button type="button" class="bouton bouton-secondaire" data-rappel="creer">${echapper(t.boutonCreer)}</button>
    <button type="button" class="lien-discret" data-rappel="ignorer">${echapper(t.lienIgnorer)}</button>`;
}

/** Version compacte : le message selon le délai + une ligne d'actions. */
function htmlResultat(reglages, liens, situation) {
  const t = reglages.textes;
  const messages = reglages.messages;
  const dateLisible = dateEnClair(situation.echeance, situation.jourConnu);
  let message;
  if (estVisible(messages)) {
    const marque = marqueRelecture(messages);
    message = situation.atteint
      // 6 mois ou plus : invitation à refaire un bilan, pas de fichier agenda
      ? `${marque.etiquette}<p class="rappel-resultat">${echapper(messages.seuilAtteint)}</p>
         <a class="bouton bouton-secondaire rappel-rdv" href="${echapper(liens.rendezVous.url)}" target="_blank" rel="noopener">${echapper(liens.rendezVous.libelle)}</a>`
      : `${marque.etiquette}<p class="rappel-resultat">${messageProchainBilan(messages.prochainBilan, dateLisible)}</p>`;
  } else {
    // Messages pas encore validés : affichage d'avant (date du prochain bilan)
    message = `<p class="rappel-resultat">${echapper(t.prochainBilan)} : <strong>${echapper(dateLisible)}</strong></p>
      ${situation.atteint ? `<p class="rappel-aide">${echapper(t.bilanPasse)}</p>` : ''}`;
  }
  const agenda = situation.atteint
    ? ''
    : `<button type="button" class="lien-discret" data-rappel="telecharger" title="${echapper(t.aideTelechargement)}">${echapper(t.boutonTelecharger)}</button>`;
  return `
    ${message}
    <div class="rappel-actions">
      ${agenda}
      <button type="button" class="lien-discret" data-rappel="modifier">${echapper(t.boutonModifier)}</button>
      <button type="button" class="lien-discret" data-rappel="effacer">${echapper(t.boutonEffacer)}</button>
    </div>`;
}

/** « Votre prochain bilan : {date} » → la date (en gras) remplace {date}. */
function messageProchainBilan(modele, dateLisible) {
  const morceaux = String(modele).split('{date}');
  return morceaux.map(echapper).join(`<strong>${echapper(dateLisible)}</strong>`);
}

/** Version repliée (par défaut) : une seule ligne qui ouvre le formulaire. */
function htmlReplie(t) {
  return `
    <button type="button" class="rappel-deplier" data-rappel="deplier" aria-expanded="false">
      <span>${echapper(t.boutonDeplier)}</span><span aria-hidden="true">›</span>
    </button>`;
}

/** Renvoie le HTML du bloc (appelé par l'écran d'accueil). */
export async function blocRappel() {
  const [reglages, liens] = await Promise.all([chargerJSON('config/rappel.json'), chargerJSON('config/liens.json')]);
  if (!etatInitialise) {
    etatInitialise = true;
    const enregistree = lireStockage();
    // Date gardée mais devenue incohérente (ex. horloge du téléphone changée) : on l'ignore
    if (enregistree && !verifierSaisie(enregistree, versJour(new Date()))) {
      etat = { mode: 'resultat', date: enregistree, conserver: true, erreur: '' };
    }
  }
  return `<section class="carte rappel" id="bloc-rappel" aria-live="polite">${contenuBloc(reglages, liens)}</section>`;
}

function contenuBloc(reglages, liens) {
  const t = reglages.textes;
  if (etat.mode === 'replie') return htmlReplie(t);
  if (etat.mode === 'resultat') {
    // Recalculé à chaque affichage, avec la date du jour
    return htmlResultat(reglages, liens, situationRappel(etat.date, reglages.moisDelai, versJour(new Date())));
  }
  return htmlFormulaire(t, etat.date);
}

/** Branche les boutons du bloc (appelé après l'affichage de l'accueil). */
export async function activerRappel(zone) {
  const bloc = zone.querySelector('#bloc-rappel');
  if (!bloc) return;
  const [reglages, liens] = await Promise.all([chargerJSON('config/rappel.json'), chargerJSON('config/liens.json')]);
  const t = reglages.textes;
  const reafficher = () => { bloc.innerHTML = contenuBloc(reglages, liens); };
  const erreurs = { mois: t.erreurMois, invalide: t.erreurDateInvalide, futur: t.erreurFutur };

  bloc.addEventListener('click', (evenement) => {
    const action = evenement.target.closest('[data-rappel]')?.dataset.rappel;
    if (!action) return;

    if (action === 'creer') {
      const lire = (nom) => parseInt(bloc.querySelector(`[name="${nom}"]`).value, 10) || null;
      const date = { jour: lire('jour'), mois: lire('mois'), annee: lire('annee') };
      etat.conserver = bloc.querySelector('[name="conserver"]').checked;
      etat.date = date;
      const probleme = verifierSaisie(date, versJour(new Date()));
      if (probleme) {
        etat.erreur = erreurs[probleme];
      } else {
        etat.erreur = '';
        etat.mode = 'resultat';
        if (etat.conserver) ecrireStockage(date); else effacerStockage();
      }
    } else if (action === 'telecharger') {
      const { echeance } = situationRappel(etat.date, reglages.moisDelai, versJour(new Date()));
      telechargerIcs(creerIcs(echeance, reglages), reglages.evenement.nomFichier);
      return;
    } else if (action === 'modifier') {
      etat.mode = 'formulaire';
    } else if (action === 'effacer') {
      effacerStockage();
      etat = { mode: 'replie', date: null, conserver: false, erreur: '' };
    } else if (action === 'ignorer') {
      etat.mode = 'replie';
      etat.erreur = '';
    } else if (action === 'deplier') {
      etat.mode = 'formulaire';
    }
    reafficher();
  });
}
