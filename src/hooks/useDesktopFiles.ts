import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppId } from '../components/Window';
import {
  changeDesktopEntry,
  createDesktopFolder,
  desktopFiles,
  emptyTrash,
  fileApp,
  joinPath,
  moveDesktopEntryToTrash,
  noteFoldersForSave,
  permanentlyDeleteTrashEntry,
  restoreTrashEntry,
  type DesktopEntry,
  type FileAction,
} from '../game/desktopFiles';
import type { GameState } from '../game/engine';
import type { DesktopFileId, NoteFile } from '../game/noteFiles';

type FileDialogType = 'noteSave' | 'discardNote' | 'fileAction' | null;

type Props = {
  state: GameState;
  setState: Dispatch<SetStateAction<GameState>>;
  openApp: (id: AppId) => void;
  setModal: (modal: FileDialogType) => void;
};

export function useDesktopFiles({ state, setState, openApp, setModal }: Props) {
  const [currentFolder, setCurrentFolder] = useState('');
  const [fileAction, setFileAction] = useState<{ kind: FileAction; entry?: DesktopEntry } | null>(
    null,
  );
  const [openedTextId, setOpenedTextId] = useState<DesktopFileId | null>(null);
  const [openedMailId, setOpenedMailId] = useState<DesktopFileId | null>(null);
  const [openedTableId, setOpenedTableId] = useState<DesktopFileId | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);
  const editingNote = state.noteFiles.find((file) => file.id === editingNoteId);
  const visibleFolder = state.folders.includes(currentFolder) ? currentFolder : '';
  const storedFiles = useMemo(() => desktopFiles(state), [state]);
  const openedText = storedFiles.find((file) => file.id === openedTextId);
  const openedMail = storedFiles.find((file) => file.id === openedMailId);
  const openedTable = storedFiles.find((file) => file.id === openedTableId);

  function openFile(id: DesktopFileId, forceText = false) {
    const file = storedFiles.find((item) => item.id === id);
    if (!file) return;
    const app = forceText ? 'notes' : fileApp(file.name);
    if (app === 'notes') {
      if (file.noteId) requestNote(file.noteId);
      else {
        setOpenedTextId(id);
        openApp('notes');
      }
    } else if (app === 'mail') {
      setOpenedMailId(id);
      openApp('mail');
    } else {
      setOpenedTableId(id);
      openApp('table');
    }
  }

  function loadNote(id: string | null) {
    const file = state.noteFiles.find((item) => item.id === id);
    if (id && !file) return;
    setEditingNoteId(id);
    setOpenedTextId(null);
    setState((current) => ({ ...current, notes: file?.content ?? '' }));
    setModal(null);
    openApp('notes');
  }

  function requestNote(id: string | null) {
    if (id && id === editingNoteId) {
      setOpenedTextId(null);
      openApp('notes');
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
    setState((current) => ({
      ...current,
      folders,
      notes: file.content,
      noteFiles: current.noteFiles.some((item) => item.id === file.id)
        ? current.noteFiles.map((item) => (item.id === file.id ? file : item))
        : [...current.noteFiles, file],
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

  function moveToTrash(entry: DesktopEntry): string {
    const result = moveDesktopEntryToTrash(state, entry);
    if (result.error) return result.error;
    setState(result.state);
    if (result.folderChange) {
      const { from, to } = result.folderChange;
      setCurrentFolder((folder) =>
        folder === from || folder.startsWith(from + '/') ? to : folder,
      );
    }
    const removed = new Set(result.fileIds ?? []);
    if (openedTextId && removed.has(openedTextId)) setOpenedTextId(null);
    if (openedMailId && removed.has(openedMailId)) setOpenedMailId(null);
    if (openedTableId && removed.has(openedTableId)) setOpenedTableId(null);
    if (editingNoteId && removed.has(`note:${editingNoteId}`)) setEditingNoteId(null);
    return '';
  }

  function restoreTrash(id: string): string {
    const result = restoreTrashEntry(state, id);
    if (result.error) return result.error;
    setState(result.state);
    return '';
  }

  function permanentlyDeleteTrash(id: string): string {
    const result = permanentlyDeleteTrashEntry(state, id);
    if (result.error) return result.error;
    setState(result.state);
    return '';
  }

  function createFolder(parent: string, name: string): string {
    const result = createDesktopFolder(state, parent, name);
    if (!result.error) setState(result.state);
    return result.error;
  }

  function beginFileAction(kind: FileAction, entry?: DesktopEntry) {
    setFileAction({ kind, entry });
    setModal('fileAction');
  }

  function closeApp(id: AppId) {
    if (id === 'files') setCurrentFolder('');
    if (id === 'mail') setOpenedMailId(null);
    if (id === 'table') setOpenedTableId(null);
    if (id === 'notes') {
      setEditingNoteId(null);
      setOpenedTextId(null);
      setState((current) => ({ ...current, notes: '' }));
    }
  }

  function closeMailDocument() {
    setOpenedMailId(null);
  }

  function reset() {
    setCurrentFolder('');
    setFileAction(null);
    setOpenedTextId(null);
    setOpenedMailId(null);
    setOpenedTableId(null);
    setEditingNoteId(null);
    setPendingNoteId(null);
  }

  return {
    setCurrentFolder,
    visibleFolder,
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
    closeApp,
    closeMailDocument,
    reset,
    emptyTrash: () => setState((current) => emptyTrash(current)),
  };
}
