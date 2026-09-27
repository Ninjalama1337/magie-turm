// Erzeugt den Changelog für ein Release aus den Commits seit dem letzten v*-Tag.
// Aufruf: node scripts/changelog.mjs <version>   (z. B. 2.0.57)
import { execSync } from 'node:child_process';

const version = process.argv[2] ?? '0.0.0';
const tag = `v${version}`;
const repo = process.env.GITHUB_REPOSITORY ?? '';
const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

let prev = '';
try {
  prev = sh(`git describe --tags --abbrev=0 --match "v*" --exclude "${tag}" HEAD`);
} catch {
  /* noch kein früheres Release */
}

const range = prev ? `${prev}..HEAD` : 'HEAD';
const commits = sh(`git log ${range} --no-merges --pretty=format:%s%x09%h`)
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    const [subject, hash] = l.split('\t');
    return { subject, hash };
  });

const groups = [
  { title: '✨ Neu', test: /^feat/i, items: [] },
  { title: '🐛 Fehlerbehebungen', test: /^fix/i, items: [] },
  { title: '⚖️ Balance & Verbesserungen', test: /^(perf|refactor|balance|style)/i, items: [] },
  { title: '🔧 Technik', test: /^(ci|build|chore|docs|test)/i, items: [] },
  { title: '📦 Sonstiges', test: /.*/, items: [] },
];

for (const c of commits) {
  const g = groups.find((x) => x.test.test(c.subject));
  // „feat(scope): Text“ → „Text“
  const text = c.subject.replace(/^[a-z]+(\([^)]*\))?!?:\s*/i, '');
  g.items.push(`- ${text.charAt(0).toUpperCase()}${text.slice(1)} (${c.hash})`);
}

const out = [`## Teufelsrad ${tag}`, ''];
if (!commits.length) out.push('Keine inhaltlichen Änderungen seit dem letzten Release.', '');
for (const g of groups) {
  if (!g.items.length) continue;
  out.push(`### ${g.title}`, ...g.items.slice(0, 40), '');
}
out.push('### 📱 Installation', 'Die `teufelsrad.apk` unten herunterladen und installieren – Updates lassen sich direkt drüber installieren.', '');
if (repo && prev) out.push(`**Alle Änderungen:** https://github.com/${repo}/compare/${prev}...${tag}`);
console.log(out.join('\n'));
