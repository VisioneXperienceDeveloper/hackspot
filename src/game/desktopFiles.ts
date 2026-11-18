import type { GameState } from './engine';
import { servers, evidenceInfo, comparison } from './world';
import {
  validFileName,
  validFolder,
  withFolderAncestors,
  DEFAULT_FOLDERS,
  type DesktopFileId,
  type FileLocation,
  type StaticFileId,
} from './noteFiles';
import { isSystemFileId } from './systemFiles';

export interface DesktopFile {
  id: DesktopFileId;
  name: string;
  folder: string;
  title: string;
  content: string;
  readOnly: boolean;
  updatedAt?: number;
  noteId?: string;
}
export type DesktopEntry = { type: 'folder'; path: string } | { type: 'file'; id: DesktopFileId };
export type FileAction = 'create' | 'rename' | 'move';
export interface TrashEntry {
  id: string;
  kind: 'file' | 'folder';
  name: string;
  path: string;
  deletedAt: number;
  folders: string[];
  files: DesktopFile[];
}
export const joinPath = (folder: string, name: string) => (folder ? `${folder}/${name}` : name);
export const parentPath = (path: string) =>
  path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
export const baseName = (path: string) => path.split('/').pop() ?? path;
export const fileApp = (name: string): 'notes' | 'mail' | 'table' =>
  name.toLowerCase().endsWith('.eml')
    ? 'mail'
    : name.toLowerCase().endsWith('.csv')
      ? 'table'
      : 'notes';

export const staticLocations: Record<StaticFileId, FileLocation> = {
  revision: { name: 'revision.log', folder: 'downloads' },
  raw: { name: 'sensor.csv', folder: 'downloads' },
  approval: { name: 'approval.eml', folder: 'downloads' },
  comparison: { name: 'comparison.txt', folder: 'downloads' },
};
export function desktopFiles(state: GameState): DesktopFile[] {
  const hidden = new Set(state.deletedFiles ?? []);
  for (const entry of state.trash ?? []) for (const file of entry.files) hidden.add(file.id);
  const files: DesktopFile[] = state.evidence.flatMap((id) => {
    if (hidden.has(id)) return [];
    const source = servers.flatMap((server) => server.files).find((file) => file.evidence === id);
    return source
      ? [
          {
            id,
            ...(state.fileLocations[id] ?? staticLocations[id]),
            title: evidenceInfo[id].title,
            content: source.content,
            readOnly: true,
          },
        ]
      : [];
  });
  if (state.compared && !hidden.has('comparison'))
    files.push({
      id: 'comparison',
      ...(state.fileLocations.comparison ?? staticLocations.comparison),
      title: '기록 대조표',
      content: comparison,
      readOnly: true,
    });
  for (const file of state.noteFiles) {
    if (hidden.has(`note:${file.id}`)) continue;
    files.push({
      ...file,
      id: `note:${file.id}`,
      noteId: file.id,
      title: file.name,
      readOnly: false,
    });
  }
  return files;
}

export function placeEvidence(state: GameState, id: StaticFileId): GameState {
  const location = state.fileLocations[id] ?? staticLocations[id];
  const occupied = new Set([
    ...state.folders,
    ...desktopFiles(state).map((file) => joinPath(file.folder, file.name)),
  ]);
  if (!occupied.has(joinPath(location.folder, location.name))) return state;
  const dot = location.name.lastIndexOf('.');
  const stem = dot > 0 ? location.name.slice(0, dot) : location.name;
  const extension = dot > 0 ? location.name.slice(dot, dot + 80) : '';
  let number = 2;
  let name: string;
  do {
    const suffix = ` (${number++})${extension}`;
    name = stem.slice(0, 100 - suffix.length) + suffix;
  } while (occupied.has(joinPath(location.folder, name)));
  return {
    ...state,
    fileLocations: { ...state.fileLocations, [id]: { ...location, name } },
  };
}

export interface FileMutation {
  state: GameState;
  error: string;
  folderChange?: { from: string; to: string };
  fileIds?: DesktopFileId[];
}
const failed = (state: GameState, error: string): FileMutation => ({ state, error });
const inside = (path: string, root: string) => path === root || path.startsWith(root + '/');
const replacePath = (path: string, from: string, to: string) =>
  inside(path, from) ? to + path.slice(from.length) : path;

