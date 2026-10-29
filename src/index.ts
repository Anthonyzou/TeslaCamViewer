/**
 * TeslaCamViewer Application Entry Point (TypeScript)
 * Bundles application modules in dependency order and mounts the top-level App.vue shell.
 */
import 'leaflet';
import { createApp } from 'vue';
import './index.css';
import './tailwind.css';

import App from './components/App.vue';

const app = createApp(App);
app.mount('#app');
