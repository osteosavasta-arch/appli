/* Menu de la semaine (#menu).
   Le patient choisit le nombre de personnes, 6 légumes, 2 fruits et 2 protéines ;
   une toile d'araignée montre la part des apports de référence (AJR) couverte sur la semaine.
   L'appli propose ensuite 6 recettes (au moins 2 aliments choisis chacune), les répartit
   sur les 14 repas et prépare la liste de courses, à envoyer dans les notes du téléphone.
   Tout est calculé dans le téléphone : rien n'est envoyé ni enregistré.
   Réglages, textes et recettes : data/menu-semaine.json (rien ne s'affiche sans "validee"). */

import { chargerJSON, estVisible, echapper, bandeau } from '../app.js';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
// Ordre des 14 repas (midi, soir) : chaque recette sert 2 ou 3 fois, jamais deux fois le même jour
const REPARTITION = [0, 1, 0, 2, 1, 3, 2, 4, 3, 5, 4, 0, 5, 1];
// « laitier » et « matiere » : groupes facultatifs (aucun minimum), titre et aide dans les textes
const GROUPES = [
  { cle: 'légume', titre: 'Légumes', types: ['légume'] },
  { cle: 'fruit', titre: 'Fruits', types: ['fruit'] },
  { cle: 'proteine', titre: 'Viandes, poissons, œufs', types: ['viande', 'poisson', 'œuf'] },
  { cle: 'laitier', titre: 'Produits laitiers', types: ['produit laitier'], texteTitre: 'titreLaitiers', texteAide: 'aideLaitiers' },
  { cle: 'matiere', titre: 'Matières grasses', types: ['matière grasse'], texteTitre: 'titreMatieres', texteAide: 'aideMatieres' },
];
const minimum = (reglages, groupe) => reglages.aChoisir[groupe] || 0;

// aleatoires : aliments ajoutés par « Sélection aléatoire » (remplacés au clic suivant)
let etat = { personnes: 2, choisis: new Set(), aleatoires: new Set(), derniereAleatoire: '', resultat: null };
let valeursAffichees = null; // pour l'animation de la toile
let complementsCiqual = {}; // vitamine E et oméga-3 des fiches, servent seulement à la toile

/* ---------- Données ---------- */
async function chargerDonnees() {
  const [menu, aliments] = await Promise.all([
    chargerJSON('data/menu-semaine.json'),
    chargerJSON('data/fruits-legumes.json'),
  ]);
  complementsCiqual = menu.apportsComplementaires?.valeurs || {};
  const moisCourant = new Date().getMonth() + 1;
  // Fruits et légumes de saison ce mois-ci, viandes, poissons et œufs toute l'année
  const proposes = aliments.produits
    .filter((f) => estVisible(f) && (f.toutLAnnee || f.moisSaison.includes(moisCourant)))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  // Produits laitiers et matières grasses au choix, seulement si leur liste est validée
  const enPlus = (bloc, type) => (estVisible(bloc) ? bloc.aliments.map((m) => ({ ...m, type, categorie: type })) : []);
  const laitiers = enPlus(menu.produitsLaitiers, 'produit laitier');
  const gras = enPlus(menu.matieresGrasses, 'matière grasse');
  return { menu, proposes: proposes.concat(laitiers, gras), recettes: menu.recettes.filter(estVisible) };
}

/** Le menu ne s'ouvre que si ses réglages, ses textes et au moins 6 recettes sont validés. */
export async function menuDisponible() {
  const menu = await chargerJSON('data/menu-semaine.json');
  return estVisible(menu.reglages) && estVisible(menu.textes) && estVisible(menu.textesRecettes)
    && menu.recettes.filter(estVisible).length >= 6;
}

/** « Mon carnet » : seulement si le menu est disponible et que ses textes sont validés. */
export async function carnetDisponible() {
  const menu = await chargerJSON('data/menu-semaine.json');
  return (await menuDisponible()) && estVisible(menu.textesCarnet);
}

// Semaine à ouvrir à l'arrivée sur le menu (depuis « Mon carnet »)
let semaineDemandee = null;
export function demanderOuvertureSemaine(id) { semaineDemandee = id; }

const groupeDe = (f) => GROUPES.find((g) => g.types.includes(f.type)).cle;

// Valeur Ciqual « 2,7 » → 2.7 ; « < 0,5 », « traces », « - » ou vide → 0.
// Vitamine E et oméga-3 des fiches : repris de data/menu-semaine.json (apportsComplementaires).
function quantite(f, cle) {
  const brut = f.nutritionPour100g?.[cle]?.valeur || complementsCiqual[f.id]?.[cle] || '';
  const texte = String(brut).trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(texte) ? Number(texte) : 0;
}

/** Nombre d'aliments choisis dans chaque groupe. */
const comptes = (choisis) => Object.fromEntries(GROUPES.map((g) => [g.cle, choisis.filter((f) => groupeDe(f) === g.cle).length]));

/** Grammes par personne pour la semaine, pour cet aliment :
    - une portion propre à sa catégorie (fruits à coque, par exemple) ;
    - sinon la portion de l'aliment (produits laitiers) ou de son groupe, partagée entre les aliments
      choisis du groupe (au moins le minimum du groupe, pour que la toile grandisse pendant le choix). */
function grammesSemaine(reglages, f, nombres) {
  const groupe = groupeDe(f);
  const partage = Math.max(nombres[groupe] || 1, minimum(reglages, groupe), 1);
  const parRepas = reglages.portionsParCategorie?.[f.categorie]
    ?? (f.portionParRepas ?? reglages.portionsParRepas[groupe]) / partage;
  return parRepas * reglages.repasParSemaine;
}

/** Part des AJR couverte (0 à 1, et plus) pour chaque axe de la toile. */
function couvertures(reglages, choisis) {
  const nombres = comptes(choisis);
  return reglages.toile.map((axe) => {
    const apport = choisis.reduce((total, f) => total + (grammesSemaine(reglages, f, nombres) / 100) * quantite(f, axe.cle), 0);
    return apport / (axe.reference * 7);
  });
}

/* ---------- Toile d'araignée ---------- */
const TAILLE = 320;
const CENTRE = TAILLE / 2;
const RAYON = 96;

