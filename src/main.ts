import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel-decorative/700.css';
import '@fontsource/crimson-pro/400.css';
import '@fontsource/crimson-pro/600.css';
import './styles/main.css';
import { App } from './ui/app';
import { checkForUpdate, isNative } from './ui/update';

const root = document.getElementById('app')!;
const app = new App(root);
(window as unknown as { __app: App }).__app = app;
app.show('title');

void checkForUpdate();

if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
