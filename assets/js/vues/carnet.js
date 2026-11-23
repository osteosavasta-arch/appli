/* =========================================================
   Écran « Mon carnet » : accès rapide, depuis la barre du bas,
   aux listes de courses des semaines enregistrées et aux
   recettes favorites. Tout reste sur ce téléphone.
   #carnet → listes de courses ; #carnet/favoris → recettes favorites
   ========================================================= */

import { bandeau, chargerJSON, echapper, estVisible } from '../app.js';
import {
  carnetDisponible, lireSemaines, ecrireSemaines, dateLongue, texteCourses, versNotes,
  lireFavoris, ecrireFavoris, htmlRecette, demanderOuvertureSemaine,
} from './menu.js';

// Cases cochées : { idSemaine: [noms cochés] }
const CLE_COCHES = 'osteo-savasta-coches';

function lireCoches() {
  try {
    const coches = JSON.parse(localStorage.getItem(CLE_COCHES));
    return coches && typeof coches === 'object' ? coches : {};
  } catch (e) { return {}; }
}
function ecrireCoches(coches) {
  try { localStorage.setItem(CLE_COCHES, JSON.stringify(coches)); } catch (e) { /* cases non gardées */ }
}

const ENTETE = { surtitre: 'Votre alimentation' };

// Quantités modifiables (v26.1) : seulement une fois les textes de textesModes validés
const textesCarnet = (menu) => (estVisible(menu.textesModes)
  ? { ...menu.textesCarnet, aideQuantites: menu.textesModes.aideQuantites, quantiteDe: menu.textesModes.quantiteDe }
  : menu.textesCarnet);

function onglets(actif, tc) {
  const onglet = (cle, adresse, libelle) =>
    `<a href="#${adresse}" class="onglet-diet" ${actif === cle ? 'aria-current="page"' : ''}>${echapper(libelle)}</a>`;
  return `
    <nav class="onglets-diet" aria-label="Rubriques du carnet">
      ${onglet('courses', 'carnet', tc.ongletCourses)}
      ${onglet('favoris', 'carnet/favoris', tc.ongletFavoris)}
    </nav>`;
}

// « 1,7 kg » → { nombre: '1,7', unite: 'kg' } ; null si la quantité ne commence pas par un nombre
function decouper(quantite) {
  const m = /^(\d+(?:[.,]\d+)?)\s*(.*)$/.exec(String(quantite || '').trim());
  return m ? { nombre: m[1], unite: m[2] } : null;
}

// Unités proposées dans la liste de courses ; g ↔ kg et cl ↔ l se convertissent tout seuls
const UNITES = ['g', 'kg', 'cl', 'l', 'unités'];
const CONVERSIONS = { 'g>kg': 0.001, 'kg>g': 1000, 'cl>l': 0.01, 'l>cl': 100 };
const nombreFr = (n) => String(Math.round(n * 1000) / 1000).replace('.', ',');

function choixUnite(ligne, unite) {
  const liste = UNITES.includes(unite) || !unite ? UNITES : [unite, ...UNITES];
  return `<select class="carnet-unite" data-ligne-unite="${ligne}" aria-label="Unité">
    ${liste.map((u) => `<option value="${echapper(u)}" ${u === (unite || 'unités') ? 'selected' : ''}>${echapper(u)}</option>`).join('')}
  </select>`;
}

