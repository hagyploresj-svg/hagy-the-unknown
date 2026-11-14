'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { audio } from './audio';
import { CFG } from './config';
import { moveWithCollision, spawns, Vec2 } from './map';
import { input, shared } from './shared';
import { useGame } from './store';

export function Player({ high }: { high: boolean }) {
  const { camera } = useThree();
  const spot = useRef<THREE.SpotLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo<Vec2>(() => ({ x: 0, z: 0 }), []);
  const bob = useRef({ t: 0, step: 0 });

  useLayoutEffect(() => {
    camera.rotation.order = 'YXZ';
    camera.position.set(shared.px, CFG.eye, shared.pz);
    camera.rotation.set(shared.pitch, shared.yaw, 0);
  }, [camera]);

  useFrame((_, delta) => {
    const g = useGame.getState();
    const dt = Math.min(delta, 0.05);
    const sp = spot.current;

    // Yakalandığında kamera yaratığa döner.
    if (g.phase === 'lost') {
      const ang = Math.atan2(-(shared.ex - shared.px), -(shared.ez - shared.pz));
      let d = ang - shared.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      shared.yaw += d * Math.min(1, dt * 8);
      shared.pitch += (0.12 - shared.pitch) * Math.min(1, dt * 6);
      camera.rotation.set(shared.pitch, shared.yaw, 0);
      return;
    }
    if (g.phase !== 'playing') return;

    shared.time += dt;

    // --- Bakış ---
    shared.yaw -= input.lookX;
    shared.pitch -= input.lookY;
    input.lookX = 0;
    input.lookY = 0;
    shared.pitch = Math.max(-1.25, Math.min(1.25, shared.pitch));

    // --- Hareket girdisi ---
    const k = input.keys;
    let mx = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0) + input.moveX;
    let my = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0) + input.moveY;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    const moving = len > 0.08;

    // --- Koşma / dayanıklılık ---
    const wantRun = (k['ShiftLeft'] || k['ShiftRight'] || input.run) && moving && my > -0.2;
    let running = false;
    if (wantRun && !shared.exhausted && shared.stamina > 0) {
      running = true;
      shared.stamina = Math.max(0, shared.stamina - CFG.staminaDrain * dt);
      if (shared.stamina <= 0) shared.exhausted = true;
    } else {
      shared.stamina = Math.min(
        100,
        shared.stamina + (moving ? CFG.staminaRegenMoving : CFG.staminaRegen) * dt,
      );
      if (shared.exhausted && shared.stamina >= CFG.staminaRecover) shared.exhausted = false;
    }
    shared.running = running && moving;
    const speed = shared.running ? CFG.runSpeed : shared.exhausted ? CFG.walkSpeed * 0.75 : CFG.walkSpeed;

    // --- Hareket + duvar çarpışması ---
    const sy = Math.sin(shared.yaw);
    const cy = Math.cos(shared.yaw);
    const vx = (-sy * my + cy * mx) * speed * dt;
    const vz = (-cy * my - sy * mx) * speed * dt;
    moveWithCollision(shared.px, shared.pz, vx, vz, CFG.playerRadius, tmp);
    shared.px = tmp.x;
    shared.pz = tmp.z;

    // --- Ayak sesi + kafa sallanması ---
    const b = bob.current;
    if (moving) {
      b.t += dt * (shared.running ? 11 : 7.5);
      b.step -= dt;
      if (b.step <= 0) {
        audio.step(shared.running);
        b.step = shared.running ? 0.3 : 0.5;
      }
    } else {
      b.step = 0.1;
    }
    const bobY = moving ? Math.sin(b.t) * (shared.running ? 0.06 : 0.04) : 0;

    camera.position.set(shared.px, CFG.eye + bobY, shared.pz);
    camera.rotation.set(shared.pitch, shared.yaw, 0);

    // --- El feneri ---
    if (input.toggleFlash) {
      input.toggleFlash = false;
      shared.flashOn = !shared.flashOn;
      audio.click();
    }
    let fl = shared.flashOn ? 1 : 0;
    if (fl > 0) {
      if (shared.blackout > 0) fl *= Math.random() > 0.6 ? 0.6 : 0.05;
      else if (shared.enemyDist < 8 && Math.random() < ((8 - shared.enemyDist) / 8) * 0.25) fl *= 0.1;
    }
    if (sp) {
      const cp = Math.cos(shared.pitch);
      sp.position.set(camera.position.x, camera.position.y - 0.1, camera.position.z);
      target.position.set(
        camera.position.x - sy * cp * 10,
        camera.position.y + Math.sin(shared.pitch) * 10,
        camera.position.z - cy * cp * 10,
      );
      sp.intensity = CFG.flashIntensity * fl;
    }
    if (fill.current) fill.current.position.set(camera.position.x, camera.position.y, camera.position.z);

    // --- Toplama (sigorta) ---
    for (let i = 0; i < spawns.fuses.length; i++) {
      if (g.collected.includes(i)) continue;
      const f = spawns.fuses[i];
      if (Math.hypot(f.x - shared.px, f.z - shared.pz) < 1.5) g.collectFuse(i);
    }

    // --- Jeneratör / çıkış ---
    const dG = Math.hypot(spawns.generator.x - shared.px, spawns.generator.z - shared.pz);
    const dX = Math.hypot(spawns.exit.x - shared.px, spawns.exit.z - shared.pz);
    let hint = '';
    let can = false;
    if (dG < 2.8 && !g.generatorOn) {
      if (g.collected.length < 3) hint = `Jeneratör için 3 sigorta gerekli (${g.collected.length}/3)`;
      else {
        hint = 'Jeneratörü çalıştır';
        can = true;
      }
    } else if (dX < 3.4 && !g.generatorOn) {
      hint = 'Kapı kilitli. Elektrik yok.';
    }
    if (g.hint !== hint || g.canInteract !== can) g.setHint(hint, can);
    if (input.interact) {
      input.interact = false;
      if (can) g.activateGenerator();
    }
    if (g.generatorOn && dX < 2.6) {
      g.win();
      return;
    }

    // --- Ani olaylar ---
    if (!shared.bangDone && shared.time > 18) {
      shared.bangDone = true;
      shared.burst = 2;
      audio.bang();
      g.say('Koridorda bir şey hareket etti...');
    }

    audio.update(dt, shared.enemyDist);
  });

  return (
    <>
      <spotLight
        ref={spot}
        color="#f2f0dc"
        intensity={CFG.flashIntensity}
        angle={0.52}
        penumbra={0.55}
        distance={26}
        decay={2}
        castShadow={high}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0005}
        target={target}
      />
      <primitive object={target} />
      <pointLight ref={fill} color="#50605a" intensity={0.5} distance={5} decay={2} />
    </>
  );
}
