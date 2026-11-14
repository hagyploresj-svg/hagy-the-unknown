
'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { audio } from './audio';
import { CFG } from './config';
import {
  Cell,
  Vec2,
  cellCenter,
  findPath,
  hasLOS,
  moveWithCollision,
  randomFloorCell,
} from './map';
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

  if (g.chasing !== chasing) {
    g.setChasing(chasing);
  }
}

// Dış model gerektirmeyen detaylı mutant

const skin = new THREE.MeshStandardMaterial({
  color: '#85877d',
  roughness: 0.96,
  metalness: 0,
});

const darkSkin = new THREE.MeshStandardMaterial({
  color: '#454942',
  roughness: 1,
});

const bone = new THREE.MeshStandardMaterial({
  color: '#c2b9a4',
  roughness: 0.85,
});

const cloth = new THREE.MeshStandardMaterial({
  color: '#59635d',
  roughness: 1,
  side: THREE.DoubleSide,
});

const blood = new THREE.MeshStandardMaterial({
  color: '#481b1b',
  roughness: 0.92,
});

const black = new THREE.MeshStandardMaterial({
  color: '#090b0a',
  roughness: 1,
});

const eyeGlow = new THREE.MeshBasicMaterial({
  color: '#ff2414',
});

function Part({
  position,
  scale,
  material,
  rotation,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  material: THREE.Material;
  rotation?: [number, number, number];
}) {
  return (
    <mesh
      position={position}
      scale={scale}
      rotation={rotation}
      material={material}
      castShadow
    >
      <sphereGeometry args={[1, 12, 10]} />
    </mesh>
  );
}

function Limb({
  from,
  to,
  radius,
  material,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
  material: THREE.Material;
}) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);

  const middle = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start);

  const rotation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );

  return (
    <mesh
      position={middle.toArray()}
      quaternion={rotation}
      material={material}
      castShadow
    >
      <cylinderGeometry
        args={[
          radius * 0.85,
          radius,
          direction.length(),
          7,
        ]}
      />
    </mesh>
  );
}

function MutantHead({
  headRef,
}: {
  headRef: React.RefObject<THREE.Group | null>;
}) {
  return (
    <group ref={headRef} position={[0, 2.13, 0.09]}>
      {/* Asimetrik kafatası */}
      <Part
        position={[0, 0.02, 0]}
        scale={[0.23, 0.31, 0.21]}
        material={skin}
      />

      <Part
        position={[-0.105, -0.1, 0.08]}
        scale={[0.12, 0.15, 0.13]}
        material={darkSkin}
      />

      {/* Çıkık elmacık kemikleri */}
      <Part
        position={[-0.16, -0.08, 0.13]}
        scale={[0.1, 0.045, 0.08]}
        material={bone}
      />
      <Part
        position={[0.16, -0.07, 0.13]}
        scale={[0.09, 0.04, 0.08]}
        material={bone}
      />

      {/* Çökük göz yuvaları */}
      <Part
        position={[-0.105, 0.065, 0.174]}
        scale={[0.091, 0.075, 0.035]}
        material={black}
      />
      <Part
        position={[0.105, 0.085, 0.17]}
        scale={[0.08, 0.064, 0.035]}
        material={black}
      />

      {/* Parlayan küçük gözler */}
      <Part
        position={[-0.105, 0.055, 0.207]}
        scale={[0.029, 0.026, 0.012]}
        material={eyeGlow}
      />
      <Part
        position={[0.105, 0.08, 0.203]}
        scale={[0.025, 0.022, 0.012]}
        material={eyeGlow}
      />

      {/* Burun */}
      <Part
        position={[0, -0.055, 0.211]}
        scale={[0.045, 0.11, 0.058]}
        material={skin}
      />

      {/* Açık, karanlık ağız */}
      <Part
        position={[0, -0.205, 0.153]}
        scale={[0.115, 0.062, 0.04]}
        material={black}
      />

      {/* Dişler */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh
          key={`tooth-${i}`}
          position={[-0.083 + i * 0.027, -0.18, 0.191]}
          rotation={[Math.PI, 0, 0]}
          material={bone}
        >
          <coneGeometry args={[0.014, 0.052, 5]} />
        </mesh>
      ))}

      {/* Yüz yaraları */}
      <Part
        position={[0.155, -0.15, 0.151]}
        scale={[0.025, 0.095, 0.009]}
        rotation={[0, 0, -0.45]}
        material={blood}
      />

      {/* Kulaklar */}
      <Part
        position={[-0.23, -0.035, 0]}
        scale={[0.055, 0.105, 0.045]}
        material={skin}
      />
      <Part
        position={[0.23, -0.03, 0]}
        scale={[0.05, 0.09, 0.04]}
        material={skin}
      />
    </group>
  );
}

