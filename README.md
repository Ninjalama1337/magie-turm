# 🧙✨ Magie-Turm

Cutes deutsches **Idle-Game** für Android & Browser. Baue deinen Magierturm aus, stelle Zauberer ein und sammle Mana — für immer!

![Gameplay](shot-game.png)

## Spielprinzip
- 👆 **Tippe** auf den Bildschirm → Mana
- 🧒🧙🧝🐉🦄 **5 Zauberer-Typen** anheuern → Mana pro Sekunde
- 🪄 **Tap-Kraft-Upgrades** (werden teurer, lohnen sich immer)
- ⭐ **Prestige**: Turm-Neustart gegen Sterne → **+5% Mana pro Stern, für immer**
- 🤖 **Auto-Prestige** (3 ⭐): Prestigt automatisch ab deiner Sterne-Schwelle
- 🌙 **Offline-Fortschritt**: 50% Ertrag, bis zu 24h
- 💾 Auto-Save alle 2s (localStorage)

## Android-APK installieren
1. Letzte [Release](../../releases/latest) öffnen
2. `magie-turm.apk` herunterladen & installieren
3. Updates: einfach neue APK aus dem nächsten Release installieren (gleiche Signatur, drüber-installierbar)

Updates werden automatisch von GitHub geprüft — erscheint ein 🔄-Banner im Spiel, einfach „Neu laden" tippen (PWA/Browser-Modus).

## Entwicklung
```bash
npm install
node test.js          # 63 Unit-Tests (Game-Logik)
node check.js         # Syntax-Checks
npx playwright ...    # E2E (e2e.js, e2e-prestige.js)
npx cap copy android  # www/ befüllen
cd android && ./gradlew assembleDebug
```

## CI/CD
- **Push auf `main`** → Baut APK (mit Tests!) → Artifact
- **Tag `v*`** → Baut APK → **GitHub Release** mit `magie-turm.apk`
- Alle Builds identisch signiert (Keystore im Repo, Fixed-Key-Signing für debug+release)

---
Made with ✨ by Ninjalama1337