function point(i, n, valeur) {
  const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
  return [CENTRE + Math.cos(angle) * RAYON * valeur, CENTRE + Math.sin(angle) * RAYON * valeur];
}

/** Score global : moyenne des repères, chacun compté au plus à 100 %. */
const scoreGlobal = (valeurs) => valeurs.reduce((s, v) => s + Math.min(v, 1), 0) / valeurs.length;
// Trois niveaux de couleur pour lire la toile d'un coup d'œil
const niveau = (score, seuil) => (score >= seuil ? 'bon' : score >= seuil - 0.25 ? 'moyen' : 'faible');
const pourcent = (v) => `${Math.round(v * 100)} %`;

function htmlToile(reglages) {
  const n = reglages.toile.length;
  // Deux repères seulement : le seuil (75 %) en pointillés et le plein (100 %)
  const anneau = (r, classe) =>
    `<polygon class="${classe}" points="${reglages.toile.map((_, i) => point(i, n, r).join(',')).join(' ')}"></polygon>`;
  const rayons = reglages.toile.map((_, i) => {
    const [x, y] = point(i, n, 1);
    return `<line class="toile-rayon" x1="${CENTRE}" y1="${CENTRE}" x2="${x}" y2="${y}"></line>`;
  }).join('');
  const libelles = reglages.toile.map((axe, i) => {
    const [x, y] = point(i, n, 1.2);
    const ancre = Math.abs(x - CENTRE) < 4 ? 'middle' : x > CENTRE ? 'start' : 'end';
    return `<text class="toile-libelle" x="${x}" y="${y}" dy="0.35em" text-anchor="${ancre}">${echapper(axe.libelle)}</text>`;
  }).join('');
  const centre = reglages.toile.map(() => `${CENTRE},${CENTRE}`).join(' ');
  return `
    <svg class="toile" viewBox="-50 0 ${TAILLE + 100} ${TAILLE}" aria-hidden="true" focusable="false">
      ${anneau(1, 'toile-anneau')}${anneau(reglages.seuil, 'toile-seuil')}${rayons}
      <polygon class="toile-surface" points="${centre}"></polygon>
      ${libelles}
    </svg>
    <p class="menu-score" data-niveau="faible"><span class="menu-score-pastille"></span><span id="menu-score-texte"></span></p>
    <p class="visuellement-cache" id="menu-toile-detail" aria-live="polite"></p>`;
}

/** Mini-toile collée en haut à droite, visible quand la grande toile sort de l'écran. */
function htmlMiniToile(reglages, t) {
  const n = reglages.toile.length;
  const anneau = (r, classe) =>
    `<polygon class="${classe}" points="${reglages.toile.map((_, i) => point(i, n, r).join(',')).join(' ')}"></polygon>`;
  return `
    <button type="button" class="toile-mini" data-voir-toile hidden aria-label="${echapper(t.voirToile)}">
      <svg viewBox="${CENTRE - RAYON - 4} ${CENTRE - RAYON - 4} ${RAYON * 2 + 8} ${RAYON * 2 + 8}" aria-hidden="true" focusable="false">
        ${anneau(1, 'toile-anneau')}${anneau(reglages.seuil, 'toile-seuil')}
        <polygon class="toile-surface" points="${reglages.toile.map(() => `${CENTRE},${CENTRE}`).join(' ')}"></polygon>
      </svg>
      <span class="toile-mini-score" id="menu-mini-score"></span>
    </button>`;
}

/** Met à jour la toile (grande et mini), le score et sa couleur, avec un petit déploiement animé. */
function dessinerToile(zone, reglages, valeurs, t) {
  const surfaces = zone.querySelectorAll('.toile-surface');
  if (!surfaces.length) return;
  const n = valeurs.length;
  const score = scoreGlobal(valeurs);
  const niveauScore = niveau(score, reglages.seuil);
  zone.querySelector('.menu-score').dataset.niveau = niveauScore;
  surfaces.forEach((s) => { s.dataset.niveau = niveauScore; });
  zone.querySelector('#menu-score-texte').textContent = `${t.score} ${pourcent(score)}`;
  zone.querySelector('#menu-mini-score').textContent = pourcent(score);
  zone.querySelector('#menu-toile-detail').textContent =
    reglages.toile.map((axe, i) => `${axe.libelle} ${pourcent(Math.min(valeurs[i], 1))}`).join(', ');
  const cibles = valeurs.map((v) => Math.min(v, 1));
  const depart = valeursAffichees && valeursAffichees.length === n ? valeursAffichees : cibles.map(() => 0);
  const tracer = (vals) => {
    const points = vals.map((v, i) => point(i, n, v).join(',')).join(' ');
    surfaces.forEach((s) => s.setAttribute('points', points));
  };
  valeursAffichees = cibles;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { tracer(cibles); return; }
  const debut = performance.now();
  const duree = 450;
  const etape = (maintenant) => {
    const t = Math.min(1, (maintenant - debut) / duree);
    const lisse = 1 - (1 - t) ** 3;
    tracer(depart.map((d, i) => d + (cibles[i] - d) * lisse));
    if (t < 1) requestAnimationFrame(etape);
  };
  requestAnimationFrame(etape);
}

/* ---------- Choix des recettes ---------- */
const nomCourt = (f) => f.nom.replace(/\s*\(.*?\)\s*/g, '').trim().replace(/^./, (c) => c.toLowerCase());

function accepte(emplacement, f, crudites) {
  if (emplacement.types && !emplacement.types.includes(f.type)) {
    // Une crudité de la liste reste acceptée pour un emplacement « crudités »
    if (!(emplacement.listeCrudites && crudites.includes(f.id))) return false;
  }
  if (emplacement.categories && !emplacement.categories.includes(f.categorie)) return false;
  if (emplacement.exclureCategories && emplacement.exclureCategories.includes(f.categorie)) return false;
  const dansListe = emplacement.listeCrudites && crudites.includes(f.id);
  const dansIds = emplacement.ids && emplacement.ids.includes(f.id);
  if (emplacement.listeCrudites || emplacement.ids) return Boolean(dansListe || dansIds);
  return true;
}

/** Remplit une recette avec les aliments les moins utilisés ; à égalité, ceux qui entrent
    dans le moins de recettes (la mâche n'a que la salade). null si impossible. */
