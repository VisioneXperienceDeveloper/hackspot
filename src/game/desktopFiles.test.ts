import { preparedGame } from './testFixtures';
import { expect, it } from 'vitest';
import { initialState, reduce, execute } from './engine';
import { decodeSave } from './storage';
import {
  createDesktopFolder,
  changeDesktopEntry,
  desktopFiles,
  noteFoldersForSave,
  moveDesktopEntryToTrash,
  restoreTrashEntry,
  permanentlyDeleteTrashEntry,
} from './desktopFiles';

it('빈 폴더 생성·하위 폴더 이름 변경·이동 후 파일과 폴더를 보존한다', () => {
  let state = initialState();
  state = createDesktopFolder(state, 'notes', '자료').state;
  state = createDesktopFolder(state, 'notes/자료', '하위').state;
  state = {
    ...state,
    noteFiles: [
      ...state.noteFiles,
      { id: 'note-1', name: '기록.txt', folder: 'notes/자료/하위', content: '원문', updatedAt: 1 },
    ],
  };
  const original = JSON.stringify(state);
  const renamed = changeDesktopEntry(
    state,
    { type: 'folder', path: 'notes/자료' },
    'rename',
    '이름 변경',
  );
  expect(renamed.error).toBe('');
  expect(renamed.state.noteFiles.find((file) => file.id === 'note-1')?.folder).toBe(
    'notes/이름 변경/하위',
  );
  expect(JSON.stringify(state)).toBe(original);
  const moved = changeDesktopEntry(
    renamed.state,
    { type: 'folder', path: 'notes/이름 변경' },
    'move',
    'desktop',
  );
  expect(moved.state.folders).toContain('desktop/이름 변경/하위');
  expect(moved.state.noteFiles.find((file) => file.id === 'note-1')).toMatchObject({
    id: 'note-1',
    folder: 'desktop/이름 변경/하위',
    content: '원문',
  });
  expect(decodeSave(JSON.stringify(moved.state))).toEqual(moved.state);
});

it('자기 하위로의 이동, 같은 이름 충돌, 경로 탈출을 거부한다', () => {
  let state = createDesktopFolder(initialState(), 'notes', '자료').state;
  state = createDesktopFolder(state, 'notes/자료', '하위').state;
  state = {
    ...state,
    noteFiles: [{ id: 'note-1', name: '파일.txt', folder: 'notes', content: '', updatedAt: 1 }],
  };
  for (const result of [
    createDesktopFolder(state, 'notes', '자료'),
    createDesktopFolder(state, 'notes', '파일.txt'),
    createDesktopFolder(state, 'notes', '..'),
    changeDesktopEntry(state, { type: 'folder', path: 'notes/자료' }, 'move', 'notes/자료/하위'),
    changeDesktopEntry(state, { type: 'file', id: 'note:note-1' }, 'rename', '../밖'),
    changeDesktopEntry(state, { type: 'file', id: 'note:note-1' }, 'move', '없는 폴더'),
  ]) {
    expect(result.error).not.toBe('');
    expect(result.state).toBe(state);
  }
  expect(noteFoldersForSave(state, 'notes/파일.txt/하위').error).not.toBe('');
});

it('수집 전 증거 폴더 이름을 바꿔도 나중에 수집한 사본을 새 위치에 표시한다', () => {
  let state = changeDesktopEntry(
    initialState(),
    { type: 'folder', path: 'downloads' },
    'rename',
    '원본 자료',
  ).state;
  expect(desktopFiles(state).filter((file) => file.id === 'revision')).toEqual([]);
  state = reduce(preparedGame(state), { type: 'accept' });
  for (const command of [
    'resolve haeon.test',
    'scan 10.17.0.11',
    'connect 10.17.0.11 auditor MORA-1017',
    'collect /audit/revision.log',
  ])
    state = execute(state, command).state;
  expect(desktopFiles(state).find((file) => file.id === 'revision')).toMatchObject({
    folder: '원본 자료',
    name: 'revision.log',
    readOnly: true,
  });
  const renamed = changeDesktopEntry(
    state,
    { type: 'file', id: 'revision' },
    'rename',
    '수정 이력.log',
  );
  const moved = changeDesktopEntry(
    renamed.state,
    { type: 'file', id: 'revision' },
    'move',
    'notes',
  );
  expect(desktopFiles(moved.state).find((file) => file.id === 'revision')).toMatchObject({
    folder: 'notes',
    name: '수정 이력.log',
  });
  expect(moved.state.evidence).toEqual(['revision']);
  expect(decodeSave(JSON.stringify(moved.state))).toEqual(moved.state);
});

it('파일 이름 충돌로 이동이 거부되면 두 파일 내용을 보존한다', () => {
  const state = {
    ...initialState(),
    noteFiles: [
      { id: 'one', name: '기록.txt', folder: 'notes', content: '첫째', updatedAt: 1 },
      { id: 'two', name: '기록.txt', folder: 'desktop', content: '둘째', updatedAt: 1 },
    ],
  };
  const result = changeDesktopEntry(state, { type: 'file', id: 'note:one' }, 'move', 'desktop');
  expect(result.error).not.toBe('');
  expect(result.state).toBe(state);
});

it('폴더와 하위 파일을 휴지통으로 옮긴 뒤 함께 복원한다', () => {
  let state = createDesktopFolder(initialState(), 'notes', '임시 기록').state;
  state = createDesktopFolder(state, 'notes/임시 기록', '하위').state;
  state = {
    ...state,
    noteFiles: [
      ...state.noteFiles,
      {
        id: 'temporary-note',
        name: '현장.txt',
        folder: 'notes/임시 기록/하위',
        content: '관측 기록',
        updatedAt: 12,
      },
    ],
  };

  const removed = moveDesktopEntryToTrash(state, {
    type: 'folder',
    path: 'notes/임시 기록',
  });
  expect(removed.error).toBe('');
  expect(removed.state.folders).not.toContain('notes/임시 기록/하위');
  expect(removed.state.noteFiles.some((file) => file.id === 'temporary-note')).toBe(false);
  expect(desktopFiles(removed.state).some((file) => file.id === 'note:temporary-note')).toBe(false);

  const restored = restoreTrashEntry(removed.state, removed.state.trash[0].id);
  expect(restored.error).toBe('');
  expect(restored.state.folders).toContain('notes/임시 기록/하위');
  expect(restored.state.noteFiles.find((file) => file.id === 'temporary-note')).toMatchObject({
    folder: 'notes/임시 기록/하위',
    content: '관측 기록',
  });
  expect(decodeSave(JSON.stringify(restored.state))).toEqual(restored.state);
});

it('영구 삭제한 기본 안내서는 저장을 다시 읽어도 복구되지 않는다', () => {
  const removed = moveDesktopEntryToTrash(initialState(), {
    type: 'file',
    id: 'note:system-handbook',
  });
  expect(removed.error).toBe('');
  const deleted = permanentlyDeleteTrashEntry(removed.state, removed.state.trash[0].id);
  expect(deleted.error).toBe('');
  expect(
    decodeSave(JSON.stringify(deleted.state)).noteFiles.some(
      (file) => file.id === 'system-handbook',
    ),
  ).toBe(false);
});
