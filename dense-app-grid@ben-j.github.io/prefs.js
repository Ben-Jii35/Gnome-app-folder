/* prefs.js — Dense App Grid */

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

/**
 * Crée une ligne « compteur » liée à une clé entière du schéma.
 *
 * @param {Gio.Settings} settings réglages de l'extension
 * @param {string} key clé entière à lier
 * @param {string} title titre affiché
 * @param {string} subtitle sous-titre affiché
 * @param {number} min valeur minimale
 * @param {number} max valeur maximale
 * @returns {Adw.SpinRow} la ligne construite
 */
function spinRow(settings, key, title, subtitle, min, max) {
    const row = new Adw.SpinRow({
        title,
        subtitle,
        adjustment: new Gtk.Adjustment({
            lower: min,
            upper: max,
            step_increment: 1,
            page_increment: 5,
        }),
    });

    settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
    return row;
}

export default class DenseAppGridPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'Grille',
            icon_name: 'view-app-grid-symbolic',
        });
        window.add(page);

        /* --- Disposition --- */
        const layout = new Adw.PreferencesGroup({
            title: 'Disposition',
            description: 'Nombre d\'icônes affichées par page. GNOME utilise par défaut une grille adaptative (4x6 ou 6x4 selon l\'écran) ; ces valeurs la remplacent.',
        });
        page.add(layout);

        layout.add(spinRow(settings, 'columns', 'Colonnes par page',
            'Nombre d\'icônes par ligne', 2, 16));
        layout.add(spinRow(settings, 'rows', 'Lignes par page',
            'Nombre de lignes d\'icônes', 2, 12));

        const iconRow = new Adw.ComboRow({
            title: 'Taille des icônes',
            subtitle: 'GNOME n\'accepte que ces tailles pour la grille',
            model: Gtk.StringList.new([
                'Automatique', '96 px', '64 px', '48 px', '32 px', '24 px', '16 px',
            ]),
        });
        const iconSizes = [0, 96, 64, 48, 32, 24, 16];
        iconRow.selected = Math.max(0, iconSizes.indexOf(settings.get_int('icon-size')));
        iconRow.connect('notify::selected', () => {
            settings.set_int('icon-size', iconSizes[iconRow.selected]);
        });
        layout.add(iconRow);

        /* --- Compacité --- */
        const spacing = new Adw.PreferencesGroup({
            title: 'Compacité',
            description: 'Espaces entre les icônes et autour de la page. Réduisez-les pour gagner de la place.',
        });
        page.add(spacing);

        spacing.add(spinRow(settings, 'column-spacing', 'Espacement horizontal',
            'Écart minimal entre deux colonnes (px)', 0, 64));
        spacing.add(spinRow(settings, 'row-spacing', 'Espacement vertical',
            'Écart minimal entre deux lignes (px)', 0, 64));
        spacing.add(spinRow(settings, 'max-column-spacing', 'Espacement horizontal max.',
            'Écart maximal entre deux colonnes (px)', 0, 128));
        spacing.add(spinRow(settings, 'max-row-spacing', 'Espacement vertical max.',
            'Écart maximal entre deux lignes (px)', 0, 128));
        spacing.add(spinRow(settings, 'page-padding-horizontal', 'Marge horizontale',
            'Marge gauche/droite de la page (px)', 0, 128));
        spacing.add(spinRow(settings, 'page-padding-vertical', 'Marge verticale',
            'Marge haute/basse de la page (px)', 0, 128));
        spacing.add(spinRow(settings, 'tile-padding', 'Marge des tuiles',
            'Marge interne autour de chaque icône (px)', 0, 32));

        /* --- Dossiers --- */
        const folders = new Adw.PreferencesGroup({
            title: 'Dossiers',
            description: 'Grille utilisée à l\'intérieur des dossiers d\'applications (3x3 par défaut dans GNOME).',
        });
        page.add(folders);

        const foldersEnabled = new Adw.SwitchRow({
            title: 'Personnaliser les dossiers',
        });
        settings.bind('apply-to-folders', foldersEnabled, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        folders.add(foldersEnabled);

        const folderColumns = spinRow(settings, 'folder-columns', 'Colonnes', '', 2, 12);
        const folderRows = spinRow(settings, 'folder-rows', 'Lignes', '', 2, 12);
        folders.add(folderColumns);
        folders.add(folderRows);

        settings.bind('apply-to-folders', folderColumns, 'sensitive',
            Gio.SettingsBindFlags.GET);
        settings.bind('apply-to-folders', folderRows, 'sensitive',
            Gio.SettingsBindFlags.GET);

        /* --- Réinitialisation --- */
        const reset = new Adw.PreferencesGroup();
        page.add(reset);

        const resetButton = new Gtk.Button({
            label: 'Réinitialiser tous les réglages',
            halign: Gtk.Align.CENTER,
            css_classes: ['destructive-action'],
        });
        resetButton.connect('clicked', () => {
            for (const key of settings.settings_schema.list_keys())
                settings.reset(key);
            iconRow.selected = Math.max(0, iconSizes.indexOf(settings.get_int('icon-size')));
        });
        reset.add(resetButton);
    }
}