function MutantArm({
  side,
  armRef,
}: {
  side: -1 | 1;
  armRef: React.RefObject<THREE.Group | null>;
}) {
  return (
    <group
      ref={armRef}
      position={[side * 0.34, 1.77, 0]}
    >
      {/* Omuz */}
      <Part
        position={[0, 0, 0]}
        scale={[0.14, 0.13, 0.13]}
        material={skin}
      />

      {/* Uzun üst kol */}
      <Limb
        from={[0, 0, 0]}
        to={[side * 0.08, -0.72, 0.1]}
        radius={0.079}
        material={skin}
      />

      {/* Çıkık dirsek */}
      <Part
        position={[side * 0.08, -0.72, 0.1]}
        scale={[0.095, 0.09, 0.09]}
        material={bone}
      />

      {/* Ön kol */}
      <Limb
        from={[side * 0.08, -0.72, 0.1]}
        to={[side * 0.11, -1.34, 0.27]}
        radius={0.064}
        material={skin}
      />

      {/* Büyük el */}
      <Part
        position={[side * 0.11, -1.42, 0.28]}
        scale={[0.12, 0.18, 0.075]}
        material={darkSkin}
      />

      {/* Pençeler */}
      {Array.from({ length: 4 }, (_, i) => (
        <group
          key={`claw-${i}`}
          position={[
            side * 0.11 + (i - 1.5) * 0.052,
            -1.54,
            0.3,
          ]}
        >
          <Limb
            from={[0, 0, 0]}
            to={[0, -0.2 - (i % 2) * 0.045, 0.07]}
            radius={0.018}
            material={bone}
          />
          <mesh
            position={[0, -0.23 - (i % 2) * 0.045, 0.08]}
            rotation={[Math.PI, 0, 0]}
            material={black}
          >
            <coneGeometry args={[0.023, 0.11, 5]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function MutantLeg({
  side,
  legRef,
}: {
  side: -1 | 1;
  legRef: React.RefObject<THREE.Group | null>;
}) {
  return (
    <group
      ref={legRef}
      position={[side * 0.15, 0.94, 0]}
    >
      <Limb
        from={[0, 0, 0]}
        to={[side * 0.025, -0.47, 0.13]}
        radius={0.115}
        material={cloth}
      />

      <Part
        position={[side * 0.025, -0.47, 0.13]}
        scale={[0.105, 0.1, 0.11]}
        material={bone}
      />

      <Limb
        from={[side * 0.025, -0.47, 0.13]}
        to={[side * 0.04, -0.82, 0.015]}
        radius={0.075}
        material={skin}
      />

      <Part
        position={[side * 0.04, -0.86, 0.12]}
        scale={[0.115, 0.075, 0.24]}
        material={darkSkin}
      />
    </group>
  );
}

function MutantBody({
  bodyRef,
  headRef,
  armL,
  armR,
  legL,
  legR,
}: {
  bodyRef: React.RefObject<THREE.Group | null>;
  headRef: React.RefObject<THREE.Group | null>;
  armL: React.RefObject<THREE.Group | null>;
  armR: React.RefObject<THREE.Group | null>;
  legL: React.RefObject<THREE.Group | null>;
  legR: React.RefObject<THREE.Group | null>;
}) {
  return (
    <group ref={bodyRef}>
      {/* Kambur gövde */}
      <Part
        position={[0, 1.48, -0.06]}
        scale={[0.32, 0.54, 0.2]}
        material={skin}
      />

      {/* Omurga çıkıntıları */}
      {Array.from({ length: 7 }, (_, i) => (
        <Part
          key={`spine-${i}`}
          position={[0, 1.17 + i * 0.105, -0.265]}
          scale={[0.055, 0.052, 0.05]}
          material={bone}
        />
      ))}

      {/* Bel */}
      <Part
        position={[0, 1.01, 0]}
        scale={[0.25, 0.21, 0.17]}
        material={cloth}
      />

      {/* Kaburgalar */}
      {Array.from({ length: 5 }, (_, i) => (
        <group key={`rib-${i}`}>
          <Part
            position={[-0.225, 1.35 + i * 0.095, 0.075]}
            scale={[0.12, 0.026, 0.075]}
            rotation={[0, 0, -0.18]}
            material={bone}
          />
          <Part
            position={[0.225, 1.35 + i * 0.095, 0.075]}
            scale={[0.12, 0.026, 0.075]}
            rotation={[0, 0, 0.18]}
            material={bone}
          />
        </group>
      ))}

      {/* Yırtık hasta kıyafeti */}
      <mesh
        position={[0, 1.13, -0.1]}
        rotation={[0.1, 0, 0]}
        material={cloth}
      >
        <coneGeometry args={[0.34, 0.8, 7, 1, true]} />
      </mesh>

      {/* Göğüste kan lekeleri */}
      <Part
        position={[0.13, 1.55, 0.135]}
        scale={[0.09, 0.16, 0.016]}
        rotation={[0, 0, 0.4]}
        material={blood}
      />

      {/* Boyun */}
      <Limb
        from={[0, 1.79, 0]}
        to={[0, 2.05, 0.08]}
        radius={0.075}
        material={skin}
      />

      <MutantHead headRef={headRef} />
      <MutantArm side={-1} armRef={armL} />
      <MutantArm side={1} armRef={armR} />
      <MutantLeg side={-1} legRef={legL} />
      <MutantLeg side={1} legRef={legR} />
    </group>
  );
}

export function Enemy() {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);

  const tmp = useMemo<Vec2>(
    () => ({ x: 0, z: 0 }),
    []
  );

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

    // Saklanma sistemiyle uyumlu algılama.
    // Saklanma noktalarının fiziksel kontrolü
    // ayrıca Player/World tarafında yapılmalıdır.
    const hidden = g.hidden === true;

    const los =
      !hidden &&
      dist < CFG.enemySight &&
      hasLOS(
        shared.ex,
        shared.ez,
        shared.px,
        shared.pz
      );

    const heard =
      !hidden &&
      shared.running &&
      dist < CFG.enemyHearing;

    const near = !hidden && dist < 2.2;

    if (shared.alert) {
      shared.alert = false;

      if (shared.enemyMode !== 'chase') {
        setMode(a, 'chase');
      }

      a.lastX = shared.px;
      a.lastZ = shared.pz;
      a.lostT = 0;
    }

    if (los || heard || near) {
      if (shared.enemyMode !== 'chase') {
        setMode(a, 'chase');
      }

      a.lastX = shared.px;
      a.lastZ = shared.pz;
      a.lostT = 0;
    }

    let speed = CFG.enemyPatrol;
    const mode = shared.enemyMode;

    if (mode === 'chase') {
      speed =
        CFG.enemyChase +
        0.15 * g.collected.length +
        (g.generatorOn ? 0.2 : 0);

      if (!los && !heard && !near) {
        a.lostT += dt;

        if (a.lostT > CFG.enemyLoseTime) {
          setMode(a, 'search');

          a.path = findPath(
            shared.ex,
            shared.ez,
            a.lastX,
            a.lastZ
          );

          a.waitT = 0;
        }
      }

      a.repathT -= dt;

      if (
        a.repathT <= 0 &&
        shared.enemyMode === 'chase'
      ) {
        a.repathT = 0.3;

        a.path = findPath(
          shared.ex,
          shared.ez,
          a.lastX,
          a.lastZ
        );
      }
    } else if (mode === 'search') {
      speed = CFG.enemySearch;

      if (a.path.length === 0) {
        a.waitT += dt;

        if (a.waitT > 3) {
          setMode(a, 'patrol');
        }
      }
    } else {
      speed = CFG.enemyPatrol;

      if (a.path.length === 0) {
        for (let tries = 0; tries < 8; tries++) {
          const c = randomFloorCell();
          const p = cellCenter(c.cx, c.cz);

          if (
            Math.hypot(
              p.x - shared.ex,
              p.z - shared.ez
            ) > 12
          ) {
            a.path = findPath(
              shared.ex,
              shared.ez,
              p.x,
              p.z
            );

            break;
          }
        }
      }
    }

    // HAREKET VE YOL BULMA

    let moving = false;
    let tx = 0;
    let tz = 0;
    let have = false;

    if (a.path.length > 0) {
      const c = cellCenter(
        a.path[0].cx,
        a.path[0].cz
      );

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

        moveWithCollision(
          shared.ex,
          shared.ez,
          (mx / d) * step,
          (mz / d) * step,
          0.3,
          tmp
        );

        shared.ex = tmp.x;
        shared.ez = tmp.z;
        moving = true;

        const want = Math.atan2(mx, mz);
        let da = want - a.facing;

        while (da > Math.PI) {
          da -= Math.PI * 2;
        }

        while (da < -Math.PI) {
          da += Math.PI * 2;
        }

        a.facing += da * Math.min(1, dt * 8);
      }

      if (a.path.length > 0 && d < 0.3) {
        a.path.shift();
      }
    }

    // AĞIR AYAK SESLERİ

    if (moving) {
      a.stepT -= dt;

      if (a.stepT <= 0) {
        a.stepT =
          shared.enemyMode === 'chase'
            ? 0.38
            : 0.7;

        if (dist < 18) {
          audio.thud(1 - dist / 18);
        }
      }
    }

    // GELİŞMİŞ PROSEDÜREL ANİMASYON

    const chasing = shared.enemyMode === 'chase';

    a.anim +=
      dt *
      (moving ? (chasing ? 10 : 5) : 1.2);

    grp.position.set(shared.ex, 0, shared.ez);
    grp.rotation.y = a.facing;

    const swing = Math.sin(a.anim);
    const breath = Math.sin(a.anim * 0.5);
    const strength = moving ? 1 : 0.12;

    if (armL.current) {
      armL.current.rotation.x =
        swing * 0.48 * strength - 0.15;

      armL.current.rotation.z =
        -0.1 + breath * 0.045;
    }

    if (armR.current) {
      armR.current.rotation.x =
        -swing * 0.55 * strength - 0.12;

      armR.current.rotation.z =
        0.1 - breath * 0.045;
    }

    if (legL.current) {
      legL.current.rotation.x =
        -swing * 0.55 * strength;
    }

    if (legR.current) {
      legR.current.rotation.x =
        swing * 0.55 * strength;
    }

    if (head.current) {
      head.current.rotation.z =
        Math.sin(a.anim * 0.47) * 0.12;

      head.current.rotation.y =
        Math.sin(a.anim * 0.23) * 0.13;

      head.current.rotation.x =
        chasing ? -0.16 : 0.07;
    }

    if (body.current) {
      body.current.rotation.x =
        chasing ? 0.32 : 0.14;

      body.current.rotation.z =
        Math.sin(a.anim * 0.5) * 0.035;

      body.current.position.y =
        Math.abs(swing) *
        (moving ? 0.035 : 0.012);
    }

    // YAKALAMA
    // Gizlenmiş oyuncuya doğrudan hasar verilmez.
    // Bu, geçici saklanma mantığıdır.

    if (
      !hidden &&
      Math.hypot(
        shared.px - shared.ex,
        shared.pz - shared.ez
      ) < CFG.catchDist
    ) {
      g.lose();
    }
  });

  return (
    <group ref={group} scale={1.15}>
      <MutantBody
        bodyRef={body}
        headRef={head}
        armL={armL}
        armR={armR}
        legL={legL}
        legR={legR}
      />
    </group>
  );
}
