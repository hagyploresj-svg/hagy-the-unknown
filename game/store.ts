import { create } from 'zustand';
import { audio } from './audio';
import { exitLock } from './platform';
import { releaseInput, resetShared, shared } from './shared';

export type Phase = 'menu' | 'playing' | 'paused' | 'won' | 'lost';
export type Quality = 'low' | 'high';

interface GameState {
  phase: Phase;
  quality: Quality;
  isTouch: boolean;
  runId: number;
  collected: number[];
  generatorOn: boolean;
  chasing: boolean;
  message: string;
  messageId: number;
  hint: string;
  canInteract: boolean;
  scareId: number;
  elapsed: number;

  setQuality: (q: Quality) => void;
  setTouch: (t: boolean) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  win: () => void;
  lose: () => void;
  toMenu: () => void;
  collectFuse: (i: number) => void;
  activateGenerator: () => void;
  say: (m: string) => void;
  setHint: (h: string, can: boolean) => void;
  setChasing: (c: boolean) => void;
}

export const useGame = create<GameState>()((set, get) => ({
  phase: 'menu',
  quality: 'high',
  isTouch: false,
  runId: 0,
  collected: [],
  generatorOn: false,
  chasing: false,
  message: '',
  messageId: 0,
  hint: '',
  canInteract: false,
  scareId: 0,
  elapsed: 0,

  setQuality: (q) => set({ quality: q }),
  setTouch: (t) => set({ isTouch: t }),

  start: () => {
    resetShared();
    releaseInput();
    audio.init();
    audio.resume();
    audio.setChase(false);
    audio.setGenerator(false);
    const id = get().runId + 1;
    set({
      phase: 'playing',
      runId: id,
      collected: [],
      generatorOn: false,
      chasing: false,
      message: '',
      hint: '',
      canInteract: false,
      scareId: 0,
      elapsed: 0,
    });
    get().say('Uyandın... Hastanenin elektrikleri kesik.');
    setTimeout(() => {
      const s = get();
      if (s.runId === id && s.phase === 'playing') s.say('3 sigortayı bul. Jeneratörü çalıştır. Kaç.');
    }, 4500);
  },

  pause: () => {
    if (get().phase !== 'playing') return;
    releaseInput();
    exitLock();
    audio.pause();
    set({ phase: 'paused' });
  },

  resume: () => {
    if (get().phase !== 'paused') return;
    audio.resume();
    set({ phase: 'playing' });
  },

  win: () => {
    if (get().phase !== 'playing') return;
    releaseInput();
    exitLock();
    audio.setChase(false);
    audio.winSting();
    set({ phase: 'won', elapsed: shared.time, chasing: false });
  },

  lose: () => {
    if (get().phase !== 'playing') return;
    releaseInput();
    exitLock();
    audio.setChase(false);
    audio.jumpscare();
    set({ phase: 'lost', elapsed: shared.time, chasing: false });
  },

  toMenu: () => {
    releaseInput();
    exitLock();
    audio.setChase(false);
    audio.setGenerator(false);
    audio.pause();
    set({ phase: 'menu', chasing: false });
  },

  collectFuse: (i) => {
    const s = get();
    if (s.collected.includes(i)) return;
    const next = [...s.collected, i];
    audio.pickup();
    set({ collected: next });
    if (next.length === 2) {
      // Ani karartma + korkutma + yaratık ses kaynağına yönelir.
      shared.blackout = 2.5;
      shared.alert = true;
      audio.bang();
      set((st) => ({ scareId: st.scareId + 1 }));
      get().say('Işıklar söndü... Bir şey seni duydu.');
    } else if (next.length === 3) {
      get().say('Üç sigorta tamam. Jeneratöre git!');
    } else {
      get().say(`Sigorta bulundu (${next.length}/3)`);
    }
  },

  activateGenerator: () => {
    if (get().generatorOn) return;
    audio.generatorStart();
    audio.setGenerator(true);
    shared.alert = true;
    shared.burst = 1;
    set((st) => ({ generatorOn: true, scareId: st.scareId + 1 }));
    get().say('Jeneratör çalıştı! Doğu koridorundaki çıkış kapısına koş!');
  },

  say: (m) => set((s) => ({ message: m, messageId: s.messageId + 1 })),

  setHint: (h, can) => set({ hint: h, canInteract: can }),

  setChasing: (c) => {
    audio.setChase(c);
    set({ chasing: c });
  },
}));
