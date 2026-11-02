"""Vérifie les vidéos de data/etirements.json (à lancer à la main, par ex. une fois par mois).

Interroge l'API officielle YouTube Data v3 (videos.list, 1 unité par
paquet de 50 vidéos) et écrit un rapport lisible dans
veille/verification-etirements.md : vidéos supprimées, devenues privées
ou dont l'intégration est désactivée.

Ce script NE MODIFIE PAS data/etirements.json : si une vidéo est
indisponible, passez vous-même "indisponible": true ou "masquee": true.

Lancement : python scripts/verifier_liens.py
"""

from datetime import date

from outils_youtube import appeler_api, ecrire_texte, lire_cle_api, lire_json


def main():
    cle = lire_cle_api()
    videos = [v for v in lire_json("data/etirements.json")["videos"] if not v.get("_exemple")]
    if not videos:
        raise SystemExit("Aucune vidéo à vérifier dans data/etirements.json.")

    trouvees = {}
    identifiants = [v["idVideo"] for v in videos]
    for debut in range(0, len(identifiants), 50):
        reponse = appeler_api("videos", {
            "part": "status",
            "id": ",".join(identifiants[debut:debut + 50]),
        }, cle)
        for element in reponse.get("items", []):
            trouvees[element["id"]] = element["status"]

    problemes, correctes = [], []
    for video in videos:
        statut = trouvees.get(video["idVideo"])
        if statut is None:
            raison = "supprimée ou introuvable"
        elif statut.get("privacyStatus") == "private":
            raison = "devenue privée"
        elif not statut.get("embeddable", True):
            raison = "intégration désactivée par la chaîne"
        else:
            correctes.append(video)
            continue
        problemes.append((video, raison))

    lignes = [f"# Vérification des vidéos d'étirements ({date.today():%d/%m/%Y})", ""]
    if problemes:
        lignes += ["## ⚠️ À traiter", ""]
        lignes += [f"- **{v['titre']}** ({v['chaine']}, id `{v['idVideo']}`) : {raison}"
                   for v, raison in problemes]
        lignes += ["", "→ Dans data/etirements.json, mettez \"indisponible\": true ou \"masquee\": true.", ""]
    else:
        lignes += ["✅ Toutes les vidéos sont disponibles.", ""]
    lignes.append(f"Vidéos vérifiées : {len(videos)} (correctes : {len(correctes)}).")

    fichier = ecrire_texte("veille/verification-etirements.md", "\n".join(lignes) + "\n")
    print(f"Rapport écrit dans {fichier}")


if __name__ == "__main__":
    main()
