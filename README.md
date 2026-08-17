# Dense App Grid — extension GNOME Shell 50

Densifie la vue « Applications » de GNOME : plus d'icônes par page, moins de
pagination, espacements réglables. Écrit pour **GNOME Shell 50 / Wayland**
(Fedora 44 testé).

## Ce que ça change

GNOME 50 utilise quatre dispositions adaptatives figées dans le code
(3x8, 4x6, 6x4, 8x3) et choisit celle dont le ratio colle le mieux à l'écran —
d'où les 6 colonnes × 4 lignes = 24 apps par page sur un écran classique.

L'extension remplace ce jeu de dispositions par une seule, la vôtre, et permet
en plus de :

- forcer la taille des icônes (96 / 64 / 48 / 32 / 24 / 16 px, ou automatique) ;
- réduire les espacements entre icônes (12 px min / 36 px max par défaut) ;
- réduire les marges de page (24 px vertical, 18 px horizontal par défaut) ;
- réduire la marge interne des tuiles (12 px par défaut) ;
- appliquer une grille personnalisée à l'intérieur des dossiers (3x3 par défaut).

Valeurs par défaut de l'extension : **8 colonnes × 5 lignes = 40 apps par page**,
espacements 6/16 px, marges 8 px.

## Installation

```bash
./install.sh
```

Puis **déconnectez-vous et reconnectez-vous**. Sous Wayland le Shell ne peut pas
être rechargé à chaud, et il ne scanne le dossier des extensions qu'au démarrage
de la session : une extension nouvellement copiée n'existe pas pour lui avant
une reconnexion. Le script l'inscrit d'avance dans
`org.gnome.shell enabled-extensions`, elle sera donc active dès votre retour.

Les installations suivantes (mise à jour du code) suivent la même règle : le
Shell garde en mémoire la version chargée au démarrage.

## Utilisation

```bash
gnome-extensions prefs dense-app-grid@ben-j.github.io   # réglages
gnome-extensions info  dense-app-grid@ben-j.github.io   # état
journalctl -f -o cat /usr/bin/gnome-shell               # journal (debug)
```

Les réglages s'appliquent immédiatement, sans reconnexion.

## Désinstallation

```bash
./install.sh --uninstall
```

## Notes

- **Taille des icônes** : GNOME n'accepte que les six tailles listées ; toute
  autre valeur serait ignorée par le moteur de grille, d'où la liste déroulante
  plutôt qu'un champ libre.
- **Trop d'icônes par page** : si colonnes × lignes ne tient pas dans l'écran à
  la taille d'icône demandée, les icônes débordent ou se chevauchent. Baissez la
  taille d'icône, ou le nombre de lignes/colonnes.
- **Autres extensions** : `just-perfection-desktop` et `dash-to-dock` touchent
  aussi à la vue d'ensemble. En cas de comportement bizarre, désactivez-les
  temporairement pour isoler.
- La feuille de style dynamique est générée dans
  `~/.cache/dense-app-grid@ben-j.github.io/`.

## Structure

```
install.sh
dense-app-grid@ben-j.github.io/
├── metadata.json
├── extension.js    # logique : grille + injection CSS
├── prefs.js        # fenêtre de réglages (libadwaita)
└── schemas/org.gnome.shell.extensions.dense-app-grid.gschema.xml
```
