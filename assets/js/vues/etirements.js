/* Étirements : vidéos YouTube d'une liste fixe (data/etirements.json).
   Protection de la vie privée : AUCUN contenu YouTube n'est chargé
   avant que la personne touche « Lire la vidéo ». Le lecteur utilise
   le mode « confidentialité renforcée » (youtube-nocookie.com).
   Adresse : #etirements (toutes) ou #etirements/dos (une sous-catégorie). */

import { chargerJSON, estVisible, marqueRelecture, echapper } from '../app.js';

export async function afficherEtirements(parametre) {
  const donnees = await chargerJSON('data/etirements.json');
  const videos = donnees.videos.filter((v) => !v.masquee && estVisible(v));
  const categories = donnees.sousCategories.filter((c) => !parametre || c.id === parametre);

  const onglets = `
    <ul class="onglets">
      <li><a href="#etirements" ${!parametre ? 'aria-current="true"' : ''}>Tout</a></li>
      ${donnees.sousCategories.map((c) => `
        <li><a href="#etirements/${c.id}" ${parametre === c.id ? 'aria-current="true"' : ''}>${echapper(c.nom)}</a></li>`).join('')}
    </ul>`;

  const sections = categories.map((categorie) => {
    const liste = videos.filter((v) => v.sousCategorie === categorie.id);
    const cartes = liste.length
      ? liste.map(carteVideo).join('')
      : '<p class="vide">Vidéos en cours de sélection.</p>';
    return `<h2>${echapper(categorie.nom)}</h2>${cartes}`;
  }).join('');

  return `
    <h1>Étirements</h1>
    ${onglets}
    ${sections}
    <p class="note-tiers">
      Vidéos de chaînes tierces, lues avec le lecteur YouTube. En touchant « Lire la vidéo »,
      vous vous connectez à YouTube (Google), qui applique ses propres règles :
      <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener">conditions d'utilisation de YouTube</a>,
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">règles de confidentialité de Google</a>.
    </p>`;
}

function carteVideo(video) {
  const marque = marqueRelecture(video);
  const entete = `
    ${marque.etiquette}
    <h3>${echapper(video.titre)}</h3>
    <p class="video-chaine">Chaîne : ${echapper(video.chaine)}</p>`;

  if (video.indisponible) {
    return `<div class="carte${marque.classe}">${entete}<p class="vide">Cette vidéo n'est plus disponible.</p></div>`;
  }
  // Seul l'identifiant de la vidéo est inséré ; il est vérifié (11 caractères autorisés)
  const id = /^[A-Za-z0-9_-]{11}$/.test(video.idVideo) ? video.idVideo : '';
  return `
    <div class="carte${marque.classe}">
      ${entete}
      <div class="video-zone" data-video="${id}">
        <button type="button" class="bouton bouton-secondaire" data-lire-video>▶ Lire la vidéo</button>
      </div>
    </div>`;
}

/* Au toucher de « Lire la vidéo », remplace le bouton par le lecteur YouTube.
   (Un seul écouteur pour toute l'appli, branché au chargement du fichier.) */
document.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('[data-lire-video]');
    if (!bouton) return;
    const conteneur = bouton.closest('.video-zone');
    const id = conteneur.dataset.video;
    if (!id) {
      conteneur.innerHTML = '<p class="vide">Cette vidéo n\'est plus disponible.</p>';
      return;
    }
    const lecteur = document.createElement('iframe');
    lecteur.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    lecteur.title = 'Lecteur vidéo YouTube';
    lecteur.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    lecteur.allowFullscreen = true;
    lecteur.referrerPolicy = 'strict-origin-when-cross-origin';
    lecteur.className = 'video-lecteur';
    conteneur.replaceChildren(lecteur);
});
