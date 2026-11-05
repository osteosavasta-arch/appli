/* =========================================================
   Aide à l'installation de l'application sur le téléphone.
   - Android / Chrome : le navigateur propose l'installation ; on
     garde cette proposition et on affiche un bouton « Installer ».
   - iPhone / iPad : Apple ne permet pas de bouton ; on affiche les
     étapes (Partager → « Sur l'écran d'accueil »).
   - Rien ne s'affiche si l'appli est déjà installée.
   Aucune fenêtre ne s'ouvre sans que la personne touche le bouton.
   ========================================================= */

let propositionAndroid = null;

// Appli déjà ouverte depuis l'écran d'accueil ?
const dejaInstallee = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const estIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad récent

const estDansSafari = () => /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios|gsa|instagram|fban|fbav/i.test(navigator.userAgent);

// Chrome (Android) signale que l'appli peut être installée
window.addEventListener('beforeinstallprompt', (evenement) => {
  evenement.preventDefault();
  propositionAndroid = evenement;
  document.querySelectorAll('[data-bloc-installation]').forEach((bloc) => { bloc.innerHTML = contenu(); });
});

window.addEventListener('appinstalled', () => {
  propositionAndroid = null;
  document.querySelectorAll('[data-bloc-installation]').forEach((bloc) => bloc.remove());
});

function contenu() {
  if (propositionAndroid) {
    return `<button type="button" class="bouton bouton-installer" data-installer>Installer l'application</button>`;
  }
  if (estIOS()) {
    const navigateur = estDansSafari() ? '' : '<li>Ouvrez cette page dans <strong>Safari</strong>.</li>';
    return `
      <details class="aide-installation">
        <summary>Installer l'application sur l'iPhone</summary>
        <ol>
          ${navigateur}
          <li>Touchez le bouton <strong>Partager</strong> (carré avec une flèche vers le haut).</li>
          <li>Choisissez <strong>« Sur l'écran d'accueil »</strong>, puis <strong>Ajouter</strong>.</li>
        </ol>
      </details>`;
  }
  return `
    <details class="aide-installation">
      <summary>Installer l'application sur le téléphone</summary>
      <ol>
        <li>Ouvrez cette page dans <strong>Chrome</strong> (si elle s'est ouverte dans l'aperçu de l'appareil photo, touchez « Ouvrir dans Chrome »).</li>
        <li>Touchez le menu <strong>⋮</strong> en haut à droite.</li>
        <li>Choisissez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</li>
      </ol>
    </details>`;
}

/** Bloc à placer dans un écran (vide si l'appli est déjà installée). */
export function blocInstallation() {
  if (dejaInstallee()) return '';
  return `<div class="bloc-installation" data-bloc-installation>${contenu()}</div>`;
}

// Le bouton Android déclenche la fenêtre d'installation du navigateur
document.addEventListener('click', async (evenement) => {
  if (!evenement.target.closest('[data-installer]') || !propositionAndroid) return;
  propositionAndroid.prompt();
  await propositionAndroid.userChoice;
  propositionAndroid = null;
  document.querySelectorAll('[data-bloc-installation]').forEach((bloc) => { bloc.innerHTML = contenu(); });
});
