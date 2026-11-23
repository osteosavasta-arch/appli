/* =========================================================
   Apparence de l'appli : couleurs, polices, tailles, arrondis, photo.
   Les réglages sont dans config/apparence.json (écrit depuis l'écran
   « Paramètres », visible seulement sur l'ordinateur du cabinet).
   Sans ce fichier, l'appli garde la charte de assets/css/style.css.
   ========================================================= */

/** Réglages d'origine : ceux de la charte Cabinet Savasta (style.css). */
export const DEFAUTS = {
  couleurs: {
    principale: '#41546e', // bandeaux, boutons, liens
    accent: '#d57c4e', // filet sous les titres, mois en cours
    plante: '#4f6b3a', // picto Diététique, repères atteints
    texte: '#1f2a3a', // texte principal
    fond: '#ffffff', // fond de page
    carte: '#faf7f2', // cartes et listes
    bordure: '#e6dfd5', // filets et contours
  },
  polices: { titres: 'lora', texte: 'lato' },
  tailleTexte: 17,
  rayonCartes: 16,
  rayonBoutons: 6,
  photoAccueil: true,
};

export const POLICES = {
  lora: { nom: 'Lora (élégante, avec empattements)', pile: '"Lora", Georgia, "Times New Roman", serif' },
  lato: { nom: 'Lato (claire, sans empattements)', pile: '"Lato", "Helvetica Neue", Arial, sans-serif' },
  georgia: { nom: 'Georgia (classique)', pile: 'Georgia, "Times New Roman", serif' },
  systeme: { nom: 'Police du téléphone', pile: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' },
};

/** Mélange deux couleurs #rrggbb (part = 0 → a, 1 → b). */
function melanger(a, b, part) {
  const rvb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [rvb(a), rvb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * part).toString(16).padStart(2, '0')).join('')}`;
}

const estCouleur = (c) => /^#[0-9a-f]{6}$/i.test(c || '');

/** Complète des réglages partiels avec les valeurs d'origine. */
export function completer(reglages = {}) {
  return {
    ...DEFAUTS,
    ...reglages,
    couleurs: { ...DEFAUTS.couleurs, ...(reglages.couleurs || {}) },
    polices: { ...DEFAUTS.polices, ...(reglages.polices || {}) },
  };
}

/** Applique les réglages à toute l'appli (variables CSS de :root). */
export function appliquerApparence(reglages) {
  const r = completer(reglages);
  const c = r.couleurs;
  const racine = document.documentElement.style;
  const variable = (nom, valeur) => racine.setProperty(nom, valeur);
  if (estCouleur(c.principale)) {
    variable('--couleur-principale', c.principale);
    variable('--couleur-principale-foncee', melanger(c.principale, '#000000', 0.25));
    variable('--couleur-sur-sombre', melanger(c.principale, '#ffffff', 0.7));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c.principale);
  }
  if (estCouleur(c.accent)) variable('--couleur-torii', c.accent);
  if (estCouleur(c.plante)) variable('--couleur-plante', c.plante);
  if (estCouleur(c.texte)) {
    variable('--couleur-texte', c.texte);
    variable('--couleur-accent', c.texte);
    variable('--couleur-texte-doux', melanger(c.texte, '#ffffff', 0.12));
  }
  if (estCouleur(c.fond)) variable('--couleur-fond', c.fond);
  if (estCouleur(c.carte)) variable('--couleur-carte', c.carte);
  if (estCouleur(c.bordure)) {
    variable('--couleur-bordure', c.bordure);
    variable('--couleur-bordure-champ', melanger(c.bordure, '#000000', 0.06));
  }
  if (POLICES[r.polices.titres]) variable('--police-titres', POLICES[r.polices.titres].pile);
  if (POLICES[r.polices.texte]) variable('--police-texte', POLICES[r.polices.texte].pile);
  const borne = (n, min, max, defaut) => (Number.isFinite(Number(n)) ? Math.min(max, Math.max(min, Number(n))) : defaut);
  variable('--taille-texte', `${borne(r.tailleTexte, 14, 22, 17) / 16}rem`);
  variable('--rayon', `${borne(r.rayonCartes, 0, 32, 16)}px`);
  variable('--rayon-bouton', `${borne(r.rayonBoutons, 0, 24, 6)}px`);
  document.documentElement.toggleAttribute('data-sans-photo', r.photoAccueil === false);
}

/** Lit config/apparence.json (s'il existe) et l'applique ; renvoie les réglages complets. */
export async function chargerApparence() {
  try {
    const reponse = await fetch('config/apparence.json');
    if (!reponse.ok) return completer();
    const reglages = await reponse.json();
    appliquerApparence(reglages);
    return completer(reglages);
  } catch (erreur) {
    return completer();
  }
}
