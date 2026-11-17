import { useEffect, useState } from 'react';
import type { GameState } from '../game/engine';
import { SAVE_KEY } from '../game/storage';

// Debounce typing, but flush the current state before reload or backgrounding.
export function useAutoSave(state: GameState, enabled: boolean) {
  const [saved, setSaved] = useState<GameState | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let dirty = true;
    function flush() {
      if (!dirty) return;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
        dirty = false;
        setSaved(state);
        setFailed(false);
      } catch {
        setFailed(true);
      }
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') flush();
    }
    const timer = setTimeout(flush, 250);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [state, enabled, attempt]);
  return {
    status: !enabled
      ? '저장 복구 필요'
      : failed
        ? '저장 실패 — 공간 또는 권한 확인'
        : saved === state
          ? '저장됨'
          : '저장 중…',
    failed,
    retry: () => setAttempt((a) => a + 1),
  };
}
