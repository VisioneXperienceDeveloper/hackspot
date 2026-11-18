import { Ellipsis, Keyboard, RotateCcw } from 'lucide-react';
import type { GameState } from '../../game/engine';
import type { GameSettings } from '../../game/settings';
import type { AppId } from '../Window';
import { appInfo, appOrder } from '../appInfo';

type Props = {
  state: GameState;
  settings: GameSettings;
  frontApp?: AppId;
  journalOpen: boolean;
  openApp: (id: AppId) => void;
  openHelp: () => void;
  startNewGame: () => void;
  openEnding: () => void;
  toggleJournal: (trigger: HTMLButtonElement) => void;
};

export function DesktopHeader({
  state,
  settings,
  frontApp,
  journalOpen,
  openApp,
  openHelp,
  startNewGame,
  openEnding,
  toggleJournal,
}: Props) {
  return (
    <>
      <header className="os-top">
        <div className="wordmark">Hackspot</div>
        <div className="top-tools">
          {state.ending && state.onboarding.completed && (
            <button onClick={openEnding}>결말 보기</button>
          )}
          <button title="조작 안내" aria-label="조작 안내" onClick={openHelp}>
            <Keyboard size={17} />
          </button>
          <button title="새 게임" aria-label="새 게임" onClick={startNewGame}>
            <RotateCcw size={15} />
          </button>
          <span className="local-label">
            <span className="status-dot" />
            로컬 세션
          </span>
          <button
            className="journal-toggle"
            aria-label="진행 기록"
            title={state.onboarding.completed ? '진행 기록' : '시작 준비 현황'}
            aria-expanded={journalOpen}
            aria-controls="investigation-journal"
            aria-haspopup="dialog"
            onClick={(event) => toggleJournal(event.currentTarget)}
          >
            <Ellipsis size={20} />
          </button>
        </div>
      </header>
      {settings.showDesktopShortcuts && (
        <nav className="desktop-shortcuts" aria-label="데스크톱 앱">
          {appOrder.map((id, index) => {
            const { Icon, title } = appInfo[id];
            return (
              <button
                key={id}
                className={frontApp === id ? 'selected' : ''}
                onClick={() => openApp(id)}
                title={`${title} · Alt+${index + 1}`}
              >
                <span>
                  <Icon size={29} strokeWidth={1.5} />
                  {id === 'mail' &&
                    state.onboarding.completed &&
                    !state.onboarding.caseMailRead && (
                      <small className="app-notification-badge" aria-label="읽지 않은 메일 1개">
                        1
                      </small>
                    )}
                </span>
                {title}
              </button>
            );
          })}
        </nav>
      )}
    </>
  );
}
