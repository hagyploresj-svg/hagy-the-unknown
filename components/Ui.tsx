'use client';

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as RPointerEvent } from 'react';
import { audio } from '@/game/audio';
import { goFullscreen, requestLock } from '@/game/platform';
import { input, shared } from '@/game/shared';
import { Quality, useGame } from '@/game/store';

function startGame(): void {
  audio.init();
  const g = useGame.getState();
  g.start();
  if (g.isTouch) goFullscreen();
  else requestLock();
}

function resumeGame(): void {
  const g = useGame.getState();
  g.resume();
  if (!g.isTouch) requestLock();
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function Face() {
  return (
    <svg viewBox="0 0 200 240" className="face" aria-hidden="true">
      <ellipse cx="100" cy="120" rx="70" ry="98" fill="#c9cdc0" />
      <ellipse cx="68" cy="105" rx="22" ry="30" fill="#050505" />
      <ellipse cx="132" cy="105" rx="22" ry="30" fill="#050505" />
      <circle cx="68" cy="108" r="6" fill="#ff2a1a" />
      <circle cx="132" cy="108" r="6" fill="#ff2a1a" />
      <path d="M52 160 Q100 245 148 160 Q100 190 52 160Z" fill="#0a0000" />
      <path d="M62 166 L68 182 L74 168 L82 188 L90 172 L100 192 L110 172 L118 188 L126 168 L132 182 L138 166" stroke="#d8d8c8" strokeWidth="3" fill="none" />
    </svg>
  );
}

function QualityPick() {
  const quality = useGame((s) => s.quality);
  const setQuality = useGame((s) => s.setQuality);
  const opt = (q: Quality, label: string) => (
    <button
      type="button"
      className={`chip${quality === q ? ' on' : ''}`}
      onClick={() => setQuality(q)}
    >
      {label}
    </button>
  );
  return (
    <div className="quality">
      <span>Grafik kalitesi:</span>
      {opt('low', 'Düşük (mobil)')}
      {opt('high', 'Yüksek')}
    </div>
  );
}

export function Menu() {
  const isTouch = useGame((s) => s.isTouch);
  return (
    <div className="screen menu">
      <div className="title-wrap">
        <h1 className="title">HAGY</h1>
        <h2 className="subtitle">THE UNKNOWN</h2>
        <p className="chapter">BÖLÜM 1 — GECE NÖBETİ</p>
      </div>
      <p className="story">
        Gece yarısı terk edilmiş bir hastanede uyanıyorsun. Elektrik yok. Koridorlarda bir şey
        dolaşıyor. <b>3 sigortayı</b> bul, <b>jeneratörü</b> çalıştır ve <b>kaç</b>.
      </p>
      <QualityPick />
      <button type="button" className="btn big" onClick={startGame}>
        OYUNA BAŞLA
      </button>
      <div className="help">
        {isTouch ? (
          <>
            <p>Sol taraf: joystick (hareket) · Sağ taraf: kaydır (bakış)</p>
            <p>KOŞ (basılı tut) · FENER · EYLEM butonları · telefonu yatay tut</p>
          </>
        ) : (
          <>
            <p>WASD: hareket · Fare: bakış · Shift: koş · F: el feneri · E: etkileşim</p>
            <p>Esc / P: duraklat</p>
          </>
        )}
        <p className="warn">Kulaklık önerilir. Ani korkutma sahneleri içerir.</p>
      </div>
    </div>
  );
}

export function PauseMenu() {
  return (
    <div className="screen pause">
      <h2>DURAKLATILDI</h2>
      <QualityPick />
      <button type="button" className="btn big" onClick={resumeGame}>
        DEVAM ET
      </button>
      <button type="button" className="btn" onClick={startGame}>
        BAŞTAN BAŞLA
      </button>
      <button type="button" className="btn" onClick={() => useGame.getState().toMenu()}>
        ANA MENÜ
      </button>
    </div>
  );
}

export function WinScreen() {
  const elapsed = useGame((s) => s.elapsed);
  return (
    <div className="screen win">
      <h2>KAÇTIN</h2>
      <p>Sabahın ilk ışıkları... ama o hâlâ orada bir yerde.</p>
      <p className="time">Süre: {fmtTime(elapsed)}</p>
      <button type="button" className="btn big" onClick={startGame}>
        TEKRAR OYNA
      </button>
      <button type="button" className="btn" onClick={() => useGame.getState().toMenu()}>
        ANA MENÜ
      </button>
    </div>
  );
}

export function LoseScreen() {
  const [scare, setScare] = useState(true);
  const elapsed = useGame((s) => s.elapsed);
  useEffect(() => {
    const t = setTimeout(() => setScare(false), 1300);
    return () => clearTimeout(t);
  }, []);
  if (scare) {
    return (
      <div className="screen scare">
        <Face />
      </div>
    );
  }
  return (
    <div className="screen lose">
      <h2>YAKALANDIN</h2>
      <p>Karanlık seni yuttu.</p>
      <p className="time">Hayatta kalma süresi: {fmtTime(elapsed)}</p>
      <button type="button" className="btn big" onClick={startGame}>
        YENİDEN DENE
      </button>
      <button type="button" className="btn" onClick={() => useGame.getState().toMenu()}>
        ANA MENÜ
      </button>
    </div>
  );
}

export function ScareFlash() {
  const scareId = useGame((s) => s.scareId);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (scareId === 0) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 380);
    return () => clearTimeout(t);
  }, [scareId]);
  if (!show) return null;
  return (
    <div className="scare-flash">
      <Face />
    </div>
  );
}

