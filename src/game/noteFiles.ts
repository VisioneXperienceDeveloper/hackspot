export interface NoteFile {
  id: string;
  name: string;
  folder: string;
  content: string;
  updatedAt: number;
}
export interface FileLocation {
  name: string;
  folder: string;
}
export type StaticFileId = 'revision' | 'raw' | 'approval' | 'comparison';
export type DesktopFileId = StaticFileId | `note:${string}`;
export type FileLocations = Partial<Record<StaticFileId, FileLocation>>;
export const DEFAULT_FOLDERS = ['증거', '메모', '조사 기록'];

export const validFileName = (name: string) =>
  name.length > 0 &&
  name.length <= 100 &&
  name.trim() === name &&
  name !== '.' &&
  name !== '..' &&
  !/[\\/]/.test(name) &&
  !Array.from(name).some((character) => character.charCodeAt(0) < 32);
export const validFolder = (folder: string) =>
  folder === '' || (folder.length <= 120 && folder.split('/').every(validFileName));
export function withFolderAncestors(folders: string[], paths: string[]): string[] {
  const result = new Set(folders);
  for (const path of paths) {
    if (!path) continue;
    const parts = path.split('/');
    parts.forEach((_, index) => result.add(parts.slice(0, index + 1).join('/')));
  }
  return Array.from(result);
}
export function validFolders(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 200 &&
    new Set(value).size === value.length &&
    value.every(
      (path) =>
        typeof path === 'string' &&
        path !== '' &&
        validFolder(path) &&
        (!path.includes('/') || value.includes(path.slice(0, path.lastIndexOf('/')))),
    )
  );
}
export function validFileLocations(value: unknown): value is FileLocations {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(
    ([id, location]) =>
      ['revision', 'raw', 'approval', 'comparison'].includes(id) &&
      location &&
      typeof location === 'object' &&
      typeof location.name === 'string' &&
      validFileName(location.name) &&
      typeof location.folder === 'string' &&
      validFolder(location.folder),
  );
}

export function validNoteFiles(value: unknown): value is NoteFile[] {
  if (!Array.isArray(value) || value.length > 100) return false;
  const ids = new Set<string>();
  const paths = new Set<string>();
  return value.every((item: unknown) => {
    if (!item || typeof item !== 'object') return false;
    const file = item as NoteFile;
    if (
      typeof file.id !== 'string' ||
      !/^[a-zA-Z0-9-]{1,60}$/.test(file.id) ||
      typeof file.name !== 'string' ||
      !validFileName(file.name) ||
      typeof file.folder !== 'string' ||
      !validFolder(file.folder) ||
      typeof file.content !== 'string' ||
      file.content.length > 10000 ||
      !Number.isSafeInteger(file.updatedAt) ||
      file.updatedAt < 0
    )
      return false;
    const path = `${file.folder}/${file.name}`;
    if (ids.has(file.id) || paths.has(path)) return false;
    ids.add(file.id);
    paths.add(path);
    return true;
  });
}