function remplir(recette, choisis, usage, crudites, souplesse) {
  const pris = {};
  for (const emplacement of recette.aliments) {
    const candidats = choisis
      .filter((f) => accepte(emplacement, f, crudites) && !Object.values(pris).includes(f))
      .sort((a, b) => usage.get(a.id) - usage.get(b.id) || souplesse.get(a.id) - souplesse.get(b.id));
    if (!candidats.length) return null;
    pris[emplacement.cle] = candidats[0];
  }
  return pris;
}

/** 6 recettes différentes si possible, en utilisant chaque aliment choisi au moins une fois. */
function choisirRecettes(recettes, choisis, crudites) {
  const usage = new Map(choisis.map((f) => [f.id, 0]));
  const souplesse = new Map(choisis.map((f) => [f.id,
    recettes.filter((rc) => rc.aliments.some((e) => accepte(e, f, crudites))).length]));
  const retenues = [];
  const dejaPrises = new Set();
  for (let r = 0; r < 6; r += 1) {
    let meilleure = null;
    for (const recette of recettes) {
      const pris = remplir(recette, choisis, usage, crudites, souplesse);
      if (!pris) continue;
      const nouveaux = Object.values(pris).filter((f) => usage.get(f.id) === 0).length;
      const score = nouveaux * 10 + (dejaPrises.has(recette.id) ? -100 : 0) - Object.values(pris).reduce((s, f) => s + usage.get(f.id), 0);
      if (!meilleure || score > meilleure.score) meilleure = { recette, pris, score };
    }
    if (!meilleure) break;
    dejaPrises.add(meilleure.recette.id);
    Object.values(meilleure.pris).forEach((f) => usage.set(f.id, usage.get(f.id) + 1));
    retenues.push(meilleure);
  }
  return retenues.map(({ recette, pris }) => recetteRemplie(recette, pris));
}

function remplacer(texte, pris) {
  return texte
    .replace(/\{(\w+)\}/g, (_, cle) => (pris[cle] ? nomCourt(pris[cle]) : ''))
    // « de endive » → « d'endive »
    .replace(/(^|\s)([dD])e ([aeiouyéèêâàœh])/gi, "$1$2'$3")
    .replace(/^./, (c) => c.toUpperCase());
}

function recetteRemplie(recette, pris) {
  return {
    titre: remplacer(recette.titre, pris),
    tempsPreparation: recette.tempsPreparation || '',
    tempsCuisson: recette.tempsCuisson || '',
    ustensiles: recette.ustensiles || [],
    aliments: Object.values(pris),
    // Anciennes recettes : « autres » était une simple liste de noms
    autres: (recette.autres || []).map((a) => (typeof a === 'string' ? { nom: a } : a)),
    etapes: recette.etapes.map((e) => remplacer(e, pris)),
  };
}

/* ---------- Quantités des recettes ----------
   Chaque recette sert 2 ou 3 repas (REPARTITION). La quantité d'un aliment choisi dans une recette
   est sa quantité de la semaine (la même que la liste de courses), répartie entre les repas des
   recettes qui l'utilisent : la somme des recettes retombe sur la liste de courses. */
const REPAS_PAR_RECETTE = REPARTITION.reduce((nombres, i) => { nombres[i] = (nombres[i] || 0) + 1; return nombres; }, []);
const nombreFr = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
const arrondir = (n, pas) => Math.max(pas, Math.round(n / pas) * pas);

function quantiteAliment(reglages, f, grammes) {
  if (f.type === 'œuf') return `${Math.max(1, Math.round(grammes / reglages.poidsOeuf))} œufs`;
  const g = arrondir(grammes, 10);
  return g >= 1000 ? `${nombreFr(Math.round(g / 100) / 10)} kg` : `${g} g`;
}

function mesure(quantite, unite) {
  if (unite === 'cl') {
    const cl = arrondir(quantite, 1);
    return cl >= 100 ? `${nombreFr(Math.round(cl / 10) / 10)} l` : `${cl} cl`;
  }
  if (unite === 'g') return `${arrondir(quantite, 5)} g`;
  const q = arrondir(quantite, 0.5);
  const pluriel = q > 1 && unite === 'citron' ? 'citrons' : unite;
  return `${nombreFr(q)} ${pluriel}`;
}

const majuscule = (texte) => texte.replace(/^./, (c) => c.toUpperCase());

function detaillerRecettes(reglages, recettes, choisis, personnes) {
  const nombres = comptes(choisis);
  const repasUtilisant = new Map();
  recettes.forEach((rc, i) => rc.aliments.forEach((f) => {
    repasUtilisant.set(f.id, (repasUtilisant.get(f.id) || 0) + REPAS_PAR_RECETTE[i]);
  }));
  return recettes.map((rc, i) => {
    const repas = REPAS_PAR_RECETTE[i];
    const ingredients = rc.aliments.map((f) => {
      const grammes = (grammesSemaine(reglages, f, nombres) * personnes * repas) / repasUtilisant.get(f.id);
      return `${majuscule(nomCourt(f))} : ${quantiteAliment(reglages, f, grammes)}`;
    }).concat(rc.autres.map((a) => (a.quantite
      ? `${a.nom} : ${mesure(a.quantite * personnes * repas, a.unite)}`
      : `${a.nom}${a.texte ? ` (${a.texte})` : ''}`)));
    return { ...rc, repas, personnes, ingredients };
  });
}

const tempsTotal = (rc) => (rc.tempsPreparation
  ? [rc.tempsPreparation, rc.tempsCuisson].filter(Boolean).join(' + ')
  : rc.temps || '');

