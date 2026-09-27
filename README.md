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
Mit **Asche** aus beendeten Runs schaltest du im **Grimoire** dauerhafte Boni frei.

**Inhalt (Vertical Slice):** 25 Arkana · 12 Siegel · 20 Pakte · 7 Dämonen · 5 Verzauberungen · 1 Kessel

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server
npm test           # Unit-Tests (Vitest)
npm run sim        # Balance-Simulation (Greedy-Bots), z. B. npm run sim -- runs=500 bot=dumb
npm run build      # Typecheck + Produktions-Build nach dist/
npm run e2e        # Playwright-Smoke-Test gegen den Build (Screenshots in e2e/shots/)
```

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

Jeder Push und jeder PR durchläuft Typecheck, Unit-Tests, Balance-Simulation, Build und E2E. Pushes auf `main` werden zusätzlich auf **GitHub Pages** veröffentlicht (dafür in den Repo-Einstellungen unter *Pages* die Quelle „GitHub Actions“ wählen).
