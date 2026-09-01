/* Syntax-Check: index.html Inline-Script + sw.js + game.js */
const fs = require('fs');
let fail = 0;
function check(name, code) {
  try { new Function(code); console.log('✓ SYNTAX OK: ' + name); }
  catch (e) { fail++; console.log('✗ SYNTAX FEHLER in ' + name + ': ' + e.message); }
}
const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
scripts.forEach((m, i) => check('index.html <script> #' + (i + 1), m[1]));
check('game.js', fs.readFileSync('game.js', 'utf8'));
check('sw.js', fs.readFileSync('sw.js', 'utf8'));
// Grundlegende HTML-Sanity
['id="c"', 'id="shop"', 'id="prestigeBtn"', 'id="autoBtn"', 'id="offlineModal"', 'id="updateBanner"', 'manifest.json', 'sw.js'].forEach(function (needle) {
  if (html.includes(needle)) console.log('✓ HTML enthält: ' + needle);
  else { fail++; console.log('✗ HTML FEHLT: ' + needle); }
});
console.log(fail ? 'FEHLER: ' + fail : 'ALLE CHECKS OK');
process.exit(fail ? 1 : 0);
