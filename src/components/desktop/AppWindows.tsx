import { Browser } from '../../pages/Browser';
import { Files } from '../../pages/Files';
import { Mail } from '../../pages/Mail';
import { Notes } from '../../pages/Notes';
import { TableDocument, MailDocument } from '../FileViewers';
import { Terminal } from '../../pages/Terminal';
import { TrashApp } from '../../pages/Trash';
import { Window, type AppId, type WindowState } from '../Window';
import { appInfo } from '../appInfo';
import type { DesktopEntry, DesktopFile, FileAction, TrashEntry } from '../../game/desktopFiles';
import type { GameState, Submission } from '../../game/engine';
import type { NoteFile } from '../../game/noteFiles';

type Props = {
  state: GameState;
  windows: WindowState[];
  runningApps: AppId[];
  frontApp?: AppId;
  sessionId: number;
  modalOpen: boolean;
  visibleFolder: string;
  bankRequest: number;
  openedText?: DesktopFile;
  openedMail?: DesktopFile;
  openedTable?: DesktopFile;
  editingNote?: NoteFile;
  trashEntries: TrashEntry[];
  onChange: (id: AppId, patch: Partial<WindowState>) => void;
  onFocus: (id: AppId) => void;
  openApp: (id: AppId) => void;
  runCommand: (input: string) => void;
  visit: (url: string) => void;
  setBookmarks: (bookmarks: string[]) => void;
  openAccount: () => void;
  createEmail: (handle: string) => void;
  acceptCase: () => void;
  submitForm: (form: Submission) => string;
  openFile: (id: DesktopFile['id'], forceText?: boolean) => void;
  closeMailDocument: () => void;
  setFolder: (folder: string) => void;
  moveToTrash: (entry: DesktopEntry) => string;
  fileAction: (kind: FileAction, entry?: DesktopEntry) => void;
  restoreTrash: (id: string) => string;
  permanentlyDeleteTrash: (id: string) => string;
  emptyTrash: () => void;
  setNotes: (text: string) => void;
  saveNote: () => void;
  createNote: () => void;
};

export function AppWindows({
  state,
  windows,
  runningApps,
  frontApp,
  sessionId,
  modalOpen,
  visibleFolder,
  bankRequest,
  openedText,
  openedMail,
  openedTable,
  editingNote,
  trashEntries,
  onChange,
  onFocus,
  openApp,
  runCommand,
  visit,
  setBookmarks,
  openAccount,
  createEmail,
  acceptCase,
  submitForm,
  openFile,
  closeMailDocument,
  setFolder,
  moveToTrash,
  fileAction,
  restoreTrash,
  permanentlyDeleteTrash,
  emptyTrash,
  setNotes,
  saveNote,
  createNote,
}: Props) {
  return windows
    .filter((window) => runningApps.includes(window.id))
    .map((window) => {
      const { title, Icon } = appInfo[window.id];
      return (
        <Window
          key={`${sessionId}-${window.id}`}
          win={window}
          title={title}
          icon={<Icon size={17} />}
          active={frontApp === window.id}
          onChange={onChange}
          onFocus={onFocus}
        >
          {window.id === 'terminal' ? (
            <Terminal
              state={state}
              run={runCommand}
              active={frontApp === window.id && !modalOpen}
            />
          ) : window.id === 'browser' ? (
            <Browser
              state={state}
              visit={visit}
              bookmarks={state.bookmarks}
              setBookmarks={setBookmarks}
              bankRequest={bankRequest}
              openAccount={openAccount}
              openMail={() => openApp('mail')}
            />
          ) : window.id === 'mail' ? (
            openedMail ? (
              <MailDocument
                file={openedMail}
                inbox={closeMailDocument}
                openText={() => openFile(openedMail.id, true)}
              />
            ) : (
              <Mail
                state={state}
                createEmail={createEmail}
                accept={acceptCase}
                openBrowser={() => openApp('browser')}
                onSubmit={submitForm}
              />
            )
          ) : window.id === 'files' ? (
            <Files
              state={state}
              folder={visibleFolder}
              setFolder={setFolder}
              openApp={openApp}
              openFile={openFile}
              moveToTrash={moveToTrash}
              action={fileAction}
            />
          ) : window.id === 'table' ? (
            <TableDocument
              key={openedTable?.id ?? 'empty'}
              file={openedTable}
              openFolder={() => openApp('files')}
              openText={() => openedTable && openFile(openedTable.id, true)}
            />
          ) : window.id === 'trash' ? (
            <TrashApp
              entries={trashEntries}
              restore={restoreTrash}
              permanentlyDelete={permanentlyDeleteTrash}
              empty={emptyTrash}
            />
          ) : (
            <Notes
              active={frontApp === 'notes' && !modalOpen}
              notes={state.notes}
              file={editingNote}
              sourceFile={openedText}
              setNotes={setNotes}
              save={saveNote}
              create={createNote}
            />
          )}
        </Window>
      );
    });
}
