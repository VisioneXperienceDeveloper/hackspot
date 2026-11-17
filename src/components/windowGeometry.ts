import type { WindowState } from './Window';
export function fitWindow(
  win: WindowState,
  viewportWidth: number,
  viewportHeight: number,
): WindowState {
  // Compact layouts are controlled by CSS; retain desktop geometry for restoration.
  if (viewportWidth <= 850) return win;
  const left = 92,
    top = 54,
    right = viewportWidth - 16,
    bottom = viewportHeight - 64;
  const width = Math.min(Math.max(360, win.width), right - left);
  const height = Math.min(Math.max(250, win.height), bottom - top);
  return {
    ...win,
    width,
    height,
    x: Math.max(left, Math.min(win.x, right - width)),
    y: Math.max(top, Math.min(win.y, bottom - height)),
  };
}