/** Une recette détaillée, repliée ; partagée avec l'écran « Mon carnet ». */
export function htmlRecette(rc, tr, options = {}) {
  const { numero, boutonFavori = '' } = options;
  const ingredients = rc.ingredients
    || rc.aliments.map((f) => nomCourt(f)).concat(rc.autres.map((a) => (typeof a === 'string' ? a : a.nom)));
  const pour = rc.personnes && rc.repas
    ? tr.pour.replace('{personnes}', `${rc.personnes} ${rc.personnes > 1 ? 'personnes' : 'personne'}`).replace('{repas}', rc.repas)
    : '';
  return `
    <details class="recette recette-detaillee">
      <summary><span>${numero ? `${numero}. ` : ''}${echapper(rc.titre)}</span> <small>${echapper(tempsTotal(rc))}</small></summary>
      ${pour ? `<p class="recette-pour">${echapper(pour)}</p>` : ''}
      ${rc.tempsPreparation ? `<dl class="recette-temps">
        <div><dt>${echapper(tr.preparation)}</dt><dd>${echapper(rc.tempsPreparation)}</dd></div>
        <div><dt>${echapper(tr.cuisson)}</dt><dd>${echapper(rc.tempsCuisson || tr.sansCuisson)}</dd></div>
      </dl>` : ''}
      <h4>${echapper(tr.ingredients)}</h4>
      <ul>${ingredients.map((i) => `<li>${echapper(i)}</li>`).join('')}</ul>
      ${(rc.ustensiles || []).length ? `<h4>${echapper(tr.ustensiles)}</h4><p>${rc.ustensiles.map(echapper).join(', ')}.</p>` : ''}
      <h4>${echapper(tr.etapes)}</h4>
      <ol>${rc.etapes.map((e) => `<li>${echapper(e)}</li>`).join('')}</ol>
      ${boutonFavori}
    </details>`;
}

/* ---------- Recettes favorites (seulement sur ce téléphone) ---------- */
const CLE_FAVORIS = 'osteo-savasta-favoris';
const idRecette = (titre) => titre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');

export function lireFavoris() {
  try {
    const liste = JSON.parse(localStorage.getItem(CLE_FAVORIS));
    return Array.isArray(liste) ? liste : [];
  } catch (e) { return []; }
}
export function ecrireFavoris(liste) {
  try { localStorage.setItem(CLE_FAVORIS, JSON.stringify(liste)); return true; } catch (e) { return false; }
}

/** Version gardée d'une recette : sans les fiches complètes des aliments. */
const recetteAGarder = (rc) => ({ ...rc, aliments: (rc.aliments || []).map((f) => ({ nom: f.nom })) });

/* ---------- Bilan de la semaine ----------
   Pour chaque repère sous le seuil (75 %), cherche l'échange d'un aliment choisi contre
   un aliment du mois du même groupe qui fait le plus progresser ce repère, sans faire
   baisser le score global. */
function bilanSemaine(reglages, proposes, choisis) {
  const actuelles = couvertures(reglages, choisis);
  const scoreActuel = scoreGlobal(actuelles);
  const manques = reglages.toile
    .map((axe, i) => ({ axe, i, valeur: actuelles[i] }))
    .filter((x) => x.valeur < reglages.seuil)
    .map(({ axe, i, valeur }) => {
      let solution = null;
      for (const ancien of choisis) {
        for (const nouveau of proposes) {
          if (choisis.includes(nouveau) || groupeDe(nouveau) !== groupeDe(ancien)) continue;
          const valeurs = couvertures(reglages, choisis.map((f) => (f === ancien ? nouveau : f)));
          if (valeurs[i] <= valeur || scoreGlobal(valeurs) < scoreActuel) continue;
          if (!solution || valeurs[i] > solution.apres) solution = { ancien, nouveau, apres: valeurs[i] };
        }
      }
      return { axe, valeur, solution };
    });
  return { score: scoreActuel, manques };
}

function phraseSolution(t, manque) {
  const s = manque.solution;
  return t.solution
    .replace('{ancien}', nomCourt(s.ancien))
    .replace('{nouveau}', nomCourt(s.nouveau))
    .replace('{repere}', manque.axe.libelle)
    .replace('{apres}', pourcent(Math.min(s.apres, 1)));
}

function htmlBilan(t, reglages, bilan) {
  const lignes = bilan.manques.map((m) => `
    <li class="menu-manque-repere">
      <p class="menu-manque-titre"><strong>${echapper(m.axe.libelle)}</strong><span>${pourcent(m.valeur)}</span></p>
      <p>${echapper(m.solution ? phraseSolution(t, m) : t.pasDeSolution)}</p>
      ${m.solution ? `<button type="button" class="bouton bouton-contour" data-remplacer="${echapper(m.solution.ancien.id)}|${echapper(m.solution.nouveau.id)}">${echapper(t.boutonRemplacer)}</button>` : ''}
    </li>`).join('');
  return `
    <section class="menu-section" id="menu-bilan" tabindex="-1">
      <h2>${echapper(t.titreBilan)}</h2>
      <div class="filet-torii"></div>
      <p class="menu-score" data-niveau="${niveau(bilan.score, reglages.seuil)}"><span class="menu-score-pastille"></span><span>${echapper(t.score)} ${pourcent(bilan.score)}</span></p>
      ${bilan.manques.length
        ? `<p class="menu-aide">${echapper(t.aideBilan)}</p><ul class="menu-manques">${lignes}</ul>`
        : `<p class="menu-aide">${echapper(t.aucunManque)}</p>`}
    </section>`;
}

/* ---------- Liste de courses ---------- */
function enKilos(grammes) {
  const arrondi = Math.ceil(grammes / 50) * 50;
  return arrondi >= 1000 ? `${String(Math.round(arrondi / 100) / 10).replace('.', ',')} kg` : `${arrondi} g`;
}

// Liquides en centilitres (arrondi au cl supérieur), en litres à partir de 1 litre
function enCentilitres(grammes, densite) {
  const cl = Math.ceil(grammes / densite / 10);
  return cl >= 100 ? `${String(Math.ceil(cl / 10) / 10).replace('.', ',')} l` : `${cl} cl`;
}