export function createDesktopFolder(
  state: GameState,
  parent: string,
  rawName: string,
): FileMutation {
  const name = rawName.trim().normalize('NFC');
  const path = joinPath(parent, name);
  if (!validFileName(name) || !validFolder(path))
    return failed(state, '폴더 이름은 1~100자로 입력하고 경로 구분자를 제외해 주세요.');
  if (parent && !state.folders.includes(parent))
    return failed(state, '상위 폴더를 찾을 수 없습니다.');
  if (
    state.folders.includes(path) ||
    desktopFiles(state).some((file) => joinPath(file.folder, file.name) === path)
  )
    return failed(state, '같은 위치에 같은 이름의 항목이 있습니다.');
  if (state.folders.length >= 200) return failed(state, '최대 200개의 폴더를 만들 수 있습니다.');
  return { state: { ...state, folders: [...state.folders, path] }, error: '' };
}

export function changeDesktopEntry(
  state: GameState,
  entry: DesktopEntry,
  action: 'rename' | 'move',
  rawValue: string,
  moveName?: string,
): FileMutation {
  const value = rawValue.trim().normalize('NFC');
  const files = desktopFiles(state);
  if (action === 'move' && value && !state.folders.includes(value))
    return failed(state, '이동할 폴더를 찾을 수 없습니다.');
  if (
    (action === 'rename' && !validFileName(value)) ||
    (moveName !== undefined && !validFileName(moveName))
  )
    return failed(state, '이름은 1~100자로 입력하고 경로 구분자를 제외해 주세요.');
  if (entry.type === 'folder') {
    if (!state.folders.includes(entry.path)) return failed(state, '폴더를 찾을 수 없습니다.');
    if (action === 'move' && inside(value, entry.path))
      return failed(state, '폴더를 자기 자신이나 하위 폴더로 이동할 수 없습니다.');
    const destination = action === 'move' ? value : parentPath(entry.path);
    const name = action === 'rename' ? value : (moveName ?? baseName(entry.path));
    const target = joinPath(destination, name);
    if (target === entry.path) return { state, error: '' };
    if (!validFolder(target)) return failed(state, '폴더 경로가 너무 길거나 올바르지 않습니다.');
    if (
      state.folders.includes(target) ||
      files.some((file) => joinPath(file.folder, file.name) === target)
    )
      return failed(state, '같은 위치에 같은 이름의 항목이 있습니다.');
    const folders = state.folders.map((path) => replacePath(path, entry.path, target));
    if (folders.some((path) => !validFolder(path)))
      return failed(state, '하위 폴더 경로가 너무 깁니다.');
    const fileLocations = { ...state.fileLocations };
    for (const id of Object.keys(staticLocations) as StaticFileId[]) {
      const location = state.fileLocations[id] ?? staticLocations[id];
      if (inside(location.folder, entry.path))
        fileLocations[id] = {
          ...location,
          folder: replacePath(location.folder, entry.path, target),
        };
    }
    return {
      state: {
        ...state,
        folders,
        fileLocations,
        noteFiles: state.noteFiles.map((file) => ({
          ...file,
          folder: replacePath(file.folder, entry.path, target),
        })),
      },
      error: '',
      folderChange: { from: entry.path, to: target },
    };
  }
  const file = files.find((file) => file.id === entry.id);
  if (!file) return failed(state, '파일을 찾을 수 없습니다.');
  const name = action === 'rename' ? value : (moveName ?? file.name);
  const folder = action === 'move' ? value : file.folder;
  if (!validFolder(folder)) return failed(state, '올바른 이동 위치를 선택해 주세요.');
  if (
    files.some((item) => item.id !== file.id && item.name === name && item.folder === folder) ||
    state.folders.includes(joinPath(folder, name))
  )
    return failed(state, '같은 위치에 같은 이름의 항목이 있습니다.');
  if (file.noteId)
    return {
      state: {
        ...state,
        noteFiles: state.noteFiles.map((item) =>
          item.id === file.noteId ? { ...item, name, folder, updatedAt: Date.now() } : item,
        ),
      },
      error: '',
    };
  return {
    state: { ...state, fileLocations: { ...state.fileLocations, [file.id]: { name, folder } } },
    error: '',
  };
}

function trashId(state: GameState): string {
  const timestamp = Date.now();
  let suffix = 0;
  let id = `trash-${timestamp}`;
  while (state.trash.some((entry) => entry.id === id)) id = `trash-${timestamp}-${++suffix}`;
  return id;
}

