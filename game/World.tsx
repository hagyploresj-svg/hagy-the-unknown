'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CFG } from './config';
import { CELL, COLS, ROWS, WALL_H, beds, cabinets, cellCenter, floorCells, wallCells } from './map';
import { shared } from './shared';
import { useGame } from './store';
import { makeBloodTexture, makeSurfaceTexture } from './textures';

const W = COLS * CELL;
const H = ROWS * CELL;

function Walls({ high }: { high: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tex = useMemo(() => makeSurfaceTexture('wall'), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    wallCells.forEach((c, i) => {
      const p = cellCenter(c.cx, c.cz);
      d.position.set(p.x, WALL_H / 2, p.z);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, wallCells.length]}
      castShadow={high}
      receiveShadow={high}
      frustumCulled={false}
    >
      <boxGeometry args={[CELL, WALL_H, CELL]} />
      {high ? (
        <meshStandardMaterial map={tex} roughness={0.95} metalness={0} />
      ) : (
        <meshLambertMaterial map={tex} />
      )}
    </instancedMesh>
  );
}

function FloorAndCeiling({ high }: { high: boolean }) {
  const floorTex = useMemo(() => makeSurfaceTexture('floor'), []);
  const ceilTex = useMemo(() => makeSurfaceTexture('ceiling'), []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[W / 2, 0, H / 2]} receiveShadow={high}>
        <planeGeometry args={[W, H]} />
        {high ? (
          <meshStandardMaterial map={floorTex} roughness={0.7} metalness={0.05} />
        ) : (
          <meshLambertMaterial map={floorTex} />
        )}
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[W / 2, WALL_H, H / 2]}>
        <planeGeometry args={[W, H]} />
        {high ? (
          <meshStandardMaterial map={ceilTex} roughness={1} />
        ) : (
          <meshLambertMaterial map={ceilTex} />
        )}
      </mesh>
    </>
  );
}

function Bed({ cx, cz }: { cx: number; cz: number }) {
  const p = cellCenter(cx, cz);
  const rot = ((cx * 7 + cz * 13) % 2) * (Math.PI / 2) + (((cx * 3 + cz) % 5) - 2) * 0.04;
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.9, 0.08, 1.8]} />
        <meshStandardMaterial color="#555b5a" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.66, 0.05]} castShadow>
        <boxGeometry args={[0.8, 0.14, 1.6]} />
        <meshStandardMaterial color="#6d7568" roughness={1} />
      </mesh>
      <mesh position={[0, 0.76, -0.62]}>
        <boxGeometry args={[0.5, 0.1, 0.3]} />
        <meshStandardMaterial color="#8a8f84" roughness={1} />
      </mesh>
      {([-0.4, 0.4] as const).map((x) =>
        ([-0.8, 0.8] as const).map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.27, z]}>
            <cylinderGeometry args={[0.03, 0.03, 0.55, 6]} />
            <meshStandardMaterial color="#3a3d3d" metalness={0.7} roughness={0.5} />
          </mesh>
        )),
      )}
    </group>
  );
}

function Cabinet({ cx, cz }: { cx: number; cz: number }) {
  const p = cellCenter(cx, cz);
  return (
    <group position={[p.x, 0, p.z]}>
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[1.5, 1.9, 1.2]} />
        <meshStandardMaterial color="#4a5a52" roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh position={[0.2, 1.0, 0.61]}>
        <boxGeometry args={[0.06, 0.4, 0.04]} />
        <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Props() {
  return (
    <>
      {beds.map((b) => (
        <Bed key={`b${b.cx}-${b.cz}`} cx={b.cx} cz={b.cz} />
      ))}
      {cabinets.map((c) => (
        <Cabinet key={`c${c.cx}-${c.cz}`} cx={c.cx} cz={c.cz} />
      ))}
    </>
  );
}

function Decals() {
  const tex = useMemo(() => makeBloodTexture(), []);
  const items = useMemo(
    () =>
      floorCells
        .filter((_, i) => i % 11 === 0)
        .map((c, i) => {
          const p = cellCenter(c.cx, c.cz);
          return { x: p.x + ((i * 37) % 10) / 10 - 0.5, z: p.z + ((i * 53) % 10) / 10 - 0.5, s: 1.2 + (i % 4) * 0.6, r: i * 1.7 };
        }),
    [],
  );
  return (
    <>
      {items.map((d, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, d.r]} position={[d.x, 0.012, d.z]}>
          <planeGeometry args={[d.s, d.s]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} color="#7a6a6a" />
        </mesh>
      ))}
    </>
  );
}

