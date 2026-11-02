/* =========================================================
   Bloc « Votre dernière consultation » (accueil, facultatif).
   - Tout est calculé dans le téléphone : rien n'est envoyé.
   - La date n'est enregistrée (localStorage) QUE si la personne
     coche « Garder cette date sur mon téléphone ».
   - Le rappel est un fichier .ics ouvert par l'agenda du téléphone.
   Réglages et textes : config/rappel.json
   ========================================================= */

import { chargerJSON, echapper } from './app.js';

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

/* ---------- Calcul de la date du prochain bilan ---------- */
/** date = { jour (facultatif), mois 1-12, annee } → même jour N mois plus tard. */
export function calculerProchainBilan(date, moisDelai) {
  const totalMois = (date.mois - 1) + moisDelai;
  const annee = date.annee + Math.floor(totalMois / 12);
  const mois = (totalMois % 12) + 1;
  // Jour inconnu → le 1er du mois ; 31 août + 6 mois → dernier jour de février
  const dernierJour = new Date(annee, mois, 0).getDate();
  const jour = date.jour ? Math.min(date.jour, dernierJour) : 1;
  return { jour, mois, annee, jourConnu: Boolean(date.jour) };
}

function dateEnClair(d) {
  const moisAnnee = `${NOMS_MOIS[d.mois - 1]} ${d.annee}`;
  if (!d.jourConnu) return `début ${moisAnnee}`;
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

/** Version compacte : une ligne de date + une ligne d'actions. */
function htmlResultat(t, bilan) {
  // Date déjà passée : un rappel d'agenda ne servirait à rien, on ne le propose pas
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const passee = new Date(bilan.annee, bilan.mois - 1, bilan.jour) < aujourdhui;
  const agenda = passee
    ? ''
    : `<button type="button" class="lien-discret" data-rappel="telecharger" title="${echapper(t.aideTelechargement)}">${echapper(t.boutonTelecharger)}</button>`;
  return `
    <p class="rappel-resultat">${echapper(t.prochainBilan)} : <strong>${echapper(dateEnClair(bilan))}</strong></p>
    ${passee ? `<p class="rappel-aide">${echapper(t.bilanPasse)}</p>` : ''}
    <div class="rappel-actions">
      ${agenda}
      <button type="button" class="lien-discret" data-rappel="modifier">${echapper(t.boutonModifier)}</button>
      <button type="button" class="lien-discret" data-rappel="effacer">${echapper(t.boutonEffacer)}</button>
    </div>`;
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
  const reglages = await chargerJSON('config/rappel.json');
  if (!etatInitialise) {
    etatInitialise = true;
    const enregistree = lireStockage();
    if (enregistree) etat = { mode: 'resultat', date: enregistree, conserver: true, erreur: '' };
  }
  return `<section class="carte rappel" id="bloc-rappel" aria-live="polite">${contenuBloc(reglages)}</section>`;
}

function contenuBloc(reglages) {
  const t = reglages.textes;
  if (etat.mode === 'replie') return htmlReplie(t);
  if (etat.mode === 'resultat') {
    return htmlResultat(t, calculerProchainBilan(etat.date, reglages.moisDelai));
  }
  return htmlFormulaire(t, etat.date);
}

/** Branche les boutons du bloc (appelé après l'affichage de l'accueil). */
export async function activerRappel(zone) {
  const bloc = zone.querySelector('#bloc-rappel');
  if (!bloc) return;
  const reglages = await chargerJSON('config/rappel.json');
  const t = reglages.textes;
  const reafficher = () => { bloc.innerHTML = contenuBloc(reglages); };

  bloc.addEventListener('click', (evenement) => {
    const action = evenement.target.closest('[data-rappel]')?.dataset.rappel;
    if (!action) return;

    if (action === 'creer') {
      const lire = (nom) => parseInt(bloc.querySelector(`[name="${nom}"]`).value, 10) || null;
      const date = { jour: lire('jour'), mois: lire('mois'), annee: lire('annee') };
      etat.conserver = bloc.querySelector('[name="conserver"]').checked;
      etat.date = date;
      if (!date.mois || !date.annee) {
        etat.erreur = t.erreurMois;
      } else if (new Date(date.annee, date.mois - 1, date.jour || 1) > new Date()) {
        etat.erreur = t.erreurFutur;
      } else {
        etat.erreur = '';
        etat.mode = 'resultat';
        if (etat.conserver) ecrireStockage(date); else effacerStockage();
      }
    } else if (action === 'telecharger') {
      const bilan = calculerProchainBilan(etat.date, reglages.moisDelai);
      telechargerIcs(creerIcs(bilan, reglages), reglages.evenement.nomFichier);
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