function htmlListe(s, t, tc, coches, ouverte) {
  const faits = new Set(coches[s.id] || []);
  // Quantité modifiable : un champ pour le nombre, l'unité à côté
  const caseACocher = (ligne, nom, quantite) => {
    const q = decouper(quantite);
    const champ = q && tc.aideQuantites
      ? `<span class="carnet-quantite"><input type="text" inputmode="decimal" class="carnet-champ" data-ligne="${ligne}"
           value="${echapper(q.nombre)}" aria-label="${echapper(`${tc.quantiteDe || 'Quantité :'} ${nom}`)}">${choixUnite(ligne, q.unite)}</span>`
      : (quantite ? `<span class="carnet-quantite">${echapper(quantite)}</span>` : '');
    return `
    <li class="carnet-ligne"><label class="carnet-case">
      <input type="checkbox" data-coche="${echapper(nom)}" ${faits.has(nom) ? 'checked' : ''}>
      <span class="carnet-nom">${echapper(nom)}</span>
    </label>${champ}</li>`;
  };
  const groupes = s.courses.lignes.map((g, gi) => `
    <h4 class="surtitre sous-groupe">${echapper(g.titre)}</h4>
    <ul class="carnet-courses">${g.elements.map((e, ei) => caseACocher(`g${gi}-${ei}`, e.nom, e.quantite)).join('')}</ul>`).join('');
  const autres = s.courses.autres.length ? `
    <h4 class="surtitre sous-groupe">${echapper(t.autresIngredients)}</h4>
    <ul class="carnet-courses">${s.courses.autres.map((a, ai) => {
      const [nom, quantite] = a.split(' : ');
      return caseACocher(`a${ai}`, nom, quantite);
    }).join('')}</ul>` : '';
  const personnes = `${s.personnes} ${s.personnes > 1 ? 'personnes' : 'personne'}`;
  return `
    <details class="carnet-semaine" data-semaine="${echapper(s.id)}" ${ouverte ? 'open' : ''}>
      <summary><span>${echapper(s.mode === 'liste' ? `Liste du ${dateLongue(s.date)}` : tc.semaineDu.replace('{date}', dateLongue(s.date)))}</span> <small>${echapper(personnes)}</small></summary>
      ${tc.aideQuantites ? `<p class="menu-aide">${echapper(tc.aideQuantites)}</p>` : ''}
      ${groupes}${autres}
      <div class="carnet-actions">
        <button type="button" class="bouton bouton-contour" data-decocher>${echapper(tc.toutDecocher)}</button>
        <button type="button" class="bouton bouton-contour" data-notes>${echapper(tc.envoyerNotes)}</button>
      </div>
      <button type="button" class="bouton bouton-secondaire" data-voir-semaine>${echapper(s.mode === 'liste' ? 'Modifier cette liste' : tc.ouvrirMenu)}</button>
      <button type="button" class="bouton bouton-contour carnet-supprimer" data-supprimer-liste>${s.mode === 'liste' ? 'Supprimer cette liste' : 'Supprimer ce menu et sa liste'}</button>
    </details>`;
}

export async function afficherCarnet(parametre) {
  const menu = await chargerJSON('data/menu-semaine.json');
  const tc = textesCarnet(menu);
  if (!(await carnetDisponible())) {
    return `${bandeau({ ...ENTETE, titre: 'Mon carnet' })}<p class="vide">Bientôt disponible.</p>`;
  }
  const actif = parametre === 'favoris' ? 'favoris' : 'courses';
  let corps;
  if (actif === 'courses') {
    const semaines = lireSemaines();
    const coches = lireCoches();
    corps = semaines.length
      ? semaines.map((s, i) => htmlListe(s, menu.textes, tc, coches, i === 0)).join('')
      : `<p class="vide">${echapper(tc.aucuneListe)}</p><a class="bouton bouton-secondaire" href="#menu">${echapper(tc.creerMenu)}</a>`;
  } else {
    const favoris = lireFavoris();
    corps = favoris.length
      ? favoris.map((rc) => htmlRecette(rc, menu.textesRecettes, {
        boutonFavori: `<button type="button" class="bouton bouton-contour recette-favori" data-retirer="${echapper(rc.id)}">${echapper(tc.retirerFavori)}</button>`,
      })).join('')
      : `<p class="vide">${echapper(tc.aucunFavori)}</p><a class="bouton bouton-secondaire" href="#menu">${echapper(tc.creerMenu)}</a>`;
  }
  return `<div class="carnet-ecran" data-onglet="${actif}">
    ${bandeau({ ...ENTETE, titre: tc.titre })}
    <p>${echapper(tc.intro)}</p>
    ${onglets(actif, tc)}
    ${corps}
    <p class="menu-copie" id="menu-copie" role="status" hidden>${echapper(menu.textes.copie)}</p>
    <textarea class="menu-texte" id="menu-texte" readonly hidden aria-label="Texte à copier"></textarea>
  </div>`;
}

