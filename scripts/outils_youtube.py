"""Outils communs aux scripts YouTube (lancés à la main, jamais automatiquement).

Lit la clé API dans le fichier .env (jamais envoyé sur GitHub)
et interroge l'API officielle YouTube Data v3.
"""

import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
API = "https://www.googleapis.com/youtube/v3/"


def lire_cle_api():
    """Cherche YOUTUBE_API_KEY=... dans le fichier .env à la racine du projet."""
    fichier = RACINE / ".env"
    if not fichier.exists():
        sys.exit("Fichier .env introuvable. Copiez .env.exemple en .env et collez-y votre clé API.")
    for ligne in fichier.read_text(encoding="utf-8").splitlines():
        if ligne.strip().startswith("YOUTUBE_API_KEY="):
            cle = ligne.split("=", 1)[1].strip().strip('"')
            if cle and not cle.startswith("collez"):
                return cle
    sys.exit("Aucune clé YOUTUBE_API_KEY dans le fichier .env.")


def appeler_api(ressource, parametres, cle):
    """Appelle l'API YouTube et renvoie la réponse (dictionnaire)."""
    adresse = API + ressource + "?" + urllib.parse.urlencode({**parametres, "key": cle})
    try:
        with urllib.request.urlopen(adresse, timeout=30) as reponse:
            return json.load(reponse)
    except urllib.error.HTTPError as erreur:
        detail = erreur.read().decode("utf-8", "replace")
        sys.exit(f"Erreur de l'API YouTube ({erreur.code}) : {detail[:500]}")


def lire_json(chemin):
    return json.loads((RACINE / chemin).read_text(encoding="utf-8"))


def ecrire_texte(chemin, contenu):
    fichier = RACINE / chemin
    fichier.parent.mkdir(parents=True, exist_ok=True)
    fichier.write_text(contenu, encoding="utf-8")
    return fichier
