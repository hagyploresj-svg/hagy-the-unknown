// Oyun ayarları — dengeyi buradan değiştirebilirsin.
export const CFG = {
  eye: 1.65,
  playerRadius: 0.38,
  walkSpeed: 3.0,
  runSpeed: 5.2,
  staminaDrain: 22, // koşarken saniyede
  staminaRegen: 16, // dururken saniyede
  staminaRegenMoving: 9, // yürürken saniyede
  staminaRecover: 30, // yorgunluktan çıkış eşiği

  enemyPatrol: 1.9,
  enemySearch: 2.4,
  enemyChase: 3.8,
  enemySight: 16,
  enemyHearing: 9,
  enemyLoseTime: 4.5,
  catchDist: 1.0,

  // Görünüm (çok karanlık / çok aydınlık gelirse buradan ayarla)
  ambient: 0.22,
  fogDensity: 0.075,
  flashIntensity: 90,
} as const;