export function moveDesktopEntryToTrash(state: GameState, entry: DesktopEntry): FileMutation {
  if (state.trash.length >= 200)
    return failed(state, '휴지통에 최대 200개 항목을 보관할 수 있습니다.');
  const files = desktopFiles(state);
  if (entry.type === 'folder') {
    if (!state.folders.includes(entry.path)) return failed(state, '폴더를 찾을 수 없습니다.');
    if (DEFAULT_FOLDERS.includes(entry.path))
      return failed(state, '기본 폴더는 휴지통으로 이동할 수 없습니다.');
    const folders = state.folders.filter((path) => inside(path, entry.path));
    const removedFiles = files.filter((file) => inside(file.folder, entry.path));
    const trashEntry: TrashEntry = {
      id: trashId(state),
      kind: 'folder',
      name: baseName(entry.path),
      path: entry.path,
      deletedAt: Date.now(),
      folders,
      files: removedFiles,
    };
    const removedIds = new Set(removedFiles.map((file) => file.id));
    const fileLocations = { ...state.fileLocations };
    for (const file of removedFiles)
      if (!file.noteId) delete fileLocations[file.id as StaticFileId];
    return {
      state: {
        ...state,
        folders: state.folders.filter((path) => !inside(path, entry.path)),
        noteFiles: state.noteFiles.filter((file) => !removedIds.has(`note:${file.id}`)),
        fileLocations,
        trash: [...state.trash, trashEntry],
      },
      error: '',
      folderChange: { from: entry.path, to: parentPath(entry.path) },
      fileIds: removedFiles.map((file) => file.id),
    };
  }
  const file = files.find((item) => item.id === entry.id);
  if (!file) return failed(state, '파일을 찾을 수 없습니다.');
  const trashEntry: TrashEntry = {
    id: trashId(state),
    kind: 'file',
    name: file.name,
    path: joinPath(file.folder, file.name),
    deletedAt: Date.now(),
    folders: [],
    files: [file],
  };
  const fileLocations = { ...state.fileLocations };
  if (!file.noteId) delete fileLocations[file.id as StaticFileId];
  return {
    state: {
      ...state,
      noteFiles: file.noteId
        ? state.noteFiles.filter((item) => item.id !== file.noteId)
        : state.noteFiles,
      fileLocations,
      trash: [...state.trash, trashEntry],
    },
    error: '',
    fileIds: [file.id],
  };
}

export function restoreTrashEntry(state: GameState, id: string): FileMutation {
  const entry = state.trash.find((item) => item.id === id);
  if (!entry) return failed(state, '휴지통 항목을 찾을 수 없습니다.');
  const folders = withFolderAncestors(state.folders, [
    ...entry.folders,
    ...entry.files.map((file) => file.folder),
  ]);
  if (folders.length > 200) return failed(state, '복원하면 최대 200개의 폴더 제한을 넘습니다.');
  const activeFiles = desktopFiles(state);
  if (folders.some((path) => activeFiles.some((file) => joinPath(file.folder, file.name) === path)))
    return failed(state, '같은 경로에 파일이 있어 복원할 수 없습니다.');
  const restoredPaths = new Set<string>();
  for (const file of entry.files) {
    const path = joinPath(file.folder, file.name);
    if (
      folders.includes(path) ||
      restoredPaths.has(path) ||
      activeFiles.some((item) => joinPath(item.folder, item.name) === path)
    )
      return failed(state, '같은 이름의 파일이나 폴더가 있어 복원할 수 없습니다.');
    restoredPaths.add(path);
  }
  const noteIds = new Set(state.noteFiles.map((file) => file.id));
  if (entry.files.some((file) => file.noteId && noteIds.has(file.noteId)))
    return failed(state, '같은 메모 파일이 이미 있어 복원할 수 없습니다.');
  const fileLocations = { ...state.fileLocations };
  for (const file of entry.files)
    if (!file.noteId)
      fileLocations[file.id as StaticFileId] = { name: file.name, folder: file.folder };
  const noteFiles = entry.files
    .filter((file) => file.noteId)
    .map((file) => ({
      id: file.noteId!,
      name: file.name,
      folder: file.folder,
      content: file.content,
      updatedAt: file.updatedAt ?? 0,
    }));
  const restoredIds = new Set(entry.files.map((file) => file.id));
  return {
    state: {
      ...state,
      folders,
      noteFiles: [...state.noteFiles, ...noteFiles],
      fileLocations,
      trash: state.trash.filter((item) => item.id !== id),
      deletedFiles: state.deletedFiles.filter((fileId) => !restoredIds.has(fileId)),
    },
    error: '',
    fileIds: Array.from(restoredIds),
  };
}

function deletedIdsFor(entry: TrashEntry): DesktopFileId[] {
  return entry.files
    .filter((file) => !file.noteId || isSystemFileId(file.noteId))
    .map((file) => file.id);
}

export function permanentlyDeleteTrashEntry(state: GameState, id: string): FileMutation {
  const entry = state.trash.find((item) => item.id === id);
  if (!entry) return failed(state, '휴지통 항목을 찾을 수 없습니다.');
  return {
    state: {
      ...state,
      trash: state.trash.filter((item) => item.id !== id),
      deletedFiles: Array.from(new Set([...state.deletedFiles, ...deletedIdsFor(entry)])),
    },
    error: '',
  };
}

