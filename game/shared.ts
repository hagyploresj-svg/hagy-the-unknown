import { spawns } from './map';

// Her karede değişen veriler React state'inde değil, burada tutulur (performans).
export const input = {
  moveX: 0, // joystick
  moveY: 0, // joystick (ileri +)
  lookX: 0, // radyan, kare başına tüketilir
  lookY: 0,
  run: false,
  toggleFlash: false,
  interact: false,
  keys: {} as Record<string, boolean>,
};

export type EnemyMode = 'patrol' | 'chase' | 'search';

export const shared = {
  px: 0,
  pz: 0,
  yaw: 0,
  pitch: 0,
  stamina: 100,
  exhausted: false,
  flashOn: true,
  running: false,
  ex: 0,
  ez: 0,
  enemyMode: 'patrol' as EnemyMode,
  enemyDist: 99,
  alert: false,
  time: 0,
  blackout: 0,
  burst: 0,
  bangDone: false,
};

export function resetShared(): void {
  shared.px = spawns.player.x;
  shared.pz = spawns.player.z;
  shared.yaw = 0;
  shared.pitch = 0;
  shared.stamina = 100;
  shared.exhausted = false;
  shared.flashOn = true;
  shared.running = false;
  shared.ex = spawns.enemy.x;
  shared.ez = spawns.enemy.z;
  shared.enemyMode = 'patrol';
  shared.enemyDist = 99;
  shared.alert = false;
  shared.time = 0;
  shared.blackout = 0;
  shared.burst = 0;
  shared.bangDone = false;
}

export function releaseInput(): void {
  input.moveX = 0;
  input.moveY = 0;
  input.lookX = 0;
  input.lookY = 0;
  input.run = false;
  input.toggleFlash = false;
  input.interact = false;
  for (const k of Object.keys(input.keys)) input.keys[k] = false;
}

resetShared();
