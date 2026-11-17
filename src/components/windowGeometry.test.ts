import { it, expect } from 'vitest';
import { fitWindow } from './windowGeometry';
import type { WindowState } from './Window';
const win: WindowState = {
  id: 'mail',
  x: 9999,
  y: 9999,
  width: 900,
  height: 600,
  z: 1,
  minimized: false,
  closed: false,
  maximized: false,
};
it('창 전체를 데스크톱 작업 영역 안에 유지한다', () => {
  for (const [width, height] of [
    [1440, 900],
    [900, 600],
    [1024, 500],
  ]) {
    const w = fitWindow(win, width, height);
    expect(w.x).toBeGreaterThanOrEqual(92);
    expect(w.y).toBeGreaterThanOrEqual(54);
    expect(w.x + w.width).toBeLessThanOrEqual(width - 16);
    expect(w.y + w.height).toBeLessThanOrEqual(height - 64);
  }
});
it('작은 화면에서는 CSS 전환 후 복구할 데스크톱 배치를 보존한다', () => {
  expect(fitWindow(win, 390, 844)).toEqual(win);
});
