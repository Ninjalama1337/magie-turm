# Teufelsrad

Ein okkulter **Roulette-Roguelite-Deckbuilder** für Browser und Handy (PWA), inspiriert von *The Loopler* und *Balatro*.

> Setze deine Seele. Dreh das Rad. Jage die Unendlichkeit.

## Spielprinzip

| Element | Bedeutung |
|---|---|
| **Seelenkugel** | Sie kreist Runde um Runde im Kessel; jede Runde bringt **Glut**. Mit mehr **Tempo** fährt sie mehr Runden. |
| **Siegel** | Werden auf den 8 **Rauten** am Kesselrand platziert. Jede Kugel löst sie bei jeder Runde **der Reihe nach** aus. |
| **Arkana** | Tarotkarten (max. 5), die auf Runden, Siegel, Landungen und Einsätze reagieren. Die Reihenfolge zählt. |
| **Pakte** | Passive, stapelbare Boni, teils mit einem Preis. |
| **Irrlichter** | Geisterkugeln, die zusätzlich Runden fahren und Siegel auslösen. |
| **Einsatz** | Vor jeder Drehung: Farbe, Gerade/Ungerade, Hälfte, Dutzend oder Zahl. Ein Treffer multipliziert den **Fluch**. |
| **Opfergabe** | **Glut × Fluch**. Erreiche das Ziel des Rituals, bevor die Drehungen ausgehen. |

Ein Run führt durch die **9 Höllenkreise** mit je drei Ritualen: Klein, Groß und einem **Dämon**, der die Regeln verdreht. Im neunten Kreis wartet Luzifer. Danach geht es im **Jenseits** endlos weiter, mit super-exponentiell wachsenden Zielen (Zahlen über `1e308` dank `break_eternity.js`).
Zwischen den Ritualen kaufst du im **Basar** ein: Arkana, Siegel (erneuter Kauf erhöht die Stufe), Pakte und Fach-Verzauberungen. Außerdem kannst du Rauten freilegen und Arkana aufwerten.
Mit **Asche** aus beendeten Runs und Erfolgen wächst im **Grimoire** ein **Talentbaum** mit drei Pfaden zu je 8 Knoten: *Flamme* (Glut und Fluch), *Gold* (Seelen, Basar, Tränke) und *Kugel* (Tempo, Rauten, Irrlichter). Späte Knoten und die Schlusssteine sind ein Langzeitziel (insgesamt 1.980 Asche). Die alten Grimoire-Segnungen werden beim Update als Asche erstattet.

**Inhalt (v0.2):**
- 50 Arkana: 25 Große, 24 Kleine Arkana in 4 Farben und Der Spieler
- 30 Siegel, 40 Pakte, 12 Tränke
- 13 Dämonen, 5 Verzauberungen
- 6 Kessel, 5 Höllenstufen
- 12 Omen, 21 Erfolge

### Beschwörer
Vor jedem Run wählst du, wer den Pakt schließt. Jeder Beschwörer hat ein eigenes Start-Siegel und eigene Vor- und Nachteile:

| Beschwörer | Besonderheit | Freischaltung |
|---|---|---|
| Der Wanderer | Klassisch | von Beginn an |
| Die Hexe | 2 Start-Tränke, +1 Trank-Platz, günstigere Tränke, −2 Seelen | 3 Runs |
| Der Spieler | Knochenwürfel; Zahl ×27, Dutzend ×4, einfache Einsätze nur ×1,6 | Kreis 3 |
| Der Geisterseher | Irrlichtsiegel, Start-Irrlicht, +2 Irrlicht-Limit, −2 Glut/Runde | Erkenntnis-Stufe 2 |
| Die Blutgräfin | Blutsiegel, +2 Basis-Fluch, −1 Seele je Ritual | Kreis 5 |
| Der Alchemist | Freies Neu-Würfeln, +1 Arkana- und Siegel-Angebot, nur 4 Arkana-Plätze | Luzifer besiegt |

Herausforderungen nutzen immer den Wanderer.

