'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { audio } from './audio';
import { CFG } from './config';
import { Cell, Vec2, cellCenter, findPath, hasLOS, moveWithCollision, randomFloorCell } from './map';
import { EnemyMode, shared } from './shared';
import { useGame } from './store';

interface AiState {
  path: Cell[];
  repathT: number;
  lostT: number;
  waitT: number;
  lastX: number;
  lastZ: number;
  stepT: number;
  facing: number;
  anim: number;
}

function setMode(a: AiState, m: EnemyMode): void {
  shared.enemyMode = m;
  a.path = [];
  a.repathT = 0;
  const chasing = m === 'chase';
  const g = useGame.getState();
  if (g.chasing !== chasing) g.setChasing(chasing);
}

export function Enemy() {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const tmp = useMemo<Vec2>(() => ({ x: 0, z: 0 }), []);
  const ai = useRef<AiState>({
    path: [],
    repathT: 0,
    lostT: 0,
    waitT: 0,
    lastX: 0,
    lastZ: 0,
    stepT: 0,
    facing: 0,
    anim: 0,
  });

  useFrame((_, delta) => {
    const grp = group.current;
    if (!grp) return;
    const g = useGame.getState();
    grp.position.set(shared.ex, 0, shared.ez);
    if (g.phase !== 'playing') return;

    const dt = Math.min(delta, 0.05);
    const a = ai.current;
    const dx = shared.px - shared.ex;
    const dz = shared.pz - shared.ez;
    const dist = Math.hypot(dx, dz);
    shared.enemyDist = dist;

    const los = dist < CFG.enemySight && hasLOS(shared.ex, shared.ez, shared.px, shared.pz);
    const heard = shared.running && dist < CFG.enemyHearing;
    const near = dist < 2.2;

    if (shared.alert) {
      shared.alert = false;
      if (shared.enemyMode !== 'chase') setMode(a, 'chase');
      a.lastX = shared.px;
      a.lastZ = shared.pz;
      a.lostT = 0;
    }
    if (los || heard || near) {
      if (shared.enemyMode !== 'chase') setMode(a, 'chase');
      a.lastX = shared.px;
      a.lastZ = shared.pz;
      a.lostT = 0;
    }

    let speed: number = CFG.enemyPatrol;
    const mode = shared.enemyMode;

    if (mode === 'chase') {
      speed = CFG.enemyChase + 0.15 * g.collected.length + (g.generatorOn ? 0.2 : 0);
      if (!los && !heard && !near) {
        a.lostT += dt;
        if (a.lostT > CFG.enemyLoseTime) {
          setMode(a, 'search');
          a.path = findPath(shared.ex, shared.ez, a.lastX, a.lastZ);
          a.waitT = 0;
        }
      }
      a.repathT -= dt;
      if (a.repathT <= 0 && shared.enemyMode === 'chase') {
        a.repathT = 0.3;
        a.path = findPath(shared.ex, shared.ez, a.lastX, a.lastZ);
      }
    } else if (mode === 'search') {
      speed = CFG.enemySearch;
      if (a.path.length === 0) {
        a.waitT += dt;
        if (a.waitT > 3) setMode(a, 'patrol');
      }
    } else {
      speed = CFG.enemyPatrol;
      if (a.path.length === 0) {
        for (let tries = 0; tries < 8; tries++) {
          const c = randomFloorCell();
          const p = cellCenter(c.cx, c.cz);
          if (Math.hypot(p.x - shared.ex, p.z - shared.ez) > 12) {
            a.path = findPath(shared.ex, shared.ez, p.x, p.z);
            break;
          }
        }
      }
    }

    // --- Hareket ---
    let moving = false;
    let tx = 0;
    let tz = 0;
    let have = false;
    if (a.path.length > 0) {
      const c = cellCenter(a.path[0].cx, a.path[0].cz);
      tx = c.x;
      tz = c.z;
      have = true;
    } else if (shared.enemyMode === 'chase') {
      tx = a.lastX;
      tz = a.lastZ;
      have = true;
    }
    if (have) {
      const mx = tx - shared.ex;
      const mz = tz - shared.ez;
      const d = Math.hypot(mx, mz);
      if (d > 0.05) {
        const step = Math.min(speed * dt, d);
        moveWithCollision(shared.ex, shared.ez, (mx / d) * step, (mz / d) * step, 0.3, tmp);
        shared.ex = tmp.x;
        shared.ez = tmp.z;
        moving = true;
        const want = Math.atan2(mx, mz);
        let da = want - a.facing;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        a.facing += da * Math.min(1, dt * 8);
      }
      if (a.path.length > 0 && d < 0.3) a.path.shift();
    }

    // --- Ses: ağır ayak sesleri ---
    if (moving) {
      a.stepT -= dt;
      if (a.stepT <= 0) {
        a.stepT = shared.enemyMode === 'chase' ? 0.38 : 0.7;
        if (dist < 18) audio.thud(1 - dist / 18);
      }
    }

    // --- Animasyon ---
    a.anim += dt * (moving ? (shared.enemyMode === 'chase' ? 9 : 5) : 1.5);
    grp.position.set(shared.ex, 0, shared.ez);
    grp.rotation.y = a.facing;
    const sw = Math.sin(a.anim) * (moving ? 0.8 : 0.1);
    if (armL.current) armL.current.rotation.x = sw;
    if (armR.current) armR.current.rotation.x = -sw;
    if (legL.current) legL.current.rotation.x = -sw * 0.8;
    if (legR.current) legR.current.rotation.x = sw * 0.8;
    if (head.current) head.current.rotation.z = Math.sin(a.anim * 0.5) * 0.25;
    if (body.current) body.current.rotation.x = shared.enemyMode === 'chase' ? 0.35 : 0.1;

    // --- Yakalama ---
    if (Math.hypot(shared.px - shared.ex, shared.pz - shared.ez) < CFG.catchDist) g.lose();
  });

  return (
    <group ref={group} scale={1.15}>
      <group ref={body}>
        <mesh position={[0, 1.05, 0]} castShadow>
          <capsuleGeometry args={[0.2, 0.8, 4, 8]} />
          <meshStandardMaterial color="#6e756a" roughness={0.9} />
        </mesh>
        <mesh ref={head} position={[0, 1.85, 0.05]} scale={[0.85, 1.25, 0.9]}>
          <sphereGeometry args={[0.2, 12, 10]} />
          <meshStandardMaterial color="#b9bdb0" roughness={0.8} />
        </mesh>
        <mesh position={[-0.07, 1.9, 0.2]}>
          <sphereGeometry args={[0.04, 8, 6]} />
          <meshBasicMaterial color="#ff2a1a" />
        </mesh>
        <mesh position={[0.07, 1.9, 0.2]}>
          <sphereGeometry args={[0.04, 8, 6]} />
          <meshBasicMaterial color="#ff2a1a" />
        </mesh>
        <group ref={armL} position={[-0.3, 1.5, 0]}>
          <mesh position={[0, -0.65, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 1.3, 6]} />
            <meshStandardMaterial color="#8a9084" roughness={0.9} />
          </mesh>
        </group>
        <group ref={armR} position={[0.3, 1.5, 0]}>
          <mesh position={[0, -0.65, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 1.3, 6]} />
            <meshStandardMaterial color="#8a9084" roughness={0.9} />
          </mesh>
        </group>
      </group>
      <mesh ref={legL} position={[-0.12, 0.4, 0]}>
        <cylinderGeometry args={[0.06, 0.05, 0.8, 6]} />
        <meshStandardMaterial color="#555a52" roughness={0.9} />
      </mesh>
      <mesh ref={legR} position={[0.12, 0.4, 0]}>
        <cylinderGeometry args={[0.06, 0.05, 0.8, 6]} />
        <meshStandardMaterial color="#555a52" roughness={0.9} />
      </mesh>
    </group>
  );
}
