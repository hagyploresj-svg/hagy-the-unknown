
 // HAGY: THE UNKNOWN — V0.3
 // Oyuncu, yaratık ve atmosfer ayarları

export const CFG = {
  // OYUNCU
  eye: 1.65,
  playerRadius: 0.38,

  // HAREKET HIZLARI
  walkSpeed: 3.8,
  runSpeed: 6.5,

  // DAYANIKLILIK
  staminaDrain: 15,
  staminaRegen: 20,
  staminaRegenMoving: 12,
  staminaRecover: 30,

  // YARATIK YAPAY ZEKASI
  enemyPatrol: 1.6,
  enemySearch: 2.0,
  enemyChase: 4.2,
  enemySight: 14,
  enemyHearing: 8,
  enemyLoseTime: 3.5,
  catchDist: 0.85,

  // HASTANE ATMOSFERİ
  ambient: 0.22,
  fogDensity: 0.055,
  flashIntensity: 110,
} as const;
