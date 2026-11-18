import type { RefObject } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import type { GameState } from '../../game/engine';
import type { ClockFormat } from '../../game/settings';
import { Clock } from '../Clock';
import { appInfo, appOrder } from '../appInfo';
import type { AppId, WindowState } from '../Window';

type Props = {
  state: GameState;
  windows: WindowState[];
  runningApps: AppId[];
  frontApp?: AppId;
  saveStatus: string;
  saveEnabled: boolean;
  saveFailed: boolean;
  searchOpen: boolean;
  searchButtonRef: RefObject<HTMLButtonElement | null>;
  clockFormat: ClockFormat;
  openApp: (id: AppId) => void;
  openSaveNotice: () => void;
  toggleSearch: () => void;
};

export function DesktopTaskbar({
  state,
  windows,
  runningApps,
  frontApp,
  saveStatus,
  saveEnabled,
  saveFailed,
  searchOpen,
  searchButtonRef,
  clockFormat,
  openApp,
  openSaveNotice,
  toggleSearch,
}: Props) {
  return (
    <footer className="taskbar">
      <button
        className="launcher"
        ref={searchButtonRef}
        title="앱 및 파일 검색"
        aria-label="앱 및 파일 검색"
        aria-expanded={searchOpen}
        aria-controls="desktop-search"
        aria-haspopup="dialog"
        onClick={toggleSearch}
      >
        <Search size={19} />
      </button>
      <nav aria-label="작업 표시줄">
        {appOrder
          .filter((id) => runningApps.includes(id))
          .map((id) => {
            const window = windows.find((item) => item.id === id)!;
            const { title, Icon } = appInfo[id];
            return (
              <button
                key={id}
                className={`${frontApp === id ? 'selected' : ''} ${!window.closed ? 'running' : ''}`}
                onClick={() => openApp(id)}
                aria-label={title}
                title={title}
              >
                <Icon size={20} />
                <span>{title}</span>
                {id === 'files' && state.evidence.length > 0 && (
                  <small>{state.evidence.length}</small>
                )}
              </button>
            );
          })}
      </nav>
      <div className="taskbar-status">
        <ShieldCheck size={17} />
        {!saveEnabled || saveFailed ? (
          <button className="save-control" aria-label="저장 안내 열기" onClick={openSaveNotice}>
            <span role="status">{saveStatus}</span>
          </button>
        ) : (
          <span role="status">{saveStatus}</span>
        )}
        <Clock format={clockFormat} />
      </div>
    </footer>
  );
}
