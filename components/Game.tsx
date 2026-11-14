'use client';

import { Canvas } from '@react-three/fiber';
import { useEffect } from 'react';
import { requestLock } from '@/game/platform';
import { Scene } from '@/game/Scene';
import { input } from '@/game/shared';
import { useGame } from '@/game/store';
import { Hud, LoseScreen, Menu, PauseMenu, ScareFlash, TouchControls, WinScreen } from './Ui';

function useGlobalInput(): void {
  useEffect(() => {
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const st = useGame.getState();
    st.setTouch(touch);
    if (touch) st.setQuality('low'); // mobilde varsayılan: düşük kalite

    const onKeyDown = (e: KeyboardEvent) => {
      const g = useGame.getState();
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      input.keys[e.code] = true;
      if (e.repeat) return;
      if (g.phase === 'playing') {
        if (e.code === 'KeyF') input.toggleFlash = true;
        else if (e.code === 'KeyE') input.interact = true;
        else if (e.code === 'KeyP' || e.code === 'Escape') g.pause();
      } else if (g.phase === 'paused' && (e.code === 'KeyP' || e.code === 'Escape')) {
        g.resume();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      input.keys[e.code] = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      if (useGame.getState().phase !== 'playing') return;
      const mx = Math.max(-120, Math.min(120, e.movementX));
      const my = Math.max(-120, Math.min(120, e.movementY));
      input.lookX += mx * 0.0022;
      input.lookY += my * 0.0022;
    };
    const onLockChange = () => {
      const g = useGame.getState();
      if (!document.pointerLockElement && g.phase === 'playing' && !g.isTouch) g.pause();
    };
    const onClick = () => {
      const g = useGame.getState();
      if (g.phase === 'playing' && !g.isTouch && !document.pointerLockElement) requestLock();
    };
    const onBlur = () => useGame.getState().pause();
    const onVisibility = () => {
      if (document.hidden) useGame.getState().pause();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);
    window.addEventListener('blur', onBlur);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}

export default function Game() {
  useGlobalInput();
  const phase = useGame((s) => s.phase);
  const quality = useGame((s) => s.quality);
  const runId = useGame((s) => s.runId);
  const isTouch = useGame((s) => s.isTouch);
  const high = quality === 'high';

  return (
    <div className={`root${isTouch ? ' touch' : ''}`}>
      <Canvas
        key={`${runId}-${quality}`}
        className="canvas"
        shadows={high}
        dpr={high ? [1, 1.75] : [0.6, 1]}
        camera={{ fov: 72, near: 0.1, far: 70, position: [0, 1.65, 0] }}
        gl={{ antialias: high, powerPreference: 'high-performance', alpha: false }}
      >
        <Scene />
      </Canvas>

      <div className="grain" />
      <div className="vignette" />

      {(phase === 'playing' || phase === 'paused') && <Hud />}
      {phase === 'playing' && <ScareFlash />}
      {phase === 'playing' && isTouch && <TouchControls />}
      {phase === 'menu' && <Menu />}
      {phase === 'paused' && <PauseMenu />}
      {phase === 'won' && <WinScreen />}
      {phase === 'lost' && <LoseScreen />}
    </div>
  );
}