function courses(reglages, choisis, personnes, recettes) {
  const nombres = comptes(choisis);
  const lignes = GROUPES.map((g) => ({
    titre: g.titre,
    elements: choisis.filter((f) => groupeDe(f) === g.cle).map((f) => {
      const grammes = grammesSemaine(reglages, f, nombres) * personnes;
      let texte = enKilos(grammes);
      if (f.type === 'œuf') texte = `${Math.ceil(grammes / reglages.poidsOeuf)} œufs`;
      else if (f.uniteCourses === 'ml') texte = enCentilitres(grammes, f.densite || reglages.densiteHuile || 0.92);
      else if (f.uniteCourses === 'pot') texte = `${Math.ceil(grammes / f.poidsUnite)} pots`;
      return { nom: f.nom, quantite: texte };
    }),
  })).filter((g) => g.elements.length);
  // Ingrédients du placard additionnés sur les recettes, sauf ceux déjà dans la liste
  // (fromage râpé, crème fraîche, huile d'olive choisis)
  const dejaListes = choisis.map((f) => f.nom.toLowerCase());
  const totaux = new Map();
  recettes.forEach((rc) => rc.autres.forEach((a) => {
    const nom = typeof a === 'string' ? a : a.nom;
    if (dejaListes.some((n) => n.startsWith(nom.toLowerCase()))) return;
    const cle = `${nom}|${a.unite || ''}`;
    const total = totaux.get(cle) || { nom, unite: a.unite, quantite: 0 };
    if (a.quantite) total.quantite += a.quantite * personnes * (rc.repas || 1);
    totaux.set(cle, total);
  }));
  const autres = [...totaux.values()].map((a) => (a.quantite ? `${a.nom} : ${mesure(a.quantite, a.unite)}` : a.nom));
  return { lignes, autres };
}

export function texteCourses(t, liste, personnes) {
  const blocs = liste.lignes.map((g) => `${g.titre}\n${g.elements.map((e) => `- ${e.nom} : ${e.quantite}`).join('\n')}`);
  blocs.push(`${t.autresIngredients}\n${liste.autres.map((a) => `- ${a}`).join('\n')}`);
  return `${t.titreCourses} (${personnes} ${personnes > 1 ? 'personnes' : 'personne'})\n\n${blocs.join('\n\n')}\n`;
}

function texteMenu(t, semaine, recettes) {
  const jours = semaine.map((j) => `${j.jour}\n- Midi : ${j.midi}\n- Soir : ${j.soir}`).join('\n\n');
  const details = recettes.map((r, i) => [
    `${i + 1}. ${r.titre} (${tempsTotal(r)})`,
    ...(r.ingredients || []).map((x) => `   - ${x}`),
    ...r.etapes.map((e, n) => `   ${n + 1}) ${e}`),
  ].join('\n')).join('\n\n');
  return `${t.titre}\n\n${jours}\n\n${t.titreRecettes}\n\n${details}\n`;
}

/* ---------- Sélection aléatoire ----------
   Complète les choix de la personne pour atteindre les minimums, avec 1 ou 2 produits laitiers
   et une huile conseillée, en variant les catégories ; vise une toile verte (score ≥ seuil). */
