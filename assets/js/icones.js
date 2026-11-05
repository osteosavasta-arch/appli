/* Icônes dessinées de l'appli (la charte exclut les emojis).
   icone('agenda') renvoie le SVG ; icone('lecture', 'icone-petite icone-pleine') ajoute des classes. */

const TRACES = {
  agenda: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  bulle: '<path d="M21 12a8 8 0 0 1-11.8 7L4 20.5 5.5 15A8 8 0 1 1 21 12Z"/>',
  corps: '<circle cx="13" cy="4.5" r="2"/><path d="M6 21l4-6 3 2 1-6 4 3M10 9l3-1 1 3"/>',
  feuille: '<path d="M5 19C5 10 11 5 20 4c0 9-5 15-13 15M5 19c2-5 5-8 9-10"/>',
  document: '<path d="M5 4h11l3 3v13H5zM9 11h6M9 15h6"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  retour: '<path d="M15 6l-6 6 6 6"/>',
  lecture: '<path d="M8 5l11 7-11 7z"/>',
  epingle: '<path d="M12 21s7-6.200 7-11.500a7 7 0 1 0-14 0C5 14.800 12 21 12 21Z"/><circle cx="12" cy="9.500" r="2.500"/>',
};

export function icone(nom, classes = '') {
  return `<svg class="icone ${classes}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${TRACES[nom]}</svg>`;
}
