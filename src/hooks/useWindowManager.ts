import { useCallback, useEffect, useRef, useState } from 'react';
import { fitWindow } from '../components/windowGeometry';
import type { AppId, WindowState } from '../components/Window';
import { initialWindows } from '../configs/windowLayout';

export function useWindowManager(onboarded: boolean, initialApps: AppId[] = []) {
  const [windows, setWindows] = useState(() => initialWindows(onboarded));
  const [runningApps, setRunningApps] = useState(initialApps);
  const zIndex = useRef(4);
  const frontApp = windows
    .filter((window) => !window.closed && !window.minimized)
    .sort((a, b) => b.z - a.z)[0]?.id;

  const focus = useCallback((id: AppId) => {
    const z = ++zIndex.current;
    setWindows((items) => items.map((window) => (window.id === id ? { ...window, z } : window)));
  }, []);

  const open = useCallback((id: AppId) => {
    const z = ++zIndex.current;
    setRunningApps((apps) => (apps.includes(id) ? apps : [...apps, id]));
    setWindows((items) =>
      items.map((window) =>
        window.id === id ? { ...window, closed: false, minimized: false, z } : window,
      ),
    );
  }, []);

  const close = useCallback((id: AppId) => {
    setRunningApps((apps) => apps.filter((app) => app !== id));
    const initial = initialWindows().find((window) => window.id === id)!;
    setWindows((items) =>
      items.map((window) => (window.id === id ? { ...initial, closed: true } : window)),
    );
  }, []);

  const change = useCallback((id: AppId, patch: Partial<WindowState>) => {
    setWindows((items) =>
      items.map((window) => (window.id === id ? { ...window, ...patch } : window)),
    );
  }, []);

  const reset = useCallback(() => {
    zIndex.current = 4;
    setWindows(initialWindows());
    setRunningApps([]);
  }, []);

  useEffect(() => {
    const resize = () =>
      setWindows((items) =>
        items.map((item) => fitWindow(item, window.innerWidth, window.innerHeight)),
      );
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return {
    windows,
    runningApps,
    frontApp,
    open,
    close,
    focus,
    change,
    reset,
    setWindows,
  };
}
