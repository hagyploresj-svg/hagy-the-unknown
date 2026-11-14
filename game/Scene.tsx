'use client';

import { CFG } from './config';
import { Enemy } from './Enemy';
import { Pickups } from './Pickups';
import { Player } from './Player';
import { useGame } from './store';
import { World } from './World';

export function Scene() {
  const high = useGame((s) => s.quality === 'high');
  return (
    <>
      <color attach="background" args={['#020304']} />
      <fogExp2 attach="fog" args={['#030505', CFG.fogDensity]} />
      <World high={high} />
      <Pickups />
      <Enemy />
      <Player high={high} />
    </>
  );
}
