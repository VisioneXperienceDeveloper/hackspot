import { useState } from 'react';
import { reduce } from '../game/engine';
import { loadGame } from '../game/storage';
import { useAutoSave } from './useAutoSave';

export function useGameSession() {
  const [loaded] = useState(() => {
    const saved = loadGame();
    return saved.state.bank && !saved.state.onboarding.completed
      ? { ...saved, state: reduce(saved.state, { type: 'complete-tutorial' }) }
      : saved;
  });
  const [state, setState] = useState(loaded.state);
  const [saveEnabled, setSaveEnabled] = useState(!loaded.warning);
  const {
    status: saveStatus,
    failed: saveFailed,
    retry: retrySave,
  } = useAutoSave(state, saveEnabled);

  return {
    loaded,
    state,
    setState,
    saveEnabled,
    setSaveEnabled,
    saveStatus,
    saveFailed,
    retrySave,
  };
}
