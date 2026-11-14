'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { spawns } from './map';
import { useGame } from './store';
import { makeGlowTexture } from './textures';

function Glow({ color, size, texture }: { color: string; size: number; texture: THREE.Texture }) {
  return (
    <sprite scale={[size, size, 1]}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </sprite>
  );
}

function Fuse({ index, x, z, glow }: { index: number; x: number; z: number; glow: THREE.Texture }) {
  const taken = useGame((s) => s.collected.includes(index));
  const ref = useRef<THREE.Group>(null);
  useFrame((st) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y = st.clock.elapsedTime * 1.2;
    g.position.y = 1.0 + Math.sin(st.clock.elapsedTime * 2 + index) * 0.08;
  });
  if (taken) return null;
  return (
    <group ref={ref} position={[x, 1.0, z]}>
      <mesh>
        <boxGeometry args={[0.16, 0.5, 0.16]} />
        <meshStandardMaterial color="#222" emissive="#ffb020" emissiveIntensity={1.8} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.1, 8]} />
        <meshStandardMaterial color="#999" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.1, 8]} />
        <meshStandardMaterial color="#999" metalness={0.8} roughness={0.3} />
      </mesh>
      <Glow color="#ffae2a" size={1.5} texture={glow} />
    </group>
  );
}

function Generator({ glow }: { glow: THREE.Texture }) {
  const on = useGame((s) => s.generatorOn);
  const lamp = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((st) => {
    if (lamp.current) {
      lamp.current.emissiveIntensity = on ? 2.2 : 1 + Math.sin(st.clock.elapsedTime * 3) * 0.6;
    }
  });
  const p = spawns.generator;
  return (
    <group position={[p.x, 0, p.z]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[1.5, 1.2, 1.0]} />
        <meshStandardMaterial color="#3b4a3d" roughness={0.7} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.4, 10]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0.5, 0.9, 0.52]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial
          ref={lamp}
          color="#111"
          emissive={on ? '#33ff66' : '#ff2a1a'}
          emissiveIntensity={1.5}
        />
      </mesh>
      <group position={[0.5, 0.9, 0.55]}>
        <Glow color={on ? '#33ff66' : '#ff2a1a'} size={on ? 2.4 : 1.4} texture={glow} />
      </group>
    </group>
  );
}

function ExitDoor({ glow }: { glow: THREE.Texture }) {
  const on = useGame((s) => s.generatorOn);
  const p = spawns.exit;
  return (
    <group position={[p.x, 0, p.z]}>
      {/* Hücrenin tamamını dolduran koyu gövde */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[2, 3.2, 2]} />
        <meshStandardMaterial color="#1b2220" roughness={1} />
      </mesh>
      {/* Kapı */}
      <mesh position={[-1.02, 1.15, 0]}>
        <boxGeometry args={[0.12, 2.3, 1.6]} />
        <meshStandardMaterial color={on ? '#3f6b4a' : '#5a2a28'} roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Çıkış tabelası */}
      <mesh position={[-1.02, 2.65, 0]}>
        <boxGeometry args={[0.12, 0.3, 1.2]} />
        <meshStandardMaterial
          color="#111"
          emissive={on ? '#33ff66' : '#ff2a1a'}
          emissiveIntensity={on ? 2.5 : 1.2}
        />
      </mesh>
      <group position={[-1.3, 2.65, 0]}>
        <Glow color={on ? '#33ff66' : '#ff2a1a'} size={on ? 3.2 : 2.0} texture={glow} />
      </group>
    </group>
  );
}

export function Pickups() {
  const glow = useMemo(() => makeGlowTexture(), []);
  return (
    <>
      {spawns.fuses.map((f, i) => (
        <Fuse key={i} index={i} x={f.x} z={f.z} glow={glow} />
      ))}
      <Generator glow={glow} />
      <ExitDoor glow={glow} />
    </>
  );
}
