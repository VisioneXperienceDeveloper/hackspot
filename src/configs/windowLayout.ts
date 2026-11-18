import { fitWindow } from '../components/windowGeometry';
import type { WindowState } from '../components/Window';

export const ENABLE_BOOT_SCREEN = false;

export function initialWindows(onboarded = false): WindowState[] {
  const w = window.innerWidth,
    h = window.innerHeight;
  return [
    {
      id: 'terminal',
      x: Math.max(100, w - 505),
      y: Math.max(310, h - 352),
      width: 465,
      height: 285,
      z: 2,
      minimized: false,
      closed: !onboarded,
      maximized: false,
    },
    {
      id: 'browser',
      x: Math.min(125, w * 0.1),
      y: 80,
      width: Math.max(650, Math.min(850, w - 380)),
      height: Math.min(650, h - 160),
      z: 1,
      minimized: false,
      closed: true,
      maximized: false,
    },
    {
      id: 'files',
      x: Math.min(165, w * 0.12),
      y: 100,
      width: Math.max(650, Math.min(800, w - 320)),
      height: Math.min(600, h - 180),
      z: 1,
      minimized: false,
      closed: true,
      maximized: false,
    },
    {
      id: 'notes',
      x: Math.min(205, w * 0.15),
      y: 110,
      width: 560,
      height: Math.min(520, h - 180),
      z: 1,
      minimized: false,
      closed: true,
      maximized: false,
    },
    {
      id: 'table',
      x: 130,
      y: 95,
      width: 720,
      height: Math.min(540, h - 160),
      z: 1,
      minimized: false,
      closed: true,
      maximized: false,
    },
    {
      id: 'mail',
      x: 110,
      y: 90,
      width: Math.min(650, Math.max(400, w - 390)),
      height: Math.max(400, h - 195),
      z: 3,
      minimized: false,
      closed: !onboarded,
      maximized: false,
    },
    {
      id: 'trash',
      x: 170,
      y: 120,
      width: 680,
      height: Math.min(520, h - 180),
      z: 1,
      minimized: false,
      closed: true,
      maximized: false,
    },
  ].map((win) => fitWindow(win as WindowState, w, h));
}
