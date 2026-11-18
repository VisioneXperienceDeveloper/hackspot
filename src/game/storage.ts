import { initialState, type GameState } from './engine';
import { evidenceInfo, objectives, servers, sites } from './world';
import { decodeShell } from './shell/state';
import { decodeAccount } from './account';
import { validDeletedFiles, validTrashEntries } from './desktopFiles';
import {
  validNoteFiles,
  validFolders,
  validFileLocations,
  withFolderAncestors,
  DEFAULT_FOLDERS,
} from './noteFiles';
import { DEFAULT_SYSTEM_FILES } from './systemFiles';

export const SAVE_KEY = 'echo-investigation-v1';
export const MAX_SAVE_LENGTH = 4_000_000;
const record = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);
const strings = (x: unknown, max: number, length: number): x is string[] =>
  Array.isArray(x) &&
  x.length <= max &&
  x.every((v) => typeof v === 'string' && v.length <= length);
const validBookmarks = (x: unknown): x is string[] =>
  strings(x, 100, 512) &&
  new Set(x).size === x.length &&
  x.every((bookmark) => bookmark.length > 0 && bookmark === bookmark.trim());
const legacyFolderNames: Record<string, string> = {
  증거: 'downloads',
  메모: 'notes',
  '조사 기록': 'desktop',
};
const migrateFolder = (folder: string) => {
  const separator = folder.indexOf('/');
  const root = separator < 0 ? folder : folder.slice(0, separator);
  const replacement = legacyFolderNames[root];
  return replacement ? replacement + (separator < 0 ? '' : folder.slice(separator)) : folder;
};
function identifiers(x: unknown, allowed: string[]): x is string[] {
  return (
    strings(x, allowed.length, 200) &&
    new Set(x).size === x.length &&
    x.every((v) => allowed.includes(v))
  );
}
export function decodeSave(raw: string): GameState {
  if (raw.length > MAX_SAVE_LENGTH) throw Error('저장 파일이 너무 큽니다.');
  const x: unknown = JSON.parse(raw);
  if (!record(x)) throw Error('손상된 저장 파일');
  const files = servers.flatMap((s) => s.files.map((f) => s.ip + f.path));
  const trash = x.trash ?? [];
  const deletedFiles = x.deletedFiles ?? [];
  if (
    x.version !== 1 ||
    typeof x.accepted !== 'boolean' ||
    typeof x.compared !== 'boolean' ||
    !identifiers(
      x.visited,
      sites.flatMap((s) => s.pages.map((p) => s.host + p.path)),
    ) ||
    !identifiers(
      x.resolved,
      servers.map((s) => s.domain),
    ) ||
    !identifiers(
      x.scanned,
      servers.map((s) => s.ip),
    ) ||
    !identifiers(x.readFiles, files) ||
    !identifiers(x.evidence, Object.keys(evidenceInfo)) ||
    !strings(x.log, 200, 1000) ||
    !strings(x.history, 100, 12000) ||
    typeof x.notes !== 'string' ||
    x.notes.length > 10000 ||
    (x.bookmarks !== undefined && !validBookmarks(x.bookmarks)) ||
    (x.noteFiles !== undefined && !validNoteFiles(x.noteFiles)) ||
    (x.folders !== undefined && !validFolders(x.folders)) ||
    (x.fileLocations !== undefined && !validFileLocations(x.fileLocations)) ||
    !validTrashEntries(trash) ||
    !validDeletedFiles(deletedFiles) ||
    !Array.isArray(x.terminal) ||
    x.terminal.length > 160 ||
    !x.terminal.every(
      (t) =>
        record(t) &&
        typeof t.input === 'string' &&
        t.input.length <= 12000 &&
        typeof t.output === 'string' &&
        t.output.length <= 16000 &&
        (t.prompt === undefined || (typeof t.prompt === 'string' && t.prompt.length <= 600)),
    ) ||
    !record(x.hints) ||
    !Object.entries(x.hints).every(
      ([k, v]) =>
        objectives.some((o) => o.id === k) &&
        typeof v === 'number' &&
        Number.isInteger(v) &&
        v >= 0 &&
        v <= 3,
    ) ||
    typeof x.attempts !== 'number' ||
    !Number.isSafeInteger(x.attempts) ||
    x.attempts < 0 ||
    !(x.session === null || servers.some((s) => s.ip === x.session)) ||
    !(x.ending === null || x.ending === 'review' || x.ending === 'public')
  )
    throw Error('지원하지 않거나 손상된 저장 파일');
  const s = x as unknown as GameState;
  const savedNoteFiles = (s.noteFiles ?? []).map((file) => ({
    ...file,
    folder: migrateFolder(file.folder),
  }));
  const hiddenSystemFiles = new Set([
    ...deletedFiles,
    ...trash.flatMap((entry) => entry.files.map((file) => file.id)),
  ]);
  const noteFiles = [
    ...DEFAULT_SYSTEM_FILES.filter(
      (systemFile) =>
        !hiddenSystemFiles.has(`note:${systemFile.id}`) &&
        !savedNoteFiles.some(
          (file) =>
            file.id === systemFile.id ||
            (file.folder === systemFile.folder && file.name === systemFile.name),
        ),
    ).map((file) => ({ ...file })),
    ...savedNoteFiles,
  ];
  const fileLocations = Object.fromEntries(
    Object.entries(s.fileLocations ?? {}).map(([id, location]) => [
      id,
      { ...location, folder: migrateFolder(location.folder) },
    ]),
  );
  const savedFolders = s.folders?.map(migrateFolder) ?? [];
  const hasLegacyFolders =
    s.folders?.some((folder) => Object.hasOwn(legacyFolderNames, folder.split('/')[0])) ?? false;
  const folders = withFolderAncestors(
    [...(!s.folders || hasLegacyFolders ? DEFAULT_FOLDERS : []), ...savedFolders],
    s.folders
      ? []
      : [
          ...noteFiles.map((file) => file.folder),
          ...Object.values(fileLocations).map((location) => location.folder),
        ],
  );
  if (new Set(noteFiles.map((file) => `${file.folder}/${file.name}`)).size !== noteFiles.length)
    throw Error('폴더 이름 변경 후 메모 파일 경로가 중복됩니다.');
  if (!validNoteFiles(noteFiles)) throw Error('기본 파일 또는 메모 파일이 올바르지 않습니다.');
  if (
    !validFolders(folders) ||
    [...noteFiles, ...Object.values(fileLocations)].some(
      (file) => file.folder && !folders.includes(file.folder),
    )
  )
    throw Error('파일의 저장 폴더가 올바르지 않습니다.');
  if (
    [...s.evidence, ...(s.compared ? (['comparison'] as const) : [])].some((id) => {
      const folder = fileLocations[id]?.folder ?? 'downloads';
      return folder && !folders.includes(folder);
    })
  )
    throw Error('증거 사본의 폴더를 찾을 수 없습니다.');
  const invalid =
    (!s.accepted &&
      (s.resolved.length > 0 ||
        s.scanned.length > 0 ||
        s.readFiles.length > 0 ||
        s.evidence.length > 0 ||
        s.session !== null ||
        s.compared ||
        s.attempts > 0 ||
        s.ending !== null)) ||
    s.scanned.some(
      (ip) => !s.resolved.includes(servers.find((server) => server.ip === ip)!.domain),
    ) ||
    (s.session !== null && !s.scanned.includes(s.session)) ||
    s.readFiles.some((id) => !s.scanned.some((ip) => id.startsWith(ip + '/'))) ||
    s.evidence.some(
      (id) =>
        !servers.some((server) =>
          server.files.some((f) => f.evidence === id && s.readFiles.includes(server.ip + f.path)),
        ),
    ) ||
    (s.compared && (s.evidence.length !== 3 || !s.visited.includes('haeon.test/report'))) ||
    ((s.ending !== null || s.attempts > 0) && !s.compared);
  if (invalid) throw Error('진행 상태가 서로 맞지 않는 저장 파일');
  // Only copy schema fields. Unknown keys never enter application state.
  return {
    version: 1,
    ...decodeAccount(x.onboarding, x.bank, s.ending !== null),
    bookmarks: s.bookmarks ?? [],
    accepted: s.accepted,
    visited: s.visited,
    resolved: s.resolved,
    scanned: s.scanned,
    session: s.session,
    readFiles: s.readFiles,
    evidence: s.evidence,
    compared: s.compared,
    hints: { ...s.hints },
    ending: s.ending,
    attempts: s.attempts,
    log: s.log,
    notes: s.notes,
    shell: decodeShell(x.shell),
    folders: [...folders],
    fileLocations: Object.fromEntries(
      Object.entries(fileLocations).map(([id, location]) => [
        id,
        { name: location.name, folder: location.folder },
      ]),
    ),
    noteFiles,
    trash: [...trash],
    deletedFiles: [...deletedFiles],
    terminal: s.terminal
      .filter(({ input }) => input)
      .map(({ input, output, prompt }) => ({
        input,
        output,
        ...(prompt === undefined ? {} : { prompt }),
      })),
    history: s.history,
  };
}
export function loadGame(): { state: GameState; warning: string } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return { state: raw === null ? initialState() : decodeSave(raw), warning: '' };
  } catch {
    return {
      state: initialState(),
      warning:
        '저장 기록을 읽을 수 없습니다. 새 세션으로 열었습니다. 기존 기록은 저장을 다시 시작하기 전까지 보존합니다.',
    };
  }
}