### Siegel-Synergien
Jedes Siegel gehört zu einem **Element** (Flamme, Blut, Sturm, Geist, Gold, Arkan).
- **Resonanz:** Liegt ein Siegel direkt neben einem Siegel desselben Elements, wirkt es eine Stufe stärker.
- **Bünde:** Mehrere Siegel eines Elements auf freien Rauten schalten Boni frei, zum Beispiel 3× Flamme für +3 Glut pro Runde oder 5× Flamme für ×1,5 Glut am Drehende.

### Begegnungen, Fusionen und Chronik
- **Begegnungen:** In etwa 40 % der Basare wartet eine Begegnung mit einer Entscheidung, etwa der Blutaltar (eine Drehung weniger im nächsten Ritual, dafür dauerhaft mehr Fluch) oder die schwarze Katze (Münzwurf um Seelen). Es gibt 9 Begegnungen, in Herausforderungen keine.
- **Arkana-Fusion:** Zwei passende Arkana auf Stufe 3 verschmelzen im Basar zu einer legendären Karte, zum Beispiel Sonne + Mond zur *Sonnenfinsternis*. Es gibt 6 Rezepte; sie stehen in den Kartendetails und im Kodex.
- **Chronik:** Der Kodex zeigt die letzten 25 Runs mit Beschwörer, Deck und Todesursache sowie Gesamtstatistiken.

### Kessel & Höllenstufen
| Kessel | Besonderheit |
|---|---|
| Europäisch | Klassisch, 37 Fächer |
| Amerikanisch | 0 **und** 00, Höllen-Synergien, Start mit *Der Turm* |
| Mini-Rad | Nur 0–12, rasend schnell, Drittel statt Dutzend |
| Blutrad | 6 Blutfächer, −1 Arkana-Platz |
| Knochenrad | Alle 8 Rauten frei, schwere Kugel |
| Sternenrad | Glück ×2, nur 3 Drehungen |

Einen neuen Kessel schaltest du frei, indem du mit dem vorherigen gewinnst oder ihn mit Asche kaufst. Jeder Sieg öffnet die nächste der 5 Höllenstufen für diesen Kessel.

### Freischaltungen (Erkenntnis)
Jeder Run beginnt mit einem kleinen **Start-Pool**: 12 Arkana, 8 Siegel, 10 Pakte und 4 Tränke. Alles andere ist versiegelt und im Kodex mit einem Hinweis sichtbar, wie man es freischaltet.
- **Erkenntnis-Stufen:** Jeder normale Run gibt Erkenntnis, auch eine Niederlage, und je tiefer man kommt, desto mehr. 16 Stufen schalten in kuratierter Reihenfolge zusammenpassende **Kombo-Gruppen** frei, zum Beispiel „Tag und Nacht“ (Sonne, Mond, Pakt der Farben) oder „Geisterstunde“ (Schatten, Liebende, Irrlichtsiegel, Zweite Kugel, Horde).
- **Entdeckungen:** 15 Karten entdeckt man durch eine bestimmte Spielweise. Beispiele: 20 Runden in einer Drehung schalten *Der Teufel* frei, 5 Irrlichter schalten *Ritter der Kelche* frei. Entdeckte Karten erscheinen sofort im Basar des laufenden Runs.
- **Ausnahme:** Tägliche und wöchentliche Herausforderungen nutzen den vollen Pool, damit sie für alle gleich sind.

### Herausforderungen
Täglich und wöchentlich gibt es einen festen Seed mit Kessel, Stufe und Omen, gleich für alle Spieler. Grimoire-Boni gelten dabei nicht, und gewertet wird der erste Versuch (lokaler Verlauf und Serie).

