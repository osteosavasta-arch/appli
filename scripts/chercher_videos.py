"""Recherche UNIQUE de vidéos candidates (à lancer à la main).

Pour chaque chaîne de config/chaines.json et chaque sous-catégorie,
interroge l'API officielle YouTube Data v3 (search.list), puis écrit
une liste lisible dans veille/etirements-candidates.md.

Ce script NE MODIFIE PAS data/etirements.json : c'est vous qui
recopiez les vidéos retenues.

Coût : chaque recherche consomme 100 unités du quota quotidien
(10 000 unités par jour par défaut). 8 chaînes × 4 sous-catégories = 3 200 unités.

Lancement : python scripts/chercher_videos.py
"""

from datetime import date

from outils_youtube import appeler_api, ecrire_texte, lire_cle_api, lire_json

RESULTATS_PAR_RECHERCHE = 5


def main():
    cle = lire_cle_api()
    config = lire_json("config/chaines.json")
    chaines = config.get("chaines", [])
    if not chaines:
        raise SystemExit("La liste blanche config/chaines.json est vide : ajoutez d'abord des chaînes.")

    sous_categories = {c["id"]: c["nom"] for c in lire_json("data/etirements.json")["sousCategories"]}
    lignes = [
        f"# Vidéos candidates – étirements ({date.today():%d/%m/%Y})",
        "",
        "Liste à trier. Pour garder une vidéo, recopiez son identifiant dans data/etirements.json.",
        "",
    ]

    for id_categorie, recherche in config["recherches"].items():
        lignes += [f"## {sous_categories.get(id_categorie, id_categorie)}", ""]
        for chaine in chaines:
            reponse = appeler_api("search", {
                "part": "snippet",
                "channelId": chaine["idChaine"],
                "q": recherche,
                "type": "video",
                "videoEmbeddable": "true",
                "maxResults": RESULTATS_PAR_RECHERCHE,
                "relevanceLanguage": "fr",
            }, cle)
            for element in reponse.get("items", []):
                id_video = element["id"]["videoId"]
                titre = element["snippet"]["title"]
                lignes.append(
                    f"- [ ] **{titre}** — {chaine['nom']} — id `{id_video}` — "
                    f"https://www.youtube.com/watch?v={id_video}"
                )
        lignes.append("")

    fichier = ecrire_texte("veille/etirements-candidates.md", "\n".join(lignes))
    print(f"Liste écrite dans {fichier}")


if __name__ == "__main__":
    main()
