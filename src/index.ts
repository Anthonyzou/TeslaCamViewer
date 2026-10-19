/**
 * TeslaCamViewer Application Entry Point (TypeScript)
 * Bundles application modules in dependency order and mounts the top-level App.vue shell.
 */
import './index.css';
import { createApp } from 'vue';

// Internationalization should be first to initalize
import './utils/i18n';

import App from './components/App.vue';

const app = createApp(App);
app.mount('#app');
