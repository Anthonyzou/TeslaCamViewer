/**
 * CommandPalette - Vue 3 Island Component Wrapper
 * Mounts CommandPalette.vue Single File Component into document.body.
 */

import { createApp } from 'vue';
import CommandPaletteComponent from '../src/components/CommandPalette.vue';

class CommandPalette {
  constructor(app) {
    this.app = app;
    this.container = document.createElement('div');
    this.container.id = 'commandPaletteApp';
    document.body.appendChild(this.container);

    this._app = createApp(CommandPaletteComponent, {
      app: this.app,
    });
    this._instance = this._app.mount(this.container);
  }

  register(command) {
    if (this._instance?.register) {
      this._instance.register(command);
    }
  }

  registerMany(commands) {
    if (this._instance?.registerMany) {
      this._instance.registerMany(commands);
    }
  }

  setupGlobalShortcut() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K toggles palette. Don't trigger while typing in a
      // text input unless the input is our own palette input.
      if (!(e.key === 'k' || e.key === 'K')) return;
      if (!(e.ctrlKey || e.metaKey)) return;

      const tgt = e.target;
      const isTextInput =
        tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable);
      const isPaletteInput = tgt && tgt.classList?.contains('command-palette-input');
      if (isTextInput && !isPaletteInput) return;

      e.preventDefault();
      this.toggle();
    });
  }

  toggle() {
    if (this._instance?.toggle) {
      this._instance.toggle();
    }
  }

  open() {
    if (this._instance?.open) {
      this._instance.open();
    }
  }

  close() {
    if (this._instance?.close) {
      this._instance.close();
    }
  }
}

if (typeof window !== 'undefined') {
  window.CommandPalette = CommandPalette;
}

export default CommandPalette;