export function Hud() {
  const collected = useGame((s) => s.collected.length);
  const generatorOn = useGame((s) => s.generatorOn);
  const message = useGame((s) => s.message);
  const messageId = useGame((s) => s.messageId);
  const hint = useGame((s) => s.hint);
  const chasing = useGame((s) => s.chasing);
  const isTouch = useGame((s) => s.isTouch);
  const [st, setSt] = useState({ stamina: 100, flash: true, exhausted: false });

  useEffect(() => {
    const id = setInterval(() => {
      setSt((p) =>
        Math.abs(p.stamina - shared.stamina) < 1 &&
        p.flash === shared.flashOn &&
        p.exhausted === shared.exhausted
          ? p
          : { stamina: shared.stamina, flash: shared.flashOn, exhausted: shared.exhausted },
      );
    }, 100);
    return () => clearInterval(id);
  }, []);

  const objective = generatorOn
    ? 'Çıkış kapısına git!'
    : collected < 3
      ? `Sigortaları bul (${collected}/3)`
      : 'Jeneratörü çalıştır';

  return (
    <div className="hud">
      {chasing && <div className="chase-vignette" />}
      <div className="objective">{objective}</div>
      <div className="fuses">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`fuse${i < collected ? ' got' : ''}`} />
        ))}
      </div>
      <div className="stamina">
        <div
          className={`stamina-fill${st.exhausted ? ' tired' : ''}`}
          style={{ width: `${Math.max(0, Math.min(100, st.stamina))}%` }}
        />
      </div>
      <div className="flash-ind">{st.flash ? 'FENER AÇIK' : 'FENER KAPALI'}</div>
      <div className="crosshair" />
      {message && (
        <div key={messageId} className="msg">
          {message}
        </div>
      )}
      {hint && (
        <div className="hint">
          {!isTouch && hint === 'Jeneratörü çalıştır' ? '[E] ' : ''}
          {hint}
        </div>
      )}
      {isTouch && (
        <button
          type="button"
          className="pause-btn"
          onClick={() => useGame.getState().pause()}
          aria-label="Duraklat"
        >
          II
        </button>
      )}
    </div>
  );
}

export function TouchControls() {
  const canInteract = useGame((s) => s.canInteract);
  const [stick, setStick] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null);
  const stickId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const last = useRef({ x: 0, y: 0 });
  const R = 60;

  const onStickDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (stickId.current !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    stickId.current = e.pointerId;
    setStick({ ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY });
  };
  const onStickMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (stickId.current !== e.pointerId) return;
    setStick((s) => {
      if (!s) return s;
      let dx = e.clientX - s.ox;
      let dy = e.clientY - s.oy;
      const len = Math.hypot(dx, dy);
      if (len > R) {
        dx = (dx / len) * R;
        dy = (dy / len) * R;
      }
      input.moveX = dx / R;
      input.moveY = -dy / R;
      return { ...s, x: s.ox + dx, y: s.oy + dy };
    });
  };
  const onStickUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (stickId.current !== e.pointerId) return;
    stickId.current = null;
    input.moveX = 0;
    input.moveY = 0;
    setStick(null);
  };

  const onLookDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (lookId.current !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    lookId.current = e.pointerId;
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onLookMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (lookId.current !== e.pointerId) return;
    input.lookX += (e.clientX - last.current.x) * 0.0045;
    input.lookY += (e.clientY - last.current.y) * 0.0045;
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onLookUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (lookId.current !== e.pointerId) return;
    lookId.current = null;
  };

  return (
    <div className="touch-layer">
      <div
        className="zone left"
        onPointerDown={onStickDown}
        onPointerMove={onStickMove}
        onPointerUp={onStickUp}
        onPointerCancel={onStickUp}
      />
      <div
        className="zone right"
        onPointerDown={onLookDown}
        onPointerMove={onLookMove}
        onPointerUp={onLookUp}
        onPointerCancel={onLookUp}
      />
      {stick && (
        <>
          <div className="stick-base" style={{ left: stick.ox, top: stick.oy }} />
          <div className="stick-knob" style={{ left: stick.x, top: stick.y }} />
        </>
      )}
      <div className="tbtns">
        {canInteract && (
          <button
            type="button"
            className="tbtn act"
            onPointerDown={(e) => {
              e.preventDefault();
              input.interact = true;
            }}
          >
            EYLEM
          </button>
        )}
        <button
          type="button"
          className="tbtn"
          onPointerDown={(e) => {
            e.preventDefault();
            input.toggleFlash = true;
          }}
        >
          FENER
        </button>
        <button
          type="button"
          className="tbtn"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            input.run = true;
          }}
          onPointerUp={() => {
            input.run = false;
          }}
          onPointerCancel={() => {
            input.run = false;
          }}
        >
          KOŞ
        </button>
      </div>
      <div className="rotate-hint">Telefonu yatay çevir</div>
    </div>
  );
}