export async function activerCarnet(contenu) {
  const zone = contenu.querySelector('.carnet-ecran');
  if (!zone) return;
  const menu = await chargerJSON('data/menu-semaine.json');
  const tc = menu.textesCarnet;
  if (!estVisible(tc)) return;

  // Unité de départ de chaque liste déroulante (pour convertir au changement)
  zone.querySelectorAll('[data-ligne-unite]').forEach((c) => { c.dataset.avant = c.value; });

  // Oublie les cases des semaines supprimées
  const coches = lireCoches();
  const ids = new Set(lireSemaines().map((s) => s.id));
  Object.keys(coches).forEach((id) => { if (!ids.has(id)) delete coches[id]; });
  ecrireCoches(coches);

  // Quantité modifiée : enregistrée dans la semaine (liste, notes et menu la reprennent)
  zone.addEventListener('change', (evenement) => {
    const choix = evenement.target.closest('[data-ligne-unite]');
    const champ = choix ? choix.previousElementSibling : evenement.target.closest('[data-ligne]');
    if (!champ) return;
    if (choix) {
      // Conversion automatique g ↔ kg, cl ↔ l ; sinon le nombre reste le même
      const facteur = CONVERSIONS[`${choix.dataset.avant || ''}>${choix.value}`];
      const valeur = Number(champ.value.replace(',', '.'));
      if (facteur && Number.isFinite(valeur)) champ.value = nombreFr(valeur * facteur);
      choix.dataset.avant = choix.value;
    }
    const id = champ.closest('[data-semaine]').dataset.semaine;
    const semaines = lireSemaines();
    const s = semaines.find((x) => x.id === id);
    if (!s) return;
    const ligne = champ.dataset.ligne;
    const unite = champ.nextElementSibling.value;
    const valeur = champ.value.trim().replace('.', ',');
    const ancienne = ligne.startsWith('a')
      ? s.courses.autres[Number(ligne.slice(1))].split(' : ')[1]
      : (() => { const [gi, ei] = ligne.slice(1).split('-').map(Number); return s.courses.lignes[gi].elements[ei].quantite; })();
    if (!/^\d+(,\d+)?$/.test(valeur)) { champ.value = decouper(ancienne)?.nombre || ''; return; }
    const quantite = `${valeur}${unite ? ` ${unite}` : ''}`;
    if (ligne.startsWith('a')) {
      const ai = Number(ligne.slice(1));
      s.courses.autres[ai] = `${s.courses.autres[ai].split(' : ')[0]} : ${quantite}`;
    } else {
      const [gi, ei] = ligne.slice(1).split('-').map(Number);
      s.courses.lignes[gi].elements[ei].quantite = quantite;
    }
    champ.value = valeur;
    ecrireSemaines(semaines);
  });

  zone.addEventListener('change', (evenement) => {
    const caseCochee = evenement.target.closest('[data-coche]');
    if (!caseCochee) return;
    const id = caseCochee.closest('[data-semaine]').dataset.semaine;
    const c = lireCoches();
    const faits = new Set(c[id] || []);
    if (caseCochee.checked) faits.add(caseCochee.dataset.coche); else faits.delete(caseCochee.dataset.coche);
    c[id] = [...faits];
    ecrireCoches(c);
  });

  zone.addEventListener('click', (evenement) => {
    const semaine = evenement.target.closest('[data-semaine]');
    if (semaine && evenement.target.closest('[data-decocher]')) {
      semaine.querySelectorAll('[data-coche]').forEach((c) => { c.checked = false; });
      const c = lireCoches();
      delete c[semaine.dataset.semaine];
      ecrireCoches(c);
      return;
    }
    if (semaine && evenement.target.closest('[data-notes]')) {
      const s = lireSemaines().find((x) => x.id === semaine.dataset.semaine);
      if (s) versNotes(zone, menu.textes.titreCourses, texteCourses(menu.textes, s.courses, s.personnes), menu.textes);
      return;
    }
    // Suppression en deux temps : le bouton demande une confirmation
    const supprimer = evenement.target.closest('[data-supprimer-liste]');
    if (semaine && supprimer) {
      if (supprimer.dataset.confirme !== 'oui') {
        supprimer.dataset.confirme = 'oui';
        supprimer.textContent = 'Confirmer la suppression';
        return;
      }
      const id = semaine.dataset.semaine;
      ecrireSemaines(lireSemaines().filter((s) => s.id !== id));
      const c = lireCoches();
      delete c[id];
      ecrireCoches(c);
      const message = document.createElement('p');
      message.className = 'menu-copie';
      message.setAttribute('role', 'status');
      message.textContent = lireSemaines().length ? 'Supprimé de votre carnet.' : `Supprimé de votre carnet. ${tc.aucuneListe}`;
      semaine.replaceWith(message);
      return;
    }
    if (semaine && evenement.target.closest('[data-voir-semaine]')) {
      demanderOuvertureSemaine(semaine.dataset.semaine);
      location.hash = '#menu';
      return;
    }
    // Retrait d'un favori en deux temps : le bouton demande une confirmation
    const retirer = evenement.target.closest('[data-retirer]');
    if (retirer) {
      if (retirer.dataset.confirme !== 'oui') {
        retirer.dataset.confirme = 'oui';
        retirer.textContent = tc.confirmerRetrait;
        return;
      }
      ecrireFavoris(lireFavoris().filter((f) => f.id !== retirer.dataset.retirer));
      const recette = retirer.closest('details');
      const message = document.createElement('p');
      message.className = 'menu-copie';
      message.setAttribute('role', 'status');
      message.textContent = tc.retire;
      recette.replaceWith(message);
    }
  });
}
