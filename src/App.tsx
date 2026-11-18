import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { AppId, WindowState } from './components/Window';
import { initialShell } from './game/shell/state';
import { BootScreen } from './components/BootScreen';
import { DesktopSearch } from './components/DesktopSearch';
import { appOrder } from './components/appInfo';
import { initialState, reduce, execute, submit, completed, type Submission } from './game/engine';
import { DEFAULT_SETTINGS_CONTENT, parseGameSettings } from './game/settings';
import { SETTINGS_FILE_ID } from './game/systemFiles';
import { ENABLE_BOOT_SCREEN } from './configs/windowLayout';
import { AppWindows } from './components/desktop/AppWindows';
import { DesktopHeader } from './components/desktop/DesktopHeader';
import { DesktopTaskbar } from './components/desktop/DesktopTaskbar';
import { GameDialogs, type GameDialogType } from './components/desktop/GameDialogs';
import { JournalPanel } from './components/desktop/JournalPanel';
import { useGameSession } from './hooks/useGameSession';
import { useDesktopFiles } from './hooks/useDesktopFiles';
import { useWindowManager } from './hooks/useWindowManager';
export default function App() {
  const {
    loaded,
    state,
    setState,
    saveEnabled,
    setSaveEnabled,
    saveStatus,
    saveFailed,
    retrySave,
  } = useGameSession();
  const [modal, setModal] = useState<GameDialogType>(
    loaded.state.ending && loaded.state.onboarding.completed ? 'ending' : null,
  );
  const [journal, setJournal] = useState(!loaded.state.onboarding.completed);
  const [showSetupChecklist, setShowSetupChecklist] = useState(!loaded.state.onboarding.completed);
  const [checklistAnimation, setChecklistAnimation] = useState<{
    setup: number[];
    investigation: number[];
  }>({ setup: [], investigation: [] });
  const [booting, setBooting] = useState(
    () =>
      ENABLE_BOOT_SCREEN || new URLSearchParams(window.location.search).get('boot') === 'preview',
  );
  const [toast, setToast] = useState('');
  const [sessionId, setSessionId] = useState(0);
  const [saveNoticeOpen, setSaveNoticeOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const windowManager = useWindowManager(
    loaded.state.onboarding.completed,
    loaded.state.onboarding.completed ? ['terminal', 'mail'] : [],
  );
  const {
    windows,
    runningApps,
    frontApp: front,
    open: openWindow,
    close: closeWindow,
    focus,
    change: changeWindow,
    reset: resetWindows,
  } = windowManager;
  const [bankRequest, setBankRequest] = useState(0);
  const settingsFile = state.noteFiles.find((file) => file.id === SETTINGS_FILE_ID);
  const { settings, error: settingsError } = useMemo(
    () => parseGameSettings(settingsFile?.content ?? DEFAULT_SETTINGS_CONTENT),
    [settingsFile?.content],
  );
  const setupProgress = useMemo(
    () => [!!state.onboarding.email, !!state.bank, state.onboarding.completed],
    [state.onboarding.email, state.bank, state.onboarding.completed],
  );
  const done = useMemo(() => completed(state), [state]);
  const progressSnapshot = useRef({ setup: setupProgress, investigation: done });
  const animationTimer = useRef<number | undefined>(undefined);
  const modalTrigger = useRef<HTMLElement | null>(null);
  const journalPanel = useRef<HTMLElement | null>(null);
  const journalTrigger = useRef<HTMLButtonElement | null>(null);
  const searchTrigger = useRef<HTMLButtonElement | null>(null);
  const finishBoot = useCallback(() => setBooting(false), []);

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
    const previous = progressSnapshot.current;
    const newlyCompletedSetup = setupProgress.flatMap((isDone, index) =>
      isDone && !previous.setup[index] ? [index] : [],
    );
    const newlyCompletedInvestigation = done.flatMap((isDone, index) =>
      isDone && !previous.investigation[index] ? [index] : [],
    );
    const changed =
      setupProgress.some((isDone, index) => isDone !== previous.setup[index]) ||
      done.some((isDone, index) => isDone !== previous.investigation[index]);
    progressSnapshot.current = {
      setup: [...setupProgress],
      investigation: [...done],
    };
    if (!changed) return;
    if (animationTimer.current !== undefined) window.clearTimeout(animationTimer.current);
    if (!newlyCompletedSetup.length && !newlyCompletedInvestigation.length) {
      setChecklistAnimation({ setup: [], investigation: [] });
      return;
    }

    setJournal(true);
    setChecklistAnimation({
      setup: newlyCompletedSetup,
      investigation: newlyCompletedInvestigation,
    });
    if (newlyCompletedSetup.length) setShowSetupChecklist(true);
    animationTimer.current = window.setTimeout(() => {
      setChecklistAnimation({ setup: [], investigation: [] });
      animationTimer.current = undefined;
      if (setupProgress[2]) setShowSetupChecklist(false);
    }, 1500);
  }, [setupProgress, done]);

  useEffect(
    () => () => {
      if (animationTimer.current !== undefined) window.clearTimeout(animationTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (settingsError)
      setToast(`config/settings.json 오류: ${settingsError} 기본 설정을 적용했습니다.`);
  }, [settingsError]);
  const open = useCallback(
    (id: AppId) => {
      if (id === 'mail') setState((s) => reduce(s, { type: 'read-case-mail' }));
      openWindow(id);
      setJournal(false);
      setSearchOpen(false);
    },
    [openWindow, setState],
  );
  const fileManager = useDesktopFiles({ state, setState, openApp: open, setModal });
  const {
    visibleFolder,
    setCurrentFolder,
    fileAction,
    pendingNoteId,
    editingNote,
    storedFiles,
    openedText,
    openedMail,
    openedTable,
    moveToTrash,
    fileOperation,
    openFile,
    loadNote,
    requestNote,
    saveNote,
    restoreTrash,
    permanentlyDeleteTrash,
    createFolder,
    beginFileAction,
    closeApp: closeFileApp,
    closeMailDocument,
    reset: resetFileManager,
    emptyTrash: emptyTheTrash,
  } = fileManager;
  function openBank() {
    setBankRequest((request) => request + 1);
    open('browser');
  }
  function quitApp(id: AppId) {
    closeWindow(id);
    closeFileApp(id);
    if (id === 'browser') setBankRequest(0);
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
    searchTrigger.current?.focus({ preventScroll: true });
  }
  function change(id: AppId, patch: Partial<WindowState>) {
    if (patch.closed) {
      quitApp(id);
      return;
    }
    changeWindow(id, patch);
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
      if (e.altKey && /^[1-7]$/.test(e.key)) {
        e.preventDefault();
        open(appOrder[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modal, open, journal, searchOpen]);
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
    setJournal(true);
    setShowSetupChecklist(true);
    setSearchOpen(false);
    setBankRequest(0);
    resetFileManager();
    setState(initialState());
    resetWindows();
    setModal(null);
    setSaveEnabled(true);
    setToast('새 세션을 시작했습니다.');
  }
  return (
    <main
      className="desktop"
      data-wallpaper={settings.wallpaper}
      data-animations={settings.animations ? 'on' : 'off'}
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
          !(e.target as HTMLElement).closest(
            '.journal, [aria-controls="investigation-journal"], [aria-label="새 게임"]',
          )
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
        <DesktopHeader
          state={state}
          settings={settings}
          frontApp={front}
          journalOpen={journal}
          openApp={open}
          openHelp={() => setModal('help')}
          startNewGame={() => setModal('new')}
          openEnding={() => setModal('ending')}
          toggleJournal={toggleJournal}
        />
        <JournalPanel
          ref={journalPanel}
          state={state}
          visible={journal}
          showSetupChecklist={showSetupChecklist}
          animatedSteps={checklistAnimation}
          close={closeJournal}
          showNextHint={() => setState((current) => reduce(current, { type: 'hint' }))}
          openNotes={() => open('notes')}
        />
        <AppWindows
          state={state}
          windows={windows}
          runningApps={runningApps}
          frontApp={front}
          sessionId={sessionId}
          modalOpen={!!modal}
          visibleFolder={visibleFolder}
          bankRequest={bankRequest}
          openedText={openedText}
          openedMail={openedMail}
          openedTable={openedTable}
          editingNote={editingNote}
          trashEntries={state.trash}
          onChange={change}
          onFocus={focus}
          openApp={open}
          runCommand={run}
          visit={(url) => setState((current) => reduce(current, { type: 'visit', url }))}
          setBookmarks={(bookmarks) => setState((current) => ({ ...current, bookmarks }))}
          openAccount={() =>
            setState((current) => {
              const accountOpened = reduce(current, { type: 'open-bank-account' });
              return accountOpened.bank
                ? reduce(accountOpened, { type: 'complete-tutorial' })
                : accountOpened;
            })
          }
          createEmail={(handle) =>
            setState((current) => reduce(current, { type: 'create-email', handle }))
          }
          acceptCase={() => {
            setState((current) => reduce(current, { type: 'accept' }));
            setToast('조사를 시작했습니다. 브라우저의 세 사이트를 확인하세요.');
          }}
          submitForm={submitForm}
          openFile={openFile}
          closeMailDocument={closeMailDocument}
          setFolder={setCurrentFolder}
          moveToTrash={moveToTrash}
          fileAction={beginFileAction}
          restoreTrash={restoreTrash}
          permanentlyDeleteTrash={permanentlyDeleteTrash}
          emptyTrash={emptyTheTrash}
          setNotes={(text) => setState((current) => reduce(current, { type: 'notes', text }))}
          saveNote={() => setModal('noteSave')}
          createNote={() => requestNote(null)}
        />
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
        <DesktopTaskbar
          state={state}
          windows={windows}
          runningApps={runningApps}
          frontApp={front}
          saveStatus={saveStatus}
          saveEnabled={saveEnabled}
          saveFailed={saveFailed}
          searchOpen={searchOpen}
          searchButtonRef={searchTrigger}
          clockFormat={settings.clockFormat}
          openApp={open}
          openSaveNotice={() => setSaveNoticeOpen(true)}
          toggleSearch={() => {
            setJournal(false);
            setSearchOpen((value) => !value);
          }}
        />
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
      <GameDialogs
        modal={modal}
        state={state}
        restoreFocus={modalTrigger}
        saveEnabled={saveEnabled}
        saveFailed={saveFailed}
        editingNote={editingNote}
        openedText={openedText}
        pendingNoteId={pendingNoteId}
        visibleFolder={visibleFolder}
        storedFiles={storedFiles}
        fileAction={fileAction}
        close={() => setModal(null)}
        setModal={setModal}
        openApp={open}
        saveNote={saveNote}
        createFolder={createFolder}
        fileOperation={fileOperation}
        loadNote={loadNote}
        startNew={startNew}
        openBank={openBank}
      />
      {booting && <BootScreen onComplete={finishBoot} />}
    </main>
  );
}
