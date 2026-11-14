
// HAGY: THE UNKNOWN — V0.2
// Oyun ayarları

export const CFG = {
  // Oyuncu
  eye: 1.65,
  playerRadius: 0.38,

  // Hareket hızları
  walkSpeed: 5.5,
  runSpeed: 10.0,

  // Dayanıklılık
  staminaDrain: 12,
  staminaRegen: 20,
  staminaRegenMoving: 15,
  staminaRecover: 30,

  // Yaratık yapay zekası
  enemyPatrol: 2.4,
  enemySearch: 3.2,
  enemyChase: 5.5,
  enemySight: 18,
  enemyHearing: 11,
  enemyLoseTime: 5.0,
  catchDist: 1.0,

  // Hastane atmosferi
  ambient: 0.22,
  fogDensity: 0.055,
  flashIntensity: 110,
} as const;
