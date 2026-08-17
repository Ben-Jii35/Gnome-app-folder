/* extension.js — Dense App Grid
 *
 * Densifie la vue « Applications » de GNOME Shell 50 :
 *  - fige le nombre de colonnes/lignes par page (au lieu des 4 modes adaptatifs
 *    de GNOME : 3x8, 4x6, 6x4, 8x3),
 *  - permet de forcer la taille des icônes,
 *  - compresse espacements, marges de page et marges internes des tuiles
 *    via une feuille de style générée à la volée.
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const CSS_KEYS = [
    'row-spacing',
    'column-spacing',
    'max-row-spacing',
    'max-column-spacing',
    'page-padding-vertical',
    'page-padding-horizontal',
    'tile-padding',
];

const GRID_KEYS = [
    'columns',
    'rows',
    'icon-size',
    'apply-to-folders',
    'folder-columns',
    'folder-rows',
];

export default class DenseAppGridExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        this._cssFile = null;
        this._themeChangedId = 0;
        this._settingsChangedId = 0;
        this._redisplayOverride = false;

        this._appDisplay = Main.overview?._overview?.controls?._appDisplay ?? null;
        if (!this._appDisplay) {
            console.warn(`${this.metadata.name}: vue des applications introuvable`);
            return;
        }

        this._hookRedisplay();

        this._settingsChangedId = this._settings.connect('changed', (_s, key) => {
            if (CSS_KEYS.includes(key))
                this._updateStylesheet();
            if (GRID_KEYS.includes(key))
                this._applyGrid();
        });

        // Main.loadTheme() (changement de thème, mode clair/sombre…) repart d'un
        // St.Theme neuf : il faut réinjecter notre feuille de style.
        this._themeChangedId = St.ThemeContext.get_for_stage(global.stage).connect(
            'notify::theme', () => this._loadStylesheet());

        this._updateStylesheet();
        this._applyGrid();
    }

    disable() {
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = 0;
        }

        if (this._themeChangedId) {
            St.ThemeContext.get_for_stage(global.stage).disconnect(this._themeChangedId);
            this._themeChangedId = 0;
        }

        this._unloadStylesheet();
        this._unhookRedisplay();
        this._restoreGrid();

        this._appDisplay = null;
        this._settings = null;
    }

    /* ---------------------------------------------------------------- grille */

    _allViews() {
        const views = [this._appDisplay];

        if (this._settings.get_boolean('apply-to-folders')) {
            for (const icon of this._appDisplay._folderIcons ?? []) {
                if (icon.view)
                    views.push(icon.view);
            }
        }

        return views;
    }

    _applyGrid() {
        const columns = this._settings.get_int('columns');
        const rows = this._settings.get_int('rows');
        const iconSize = this._settings.get_int('icon-size');
        const folderColumns = this._settings.get_int('folder-columns');
        const folderRows = this._settings.get_int('folder-rows');

        for (const view of this._allViews()) {
            const isFolder = view !== this._appDisplay;
            this._setGridMode(view._grid,
                isFolder ? folderColumns : columns,
                isFolder ? folderRows : rows,
                iconSize);
        }
    }

    _restoreGrid() {
        if (!this._appDisplay)
            return;

        // Restaure les modes adaptatifs par défaut de GNOME, ainsi que la
        // taille d'icône automatique. On repasse sur tous les dossiers, y
        // compris si l'option a été désactivée entre-temps.
        const views = [this._appDisplay];
        for (const icon of this._appDisplay._folderIcons ?? []) {
            if (icon.view)
                views.push(icon.view);
        }

        for (const view of views) {
            const grid = view._grid;
            if (!grid)
                continue;

            if (view === this._appDisplay) {
                grid.setGridModes(null);
            } else {
                // FolderGrid n'a qu'un seul mode 3x3 dans GNOME 50.
                grid.setGridModes([{rows: 3, columns: 3}]);
                grid.layout_manager.rows_per_page = 3;
                grid.layout_manager.columns_per_page = 3;
            }

            grid.layout_manager.fixed_icon_size = -1;
            grid._currentMode = -1;
            grid.queue_relayout();
        }
    }

    _setGridMode(grid, columns, rows, iconSize) {
        if (!grid)
            return;

        grid.setGridModes([{rows, columns}]);

        // _setGridMode() sort immédiatement si l'index du mode n'a pas changé.
        // Comme on ne fournit qu'un seul mode, son index reste 0 : sans ce
        // reset, un changement de colonnes/lignes ne serait jamais appliqué.
        grid._currentMode = -1;

        grid.layout_manager.fixed_icon_size = iconSize > 0 ? iconSize : -1;
        grid.queue_relayout();
    }

    /* Les dossiers sont recréés à chaque _redisplay() de l'AppDisplay :
     * on réapplique la grille juste après. */
    _hookRedisplay() {
        const appDisplay = this._appDisplay;
        const original = appDisplay._redisplay;

        this._originalRedisplay = original;
        this._redisplayOverride = true;

        const self = this;
        appDisplay._redisplay = function (...args) {
            const result = original.apply(this, args);
            self._applyGrid();
            return result;
        };
    }

    _unhookRedisplay() {
        if (!this._redisplayOverride)
            return;

        delete this._appDisplay._redisplay;
        this._originalRedisplay = null;
        this._redisplayOverride = false;
    }

    /* ------------------------------------------------------------ stylesheet */

    _buildCss() {
        const s = this._settings;
        const rowSpacing = s.get_int('row-spacing');
        const colSpacing = s.get_int('column-spacing');
        const maxRowSpacing = s.get_int('max-row-spacing');
        const maxColSpacing = s.get_int('max-column-spacing');
        const padV = s.get_int('page-padding-vertical');
        const padH = s.get_int('page-padding-horizontal');
        const tilePadding = s.get_int('tile-padding');

        return `/* Généré par ${this.metadata.name} — ne pas éditer à la main. */
.icon-grid {
  row-spacing: ${rowSpacing}px;
  column-spacing: ${colSpacing}px;
  max-row-spacing: ${Math.max(maxRowSpacing, rowSpacing)}px;
  max-column-spacing: ${Math.max(maxColSpacing, colSpacing)}px;
  page-padding-top: ${padV}px;
  page-padding-bottom: ${padV}px;
  page-padding-left: ${padH}px;
  page-padding-right: ${padH}px;
}

.overview-tile {
  padding: ${tilePadding}px;
}
`;
    }

    _updateStylesheet() {
        const dir = Gio.File.new_for_path(
            GLib.build_filenamev([GLib.get_user_cache_dir(), this.uuid]));

        try {
            dir.make_directory_with_parents(null);
        } catch (e) {
            if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.EXISTS)) {
                console.error(`${this.metadata.name}: ${e.message}`);
                return;
            }
        }

        this._unloadStylesheet();

        const file = dir.get_child('dense-app-grid.css');
        try {
            file.replace_contents(
                new TextEncoder().encode(this._buildCss()),
                null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
        } catch (e) {
            console.error(`${this.metadata.name}: écriture de la feuille de style: ${e.message}`);
            return;
        }

        this._cssFile = file;
        this._loadStylesheet();
    }

    _loadStylesheet() {
        if (!this._cssFile)
            return;

        const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
        theme?.load_stylesheet(this._cssFile);
    }

    _unloadStylesheet() {
        if (!this._cssFile)
            return;

        const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
        theme?.unload_stylesheet(this._cssFile);
        this._cssFile = null;
    }
}