function melanger(liste) {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** n aliments au hasard, au plus 2 de la même catégorie (en comptant ceux déjà choisis). */
function tirer(liste, n, deja) {
  const pris = [];
  const parCategorie = {};
  deja.forEach((f) => { parCategorie[f.categorie] = (parCategorie[f.categorie] || 0) + 1; });
  for (const f of melanger(liste)) {
    if (pris.length >= n) break;
    if ((parCategorie[f.categorie] || 0) >= 2) continue;
    pris.push(f);
    parCategorie[f.categorie] = (parCategorie[f.categorie] || 0) + 1;
  }
  // Pas assez de catégories différentes : on complète sans cette limite
  for (const f of melanger(liste)) {
    if (pris.length >= n) break;
    if (!pris.includes(f)) pris.push(f);
  }
  return pris;
}

function selectionAleatoire(reglages, proposes, fixes, precedente) {
  const libres = proposes.filter((f) => !fixes.includes(f));
  const dejaDans = (cle) => fixes.filter((f) => groupeDe(f) === cle);
  let meilleure = null;
  for (let essai = 0; essai < 300; essai += 1) {
    const besoins = {
      'légume': Math.max(0, minimum(reglages, 'légume') - dejaDans('légume').length),
      fruit: Math.max(0, minimum(reglages, 'fruit') - dejaDans('fruit').length),
      proteine: Math.max(0, minimum(reglages, 'proteine') - dejaDans('proteine').length),
      laitier: dejaDans('laitier').length ? 0 : 1 + Math.floor(Math.random() * 2),
      matiere: dejaDans('matiere').length ? 0 : 1,
    };
    const tirage = [];
    GROUPES.forEach((g) => {
      if (!besoins[g.cle]) return;
      let candidats = libres.filter((f) => groupeDe(f) === g.cle);
      if (g.cle === 'matiere' && candidats.some((f) => f.conseil)) candidats = candidats.filter((f) => f.conseil);
      tirage.push(...tirer(candidats, besoins[g.cle], dejaDans(g.cle)));
    });
    const cle = tirage.map((f) => f.id).sort().join('|');
    if (cle === precedente && essai < 299) continue; // toujours une nouvelle proposition
    let score = scoreGlobal(couvertures(reglages, fixes.concat(tirage)));
    // Variété : deux protéines du même type (deux viandes…) passent après
    const types = new Set(fixes.concat(tirage).filter((f) => groupeDe(f) === 'proteine').map((f) => f.type));
    if (types.size < 2) score -= 0.05;
    if (!meilleure || score > meilleure.score) meilleure = { tirage, score, cle };
    if (score >= reglages.seuil) break;
  }
  return meilleure;
}

/* ---------- Semaines enregistrées (seulement sur ce téléphone) ---------- */
const CLE_SEMAINES = 'osteo-savasta-semaines';
const MAX_SEMAINES = 12;

export function lireSemaines() {
  try {
    const liste = JSON.parse(localStorage.getItem(CLE_SEMAINES));
    return Array.isArray(liste) ? liste : [];
  } catch (e) { return []; }
}
export function ecrireSemaines(liste) {
  try { localStorage.setItem(CLE_SEMAINES, JSON.stringify(liste)); return true; } catch (e) { return false; }
}

export function dateLongue(iso) {
  const [annee, mois, jour] = iso.split('-').map(Number);
  const noms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${jour === 1 ? '1er' : jour} ${noms[mois - 1]} ${annee}`;
}

function htmlSemaines(tp) {
  const semaines = lireSemaines();
  if (!semaines.length) return '';
  return `
    <section class="menu-semaines" aria-labelledby="menu-semaines-titre">
      <h2 id="menu-semaines-titre">${echapper(tp.titreSemaines)}</h2>
      <p class="menu-aide">${echapper(tp.aideSemaines)}</p>
      <ul>
        ${semaines.map((s) => `
          <li>
            <p><strong>${echapper(tp.semaineDu.replace('{date}', dateLongue(s.date)))}</strong>
              <span>${s.personnes} ${s.personnes > 1 ? 'personnes' : 'personne'} · ${pourcent(s.score)}</span></p>
            <div class="menu-semaines-actions">
              <button type="button" class="bouton bouton-secondaire" data-ouvrir-semaine="${echapper(s.id)}">${echapper(tp.ouvrir)}</button>
              <button type="button" class="bouton bouton-contour" data-supprimer-semaine="${echapper(s.id)}">${echapper(tp.supprimer)}</button>
            </div>
          </li>`).join('')}
      </ul>
    </section>`;
}

/* ---------- Affichage ---------- */
export async function afficherMenu() {
  const { menu, proposes, recettes } = await chargerDonnees();
  const t = menu.textes;
  const retour = { adresse: '#dietetique', libelle: 'Diététique' };
  if (!(await menuDisponible())) {
    return `${bandeau({ titre: 'Menu de la semaine', retour })}<p class="vide">Bientôt disponible.</p>`;
  }
  valeursAffichees = null;
  const r = menu.reglages;
  // Sélection aléatoire et semaines enregistrées : seulement si leurs textes sont validés
  const tp = estVisible(menu.textesPlus) ? menu.textesPlus : null;
  const tr = menu.textesRecettes;
  const tc = estVisible(menu.textesCarnet) ? menu.textesCarnet : null;

  const groupes = GROUPES.map((g) => {
    const liste = proposes.filter((f) => g.types.includes(f.type));
    if (!liste.length) return '';
    const facultatif = !minimum(r, g.cle);
    return `
      <fieldset class="menu-groupe" data-groupe="${g.cle}">
        <legend><span>${echapper(t[g.texteTitre] || g.titre)}</span> <span class="menu-compte" data-compte="${g.cle}"></span></legend>
        ${facultatif && t[g.texteAide] ? `<p class="menu-aide">${echapper(t[g.texteAide])}</p>` : ''}
        <div class="menu-choix">
          ${liste.map((f) => `<button type="button" class="menu-aliment${f.conseil ? ' menu-aliment-conseil' : ''}" data-aliment="${echapper(f.id)}" aria-pressed="${etat.choisis.has(f.id)}">${echapper(f.nom)}${f.conseil ? `<small>${echapper(f.conseil)}</small>` : ''}</button>`).join('')}
        </div>
      </fieldset>`;
  }).join('');

  return `<div class="menu-ecran">
    ${bandeau({ surtitre: 'Votre alimentation', titre: t.titre, retour })}
    <p>${echapper(t.intro)}</p>
    ${tp ? `<div id="menu-semaines-zone">${htmlSemaines(tp)}</div>` : ''}
    <div class="menu-personnes">
      <span id="menu-personnes-libelle">${echapper(t.personnes)}</span>
      <div class="menu-compteur" role="group" aria-labelledby="menu-personnes-libelle">
        <button type="button" class="menu-plus-moins" data-personnes="-1" aria-label="Une personne de moins">−</button>
        <output id="menu-personnes" aria-live="polite">${etat.personnes}</output>
        <button type="button" class="menu-plus-moins" data-personnes="1" aria-label="Une personne de plus">+</button>
      </div>
    </div>
    <div class="menu-toile">
      <p class="menu-toile-base">${echapper(t.pourUnePersonne)}</p>
      ${htmlToile(r)}
    </div>
    ${htmlMiniToile(r, t)}
    ${tp ? `<button type="button" class="bouton bouton-secondaire menu-aleatoire" data-aleatoire>${echapper(tp.boutonAleatoire)}</button>
      <p class="menu-aide" id="menu-aleatoire-aide" aria-live="polite">${echapper(tp.aideAleatoire)}</p>` : ''}
    <button type="button" class="bouton bouton-contour menu-vider" data-vider>${echapper(t.boutonToutDeselectionner)}</button>
    <p class="menu-toile-aide">${echapper(t.explicationToile)}</p>
    ${groupes}
    <p class="menu-manque" id="menu-manque" aria-live="polite"></p>
    <button type="button" class="bouton bouton-secondaire" id="menu-creer">${echapper(t.boutonCreer)}</button>
    <div id="menu-resultat">${etat.resultat ? htmlResultat(t, r, etat.resultat, tp, tr, tc) : ''}</div>
  </div>`;
}

function boutonFavori(tc, rc, i) {
  if (!tc) return '';
  const deja = lireFavoris().some((f) => f.id === idRecette(rc.titre));
  return `<button type="button" class="bouton bouton-contour recette-favori" data-favori="${i}" aria-pressed="${deja}">${echapper(deja ? tc.retirerFavori : tc.ajouterFavori)}</button>`;
}

function htmlResultat(t, reglages, res, tp, tr, tc) {
  const semaine = res.semaine.map((j) => `
    <tr><th scope="row">${j.jour}</th><td>${echapper(j.midi)}</td><td>${echapper(j.soir)}</td></tr>`).join('');
  const recettes = res.recettes.map((rc, i) => htmlRecette(rc, tr, { numero: i + 1, boutonFavori: boutonFavori(tc, rc, i) })).join('');
  const courses = res.courses.lignes.map((g) => `
    <h4 class="surtitre sous-groupe">${g.titre}</h4>
    <ul class="menu-courses">${g.elements.map((e) => `<li><span>${echapper(e.nom)}</span><span>${echapper(e.quantite)}</span></li>`).join('')}</ul>`).join('');
  const enregistrer = tp ? `
    <section class="menu-section menu-enregistrer">
      ${res.horsSaison ? `<p class="menu-aide">${echapper(tp.horsSaison)}</p>` : ''}
      <button type="button" class="bouton bouton-secondaire" data-enregistrer>${echapper(tp.boutonEnregistrer)}</button>
      <p class="menu-copie" id="menu-enregistre" role="status" hidden></p>
    </section>` : '';
  return `
    ${htmlBilan(t, reglages, res.bilan)}
    ${enregistrer}
    <section class="menu-section" id="menu-semaine">
      <h2>${echapper(t.titreSemaine)}</h2>
      <div class="filet-torii"></div>
      <p class="menu-aide">${echapper(t.aideSemaine)}</p>
      <div class="menu-tableau"><table>
        <thead><tr><th scope="col"><span class="visuellement-cache">Jour</span></th><th scope="col">Midi</th><th scope="col">Soir</th></tr></thead>
        <tbody>${semaine}</tbody>
      </table></div>
      <p class="menu-aide">${echapper(t.fruitsAuQuotidien)}</p>
      <button type="button" class="bouton bouton-contour" data-notes="menu">${echapper(t.boutonNotesMenu)}</button>
    </section>
    <section class="menu-section">
      <h2>${echapper(t.titreRecettes)}</h2>
      <div class="filet-torii"></div>
      <p class="menu-copie" id="menu-favori" role="status" hidden></p>
      ${recettes}
    </section>
    <section class="menu-section">
      <h2>${echapper(t.titreCourses)}</h2>
      <div class="filet-torii"></div>
      <p class="menu-aide">${echapper(t.aideCourses)}</p>
      ${courses}
      <h4 class="surtitre sous-groupe">${echapper(t.autresIngredients)}</h4>
      <ul class="menu-courses">${res.courses.autres.map((a) => `<li><span>${echapper(a)}</span></li>`).join('')}</ul>
      <button type="button" class="bouton bouton-secondaire" data-notes="courses">${echapper(t.boutonNotesCourses)}</button>
      <p class="menu-copie" id="menu-copie" role="status" hidden>${echapper(t.copie)}</p>
      <textarea class="menu-texte" id="menu-texte" readonly hidden aria-label="Texte à copier"></textarea>
      <button type="button" class="lien-discret" data-modifier>${echapper(t.boutonModifier)}</button>
    </section>`;
}

/* Envoie le texte vers les notes : fenêtre de partage du téléphone (Notes, Keep…),
   sinon copie dans le presse-papiers, sinon texte affiché à copier soi-même. */
export async function versNotes(zone, titre, texte, t) {
  if (navigator.share) {
    try { await navigator.share({ title: titre, text: texte }); return; } catch (erreur) {
      if (erreur.name === 'AbortError') return;
    }
  }
  const message = zone.querySelector('#menu-copie');
  try {
    await navigator.clipboard.writeText(texte);
    message.hidden = false;
  } catch (erreur) {
    const zoneTexte = zone.querySelector('#menu-texte');
    zoneTexte.value = texte;
    zoneTexte.hidden = false;
    zoneTexte.select();
  }
}

/** Branche les boutons de l'écran (appelé après l'affichage). */
export async function activerMenu(contenu) {
  // Écouteurs posés sur l'écran lui-même : ils disparaissent avec lui
  const zone = contenu.querySelector('.menu-ecran');
  if (!zone) return;
  const { menu, proposes, recettes } = await chargerDonnees();
  const r = menu.reglages;
  const t = menu.textes;
  const tp = estVisible(menu.textesPlus) ? menu.textesPlus : null;
  const tr = menu.textesRecettes;
  const tc = estVisible(menu.textesCarnet) ? menu.textesCarnet : null;

  const choisis = () => proposes.filter((f) => etat.choisis.has(f.id));
  const nombre = (cle) => choisis().filter((f) => groupeDe(f) === cle).length;
  // Aucun maximum : il faut seulement atteindre le minimum de chaque groupe
  const complet = () => GROUPES.every((g) => nombre(g.cle) >= minimum(r, g.cle));

  function mettreAJour() {
    GROUPES.forEach((g) => {
      const compteur = zone.querySelector(`[data-compte="${g.cle}"]`);
      if (!compteur) return;
      const n = nombre(g.cle);
      const min = minimum(r, g.cle);
      compteur.textContent = min ? `${n} · ${t.auMoins} ${min}` : String(n);
      compteur.dataset.atteint = String(n >= min);
      zone.querySelectorAll(`[data-groupe="${g.cle}"] .menu-aliment`).forEach((b) => {
        b.setAttribute('aria-pressed', String(etat.choisis.has(b.dataset.aliment)));
      });
    });
    const manque = GROUPES.filter((g) => nombre(g.cle) < minimum(r, g.cle))
      .map((g) => `${minimum(r, g.cle) - nombre(g.cle)} ${g.titre.toLowerCase()}`);
    zone.querySelector('#menu-manque').textContent = manque.length ? `${t.manque} ${manque.join(', ')}.` : '';
    zone.querySelector('#menu-creer').disabled = !complet();
    zone.querySelector('[data-vider]').disabled = etat.choisis.size === 0;
    dessinerToile(zone, r, couvertures(r, choisis()), t);
  }

  /** Crée le menu ; avec une semaine enregistrée, reprend ses recettes, sa répartition et ses courses. */
  function creer(allerAuBilan = true, enregistree = null) {
    const liste = choisis();
    const retenues = enregistree ? enregistree.recettes
      : detaillerRecettes(r, choisirRecettes(recettes, liste, menu.crudites || []), liste, etat.personnes);
    const semaine = enregistree ? enregistree.semaine : JOURS.map((jour, i) => ({
      jour,
      midi: retenues[REPARTITION[i * 2]]?.titre || '',
      soir: retenues[REPARTITION[i * 2 + 1]]?.titre || '',
    }));
    etat.resultat = {
      semaine,
      recettes: retenues,
      courses: enregistree ? enregistree.courses : courses(r, liste, etat.personnes, retenues),
      bilan: bilanSemaine(r, proposes, liste),
      horsSaison: enregistree ? enregistree.choisis.length > liste.length : false,
    };
    zone.querySelector('#menu-resultat').innerHTML = htmlResultat(t, r, etat.resultat, tp, tr, tc);
    if (allerAuBilan) zone.querySelector('#menu-bilan').focus();
  }

  function enregistrerSemaine() {
    const res = etat.resultat;
    const aujourdhui = new Date();
    const semaine = {
      id: aujourdhui.getTime().toString(36),
      date: `${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, '0')}-${String(aujourdhui.getDate()).padStart(2, '0')}`,
      personnes: etat.personnes,
      score: res.bilan.score,
      choisis: [...etat.choisis],
      semaine: res.semaine,
      // Recettes sans les fiches complètes : seuls les noms des aliments sont gardés
      recettes: res.recettes.map(recetteAGarder),
      courses: res.courses,
    };
    const ok = ecrireSemaines([semaine, ...lireSemaines()].slice(0, MAX_SEMAINES));
    const message = zone.querySelector('#menu-enregistre');
    message.textContent = ok ? tp.enregistre : tp.echecEnregistrement;
    message.hidden = false;
    zone.querySelector('#menu-semaines-zone').innerHTML = htmlSemaines(tp);
  }

  function ouvrirSemaine(id) {
    const s = lireSemaines().find((x) => x.id === id);
    if (!s) return;
    etat.personnes = s.personnes;
    zone.querySelector('#menu-personnes').textContent = etat.personnes;
    etat.choisis = new Set(s.choisis);
    etat.aleatoires = new Set();
    mettreAJour();
    creer(true, s);
  }

  zone.addEventListener('click', (evenement) => {
    const aliment = evenement.target.closest('[data-aliment]');
    if (aliment) {
      const id = aliment.dataset.aliment;
      if (etat.choisis.has(id)) etat.choisis.delete(id); else etat.choisis.add(id);
      etat.aleatoires.delete(id); // touché à la main : devient un choix de la personne
      etat.resultat = null;
      zone.querySelector('#menu-resultat').innerHTML = '';
      mettreAJour();
      return;
    }
    const plusMoins = evenement.target.closest('[data-personnes]');
    if (plusMoins) {
      etat.personnes = Math.min(r.personnesMax, Math.max(r.personnesMin, etat.personnes + Number(plusMoins.dataset.personnes)));
      zone.querySelector('#menu-personnes').textContent = etat.personnes;
      if (etat.resultat) creer(false);
      return;
    }
    if (evenement.target.closest('#menu-creer') && complet()) { creer(); return; }
    if (evenement.target.closest('[data-aleatoire]')) {
      // Garde les choix faits à la main, remplace la partie tirée au hasard au clic précédent
      etat.aleatoires.forEach((id) => etat.choisis.delete(id));
      const fixes = choisis();
      const proposition = selectionAleatoire(r, proposes, fixes, etat.derniereAleatoire);
      etat.aleatoires = new Set(proposition.tirage.map((f) => f.id));
      etat.aleatoires.forEach((id) => etat.choisis.add(id));
      etat.derniereAleatoire = proposition.cle;
      etat.resultat = null;
      zone.querySelector('#menu-resultat').innerHTML = '';
      zone.querySelector('#menu-aleatoire-aide').textContent =
        proposition.score >= r.seuil ? tp.aideAleatoire : tp.pasDeVert;
      mettreAJour();
      return;
    }
    if (evenement.target.closest('[data-enregistrer]') && etat.resultat) { enregistrerSemaine(); return; }
    const favori = evenement.target.closest('[data-favori]');
    if (favori && etat.resultat && tc) {
      const rc = etat.resultat.recettes[Number(favori.dataset.favori)];
      const id = idRecette(rc.titre);
      const deja = lireFavoris().some((f) => f.id === id);
      const liste = deja ? lireFavoris().filter((f) => f.id !== id)
        : [{ ...recetteAGarder(rc), id, ajoutee: new Date().toISOString().slice(0, 10) }, ...lireFavoris()];
      const ok = ecrireFavoris(liste);
      const message = zone.querySelector('#menu-favori');
      if (ok) {
        favori.setAttribute('aria-pressed', String(!deja));
        favori.textContent = deja ? tc.ajouterFavori : tc.retirerFavori;
      }
      message.textContent = ok ? (deja ? tc.retire : tc.ajoute) : tp.echecEnregistrement;
      message.hidden = false;
      favori.closest('details').after(message);
      return;
    }
    const ouvrir = evenement.target.closest('[data-ouvrir-semaine]');
    if (ouvrir) { ouvrirSemaine(ouvrir.dataset.ouvrirSemaine); return; }
    // Suppression en deux temps : le bouton demande une confirmation
    const supprimer = evenement.target.closest('[data-supprimer-semaine]');
    if (supprimer) {
      if (supprimer.dataset.confirme !== 'oui') {
        supprimer.dataset.confirme = 'oui';
        supprimer.textContent = tp.confirmerSuppression;
        return;
      }
      ecrireSemaines(lireSemaines().filter((s) => s.id !== supprimer.dataset.supprimerSemaine));
      zone.querySelector('#menu-semaines-zone').innerHTML = htmlSemaines(tp);
      return;
    }
    if (evenement.target.closest('[data-vider]')) {
      etat.choisis.clear();
      etat.aleatoires.clear();
      etat.resultat = null;
      zone.querySelector('#menu-resultat').innerHTML = '';
      mettreAJour();
      return;
    }
    // Échange proposé par le bilan : la toile, les recettes et les courses se recalculent
    const echange = evenement.target.closest('[data-remplacer]');
    if (echange) {
      const [ancien, nouveau] = echange.dataset.remplacer.split('|');
      etat.choisis.delete(ancien);
      etat.choisis.add(nouveau);
      mettreAJour();
      creer();
      return;
    }
    const notes = evenement.target.closest('[data-notes]');
    if (notes && etat.resultat) {
      const pourCourses = notes.dataset.notes === 'courses';
      versNotes(zone, pourCourses ? t.titreCourses : t.titre,
        pourCourses ? texteCourses(t, etat.resultat.courses, etat.personnes) : texteMenu(t, etat.resultat.semaine, etat.resultat.recettes), t);
      return;
    }
    if (evenement.target.closest('[data-modifier], [data-voir-toile]')) {
      zone.querySelector('.menu-toile').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  if (semaineDemandee) {
    const id = semaineDemandee;
    semaineDemandee = null;
    ouvrirSemaine(id);
  }

  // La mini-toile apparaît dès que la grande toile n'est plus visible
  const mini = zone.querySelector('.toile-mini');
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver(([entree]) => { mini.hidden = entree.isIntersecting; });
    observateur.observe(zone.querySelector('.menu-toile'));
    window.addEventListener('hashchange', () => observateur.disconnect(), { once: true });
  }

  mettreAJour();
}
