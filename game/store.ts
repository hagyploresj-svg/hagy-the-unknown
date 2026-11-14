
import { create } from 'zustand';
import { audio } from './audio';
import { exitLock } from './platform';
import { releaseInput, resetShared, shared } from './shared';

export type Phase = 'menu' | 'playing' | 'paused' | 'won' | 'lost';
export type Quality = 'low' | 'high';

export type StoryChapter =
  | 'awakening'
  | 'quarantine'
  | 'laboratory'
  | 'escape';

export type Ending = 'escaped' | 'destroyed' | null;

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

  // DENEК 07 HİKÂYE SİSTEMİ
  chapter: StoryChapter;
  objective: string;
  records: number[];
  keycard: boolean;
  laboratoryUnlocked: boolean;
  ending: Ending;
  hidden: boolean;

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

  // YENİ HİKÂYE EYLEMLERİ
  collectRecord: (id: number) => void;
  collectKeycard: () => void;
  unlockLaboratory: () => void;
  setHidden: (value: boolean) => void;
  finishStory: (ending: Exclude<Ending, null>) => void;
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

  chapter: 'awakening',
  objective: 'Hastane odasından çık ve çevreyi araştır.',
  records: [],
  keycard: false,
  laboratoryUnlocked: false,
  ending: null,
  hidden: false,

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

      chapter: 'awakening',
      objective: '3 sigortayı bul ve karantina kapısına ulaş.',
      records: [],
      keycard: false,
      laboratoryUnlocked: false,
      ending: null,
      hidden: false,
    });

    get().say(
      'DENEК 07 UYANDI. Hafıza sıfırlama başarısız.'
    );

    setTimeout(() => {
      const s = get();

      if (s.runId === id && s.phase === 'playing') {
        s.say(
          'Kim olduğunu hatırlamıyorsun. Bileğinde yalnızca 07 yazıyor.'
        );
      }
    }, 4500);

    setTimeout(() => {
      const s = get();

      if (s.runId === id && s.phase === 'playing') {
        s.say(
          'Üç sigortayı bul. Elektriği geri getir.'
        );
      }
    }, 9000);
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

    set({
      phase: 'won',
      elapsed: shared.time,
      chasing: false,
      hidden: false,
    });
  },

  lose: () => {
    if (get().phase !== 'playing') return;

    releaseInput();
    exitLock();
    audio.setChase(false);
    audio.jumpscare();

    set({
      phase: 'lost',
      elapsed: shared.time,
      chasing: false,
      hidden: false,
    });
  },

  toMenu: () => {
    releaseInput();
    exitLock();

    audio.setChase(false);
    audio.setGenerator(false);
    audio.pause();

    set({
      phase: 'menu',
      chasing: false,
      hidden: false,
    });
  },

  collectFuse: (i) => {
    const s = get();

    if (s.phase !== 'playing') return;
    if (s.collected.includes(i)) return;

    const next = [...s.collected, i];

    audio.pickup();

    set({ collected: next });

    if (next.length === 2) {
      shared.blackout = 2.5;
      shared.alert = true;

      audio.bang();

      set((st) => ({
        scareId: st.scareId + 1,
      }));

      get().say(
        'Güvenlik alarmı! Denek 03 serbest bırakıldı.'
      );
    } else if (next.length === 3) {
      set({
        chapter: 'quarantine',
        objective: 'Jeneratörü çalıştır ve araştırma kayıtlarını bul.',
      });

      get().say(
        'Üç sigorta tamam. Karantina protokolü devre dışı.'
      );
    } else {
      get().say(
        `Sigorta bulundu (${next.length}/3)`
      );
    }
  },

  activateGenerator: () => {
    const s = get();

    if (s.phase !== 'playing') return;
    if (s.generatorOn) return;
    if (s.collected.length < 3) {
      s.say('Jeneratör için üç sigorta gerekiyor.');
      return;
    }

    audio.generatorStart();
    audio.setGenerator(true);

    shared.alert = true;
    shared.burst = 1;

    set((st) => ({
      generatorOn: true,
      scareId: st.scareId + 1,
      objective: 'Üç araştırma kaydını bul.',
    }));

    get().say(
      'Elektrik geri geldi. Gizli araştırma kayıtlarını bul.'
    );
  },

  collectRecord: (id) => {
    const s = get();

    if (s.phase !== 'playing') return;
    if (s.records.includes(id)) return;

    const next = [...s.records, id];

    audio.pickup();

    set({ records: next });

    const texts: Record<number, string> = {
      1: 'KAYIT 01: Proje Lazarus, insan hafızasını yeniden yazmak için başlatıldı.',
      2: 'KAYIT 02: Denek 03 kontrol dışı. Tüm personel tahliye edilmeli.',
      3: 'KAYIT 03: Denek 07 sıradan bir hasta değil. Projenin yöneticisi.',
    };

    get().say(
      texts[id] ?? `Araştırma kaydı ${id} bulundu.`
    );

    if (next.length >= 3) {
      set({
        objective: 'Laboratuvar erişim kartını bul.',
      });
    }
  },

  collectKeycard: () => {
    const s = get();

    if (s.phase !== 'playing' || s.keycard) return;

    audio.pickup();

    set({
      keycard: true,
      objective: 'Yeraltı laboratuvarının girişini bul.',
    });

    get().say(
      'LAZARUS LABORATUVARI — YETKİLİ ERİŞİM KARTI'
    );
  },

  unlockLaboratory: () => {
    const s = get();

    if (s.phase !== 'playing') return;
    if (s.laboratoryUnlocked) return;

    if (!s.generatorOn || s.records.length < 3 || !s.keycard) {
      s.say(
        'Erişim reddedildi. Elektrik, üç kayıt ve erişim kartı gerekli.'
      );
      return;
    }

    set({
      laboratoryUnlocked: true,
      chapter: 'laboratory',
      objective: 'Laboratuvardaki son deneyi araştır.',
    });

    get().say(
      'ERİŞİM ONAYLANDI. Hoş geldiniz, Doktor 07.'
    );
  },

  setHidden: (value) => {
    if (get().phase !== 'playing') return;

    set({ hidden: value });

    get().say(
      value
        ? 'Saklandın. Sessiz kal.'
        : 'Saklandığın yerden çıktın.'
    );
  },

  finishStory: (ending) => {
    if (get().phase !== 'playing') return;

    set({
      chapter: 'escape',
      ending,
      objective: 'Hikâye tamamlandı.',
    });

    get().win();
  },

  say: (m) =>
    set((s) => ({
      message: m,
      messageId: s.messageId + 1,
    })),

  setHint: (h, can) =>
    set({
      hint: h,
      canInteract: can,
    }),

  setChasing: (c) => {
    audio.setChase(c);
    set({ chasing: c });
  },
}));
