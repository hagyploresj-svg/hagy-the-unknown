'use client';

import dynamic from 'next/dynamic';

// Three.js / WebAudio yalnızca tarayıcıda çalışır: SSR kapalı.
const Game = dynamic(() => import('./Game'), {
  ssr: false,
  loading: () => <div className="loading">YÜKLENİYOR…</div>,
});

export default function GameLoader() {
  return <Game />;
}
