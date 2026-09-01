/* Magie-Turm — Idle Game Core (pure Logik, browser- UND node-testbar) */
(function (root) {
  'use strict';

  var APP_VERSION = '1.0.0';

  var WIZARDS = [
    { id: 'azubi',    emoji: '🧒', name: 'Azubi',       baseCost: 15,     mps: 0.5 },
    { id: 'zauberer', emoji: '🧙', name: 'Zauberer',    baseCost: 120,    mps: 3 },
    { id: 'elfe',     emoji: '🧝', name: 'Elfenmagier', baseCost: 1300,   mps: 18 },
    { id: 'drache',   emoji: '🐉', name: 'Drache',      baseCost: 14000,  mps: 120 },
    { id: 'einhorn',  emoji: '🦄', name: 'Einhorn',     baseCost: 200000, mps: 900 }
  ];

  var TAP_BASE_COST = 25;
  var TAP_COST_MUL = 2.2;
  var WIZ_COST_MUL = 1.15;
  var STAR_BONUS = 0.05;          // +5% Mana pro Stern
  var PRESTIGE_DIV = 10000;       // Sterne = floor(sqrt(runMana / 10000))
  var AUTO_UNLOCK_COST = 3;       // Sterne
  var OFFLINE_CAP_S = 24 * 3600;  // max 24h offline
  var OFFLINE_RATE = 0.5;         // 50% offline-Ertrag
  var SAVE_KEY = 'magieTurmSave_v1';

  function newState() {
    return {
      mana: 0,
      totalMana: 0,
      runMana: 0,
      tapLvl: 0,
      wiz: { azubi: 0, zauberer: 0, elfe: 0, drache: 0, einhorn: 0 },
      stars: 0,
      autoUnlocked: false,
      autoOn: false,
      autoThreshold: 1,
      lastSeen: Date.now()
    };
  }

  function wizCost(w, count) {
    return Math.ceil(w.baseCost * Math.pow(WIZ_COST_MUL, count));
  }

  function wizCostAt(s, wid) {
    var w = WIZARDS.find(function (x) { return x.id === wid; });
    if (!w) return Infinity;
    return wizCost(w, s.wiz[wid] || 0);
  }

  function tapCost(s) {
    return Math.ceil(TAP_BASE_COST * Math.pow(TAP_COST_MUL, s.tapLvl));
  }

  function tapPower(s) {
    return 1 + s.tapLvl;
  }

  function starMult(s) {
    return 1 + s.stars * STAR_BONUS;
  }

  function rawMps(s) {
    var sum = 0;
    WIZARDS.forEach(function (w) { sum += (s.wiz[w.id] || 0) * w.mps; });
    return sum;
  }

  function mps(s) {
    return rawMps(s) * starMult(s);
  }

  function pendingStars(s) {
    return Math.floor(Math.sqrt(s.runMana / PRESTIGE_DIV));
  }

  function canPrestige(s) {
    return pendingStars(s) >= 1;
  }

  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 1000) return (Math.floor(n * 10) / 10).toString().replace('.', ',');
    var units = ['k', 'M', 'Mrd', 'B'];
    var u = -1;
    while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
    return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0).replace('.', ',') + units[u];
  }

  // --- Aktionen (mutieren State, geben bei Erfolg true zurück) ---

  function tapMana(s) {
    var gain = tapPower(s) * starMult(s);
    s.mana += gain;
    s.totalMana += gain;
    s.runMana += gain;
    return gain;
  }

  function buyWizard(s, wid) {
    var cost = wizCostAt(s, wid);
    if (s.mana < cost) return false;
    s.mana -= cost;
    s.wiz[wid] = (s.wiz[wid] || 0) + 1;
    return true;
  }

  function buyTap(s) {
    var cost = tapCost(s);
    if (s.mana < cost) return false;
    s.mana -= cost;
    s.tapLvl += 1;
    return true;
  }

  function unlockAuto(s) {
    if (s.autoUnlocked) return false;
    if (s.stars < AUTO_UNLOCK_COST) return false;
    s.stars -= AUTO_UNLOCK_COST;
    s.autoUnlocked = true;
    s.autoOn = true;
    return true;
  }

  function toggleAuto(s) {
    if (!s.autoUnlocked) return false;
    s.autoOn = !s.autoOn;
    return true;
  }

  function setAutoThreshold(s, v) {
    if (!s.autoUnlocked) return false;
    s.autoThreshold = Math.max(1, Math.floor(v));
    return true;
  }

  function doPrestige(s) {
    var gain = pendingStars(s);
    if (gain < 1) return 0;
    s.stars += gain;
    s.mana = 0;
    s.runMana = 0;
    s.tapLvl = 0;
    WIZARDS.forEach(function (w) { s.wiz[w.id] = 0; });
    return gain;
  }

  // Auto-Prestige prüfen (in tick integriert)
  function checkAutoPrestige(s) {
    if (!s.autoUnlocked || !s.autoOn) return 0;
    if (pendingStars(s) >= s.autoThreshold) return doPrestige(s);
    return 0;
  }

  function tick(s, dt) {
    if (dt <= 0) return 0;
    var gain = mps(s) * dt;
    s.mana += gain;
    s.totalMana += gain;
    s.runMana += gain;
    checkAutoPrestige(s);
    return gain;
  }

  // Offline-Fortschritt beim Laden (kein Auto-Prestige offline, 50% Rate, 24h Cap)
  function applyOffline(s, nowMs) {
    var dt = Math.min(OFFLINE_CAP_S, Math.max(0, (nowMs - (s.lastSeen || nowMs)) / 1000));
    s.lastSeen = nowMs;
    if (dt < 10) return { dt: dt, gain: 0 }; // <10s: kein Offline-Bonus nötig
    var gain = rawMps(s) * starMult(s) * dt * OFFLINE_RATE;
    s.mana += gain;
    s.totalMana += gain;
    s.runMana += gain;
    return { dt: dt, gain: gain };
  }

  function serialize(s) {
    return JSON.stringify(Object.assign({}, s, { lastSeen: Date.now() }));
  }

  function deserialize(json) {
    try {
      var o = JSON.parse(json);
      var s = newState();
      if (typeof o.mana === 'number') s.mana = o.mana;
      if (typeof o.totalMana === 'number') s.totalMana = o.totalMana;
      if (typeof o.runMana === 'number') s.runMana = o.runMana;
      if (typeof o.tapLvl === 'number') s.tapLvl = o.tapLvl;
      if (o.wiz) WIZARDS.forEach(function (w) {
        if (typeof o.wiz[w.id] === 'number') s.wiz[w.id] = o.wiz[w.id];
      });
      if (typeof o.stars === 'number') s.stars = o.stars;
      s.autoUnlocked = !!o.autoUnlocked;
      s.autoOn = !!o.autoOn;
      if (typeof o.autoThreshold === 'number') s.autoThreshold = o.autoThreshold;
      if (typeof o.lastSeen === 'number') s.lastSeen = o.lastSeen;
      return s;
    } catch (e) { return newState(); }
  }

  var api = {
    APP_VERSION: APP_VERSION,
    WIZARDS: WIZARDS,
    TAP_BASE_COST: TAP_BASE_COST,
    TAP_COST_MUL: TAP_COST_MUL,
    AUTO_UNLOCK_COST: AUTO_UNLOCK_COST,
    OFFLINE_CAP_S: OFFLINE_CAP_S,
    OFFLINE_RATE: OFFLINE_RATE,
    SAVE_KEY: SAVE_KEY,
    newState: newState,
    wizCostAt: wizCostAt,
    tapCost: tapCost,
    tapPower: tapPower,
    starMult: starMult,
    rawMps: rawMps,
    mps: mps,
    pendingStars: pendingStars,
    canPrestige: canPrestige,
    fmt: fmt,
    tapMana: tapMana,
    buyWizard: buyWizard,
    buyTap: buyTap,
    unlockAuto: unlockAuto,
    toggleAuto: toggleAuto,
    setAutoThreshold: setAutoThreshold,
    doPrestige: doPrestige,
    checkAutoPrestige: checkAutoPrestige,
    tick: tick,
    applyOffline: applyOffline,
    serialize: serialize,
    deserialize: deserialize
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameCore = api;
})(typeof self !== 'undefined' ? self : this);
