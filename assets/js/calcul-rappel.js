/* =========================================================
   Calcul du rappel « dernière consultation » (sans affichage).
   Séparé de rappel.js pour pouvoir être testé : tests/calcul-rappel.html
   - Les dates sont des objets { jour, mois 1-12, annee } : on compare
     des jours du calendrier, jamais des heures ni des nombres de jours.
   - Mois calendaires réels : 31 août + 6 mois → dernier jour de février
     (28 ou 29), 29 février + 6 mois → 29 août.
   - Jour non renseigné → on prend le DERNIER jour du mois : le message
     « 6 mois ou plus » n'apparaît jamais trop tôt.
   ========================================================= */

/** Nombre de jours du mois (mois 1-12). Gère les années bissextiles. */
export function joursDansMois(annee, mois) {
  return new Date(annee, mois, 0).getDate();
}

/** Aujourd'hui sous forme { jour, mois, annee } (heure ignorée). */
export function versJour(date) {
  return { jour: date.getDate(), mois: date.getMonth() + 1, annee: date.getFullYear() };
}

/** Compare deux jours : négatif si a est avant b, 0 si même jour, positif sinon. */
export function comparerJours(a, b) {
  return (a.annee - b.annee) || (a.mois - b.mois) || (a.jour - b.jour);
}

/** Ajoute n mois calendaires. Si le jour n'existe pas dans le mois d'arrivée, on prend le dernier jour. */
export function ajouterMois(date, n) {
  const total = (date.mois - 1) + n;
  const annee = date.annee + Math.floor(total / 12);
  const mois = (total % 12) + 1;
  return { jour: Math.min(date.jour, joursDansMois(annee, mois)), mois, annee };
}

/**
 * Vérifie la saisie. Renvoie '' si elle est correcte, sinon :
 * 'mois' (mois ou année manquant), 'invalide' (ex. 31 avril), 'futur'.
 * Sans jour, la date n'est refusée que si le mois entier est dans le futur.
 */
export function verifierSaisie(saisie, aujourdhui) {
  if (!saisie || !saisie.mois || !saisie.annee) return 'mois';
  if (saisie.jour && saisie.jour > joursDansMois(saisie.annee, saisie.mois)) return 'invalide';
  const premierJourPossible = { jour: saisie.jour || 1, mois: saisie.mois, annee: saisie.annee };
  if (comparerJours(premierJourPossible, aujourdhui) > 0) return 'futur';
  return '';
}

/**
 * Situation du rappel à la date du jour.
 * Renvoie { echeance: { jour, mois, annee }, atteint: true/false, jourConnu }.
 * atteint = la dernière consultation date de moisDelai mois ou plus (échéance pile incluse).
 */
export function situationRappel(saisie, moisDelai, aujourdhui) {
  const jourConnu = Boolean(saisie.jour);
  const reference = { jour: saisie.jour || joursDansMois(saisie.annee, saisie.mois), mois: saisie.mois, annee: saisie.annee };
  let echeance = ajouterMois(reference, moisDelai);
  // Jour inconnu : l'échéance est la fin du mois d'arrivée (ex. avril → fin octobre, pas le 30)
  if (!jourConnu) echeance = { ...echeance, jour: joursDansMois(echeance.annee, echeance.mois) };
  return { echeance, atteint: comparerJours(aujourdhui, echeance) >= 0, jourConnu };
}