### Weitere Systeme
- **Editionen:** Arkana erscheinen im Basar manchmal als Folie, Holo, Polychrom oder Negativ.
- **Tränke:** Einmal-Effekte vor einer Drehung oder im Basar.
- **Vibration:** Auf dem Handy vibriert das Gerät bei Treffern, Siegen und Rekorden. Das lässt sich in den Einstellungen abschalten.
- **Spielstand-Export:** In den Einstellungen lässt sich der komplette Fortschritt als Code exportieren und auf einem anderen Gerät oder nach einer Neuinstallation wieder importieren.
- **Bedienung:** Drag & Drop, Hover-Tooltips am Desktop, geführtes Tutorial, Einstellungen (Musik, Effekte, Wackeln, reduzierte Effekte).

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server
npm test           # Unit-Tests (Vitest)
npm run sim        # Balance-Simulation, z. B. npm run sim -- runs=500 pool=starter bot=sim
npm run build      # Typecheck + Produktions-Build nach dist/
npm run e2e        # Playwright-Smoke-Test gegen den Build (Screenshots in e2e/shots/)
npm run icons      # PWA- und Android-Icons/Splashscreens aus public/icon.svg erzeugen
npm run apk        # Build + Capacitor-Sync + APK (benötigt Android-SDK)
```

### Android
`android/` ist ein Capacitor-Projekt (`de.ninjalama.teufelsrad`, Hochformat). Alle Builds werden mit `android/teufelsrad.jks` identisch signiert, damit Updates drüber installierbar sind. Die App zeigt ein Banner, sobald auf GitHub ein neueres Release liegt.

> **Sicherheit:** Der Keystore liegt wie beim Vorgängerprojekt im Repo; das ist nur in Ordnung, solange das Repo privat bleibt. Sollte es je öffentlich werden, lege stattdessen die Secrets `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` und `ANDROID_KEY_PASSWORD` an. Die CI nutzt sie automatisch, und der Repo-Keystore kann dann entfernt werden.

### Architektur

```
src/core/      Reine, deterministische Spiellogik (Seeded RNG)
  spin.ts      Simulation einer Drehung → Event-Log
  run.ts       Kreise, Rituale, Ziele, Belohnungen
  shop.ts      Basar-Logik
  save.ts      Speichern/Laden (localStorage) + Meta-Fortschritt
src/content/   Arkana, Siegel, Pakte, Dämonen (datengetrieben)
src/render/    Canvas-Kessel, Partikel, Timeline (spielt das Event-Log animiert ab)
src/ui/        Screens & Komponenten (DOM), prozedurale Glyphen
src/audio/     Prozedurale WebAudio-Soundeffekte
```

Simulation und Darstellung sind strikt getrennt: `simulateSpin()` berechnet das komplette Ergebnis sofort, und die Timeline spielt die Events anschließend zeitlich ab. Dadurch sind Logik und Balancing headless testbar.

## CI/CD

Jeder Push und jeder PR durchläuft Typecheck, Unit-Tests, Balance-Simulation, Build und E2E. Danach baut ein zweiter Job die signierte **APK** als Artifact.
- **Jeder Push auf `main`** (also jeder gemergte PR) erstellt automatisch ein **GitHub Release** `v2.0.<Build-Nummer>` mit der signierten `teufelsrad.apk` und einem **Changelog**. Den Changelog erzeugt `scripts/changelog.mjs` aus den Commits seit dem letzten Release, gruppiert nach Präfix (`feat` → Neu, `fix` → Fehlerbehebungen, `perf`/`refactor`/`balance` → Balance, `ci`/`build`/`chore`/`docs`/`test` → Technik).
- **Tag `v*`** (z. B. `v2.1.0`): Das Release bekommt genau diese Version. Für einen Major- oder Minor-Sprung erhöhst du die Version in `package.json`. Die Build-Nummer hängt immer an `Major.Minor` aus `package.json`.
- Die Versionsnummer landet in der App (`APP_VERSION`) und in der APK (`versionName`), damit das Update-Banner korrekt vergleicht. Die Zählung beginnt bei 2.x, weil es aus dem Vorgängerprojekt schon die Releases v1.0.0 und v1.1.0 gibt.
- Das Repo bleibt privat, es wird nichts veröffentlicht. Die Web-Version läuft lokal über `npm run dev` bzw. `npm run preview`, die Android-App über die APK.
