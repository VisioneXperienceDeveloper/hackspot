import { useRef, type ReactNode, type PointerEvent } from 'react';
import { fitWindow, resizeWindow, type ResizeDirection } from './windowGeometry';
import { Minus, Square, X, Copy } from 'lucide-react';
export type AppId = 'mail' | 'terminal' | 'browser' | 'files' | 'notes' | 'table' | 'trash';
const resizeDirections: ResizeDirection[] = ['se', 's', 'e', 'sw', 'w', 'ne', 'n', 'nw'];
export interface WindowState {
  id: AppId;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  minimized: boolean;
  closed: boolean;
  maximized: boolean;
}
interface Props {
  win: WindowState;
  title: string;
  icon: ReactNode;
  active: boolean;
  onChange: (id: AppId, patch: Partial<WindowState>) => void;
  onFocus: (id: AppId) => void;
  children: ReactNode;
}
export function Window({ win, title, icon, active, onChange, onFocus, children }: Props) {
  const start = useRef<{
    x: number;
    y: number;
    wx: number;
    wy: number;
    w: number;
    h: number;
    resize: ResizeDirection | null;
  } | null>(null);
  function down(e: PointerEvent<HTMLElement>, resize: ResizeDirection | null = null) {
    if ((e.target as HTMLElement).closest('button') || win.maximized) return;
    e.preventDefault();
    onFocus(win.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = {
      x: e.clientX,
      y: e.clientY,
      wx: win.x,
      wy: win.y,
      w: win.width,
      h: win.height,
      resize,
    };
  }
  function move(e: PointerEvent<HTMLElement>) {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x,
      dy = e.clientY - s.y;
    const candidate = s.resize
      ? resizeWindow(
          { ...win, x: s.wx, y: s.wy, width: s.w, height: s.h },
          s.resize,
          dx,
          dy,
          window.innerWidth,
          window.innerHeight,
        )
      : fitWindow({ ...win, x: s.wx + dx, y: s.wy + dy }, window.innerWidth, window.innerHeight);
    onChange(win.id, candidate);
  }
  function up() {
    start.current = null;
  }

  return (
    <section
      hidden={win.closed || win.minimized}
      aria-label={title + ' 창'}
      className={`app-window ${win.id}-window ${active ? 'active' : ''} ${win.maximized ? 'maximized' : ''}`}
      style={{ left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.z }}
      onPointerDown={() => onFocus(win.id)}
      onFocus={() => {
        if (!active) onFocus(win.id);
      }}
    >
      <header
        className="window-titlebar"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={up}
        onDoubleClick={(e) => {
          if (!(e.target as HTMLElement).closest('button'))
            onChange(win.id, { maximized: !win.maximized });
        }}
      >
        <span className="window-name">
          {icon}
          {title}
        </span>
        <div className="window-controls">
          <button
            aria-label={title + ' 최소화'}
            title="최소화"
            onClick={() => onChange(win.id, { minimized: true })}
          >
            <Minus size={15} />
          </button>
          <button
            aria-label={title + ' 최대화 또는 복원'}
            title="최대화 / 복원"
            onClick={() => onChange(win.id, { maximized: !win.maximized })}
          >
            {win.maximized ? <Copy size={13} /> : <Square size={12} />}
          </button>
          <button
            className="close-window"
            aria-label={title + ' 닫기'}
            title="닫기"
            onClick={() => onChange(win.id, { closed: true })}
          >
            <X size={16} />
          </button>
        </div>
      </header>
      <div className="window-content">{children}</div>
      {resizeDirections.map((direction) => (
        <div
          key={direction}
          className={`resize-handle resize-${direction}`}
          aria-hidden="true"
          title="끌어서 창 크기 조절"
          onPointerDown={(e) => down(e, direction)}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onLostPointerCapture={up}
        />
      ))}
    </section>
  );
}
