/* =========================================================
   Journal des erreurs techniques, gardé seulement sur ce téléphone.
   Chargé AVANT le reste du code (script classique dans index.html) :
   il note aussi les erreurs qui empêchent l'appli de démarrer.

   - Ce qui est noté : date, version, écran (#menu…), message d'erreur
     technique, fichier et ligne, type de navigateur. Aucune donnée saisie
     par la personne, rien n'est envoyé.
   - 30 entrées au plus (les plus anciennes sont effacées).
   - Lecture, copie et effacement : écran #journal.
   ========================================================= */
(function () {
  'use strict';
  var CLE = 'osteo-savasta-journal';
  var MAX = 30;

  function lire() {
    try {
      var liste = JSON.parse(localStorage.getItem(CLE));
      return Array.isArray(liste) ? liste : [];
    } catch (e) { return []; }
  }

  function ecrire(liste) {
    try { localStorage.setItem(CLE, JSON.stringify(liste.slice(-MAX))); } catch (e) { /* stockage impossible */ }
  }

  // Navigateur résumé (pas l'identifiant complet) : utile pour reproduire un souci
  function navigateur() {
    var ua = navigator.userAgent || '';
    var systeme = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'autre';
    var nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'autre';
    var installee = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    return systeme + ' · ' + nav + (installee ? ' · installée' : '');
  }

  var version = '';
  // La version est le nom de la copie hors ligne (osteo-savasta-v26.2), relue au démarrage
  // puis après l'installation du service worker
  function lireVersion() {
    if (!window.caches || !caches.keys) return;
    caches.keys().then(function (noms) {
      var nom = noms.filter(function (n) { return n.indexOf('osteo-savasta-') === 0; })[0];
      if (nom) version = nom.replace('osteo-savasta-', '');
    }).catch(function () {});
  }
  lireVersion();
  window.addEventListener('load', function () { setTimeout(lireVersion, 3000); });

  function court(texte, max) {
    texte = String(texte == null ? '' : texte);
    return texte.length > max ? texte.slice(0, max) + '…' : texte;
  }

  // Seulement le nom du fichier : pas d'adresse complète
  function fichier(source) {
    return String(source || '').split('?')[0].split('/').pop();
  }

  function noter(type, message, source, ligne) {
    var liste = lire();
    var entree = {
      date: new Date().toISOString(),
      version: version,
      ecran: location.hash || '#accueil',
      type: type,
      message: court(message, 300),
      source: fichier(source) + (ligne ? ':' + ligne : ''),
      navigateur: navigateur(),
    };
    // Même erreur répétée sur le même écran : on compte au lieu de remplir le journal
    var derniere = liste[liste.length - 1];
    if (derniere && derniere.message === entree.message && derniere.ecran === entree.ecran && derniere.type === entree.type) {
      derniere.fois = (derniere.fois || 1) + 1;
      derniere.date = entree.date;
    } else {
      liste.push(entree);
    }
    ecrire(liste);
  }

  window.addEventListener('error', function (evenement) {
    // Fichier qui ne se charge pas (script, image) : l'événement vient de l'élément
    var cible = evenement.target;
    if (cible && cible !== window && (cible.src || cible.href)) {
      noter('chargement', 'Fichier non chargé', cible.src || cible.href);
      return;
    }
    noter('erreur', evenement.message, evenement.filename, evenement.lineno);
  }, true);

  window.addEventListener('unhandledrejection', function (evenement) {
    var raison = evenement.reason;
    var pile = raison && raison.stack ? String(raison.stack).split('\n')[1] || '' : '';
    var lieu = /([\w.-]+\.js):(\d+)/.exec(pile);
    noter('promesse', raison && raison.message ? raison.message : raison, lieu ? lieu[1] : '', lieu ? lieu[2] : '');
  });

  // Appli restée sur « Chargement… » : le code n'a pas démarré
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (document.querySelector('#contenu .chargement')) noter('demarrage', "L'écran est resté sur « Chargement… » après 8 secondes", '');
    }, 8000);
  });

  window.JournalOsteo = {
    noter: noter,
    lire: lire,
    effacer: function () { try { localStorage.removeItem(CLE); } catch (e) { /* rien */ } },
  };
}());
