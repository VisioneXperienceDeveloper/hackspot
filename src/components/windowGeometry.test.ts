import { it, expect } from 'vitest';
import { fitWindow, resizeWindow } from './windowGeometry';
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

it('태블릿 폭에서는 창을 작업 영역에 맞추고 가장자리 크기 조절을 허용한다', () => {
  const fitted = fitWindow({ ...win, x: 0, y: 0, width: 650, height: 500 }, 750, 700);
  expect(fitted.x).toBe(82);
  expect(fitted.x + fitted.width).toBeLessThanOrEqual(734);
  expect(resizeWindow({ ...fitted, width: 400 }, 'e', 50, 0, 750, 700).width).toBe(450);
});

it('네 변과 모서리에서 크기를 조절하고 반대쪽 가장자리를 고정한다', () => {
  const initial = { ...win, x: 120, y: 100, width: 600, height: 400 };
  expect(resizeWindow(initial, 'e', 50, 0, 1440, 900)).toMatchObject({
    x: 120,
    width: 650,
    height: 400,
  });
  expect(resizeWindow(initial, 'w', 30, 0, 1440, 900)).toMatchObject({
    x: 150,
    width: 570,
  });
  expect(resizeWindow(initial, 'n', 0, 30, 1440, 900)).toMatchObject({
    y: 130,
    height: 370,
  });
  expect(resizeWindow(initial, 'sw', 30, 20, 1440, 900)).toMatchObject({
    x: 150,
    y: 100,
    width: 570,
    height: 420,
  });
});

it('크기 조절 시 최소 크기와 데스크톱 작업 영역 경계를 지킨다', () => {
  const initial = { ...win, x: 120, y: 100, width: 600, height: 400 };
  expect(resizeWindow(initial, 'w', 1000, 0, 1440, 900)).toMatchObject({
    x: 360,
    width: 360,
  });
  expect(resizeWindow(initial, 'e', 1000, 0, 1440, 900)).toMatchObject({
    x: 120,
    width: 1304,
  });
});
