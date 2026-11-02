# Application du cabinet Ostéo Savasta

Application mobile installable (PWA) pour les patients du cabinet de Chirens.
Pas de store, pas de serveur, pas de compte, aucune donnée patient.

**Déjà en place** : accueil, boutons « Prendre rendez-vous » et « Contacter le cabinet » (appel, WhatsApp Business, e-mail), rappel facultatif de bilan (fichier agenda), étirements (liste fixe de vidéos, vide pour l'instant), page Diététique (vide pour l'instant).
Phases suivantes : fruits et légumes et compléments alimentaires (dans Diététique), Ressources.
Le calendrier de saison est désactivé pour le moment ; ses fichiers sont conservés (`data/calendrier.json`).

---

## ⚠️ À savoir avant tout : le dépôt est public

GitHub Pages est gratuit à condition que le dépôt (le dossier en ligne qui contient l'appli) soit **public**. Tout le monde peut donc lire tous les fichiers, **y compris les textes encore « à relire »** (ils ne s'affichent pas dans l'appli, mais ils sont lisibles dans le dépôt).

Règles :
- **jamais** de donnée patient, de nom, d'adresse personnelle ou de mot de passe dans les fichiers ;
- **jamais le fichier `.env`** (il contient la clé YouTube) : il reste sur votre ordinateur. Quand vous glissez les fichiers dans GitHub, ne sélectionnez pas `.env`.

---

## 1. Créer votre compte GitHub (une seule fois, 15 min)

1. Allez sur [github.com/signup](https://github.com/signup).
2. Utilisez votre **adresse e-mail professionnelle**.
3. Choisissez un **nom d'utilisateur** : il apparaîtra dans l'adresse de l'appli (`nom-utilisateur.github.io/...`). Exemple : `osteo-savasta`.
4. Choisissez un mot de passe long et unique (idéalement dans un gestionnaire de mots de passe).
5. **Activez la double authentification** : photo de profil (en haut à droite) → *Settings* → *Password and authentication* → *Enable two-factor authentication*. Choisissez une application d'authentification sur votre téléphone (par ex. celle de votre gestionnaire de mots de passe, Google Authenticator ou Microsoft Authenticator).
6. **Téléchargez les codes de secours** proposés par GitHub et rangez-les à part (imprimés ou dans votre gestionnaire de mots de passe). Sans eux, perdre votre téléphone peut vous bloquer l'accès.

## 2. Mettre l'appli en ligne (une seule fois, 15 min)

1. Sur GitHub, cliquez sur **+** (en haut à droite) → *New repository*.
2. Nom du dépôt : par ex. `appli` → cochez **Public** → *Create repository*.
3. Sur la page qui s'affiche, cliquez sur le lien **uploading an existing file**.
4. Ouvrez sur votre ordinateur le dossier de l'appli, sélectionnez **tout son contenu** (fichiers et dossiers) et faites-le glisser dans la page. Attendez la fin du chargement.
5. En bas, cliquez sur **Commit changes**.
6. Allez dans *Settings* (onglet du dépôt) → *Pages* (menu de gauche).
7. Dans *Branch*, choisissez **main** et **/(root)**, puis *Save*.
8. Après 1 à 3 minutes, l'adresse s'affiche en haut de cette page, par exemple `https://osteo-savasta.github.io/appli/`. C'est l'adresse de l'appli à donner aux patients (vous pourrez la mettre sur votre site Squarespace).

## 3. Modifier un texte ou un lien (2 min)

Tous les contenus sont dans des fichiers `.json` ou `.md`, modifiables directement sur GitHub :

| Pour changer… | Fichier |
|---|---|
| Lien de prise de rendez-vous, téléphone, WhatsApp, e-mail, textes du panneau « Contacter le cabinet » | `config/liens.json` |
| Nom, ville, adresse, horaires, tarif, texte de présentation | `config/cabinet.json` |
| Délai du rappel (6 mois), heure des alertes, textes du rappel | `config/rappel.json` |
| Thèmes et conseils de chaque mois (calendrier désactivé pour le moment) | `data/calendrier.json` |
| Vidéos d'étirements | `data/etirements.json` |
| Fruits et légumes de saison (mois, valeurs nutritionnelles, recettes) | `data/fruits-legumes.json` |
| Compléments alimentaires | `data/complements.json` |
| Confidentialité, mentions légales | `pages/confidentialite.md`, `pages/mentions-legales.md` |

Méthode :
1. Ouvrez le fichier sur GitHub, cliquez sur le **crayon** ✏️ (*Edit this file*).
2. Modifiez **uniquement le texte entre guillemets**. Gardez les guillemets `"`, les virgules `,` et les crochets `[ ]` ou accolades `{ }`.
3. Cliquez sur **Commit changes…** puis à nouveau **Commit changes**.
4. L'appli est à jour en ligne après 1 à 3 minutes.

💡 Si vous voulez mettre un guillemet dans un texte, utilisez plutôt les guillemets français « ».

## 4. Valider un contenu (rien n'est publié sans vous)

Chaque contenu porte un statut :
- `"statut": "a-relire"` → **invisible** dans l'appli ;
- `"statut": "validee"` → **visible** par tous.

**Le plus simple : la page de relecture** (sur votre ordinateur)
1. Dans le dossier de l'appli, ouvrez `relecture\relecture.html` avec **Microsoft Edge** ou **Google Chrome** (clic droit → *Ouvrir avec*).
2. Cliquez sur **Ouvrir le dossier de l'appli**, choisissez le dossier `ostéo appli` et acceptez l'autorisation de modification.
3. Lisez les fiches (onglets Fruits et légumes, Compléments, Étirements, Présentation), cochez **Valider** sur celles qui sont prêtes. Décocher remet une fiche « à relire ».
4. Cliquez sur **Enregistrer**. Les fichiers de l'appli sont mis à jour.
5. Si l'appli est déjà en ligne : déposez ensuite sur GitHub les fichiers modifiés (`data/…json`, `config/cabinet.json`).

**À la main** (sur GitHub ou dans le Bloc-notes) : remplacez `a-relire` par `validee` (sans accent), puis enregistrez (*Commit changes* sur GitHub). Pour retirer un contenu, remettez `a-relire`.

## 5. Les vidéos d'étirements

La liste est **fixe** : rien ne change tout seul.

**Ajouter une vidéo** : dans `data/etirements.json`, recopiez le bloc d'exemple, puis remplissez :
- `idVideo` : les 11 caractères après `v=` dans l'adresse YouTube (ex. `https://www.youtube.com/watch?v=AbCdEfGhIjK` → `AbCdEfGhIjK`) ;
- `titre`, `chaine` ;
- `sousCategorie` : `membre-superieur`, `membre-inferieur`, `dos` ou `cou-nuque` ;
- `statut` : `validee` pour l'afficher ; `masquee` : `false`.

**Retirer une vidéo en 1 minute** : mettez `"masquee": true`, puis *Commit changes*.

**Chercher des vidéos candidates ou vérifier les liens** (facultatif, sur votre ordinateur) : deux petits programmes interrogent l'API officielle de YouTube. Ils ne modifient jamais l'appli : ils écrivent seulement un rapport dans le dossier `veille/`.
1. Installez Python depuis [python.org](https://www.python.org/downloads/) (une seule fois).
2. Créez une clé API YouTube Data v3 dans la [console Google Cloud](https://console.cloud.google.com/) (je peux vous guider). Limitez-la à « YouTube Data API v3 ».
3. Copiez le fichier `.env.exemple` sous le nom `.env` et collez votre clé à la place du texte. **Ne déposez jamais `.env` sur GitHub.**
4. Dans le dossier de l'appli, ouvrez un terminal et tapez :
   - `python scripts/chercher_videos.py` → liste de candidates dans `veille/etirements-candidates.md` (il faut d'abord remplir la liste blanche `config/chaines.json`) ;
   - `python scripts/verifier_liens.py` → vidéos devenues indisponibles dans `veille/verification-etirements.md`. À lancer une fois par mois.

## 6. Le rappel « dernière consultation » et le bouton « Contacter le cabinet »

- Le rappel est **facultatif** pour les patients et calculé dans leur téléphone : rien ne vous est envoyé. Vous réglez le délai (6 mois) et les textes dans `config/rappel.json`.
- Le bouton **Contacter le cabinet** (accueil et menu du bas) ouvre un panneau avec trois choix : appel, WhatsApp Business, e-mail. Pour ajouter des horaires de réponse, remplissez `horairesReponse` dans `config/liens.json`.

## 7. Installer l'appli sur un téléphone

- **iPhone** : ouvrez l'adresse dans **Safari** → bouton Partager → *Sur l'écran d'accueil*.
- **Android** : ouvrez l'adresse dans **Chrome** → menu ⋮ → *Installer l'application* (ou *Ajouter à l'écran d'accueil*).

Ces explications sont aussi dans l'appli, rubrique *Infos*.

## 8. En cas de souci

- **J'ai modifié un fichier et l'appli ne marche plus** : il manque probablement une virgule ou un guillemet. Ouvrez le fichier → bouton *History* → choisissez la version précédente pour la comparer, et corrigez. Vous pouvez aussi coller le contenu du fichier sur [jsonlint.com](https://jsonlint.com) pour trouver l'erreur.
- **Le téléphone affiche une ancienne version** : fermez complètement l'appli et rouvrez-la (deux fois si besoin). Les textes (`.json`, `.md`) se mettent à jour tout seuls dès qu'il y a du réseau.
- **J'ai modifié le code (fichiers `.html`, `.css`, `.js`)** : dans `sw.js`, augmentez le numéro de `VERSION` (`'v1'` → `'v2'`), sinon les téléphones garderont l'ancienne version.

## 9. Relire les contenus avant validation (facultatif, sur ordinateur)

Le « mode relecture » montre les contenus `a-relire` surlignés en jaune. Il ne fonctionne **que sur votre ordinateur**, jamais sur le site public. Je pourrai vous l'installer en direct si vous le souhaitez ; sinon, relisez simplement les fichiers sur GitHub.

---

## Organisation des fichiers

```
index.html              page unique de l'appli
manifest.webmanifest    nom, icône et couleurs pour l'installation
sw.js                   mode hors ligne
404.html                renvoie vers l'accueil si une adresse est inconnue
assets/css/style.css    couleurs et mise en page (couleurs en haut du fichier)
assets/js/              code de l'appli (commenté en français)
assets/icones/          icônes et logo du bandeau, créés à partir de l'image du dos (originaux dans source/)
config/                 réglages : liens, présentation, rappel, liste blanche YouTube
data/                   contenus : étirements, calendrier (désactivé), puis fruits et légumes, etc.
pages/                  confidentialité, mentions légales
scripts/                programmes YouTube à lancer à la main (jamais automatiques)
veille/                 rapports produits par ces programmes
.env.exemple            modèle pour la clé YouTube (le vrai .env ne va jamais sur GitHub)
```

## Respect de la vie privée

Aucun cookie, aucun compte, aucune statistique, aucune police ou bibliothèque chargée depuis un site tiers. Rien n'est envoyé au cabinet. YouTube, WhatsApp, la messagerie et la page de rendez-vous ne s'ouvrent que si la personne touche le bouton correspondant. La date de dernière consultation n'est gardée dans le téléphone que si la personne coche la case prévue.
