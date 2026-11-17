import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  HelpCircle,
  ArrowRight,
  Search,
  RotateCcw,
  Type,
  Keyboard,
  ShieldCheck,
  X,
  Ellipsis,
  Radio,
} from 'lucide-react';
import { Window, type AppId, type WindowState } from './components/Window';
import { Terminal } from './components/Terminal';
import { initialShell } from './game/shell/state';
import { Browser } from './components/Browser';
import { Mail } from './components/Mail';
import { Files, FileActionForm } from './components/Files';
import { Notes, SaveNoteForm } from './components/Notes';
import type { NoteFile, DesktopFileId } from './game/noteFiles';
import {
  desktopFiles,
  fileApp,
  createDesktopFolder,
  changeDesktopEntry,
  noteFoldersForSave,
  joinPath,
  type DesktopEntry,
  type FileAction,
} from './game/desktopFiles';
import { TableDocument, MailDocument } from './components/FileViewers';
import { Clock } from './components/Clock';
import { DesktopSearch } from './components/DesktopSearch';
import { appInfo, appOrder } from './components/appInfo';
import {
  initialState,
  reduce,
  execute,
  submit,
  completed,
  currentObjective,
  type Submission,
} from './game/engine';
import { hints, objectives } from './game/world';
import { loadGame } from './game/storage';
import { useAutoSave } from './hooks/useAutoSave';
import { fitWindow } from './components/windowGeometry';
function initialWindows(): WindowState[] {
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
      closed: false,
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
      width: Math.max(650, Math.min(900, w - 390)),
      height: Math.max(400, h - 195),
      z: 3,
      minimized: false,
      closed: false,
      maximized: false,
    },
  ].map((win) => fitWindow(win as WindowState, w, h));
}
function Modal({
  title,
  close,
  children,
  restoreFocus,
  className = '',
}: {
  title: string;
  restoreFocus: { current: HTMLElement | null };
  close: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = restoreFocus.current ?? (document.activeElement as HTMLElement);
    ref.current?.focus();
    return () => {
      requestAnimationFrame(() => {
        if (!document.querySelector('[aria-modal="true"]') && before?.isConnected) before.focus();
      });
    };
  }, [restoreFocus]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
          if (e.key === 'Tab') {
            const elements = Array.from(
              ref.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input,select,textarea,[tabindex="0"]',
              ) || [],
            );
            const first = elements[0],
              last = elements.at(-1);
            if (
              e.shiftKey &&
              (document.activeElement === first || document.activeElement === ref.current)
            ) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <button className="modal-close" aria-label="대화상자 닫기" onClick={close}>
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}
export default function App() {
  const [loaded] = useState(loadGame),
    [state, setState] = useState(loaded.state),
    [saveEnabled, setSaveEnabled] = useState(!loaded.warning),
    [windows, setWindows] = useState(initialWindows),
    [modal, setModal] = useState<
      'help' | 'new' | 'ending' | 'noteSave' | 'discardNote' | 'fileAction' | null
    >(loaded.state.ending ? 'ending' : null),
    [large, setLarge] = useState(false),
    [journal, setJournal] = useState(false),
    [toast, setToast] = useState('');
  const [sessionId, setSessionId] = useState(0);
  const [saveNoticeOpen, setSaveNoticeOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('');
  const [fileAction, setFileAction] = useState<{ kind: FileAction; entry?: DesktopEntry } | null>(
    null,
  );
  const [openedTextId, setOpenedTextId] = useState<DesktopFileId | null>(null);
  const [openedMailId, setOpenedMailId] = useState<DesktopFileId | null>(null);
  const [openedTableId, setOpenedTableId] = useState<DesktopFileId | null>(null);
  const [runningApps, setRunningApps] = useState<AppId[]>(['terminal', 'mail']);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);
  const editingNote = state.noteFiles.find((file) => file.id === editingNoteId);
  const visibleFolder = state.folders.includes(currentFolder) ? currentFolder : '';
  const storedFiles = desktopFiles(state);
  const openedText = storedFiles.find((file) => file.id === openedTextId);
  const openedMail = storedFiles.find((file) => file.id === openedMailId);
  const openedTable = storedFiles.find((file) => file.id === openedTableId);
  const {
    status: saveStatus,
    failed: saveFailed,
    retry: retrySave,
  } = useAutoSave(state, saveEnabled);
  const front = windows.filter((w) => !w.closed && !w.minimized).sort((a, b) => b.z - a.z)[0]?.id;
  const done = completed(state),
    objective = currentObjective(state),
    hintCount = state.hints[objective.id] || 0;
  const z = useRef(4);
  const modalTrigger = useRef<HTMLElement | null>(null);
  const journalPanel = useRef<HTMLElement | null>(null);
  const journalTrigger = useRef<HTMLButtonElement | null>(null);
  const searchTrigger = useRef<HTMLButtonElement | null>(null);

  function toggleJournal(trigger: HTMLButtonElement) {
    setSearchOpen(false);
    journalTrigger.current = trigger;
    setJournal((value) => !value);
  }

  function closeJournal() {
    setJournal(false);
    journalTrigger.current?.focus({ preventScroll: true });
  }

  function closeSearch() {
    setSearchOpen(false);
    searchTrigger.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (journal) journalPanel.current?.focus({ preventScroll: true });
  }, [journal]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  function focus(id: AppId) {
    const nextZ = ++z.current;
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, z: nextZ } : w)));
  }
  const open = useCallback((id: AppId) => {
    const nextZ = ++z.current;
    setRunningApps((apps) => (apps.includes(id) ? apps : [...apps, id]));
    setWindows((ws) =>
      ws.map((w) => (w.id === id ? { ...w, closed: false, minimized: false, z: nextZ } : w)),
    );
    setJournal(false);
    setSearchOpen(false);
  }, []);
  function quitApp(id: AppId) {
    setRunningApps((apps) => apps.filter((app) => app !== id));
    const initial = initialWindows().find((win) => win.id === id)!;
    setWindows((wins) => wins.map((win) => (win.id === id ? { ...initial, closed: true } : win)));
    if (id === 'files') setCurrentFolder('');
    if (id === 'mail') setOpenedMailId(null);
    if (id === 'table') setOpenedTableId(null);
    if (id === 'terminal') {
      setState((s) => ({
        ...s,
        session: null,
        terminal: [],
        history: [],
        shell: {
          ...initialShell(),
          addresses: s.shell.addresses,
          linkUp: s.shell.linkUp,
          listeners: s.shell.listeners,
        },
      }));
    }
    if (id === 'notes') {
      setEditingNoteId(null);
      setOpenedTextId(null);
      setState((s) => ({ ...s, notes: '' }));
    }
    searchTrigger.current?.focus({ preventScroll: true });
  }
  function openFile(id: DesktopFileId, forceText = false) {
    const file = storedFiles.find((file) => file.id === id);
    if (!file) return;
    const app = forceText ? 'notes' : fileApp(file.name);
    if (app === 'notes') {
      if (file.noteId) requestNote(file.noteId);
      else {
        setOpenedTextId(id);
        open('notes');
      }
    } else if (app === 'mail') {
      setOpenedMailId(id);
      open('mail');
    } else {
      setOpenedTableId(id);
      open('table');
    }
  }
  function loadNote(id: string | null) {
    const file = state.noteFiles.find((file) => file.id === id);
    if (id && !file) return;
    setEditingNoteId(id);
    setOpenedTextId(null);
    setState((s) => ({ ...s, notes: file?.content ?? '' }));
    setModal(null);
    open('notes');
  }
  function requestNote(id: string | null) {
    if (id && id === editingNoteId) {
      setOpenedTextId(null);
      open('notes');
      return;
    }
    if (id && state.noteFiles.find((file) => file.id === id)?.content === state.notes) {
      loadNote(id);
      return;
    }
    if (state.notes && state.notes !== (editingNote?.content ?? '')) {
      setPendingNoteId(id);
      setModal('discardNote');
    } else loadNote(id);
  }
  function saveNote(file: NoteFile): string {
    const { folders, error } = noteFoldersForSave(state, file.folder);
    if (error) return error;
    if (
      state.folders.includes(joinPath(file.folder, file.name)) ||
      storedFiles.some(
        (item) => item.readOnly && item.name === file.name && item.folder === file.folder,
      )
    )
      return '같은 위치에 같은 이름의 항목이 있습니다.';
    setState((s) => ({
      ...s,
      folders,
      notes: file.content,
      noteFiles: s.noteFiles.some((item) => item.id === file.id)
        ? s.noteFiles.map((item) => (item.id === file.id ? file : item))
        : [...s.noteFiles, file],
    }));
    setEditingNoteId(file.id);
    setOpenedTextId(null);
    setModal(null);
    return '';
  }
  function fileOperation(value: string): string {
    if (!fileAction) return '작업을 선택해 주세요.';
    const result =
      fileAction.kind === 'create'
        ? createDesktopFolder(state, visibleFolder, value)
        : fileAction.entry
          ? changeDesktopEntry(state, fileAction.entry, fileAction.kind, value)
          : null;
    if (!result) return '항목을 선택해 주세요.';
    if (result.error) return result.error;
    setState(result.state);
    if (result.folderChange) {
      const { from, to } = result.folderChange;
      setCurrentFolder((folder) =>
        folder === from || folder.startsWith(from + '/') ? to + folder.slice(from.length) : folder,
      );
    }
    setModal(null);
    return '';
  }
  function change(id: AppId, patch: Partial<WindowState>) {
    if (patch.closed) {
      quitApp(id);
      return;
    }
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModal(null);
        if (journal) closeJournal();
        if (searchOpen) closeSearch();
        return;
      }
      if (modal) return;
      if (e.altKey && /^[1-6]$/.test(e.key)) {
        e.preventDefault();
        open(appOrder[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modal, open, journal, searchOpen]);
  useEffect(() => {
    const handler = () =>
      setWindows((ws) => ws.map((w) => fitWindow(w, window.innerWidth, window.innerHeight)));
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  function run(input: string) {
    if (input.trim() === 'exit' && !state.session && !state.shell.rootSession) {
      quitApp('terminal');
      return;
    }
    setState((s) => execute(s, input).state);
  }
  function submitForm(form: Submission) {
    const result = submit(state, form);
    setState(result.state);
    if (!result.error) setModal('ending');
    return result.error;
  }
  function startNew() {
    setSaveNoticeOpen(true);
    setSessionId((id) => id + 1);
    setJournal(false);
    setSearchOpen(false);
    setCurrentFolder('');
    setOpenedTextId(null);
    setOpenedMailId(null);
    setOpenedTableId(null);
    setFileAction(null);
    setRunningApps(['terminal', 'mail']);
    setEditingNoteId(null);
    setPendingNoteId(null);
    setState(initialState());
    setWindows(initialWindows());
    setModal(null);
    setSaveEnabled(true);
    setToast('새 조사 세션을 시작했습니다.');
  }
  return (
    <main
      className={`desktop ${large ? 'large-type' : ''}`}
      onPointerDownCapture={(e) => {
        if (
          searchOpen &&
          !(e.target as HTMLElement).closest('.desktop-search, [aria-controls="desktop-search"]')
        ) {
          setSearchOpen(false);
        }
        if (
          journal &&
          !(e.target as HTMLElement).closest('.journal, [aria-controls="investigation-journal"]')
        ) {
          setJournal(false);
        }
      }}
      onFocusCapture={(e) => {
        if (
          searchOpen &&
          !(e.target as HTMLElement).closest('.desktop-search, [aria-controls="desktop-search"]')
        ) {
          setSearchOpen(false);
        }
        if (
          journal &&
          !(e.target as HTMLElement).closest('.journal, [aria-controls="investigation-journal"]')
        ) {
          setJournal(false);
        }
      }}
      onClickCapture={(e) => {
        if (!modal) {
          const button = (e.target as HTMLElement).closest('button');
          if (button) modalTrigger.current = button;
        }
      }}
    >
      <div className="desktop-workspace" inert={!!modal}>
        <header className="os-top">
          <div className="wordmark">Hackspot</div>
          <div className="top-tools">
            {state.ending && <button onClick={() => setModal('ending')}>결말 보기</button>}
            <button
              title="글자 크기 변경"
              aria-label="글자 크기 변경"
              aria-pressed={large}
              onClick={() => setLarge((v) => !v)}
            >
              <Type size={17} />
              <span>{large ? '크게' : '기본'}</span>
            </button>
            <button title="조작 안내" aria-label="조작 안내" onClick={() => setModal('help')}>
              <Keyboard size={17} />
            </button>
            <button title="새 게임" aria-label="새 게임" onClick={() => setModal('new')}>
              <RotateCcw size={15} />
            </button>
            <span className="local-label">
              <span className="status-dot" />
              로컬 세션
            </span>
            <button
              className="journal-toggle"
              title="진행 기록"
              aria-label="진행 기록"
              aria-expanded={journal}
              aria-controls="investigation-journal"
              aria-haspopup="dialog"
              onClick={(e) => toggleJournal(e.currentTarget)}
            >
              <Ellipsis size={20} />
            </button>
          </div>
        </header>
        <nav className="desktop-shortcuts" aria-label="데스크톱 앱">
          {appOrder.map((id, i) => {
            const { Icon, title } = appInfo[id];
            return (
              <button
                key={id}
                className={front === id ? 'selected' : ''}
                onClick={() => open(id)}
                title={`${title} · Alt+${i + 1}`}
              >
                <span>
                  <Icon size={29} strokeWidth={1.5} />
                </span>
                {title}
              </button>
            );
          })}
        </nav>
        <aside
          id="investigation-journal"
          ref={journalPanel}
          className="journal"
          role="dialog"
          aria-label="조사 진행"
          hidden={!journal}
          tabIndex={-1}
        >
          <div className="journal-heading">
            <div>
              <span className="case-number">사건 01</span>
              <h1>사라진 11분</h1>
            </div>
            <button className="journal-close" aria-label="진행 기록 닫기" onClick={closeJournal}>
              <X size={17} />
            </button>
          </div>
          <div className="case-rule" />
          <div className="journal-label">
            진행 기록 <span>{done.filter(Boolean).length} / 5</span>
          </div>
          <ol className="objectives">
            {objectives.map((o, i) => (
              <li key={o.id} className={done[i] ? 'done' : objective.id === o.id ? 'current' : ''}>
                <span className="step-dot">{done[i] ? <Check size={12} /> : null}</span>
                <span>{o.label}</span>
              </li>
            ))}
          </ol>
          <p className="current-task">
            {state.ending ? '조사가 마무리되었습니다.' : objective.detail}
          </p>
          <div className="case-rule" />
          <button
            className="hint-button"
            disabled={!!state.ending || hintCount === 3}
            onClick={() => setState((s) => reduce(s, { type: 'hint' }))}
          >
            {hintCount === 0 ? '힌트 보기' : hintCount < 3 ? '다음 힌트' : '힌트 모두 펼침'}
            <HelpCircle size={16} />
          </button>
          {hintCount > 0 && !state.ending && (
            <div className="hint-content">
              <span>도움말 {hintCount}/3</span>
              {hints[objective.id].slice(0, hintCount).map((hint, i) => (
                <p key={i}>{hint}</p>
              ))}
            </div>
          )}
          <button className="journal-notes" onClick={() => open('notes')}>
            메모장 열기
            <ArrowRight size={13} />
          </button>
        </aside>
        {windows
          .filter((win) => runningApps.includes(win.id))
          .map((win) => {
            const { title, Icon } = appInfo[win.id];
            return (
              <Window
                key={`${sessionId}-${win.id}`}
                win={win}
                title={title}
                icon={<Icon size={17} />}
                active={front === win.id}
                onChange={change}
                onFocus={focus}
              >
                {win.id === 'terminal' ? (
                  <Terminal state={state} run={run} active={front === win.id && !modal} />
                ) : win.id === 'browser' ? (
                  <Browser
                    state={state}
                    visit={(url) => setState((s) => reduce(s, { type: 'visit', url }))}
                  />
                ) : win.id === 'mail' ? (
                  openedMail ? (
                    <MailDocument
                      file={openedMail}
                      inbox={() => setOpenedMailId(null)}
                      openText={() => openFile(openedMail.id, true)}
                    />
                  ) : (
                    <Mail
                      state={state}
                      accept={() => {
                        setState((s) => reduce(s, { type: 'accept' }));
                        setToast('조사를 시작했습니다. 브라우저의 세 사이트를 확인하세요.');
                      }}
                      openBrowser={() => open('browser')}
                      onSubmit={submitForm}
                    />
                  )
                ) : win.id === 'files' ? (
                  <Files
                    state={state}
                    folder={visibleFolder}
                    setFolder={setCurrentFolder}
                    openFile={openFile}
                    action={(kind, entry) => {
                      setFileAction({ kind, entry });
                      setModal('fileAction');
                    }}
                  />
                ) : win.id === 'table' ? (
                  <TableDocument
                    key={openedTable?.id ?? 'empty'}
                    file={openedTable}
                    openFolder={() => open('files')}
                    openText={() => openedTable && openFile(openedTable.id, true)}
                  />
                ) : (
                  <Notes
                    active={front === 'notes' && !modal}
                    notes={state.notes}
                    file={editingNote}
                    sourceFile={openedText}
                    setNotes={(text) => setState((s) => reduce(s, { type: 'notes', text }))}
                    save={() => setModal('noteSave')}
                    create={() => requestNote(null)}
                  />
                )}
              </Window>
            );
          })}
        {!saveEnabled && saveNoticeOpen && (
          <div className="save-warning" role="alert">
            <p>{loaded.warning}</p>
            <button onClick={() => setSaveNoticeOpen(false)}>나중에</button>
            <button onClick={() => setSaveEnabled(true)}>이 세션 저장 시작</button>
          </div>
        )}
        {saveEnabled && saveFailed && saveNoticeOpen && (
          <div className="save-warning" role="alert">
            <p>
              진행을 저장하지 못했습니다. 브라우저 저장 공간과 권한을 확인한 뒤 다시 시도하세요.
              현재 진행은 이 화면에 유지됩니다.
            </p>
            <button onClick={() => setSaveNoticeOpen(false)}>나중에</button>
            <button onClick={retrySave}>저장 다시 시도</button>
          </div>
        )}
        <footer className="taskbar">
          <button
            className="launcher"
            ref={searchTrigger}
            title="앱 및 파일 검색"
            aria-label="앱 및 파일 검색"
            aria-expanded={searchOpen}
            aria-controls="desktop-search"
            aria-haspopup="dialog"
            onClick={() => {
              setJournal(false);
              setSearchOpen((value) => !value);
            }}
          >
            <Search size={19} />
          </button>
          <nav aria-label="작업 표시줄">
            {appOrder
              .filter((id) => runningApps.includes(id))
              .map((id) => {
                const w = windows.find((x) => x.id === id)!;
                const { title, Icon } = appInfo[id];
                return (
                  <button
                    key={id}
                    className={`${front === id ? 'selected' : ''} ${!w.closed ? 'running' : ''}`}
                    onClick={() => open(id)}
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
              <button
                className="save-control"
                aria-label="저장 안내 열기"
                onClick={() => setSaveNoticeOpen(true)}
              >
                <span role="status">{saveStatus}</span>
              </button>
            ) : (
              <span role="status">{saveStatus}</span>
            )}
            <Clock />
          </div>
        </footer>
        {searchOpen && (
          <DesktopSearch state={state} openApp={open} openFile={openFile} close={closeSearch} />
        )}
        {toast && (
          <div className="toast" role="status">
            <Check size={17} />
            {toast}
          </div>
        )}
      </div>
      {modal === 'noteSave' && (
        <Modal
          className="save-file-dialog"
          restoreFocus={modalTrigger}
          title="메모 저장"
          close={() => setModal(null)}
        >
          <SaveNoteForm
            content={openedText?.content ?? state.notes}
            file={openedText ? undefined : editingNote}
            sourceFile={openedText}
            files={state.noteFiles}
            entries={storedFiles}
            folders={state.folders}
            createFolder={(parent, name) => {
              const result = createDesktopFolder(state, parent, name);
              if (!result.error) setState(result.state);
              return result.error;
            }}
            save={saveNote}
            cancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal === 'discardNote' && (
        <Modal restoreFocus={modalTrigger} title="작성 중인 메모" close={() => setModal(null)}>
          <h2>작성 중인 내용을 버릴까요?</h2>
          <p>아직 파일에 저장하지 않은 수정 내용이 있습니다.</p>
          <div className="modal-actions">
            <button
              onClick={() => {
                setModal(null);
                open('notes');
              }}
            >
              계속 작성하기
            </button>
            <button className="primary" onClick={() => loadNote(pendingNoteId)}>
              버리고 계속
            </button>
          </div>
        </Modal>
      )}
      {modal === 'fileAction' && fileAction && (
        <Modal
          restoreFocus={modalTrigger}
          title={
            fileAction.kind === 'create'
              ? '새 폴더 만들기'
              : fileAction.kind === 'rename'
                ? '이름 변경'
                : '항목 이동'
          }
          close={() => setModal(null)}
        >
          <FileActionForm
            kind={fileAction.kind}
            entry={fileAction.entry}
            folder={visibleFolder}
            state={state}
            submit={fileOperation}
            cancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal === 'help' && (
        <Modal restoreFocus={modalTrigger} title="조작 안내" close={() => setModal(null)}>
          <Keyboard size={30} className="accent" />
          <h2>당신의 데스크톱입니다.</h2>
          <p>
            메일을 읽고 조사를 시작하세요. 브라우저의 문서에서 단서를 찾고, 터미널에서 기록을
            확보합니다.
          </p>
          <div className="help-grid">
            <kbd>Alt + 1~6</kbd>
            <span>앱 열기</span>
            <kbd>↑ / ↓</kbd>
            <span>터미널 입력 기록</span>
            <kbd>Tab</kbd>
            <span>명령어·발견한 경로 자동완성</span>
            <kbd>Ctrl / ⌘ + L</kbd>
            <span>터미널 출력 지우기</span>
          </div>
          <p>
            창 제목을 끌어 이동하고 모서리를 끌어 크기를 조절하세요. 제목을 두 번 누르면
            최대화합니다.
          </p>
          <p className="muted">
            시간 제한이 없습니다. 자동 저장은 이 브라우저에 보관됩니다. 작은 화면에서는 창이 화면에
            맞춰 표시됩니다.
          </p>
          <button className="primary" onClick={() => setModal(null)}>
            조사로 돌아가기
            <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {modal === 'new' && (
        <Modal restoreFocus={modalTrigger} title="새 조사 시작" close={() => setModal(null)}>
          <RotateCcw className="accent" size={28} />
          <h2>처음부터 다시 조사할까요?</h2>
          <p>
            현재 사건의 진행, 증거, 저장한 메모 파일과 편집 초안이 초기화됩니다. 두 번째 결말은 새
            조사에서 다른 전달 경로를 골라 확인할 수 있습니다.
          </p>
          <div className="modal-actions">
            <button onClick={() => setModal(null)}>계속 조사하기</button>
            <button className="primary" onClick={startNew}>
              새 조사 시작
            </button>
          </div>
        </Modal>
      )}
      {modal === 'ending' && state.ending && (
        <Modal restoreFocus={modalTrigger} title="조사 완료" close={() => setModal(null)}>
          <div className="ending-symbol">
            {state.ending === 'review' ? <ShieldCheck size={35} /> : <Radio size={35} />}
          </div>
          <span className="ending-label">
            조사 완료 · {state.ending === 'review' ? '기록의 무게' : '바다의 목소리'}
          </span>
          <h2>{state.ending === 'review' ? '진실은 절차를 남겼다.' : '침묵은 끝났다.'}</h2>
          <p>
            {state.ending === 'review'
              ? '독립 검증 기관은 세 기록의 일치를 확인했습니다. 한기석 소장의 변경 지시가 공식 조사 대상이 되었고, 항만 증설 심사는 보류되었습니다. 정민우의 실행과 소장의 지시가 구분되어 기록되었습니다.'
              : '개인정보를 제외한 원본과 대조표가 시민 기록실에 공개되었습니다. 누락된 11분은 더 이상 숨길 수 없게 되었습니다. 항만 심사에 대한 공개 질의가 시작되었지만, 자료의 맥락을 둘러싼 논쟁도 함께 커졌습니다.'}
          </p>
          <blockquote>
            {state.ending === 'review'
              ? '“늦더라도, 누가 무엇을 했는지 정확히 남았네요.”'
              : '“이제 우리가 본 것을 모두가 확인할 수 있겠네요.”'}
            <cite>— 윤서진</cite>
          </blockquote>
          <div className="ending-facts">
            <span>
              <Check size={14} />
              원본 증거 3개 확보
            </span>
            <span>
              <Check size={14} />
              11분의 기록 복원
            </span>
            <span>
              <Check size={14} />
              지시자와 실행자 구분
            </span>
          </div>
          <p className="muted">
            ECHO / 잔향 · 첫 번째 사건을 마쳤습니다.
            <br />
            {saveEnabled && !saveFailed
              ? '현재 결말과 증거는 자동 저장됩니다.'
              : '현재 저장이 중단되어 있습니다. 기록으로 돌아가 저장 상태를 확인하세요.'}
          </p>
          <div className="modal-actions">
            <button onClick={() => setModal('new')}>다른 경로로 다시 조사</button>
            <button
              className="primary"
              onClick={() => {
                setModal(null);
                open('files');
              }}
            >
              기록 돌아보기
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
