/* Diététique : deux onglets, « Apports alimentaires » (data/fruits-legumes.json :
   fruits et légumes filtrés automatiquement sur le mois en cours, viandes,
   poissons et œufs toute l'année) et « Compléments alimentaires » (data/complements.json).
   Seules les fiches au statut "validee" s'affichent ; chaque fiche
   porte la mention « Demandez conseil… ». Aucun dosage n'est affiché.
   Adresses : #dietetique (apports, #dietetique/fer pour un nutriment) et #dietetique/complements */

import { chargerJSON, estVisible, marqueRelecture, echapper } from '../app.js';

const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// « 2026-11-02 » → « 2 novembre 2026 »
function dateEnClair(iso) {
  const [annee, mois, jour] = String(iso).split('-').map(Number);
  if (!annee || !mois || !jour) return '';
  return `${jour === 1 ? '1er' : jour} ${NOMS_MOIS[mois - 1]} ${annee}`;
}

// Seules les adresses web classiques sont acceptées comme liens
const lienSur = (url) => (/^https:\/\//.test(url) ? url : '');

function ficheComplement(c, mention) {
  const marque = marqueRelecture(c);
  const precautions = c.precautions.map((p) => `<li>${echapper(p)}</li>`).join('');
  const avis = c.avisAutorites.length
    ? `<h4>Avis des autorités sanitaires</h4>
       <ul>${c.avisAutorites.map((a) => `
         <li><a href="${echapper(lienSur(a.url))}" target="_blank" rel="noopener">${echapper(a.titre)}</a></li>`).join('')}
       </ul>`
    : '';

  // Bloc produit : seulement si vous avez choisi un produit
  const p = c.produit || {};
  let produit = '';
  if (p.marque) {
    const details = [p.forme, p.prixIndicatif && `Prix indicatif : ${p.prixIndicatif}`,
      p.enseignes && p.enseignes.length && `Disponible chez : ${p.enseignes.join(', ')}`]
      .filter(Boolean).map((t) => `<li>${echapper(t)}</li>`).join('');
    const lien = lienSur(p.urlProduit)
      ? `<p><a href="${echapper(p.urlProduit)}" target="_blank" rel="noopener sponsored">Voir le produit</a>
         ${p.lienAffilie ? '<strong class="mention-affilie">(lien affilié)</strong>' : ''}</p>`
      : '';
    produit = `<h4>Produit sélectionné : ${echapper(p.marque)}</h4><ul>${details}</ul>${lien}`;
  }

  // Rôle dans l'organisme : allégations autorisées dans l'UE, recopiées mot pour mot
  const role = (c.role || []).length
    ? `<h4>Rôle dans l'organisme</h4><ul>${c.role.map((r) => `<li>${echapper(r)}</li>`).join('')}</ul>`
    : '';
  // Valeurs nutritionnelles Ciqual : seulement pour les compléments qui sont des aliments
  const lignes = Object.values(c.nutritionPour100g || {})
    .map((n) => `<tr><th scope="row">${echapper(n.libelle)}</th><td>${echapper(n.valeur)} ${echapper(n.unite)}</td></tr>`)
    .join('');
  const valeurs = lignes
    ? `<h4>Valeurs nutritionnelles pour 100 g</h4>
       <table class="tableau-nutrition"><tbody>${lignes}</tbody></table>
       <p class="fiche-date">Source : Anses, table Ciqual 2025 (${echapper(c.ciqual.nom)})</p>`
    : '';

  return `
    <details class="fiche${marque.classe}">
      <summary>${echapper(c.nom)} <span class="fiche-categorie">${echapper(c.categorie)}</span></summary>
      ${marque.etiquette}
      <p>${echapper(c.description)}</p>
      ${role}
      ${valeurs}
      <p class="mention-conseil">${echapper(mention)}</p>
      <h4>Précautions</h4>
      <ul>${precautions}</ul>
      ${avis}
      ${produit}
      <p class="fiche-date">Dernière vérification : ${echapper(dateEnClair(c.dateVerification))}</p>
    </details>`;
}

/* ---------- Fruits et légumes de saison ---------- */

function ficheProduit(f) {
  const marque = marqueRelecture(f);
  // Seules les lignes avec une valeur Ciqual sont affichées
  const lignes = Object.values(f.nutritionPour100g || {})
    .filter((n) => n.valeur)
    .map((n) => `<tr><th scope="row">${echapper(n.libelle)}</th><td>${echapper(n.valeur)} ${echapper(n.unite)}</td></tr>`)
    .join('');
  const pointsForts = f.pointsForts.length
    ? `<h4>Points forts nutritionnels</h4><ul>${f.pointsForts.map((p) => `<li>${echapper(p)}</li>`).join('')}</ul>`
    : '';
  const recettes = f.recettes.length
    ? `<h4>Recettes faciles</h4>${f.recettes.map((r) => `
        <div class="recette">
          <p class="recette-titre">${echapper(r.titre)} <span>· ${echapper(r.temps)}</span></p>
          <p><strong>Ingrédients :</strong> ${r.ingredients.map(echapper).join(', ')}.</p>
          <ol>${r.etapes.map((e) => `<li>${echapper(e)}</li>`).join('')}</ol>
        </div>`).join('')}`
    : '';

  return `
    <details class="fiche${marque.classe}">
      <summary>${echapper(f.nom)} <span class="fiche-categorie">${echapper(f.categorie)}</span></summary>
      ${marque.etiquette}
      ${f.impact ? `<p>${echapper(f.impact)}</p>` : ''}
      ${pointsForts}
      ${lignes ? `<h4>Composition pour 100 g</h4>
        <table class="tableau-nutrition"><tbody>${lignes}</tbody></table>
        <p class="fiche-date">Aliment de référence Ciqual : ${echapper(f.ciqual.nom)}</p>` : ''}
      ${recettes}
    </details>`;
}

/* Nutriments proposés dans le menu « Je cherche un apport en… ».
   seuil = quantité pour 100 g à partir de laquelle un aliment est « source de » (15 % des valeurs
   nutritionnelles de référence, règlement UE 1169/2011 ; 3 g pour les fibres) ; « riche en » = double. */
const NUTRIMENTS_CHOIX = [
  { cle: 'fibres', nom: 'fibres', seuil: 3 },
  { cle: 'vitamineC', nom: 'vitamine C', seuil: 0.15 * 80 },
  { cle: 'vitamineA', nom: 'vitamine A', seuil: 0.15 * 800 },
  { cle: 'vitamineD', nom: 'vitamine D', seuil: 0.15 * 5 },
  { cle: 'vitamineE', nom: 'vitamine E', seuil: 0.15 * 12 },
  { cle: 'vitamineK1', nom: 'vitamine K', seuil: 0.15 * 75 },
  { cle: 'vitamineB6', nom: 'vitamine B6', seuil: 0.15 * 1.4 },
  { cle: 'vitamineB9', nom: 'folates (vitamine B9)', seuil: 0.15 * 200 },
  { cle: 'vitamineB12', nom: 'vitamine B12', seuil: 0.15 * 2.5 },
  { cle: 'potassium', nom: 'potassium', seuil: 0.15 * 2000 },
  { cle: 'calcium', nom: 'calcium', seuil: 0.15 * 800 },
  { cle: 'magnesium', nom: 'magnésium', seuil: 0.15 * 375 },
  { cle: 'fer', nom: 'fer', seuil: 0.15 * 14 },
  { cle: 'iode', nom: 'iode', seuil: 0.15 * 150 },
  { cle: 'manganese', nom: 'manganèse', seuil: 0.15 * 2 },
  { cle: 'cuivre', nom: 'cuivre', seuil: 0.15 * 1 },
];

// « source de fer » mais « source d'iode » (élision devant une voyelle)
const de = (nom) => (/^[aeiouyéèêh]/i.test(nom) ? `d'${nom}` : `de ${nom}`);

// Valeur Ciqual « 2,7 » → 2.7 ; « < 0,5 », « traces » ou vide → null (non comparable)
function quantite(f, cle) {
  const texte = String(f.nutritionPour100g?.[cle]?.valeur ?? '').trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(texte) ? Number(texte) : null;
}

function menuNutriment(choix) {
  return `
    <label class="choix-nutriment">Je cherche un apport en…
      <select data-choix-nutriment>
        <option value="">Tous les aliments</option>
        ${NUTRIMENTS_CHOIX.map((n) => `<option value="${n.cle}" ${choix && choix.cle === n.cle ? 'selected' : ''}>${echapper(n.nom)}</option>`).join('')}
      </select>
    </label>`;
}

/* Liste triée par teneur décroissante pour le nutriment choisi */
function listeParNutriment(deSaison, choix) {
  const avecValeur = deSaison
    .map((f) => ({ f, q: quantite(f, choix.cle) }))
    .filter((x) => x.q !== null && x.q > 0)
    .sort((a, b) => b.q - a.q);
  const sources = avecValeur.filter((x) => x.q >= choix.seuil);
  const unite = deSaison[0]?.nutritionPour100g?.[choix.cle]?.unite || '';
  const affiches = sources.length ? sources : avecValeur.slice(0, 5);

  const intro = sources.length
    ? `<p>${sources.length} aliment(s) sont au moins « source ${echapper(de(choix.nom))} », du plus riche au moins riche :</p>`
    : `<p>Aucun aliment proposé n'atteint le seuil « source ${echapper(de(choix.nom))} ». Voici ceux qui en contiennent le plus :</p>`;

  return intro + affiches.map(({ f, q }) => {
    const niveau = q >= 2 * choix.seuil ? `Riche en ${choix.nom}` : q >= choix.seuil ? `Source ${de(choix.nom)}` : '';
    return `
      <div class="classement">
        <p class="classement-valeur">
          <strong>${echapper(f.nutritionPour100g[choix.cle].valeur)} ${echapper(unite)}</strong> pour 100 g
          ${niveau ? `<span class="badge">${echapper(niveau)}</span>` : ''}
          <span class="badge badge-neutre">${f.toutLAnnee ? "Toute l'année" : 'De saison'}</span>
        </p>
        ${ficheProduit(f)}
      </div>`;
  }).join('');
}

/* Apports naturels : fruits et légumes du mois en cours + viandes, poissons, œuf toute l'année */
function sectionApports(donnees, cleNutriment) {
  const moisCourant = new Date().getMonth() + 1;
  // Seuls les aliments validés : de saison ce mois-ci, ou disponibles toute l'année
  const proposes = donnees.produits
    .filter((f) => estVisible(f) && (f.toutLAnnee || f.moisSaison.includes(moisCourant)))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const groupe = (type) => proposes.filter((f) => f.type === type);
  const bloc = (titre, liste) => (liste.length ? `<h3>${titre}</h3>${liste.map(ficheProduit).join('')}` : '');
  const choix = NUTRIMENTS_CHOIX.find((n) => n.cle === cleNutriment);
  const s = donnees.sources;

  if (!proposes.length) return '<p class="vide">Bientôt disponible.</p>';
  const deSaison = bloc('Légumes', groupe('légume')) + bloc('Fruits', groupe('fruit'));
  const touteLAnnee = bloc('Viandes', groupe('viande')) + bloc('Poissons', groupe('poisson')) + bloc('Œufs', groupe('œuf'));
  return `
    ${menuNutriment(choix)}
    ${choix
      ? listeParNutriment(proposes, choix)
      : `${deSaison ? `<h3 class="groupe-titre">De saison en ${NOMS_MOIS[moisCourant - 1]}</h3>${deSaison}` : ''}
         ${touteLAnnee ? `<h3 class="groupe-titre">Toute l'année</h3>${touteLAnnee}` : ''}`}
    <p class="note-tiers">
      Saisonnalité : <a href="${echapper(lienSur(s.saisonnaliteUrl))}" target="_blank" rel="noopener">ADEME – Impact CO2</a>.
      Valeurs nutritionnelles : <a href="${echapper(lienSur(s.nutritionUrl))}" target="_blank" rel="noopener">Anses, table Ciqual 2025</a>.
    </p>`;
}

// Choix d'un nutriment → adresse #dietetique/fer (un seul écouteur pour toute l'appli)
document.addEventListener('change', (evenement) => {
  if (!evenement.target.matches('[data-choix-nutriment]')) return;
  const cle = evenement.target.value;
  location.hash = cle ? `dietetique/${cle}` : 'dietetique';
});

/* Deux onglets, chacun avec son adresse :
   #dietetique (ou #dietetique/fer…) → Apports alimentaires ; #dietetique/complements → Compléments */
function onglets(actif) {
  const onglet = (cle, adresse, libelle) =>
    `<a href="#${adresse}" class="onglet-diet" ${actif === cle ? 'aria-current="page"' : ''}>${libelle}</a>`;
  return `
    <nav class="onglets-diet" aria-label="Rubriques de diététique">
      ${onglet('apports', 'dietetique', 'Apports alimentaires')}
      ${onglet('complements', 'dietetique/complements', 'Compléments alimentaires')}
    </nav>`;
}

export async function afficherDietetique(parametre) {
  if (parametre === 'complements') {
    const donnees = await chargerJSON('data/complements.json');
    const fiches = donnees.complements.filter(estVisible);
    const complements = fiches.length
      ? fiches.map((c) => ficheComplement(c, donnees.mention)).join('')
      : '<p class="vide">Bientôt disponible.</p>';
    return `
      <h1>Diététique</h1>
      ${onglets('complements')}
      <section class="carte" aria-labelledby="titre-complements">
        <h2 id="titre-complements">Compléments alimentaires</h2>
        ${complements}
      </section>`;
  }

  const saison = await chargerJSON('data/fruits-legumes.json');
  return `
    <h1>Diététique</h1>
    ${onglets('apports')}
    <section class="carte" aria-labelledby="titre-fruits-legumes">
      <h2 id="titre-fruits-legumes">Apports alimentaires</h2>
      ${sectionApports(saison, parametre)}
    </section>`;
}
