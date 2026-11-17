import type { GameState } from './engine';
import { servers, evidenceInfo, comparison } from './world';
import {
  validFileName,
  validFolder,
  withFolderAncestors,
  type DesktopFileId,
  type FileLocation,
  type StaticFileId,
} from './noteFiles';

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
  revision: { name: 'revision.log', folder: '증거' },
  raw: { name: 'sensor.csv', folder: '증거' },
  approval: { name: 'approval.eml', folder: '증거' },
  comparison: { name: 'comparison.txt', folder: '증거' },
};
export function desktopFiles(state: GameState): DesktopFile[] {
  const files: DesktopFile[] = state.evidence.flatMap((id) => {
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
  if (state.compared)
    files.push({
      id: 'comparison',
      ...(state.fileLocations.comparison ?? staticLocations.comparison),
      title: '기록 대조표',
      content: comparison,
      readOnly: true,
    });
  for (const file of state.noteFiles)
    files.push({
      ...file,
      id: `note:${file.id}`,
      noteId: file.id,
      title: file.name,
      readOnly: false,
    });
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