// Lamba konumları: koridor + odalar
const LAMPS: { x: number; z: number }[] = [];
[3, 7, 11, 15, 19, 23].forEach((c) => LAMPS.push({ x: (c + 0.5) * CELL, z: 7 * CELL }));
[6, 16, 26, 36, 47].forEach((x) => {
  LAMPS.push({ x, z: 6 });
  LAMPS.push({ x, z: 22 });
});
const LIGHT_LAMPS = [1, 2, 4, 5]; // gerçek ışık yayanlar (yüksek kalite)

function lampLevel(t: number, i: number, genOn: boolean): number {
  if (shared.blackout > 0) return 0;
  if (genOn) return 1;
  if (i % 4 === 3) return 0; // bozuk lambalar
  const n = Math.sin(t * 37 + i * 12.9) * Math.sin(t * 11.3 + i * 4.7);
  let v = 0.55 + 0.25 * Math.sin(t * 0.9 + i);
  if (n > 0.55) v *= 0.15;
  if (shared.burst > 0 && Math.random() > 0.5) v *= 0.05;
  return v;
}

function Lamps({ high }: { high: boolean }) {
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const ambient = useRef<THREE.AmbientLight>(null);
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const genOn = useGame.getState().generatorOn;
    const playing = useGame.getState().phase === 'playing';
    if (playing) {
      if (shared.blackout > 0) shared.blackout = Math.max(0, shared.blackout - delta);
      if (shared.burst > 0) shared.burst = Math.max(0, shared.burst - delta);
    }
    for (let i = 0; i < LAMPS.length; i++) {
      const m = mats.current[i];
      if (m) m.emissiveIntensity = lampLevel(t, i, genOn) * 2.4;
    }
    if (high) {
      LIGHT_LAMPS.forEach((li, k) => {
        const l = lights.current[k];
        if (l) l.intensity = lampLevel(t, li, genOn) * 9;
      });
    }
    const a = ambient.current;
    if (a) {
      const base = CFG.ambient * (genOn ? 2.2 : 1);
      a.intensity = shared.blackout > 0 ? base * 0.1 : base;
    }
  });
  return (
    <>
      <ambientLight ref={ambient} color="#8fa6a0" intensity={CFG.ambient} />
      {LAMPS.map((l, i) => (
        <mesh key={i} position={[l.x, WALL_H - 0.05, l.z]}>
          <boxGeometry args={[1.1, 0.08, 0.3]} />
          <meshStandardMaterial
            ref={(m) => {
              mats.current[i] = m;
            }}
            color="#1b1d1c"
            emissive="#cfe8d8"
            emissiveIntensity={1}
          />
        </mesh>
      ))}
      {high &&
        LIGHT_LAMPS.map((li, k) => (
          <pointLight
            key={li}
            ref={(l) => {
              lights.current[k] = l;
            }}
            position={[LAMPS[li].x, WALL_H - 0.4, LAMPS[li].z]}
            color="#a9c4b4"
            intensity={6}
            distance={15}
            decay={2}
          />
        ))}
    </>
  );
}

export function World({ high }: { high: boolean }) {
  return (
    <>
      <Walls high={high} />
      <FloorAndCeiling high={high} />
      <Props />
      <Decals />
      <Lamps high={high} />
    </>
  );
}
