import type { WindowState } from './Window';

export type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export function fitWindow(
  win: WindowState,
  viewportWidth: number,
  viewportHeight: number,
): WindowState {
  if (viewportWidth <= 540) return win;
  const compact = viewportWidth <= 850;
  const left = compact ? 82 : 92;
  const top = compact ? 65 : 54;
  const right = viewportWidth - 16;
  const bottom = viewportHeight - 64;
  const availableWidth = Math.max(1, right - left);
  const availableHeight = Math.max(1, bottom - top);
  const minWidth = Math.min(360, availableWidth);
  const minHeight = Math.min(250, availableHeight);
  const width = Math.min(Math.max(minWidth, win.width), availableWidth);
  const height = Math.min(Math.max(minHeight, win.height), availableHeight);
  return {
    ...win,
    width,
    height,
    x: Math.max(left, Math.min(win.x, right - width)),
    y: Math.max(top, Math.min(win.y, bottom - height)),
  };
}

export function resizeWindow(
  win: WindowState,
  direction: ResizeDirection,
  deltaX: number,
  deltaY: number,
  viewportWidth: number,
  viewportHeight: number,
): WindowState {
  if (viewportWidth <= 540) return win;
  const base = fitWindow(win, viewportWidth, viewportHeight);
  const compact = viewportWidth <= 850;
  const left = compact ? 82 : 92;
  const top = compact ? 65 : 54;
  const right = viewportWidth - 16;
  const bottom = viewportHeight - 64;
  const minWidth = Math.min(360, right - left);
  const minHeight = Math.min(250, bottom - top);
  let { x, y, width, height } = base;

  if (direction.includes('w')) {
    x = Math.max(left, Math.min(base.x + deltaX, base.x + base.width - minWidth));
    width = base.x + base.width - x;
  } else if (direction.includes('e')) {
    width = Math.max(minWidth, Math.min(base.width + deltaX, right - base.x));
  }

  if (direction.includes('n')) {
    y = Math.max(top, Math.min(base.y + deltaY, base.y + base.height - minHeight));
    height = base.y + base.height - y;
  } else if (direction.includes('s')) {
    height = Math.max(minHeight, Math.min(base.height + deltaY, bottom - base.y));
  }

  return { ...base, x, y, width, height };
}