export function emptyTrash(state: GameState): GameState {
  return {
    ...state,
    trash: [],
    deletedFiles: Array.from(
      new Set([...state.deletedFiles, ...state.trash.flatMap(deletedIdsFor)]),
    ),
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const validDesktopFileId = (id: unknown): id is DesktopFileId =>
  typeof id === 'string' &&
  (['revision', 'raw', 'approval', 'comparison'].includes(id) ||
    /^note:[a-zA-Z0-9-]{1,60}$/.test(id));

export function validTrashEntries(value: unknown): value is TrashEntry[] {
  if (!Array.isArray(value) || value.length > 200) return false;
  const entryIds = new Set<string>();
  const fileIds = new Set<string>();
  return value.every((item: unknown) => {
    if (!isRecord(item)) return false;
    const entry = item as unknown as TrashEntry;
    if (
      typeof entry.id !== 'string' ||
      !/^trash-[0-9]+(?:-[0-9]+)?$/.test(entry.id) ||
      entryIds.has(entry.id) ||
      (entry.kind !== 'file' && entry.kind !== 'folder') ||
      typeof entry.name !== 'string' ||
      !validFileName(entry.name) ||
      typeof entry.path !== 'string' ||
      entry.path === '' ||
      !validFolder(entry.path) ||
      !Number.isSafeInteger(entry.deletedAt) ||
      entry.deletedAt < 0 ||
      !Array.isArray(entry.folders) ||
      entry.folders.length > 200 ||
      !Array.isArray(entry.files) ||
      entry.files.length > 106
    )
      return false;
    entryIds.add(entry.id);
    const folders = new Set<string>();
    for (const path of entry.folders) {
      if (
        typeof path !== 'string' ||
        !validFolder(path) ||
        entry.kind !== 'folder' ||
        !(path === entry.path || path.startsWith(entry.path + '/')) ||
        folders.has(path)
      )
        return false;
      folders.add(path);
    }
    if (
      (entry.kind === 'folder' && !folders.has(entry.path)) ||
      (entry.kind === 'file' && (entry.folders.length || entry.files.length !== 1))
    )
      return false;
    for (const file of entry.files) {
      if (
        !isRecord(file) ||
        !validDesktopFileId(file.id) ||
        fileIds.has(file.id) ||
        typeof file.name !== 'string' ||
        !validFileName(file.name) ||
        typeof file.folder !== 'string' ||
        !validFolder(file.folder) ||
        typeof file.title !== 'string' ||
        file.title.length > 200 ||
        typeof file.content !== 'string' ||
        file.content.length > 20000 ||
        typeof file.readOnly !== 'boolean' ||
        (file.updatedAt !== undefined &&
          (!Number.isSafeInteger(file.updatedAt) || file.updatedAt < 0)) ||
        (file.noteId !== undefined &&
          (typeof file.noteId !== 'string' ||
            !/^[a-zA-Z0-9-]{1,60}$/.test(file.noteId) ||
            file.id !== `note:${file.noteId}`)) ||
        (entry.kind === 'folder' &&
          !(file.folder === entry.path || file.folder.startsWith(entry.path + '/')))
      )
        return false;
      if (typeof file.id === 'string') fileIds.add(file.id);
    }
    if (
      entry.kind === 'file' &&
      entry.path !== joinPath(entry.files[0].folder, entry.files[0].name)
    )
      return false;
    return true;
  });
}

export function validDeletedFiles(value: unknown): value is DesktopFileId[] {
  return (
    Array.isArray(value) &&
    value.length <= 6 &&
    new Set(value).size === value.length &&
    value.every(
      (id) =>
        typeof id === 'string' &&
        (['revision', 'raw', 'approval', 'comparison'].includes(id) ||
          (id.startsWith('note:') && isSystemFileId(id.slice(5)))),
    )
  );
}

export function noteFoldersForSave(
  state: GameState,
  folder: string,
): { folders: string[]; error: string } {
  const folders = withFolderAncestors(state.folders, [folder]);
  if (folders.length > 200)
    return { folders: state.folders, error: '최대 200개의 폴더를 만들 수 있습니다.' };
  const added = new Set(folders.filter((path) => !state.folders.includes(path)));
  if (desktopFiles(state).some((file) => added.has(joinPath(file.folder, file.name))))
    return { folders: state.folders, error: '폴더 경로에 같은 이름의 파일이 있습니다.' };
  return { folders, error: '' };
}
