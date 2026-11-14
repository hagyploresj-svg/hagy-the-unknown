// Tarayıcı API'leri için güvenli yardımcılar.
export function requestLock(): void {
  if (typeof document === 'undefined') return;
  try {
    const r: unknown = document.documentElement.requestPointerLock();
    if (r instanceof Promise) r.catch(() => undefined);
  } catch {
    /* desteklenmiyor */
  }
}

export function exitLock(): void {
  if (typeof document === 'undefined') return;
  try {
    if (document.pointerLockElement) document.exitPointerLock();
  } catch {
    /* yoksay */
  }
}

export function goFullscreen(): void {
  if (typeof document === 'undefined') return;
  try {
    const r: unknown = document.documentElement.requestFullscreen();
    if (r instanceof Promise) r.catch(() => undefined);
  } catch {
    /* iPhone Safari tam ekranı desteklemez */
  }
}
