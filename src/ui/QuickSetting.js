"use strict";

import Gio from "gi://Gio";
import GObject from "gi://GObject";

import { panel as MainPanel } from "resource:///org/gnome/shell/ui/main.js";
import { QuickToggle, SystemIndicator } from "resource:///org/gnome/shell/ui/quickSettings.js";
import { gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";

import { logDebug, loopRun } from "../utils.js";

const BedtimeModeToggle = GObject.registerClass(
  class BedtimeModeToggle extends QuickToggle {
    constructor(extension) {
      super({
        title: _("Bedtime Mode"),
        gicon: extension.icon,
        toggleMode: true,
      });

      extension.getSettings().bind("bedtime-mode-active", this, "checked", Gio.SettingsBindFlags.DEFAULT);
    }
  }
);

const BedtimeModeIndicator = GObject.registerClass(
  class BedtimeModeIndicator extends SystemIndicator {
    constructor(extension) {
      super();

      this.quickSettingsItems.push(new BedtimeModeToggle(extension));

      this.connect("destroy", () => {
        this.quickSettingsItems.forEach((item) => item.destroy());
      });
    }
  }
);

export class QuickSetting {
  constructor(extension) {
    this.extension = extension;

    this._indicator = null;

    this._quickSettings = MainPanel.statusArea.quickSettings;

    this._checkMaxRetries = 4;
    this._checkRetryDelay = 50;
    this._checkLoopSource = null;
  }

  _checkDarkModeIndicator() {
    this._checkMaxRetries--;
    logDebug(`Dark Mode indicator check retries left ${this._checkMaxRetries}`);

    const found = !!this._quickSettings._darkMode;

    return (this._checkMaxRetries > 0 && !found) || this._addIndicator(found);
  }

  _addIndicator(darkModeFound) {
    this._destroyCheckLoopSource();

    switch (darkModeFound) {
      case true:
        logDebug(`Adding extension indicator before Dark Mode...`);

        this._quickSettings._addItemsBefore(
          this._indicator.quickSettingsItems,
          this._quickSettings._darkMode.quickSettingsItems[0]
        );
        break;

      case false:
        logDebug(`Adding extension indicator without placement...`);

        this._quickSettings.addExternalIndicator(this._indicator);
        break;
    }
  }

  create() {
    this._indicator = new BedtimeModeIndicator(this.extension);

    this._checkLoopSource = loopRun(this._checkDarkModeIndicator.bind(this), this._checkRetryDelay);
  }

  _destroyCheckLoopSource() {
    if (this._checkLoopSource) {
      logDebug(`Destroying Dark Mode check Loop Source ${this._checkLoopSource.get_id()}`);

      this._checkLoopSource.destroy();
      this._checkLoopSource = null;
    }
  }

  destroy() {
    this._destroyCheckLoopSource();

    this._indicator?.destroy();
    this._indicator = null;

    this._quickSettings = null;
  }
}
