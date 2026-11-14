import * as THREE from 'three';
import { COLS, ROWS } from './map';

function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeCanvas(size: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) throw new Error('Canvas 2D desteklenmiyor');
  return { c, g };
}

export type SurfaceKind = 'wall' | 'floor' | 'ceiling';

/** Dosya gerektirmeyen, kirli hastane dokuları. */
export function makeSurfaceTexture(kind: SurfaceKind): THREE.CanvasTexture {
  const size = 256;
  const { c, g } = makeCanvas(size);
  const r = rng(kind === 'wall' ? 11 : kind === 'floor' ? 23 : 37);

  if (kind === 'wall') {
    g.fillStyle = '#9aa095';
    g.fillRect(0, 0, size, size);
    g.fillStyle = '#4d6258';
    g.fillRect(0, size * 0.55, size, size * 0.45);
    g.fillStyle = '#1d211f';
    g.fillRect(0, size * 0.54, size, 4);
  } else if (kind === 'floor') {
    g.fillStyle = '#6a7069';
    g.fillRect(0, 0, size, size);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, 0, size / 2, size / 2);
    g.fillRect(size / 2, size / 2, size / 2, size / 2);
    g.fillStyle = '#262a27';
    g.fillRect(0, 0, size, 3);
    g.fillRect(0, size / 2 - 1, size, 3);
    g.fillRect(0, 0, 3, size);
    g.fillRect(size / 2 - 1, 0, 3, size);
  } else {
    g.fillStyle = '#4b504c';
    g.fillRect(0, 0, size, size);
    g.fillStyle = '#2a2d2b';
    g.fillRect(0, 0, size, 3);
    g.fillRect(0, 0, 3, size);
  }

  for (let i = 0; i < 4000; i++) {
    g.fillStyle = `rgba(0,0,0,${r() * 0.12})`;
    g.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2);
  }
  for (let i = 0; i < 14; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = 10 + r() * 40;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, kind === 'floor' ? 'rgba(40,10,5,0.35)' : 'rgba(30,25,10,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  if (kind === 'wall') {
    for (let i = 0; i < 9; i++) {
      g.fillStyle = 'rgba(30,20,10,0.22)';
      g.fillRect(r() * size, 0, 1 + r() * 2, r() * size * 0.9);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  if (kind !== 'wall') tex.repeat.set(COLS, ROWS);
  return tex;
}

export function makeBloodTexture(): THREE.CanvasTexture {
  const size = 128;
  const { c, g } = makeCanvas(size);
  const r = rng(77);
  g.clearRect(0, 0, size, size);
  for (let i = 0; i < 9; i++) {
    const x = size / 2 + (r() - 0.5) * 50;
    const y = size / 2 + (r() - 0.5) * 50;
    const rad = 8 + r() * 26;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, 'rgba(95,0,0,0.9)');
    grad.addColorStop(0.7, 'rgba(60,0,0,0.6)');
    grad.addColorStop(1, 'rgba(40,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const { c, g } = makeCanvas(size);
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
