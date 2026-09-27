import { h } from './dom';

const REPO = 'Ninjalama1337/magie-turm';

interface CapWindow {
  Capacitor?: { isNativePlatform?: () => boolean };
}

export function isNative(): boolean {
  return !!(window as unknown as CapWindow).Capacitor?.isNativePlatform?.();
}

function newer(a: string, b: string): boolean {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return false;
}

/** Prüft in der Android-App, ob auf GitHub ein neueres Release liegt, und zeigt ein Banner. */
export async function checkForUpdate(): Promise<void> {
  if (!isNative() || !navigator.onLine) return;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return;
    const rel = (await res.json()) as { tag_name?: string; html_url?: string; assets?: { name: string; browser_download_url: string }[] };
    if (!rel.tag_name || !newer(rel.tag_name, __APP_VERSION__)) return;
    const apk = rel.assets?.find((a) => a.name.endsWith('.apk'))?.browser_download_url ?? rel.html_url ?? '#';
    const bar = h('div', { class: 'update-banner' });
    bar.innerHTML = `<span>Neue Version <b>${rel.tag_name}</b> verfügbar</span>`;
    bar.append(
      h('a', { class: 'btn small primary', text: 'Laden', href: apk, target: '_blank', rel: 'noopener' }),
      h('button', { class: 'btn small ghost', text: '✕', onclick: () => bar.remove() }),
    );
    document.body.append(bar);
  } catch {
    /* offline – egal */
  }
}
