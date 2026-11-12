/* =========================================================
   Écran « Mon carnet » : accès rapide, depuis la barre du bas,
   aux listes de courses des semaines enregistrées et aux
   recettes favorites. Tout reste sur ce téléphone.
   #carnet → listes de courses ; #carnet/favoris → recettes favorites
   ========================================================= */

import { bandeau, chargerJSON, echapper, estVisible } from '../app.js';
import {
  carnetDisponible, lireSemaines, dateLongue, texteCourses, versNotes,
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

function onglets(actif, tc) {
  const onglet = (cle, adresse, libelle) =>
    `<a href="#${adresse}" class="onglet-diet" ${actif === cle ? 'aria-current="page"' : ''}>${echapper(libelle)}</a>`;
  return `
    <nav class="onglets-diet" aria-label="Rubriques du carnet">
      ${onglet('courses', 'carnet', tc.ongletCourses)}
      ${onglet('favoris', 'carnet/favoris', tc.ongletFavoris)}
    </nav>`;
}

function htmlListe(s, t, tc, coches, ouverte) {
  const faits = new Set(coches[s.id] || []);
  const caseACocher = (nom, quantite) => `
    <li><label class="carnet-case">
      <input type="checkbox" data-coche="${echapper(nom)}" ${faits.has(nom) ? 'checked' : ''}>
      <span class="carnet-nom">${echapper(nom)}</span>${quantite ? `<span class="carnet-quantite">${echapper(quantite)}</span>` : ''}
    </label></li>`;
  const groupes = s.courses.lignes.map((g) => `
    <h4 class="surtitre sous-groupe">${echapper(g.titre)}</h4>
    <ul class="carnet-courses">${g.elements.map((e) => caseACocher(e.nom, e.quantite)).join('')}</ul>`).join('');
  const autres = s.courses.autres.length ? `
    <h4 class="surtitre sous-groupe">${echapper(t.autresIngredients)}</h4>
    <ul class="carnet-courses">${s.courses.autres.map((a) => {
      const [nom, quantite] = a.split(' : ');
      return caseACocher(nom, quantite);
    }).join('')}</ul>` : '';
  const personnes = `${s.personnes} ${s.personnes > 1 ? 'personnes' : 'personne'}`;
  return `
    <details class="carnet-semaine" data-semaine="${echapper(s.id)}" ${ouverte ? 'open' : ''}>
      <summary><span>${echapper(tc.semaineDu.replace('{date}', dateLongue(s.date)))}</span> <small>${echapper(personnes)}</small></summary>
      ${groupes}${autres}
      <div class="carnet-actions">
        <button type="button" class="bouton bouton-contour" data-decocher>${echapper(tc.toutDecocher)}</button>
        <button type="button" class="bouton bouton-contour" data-notes>${echapper(tc.envoyerNotes)}</button>
      </div>
      <button type="button" class="bouton bouton-secondaire" data-voir-semaine>${echapper(tc.ouvrirMenu)}</button>
    </details>`;
}

export async function afficherCarnet(parametre) {
  const menu = await chargerJSON('data/menu-semaine.json');
  const tc = menu.textesCarnet;
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

  // Oublie les cases des semaines supprimées
  const coches = lireCoches();
  const ids = new Set(lireSemaines().map((s) => s.id));
  Object.keys(coches).forEach((id) => { if (!ids.has(id)) delete coches[id]; });
  ecrireCoches(coches);

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
