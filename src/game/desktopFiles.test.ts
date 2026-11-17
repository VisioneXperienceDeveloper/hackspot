import { expect, it } from 'vitest';
import { initialState, reduce, execute } from './engine';
import { decodeSave } from './storage';
import {
  createDesktopFolder,
  changeDesktopEntry,
  desktopFiles,
  noteFoldersForSave,
} from './desktopFiles';

it('빈 폴더 생성·하위 폴더 이름 변경·이동 후 파일과 폴더를 보존한다', () => {
  let state = initialState();
  state = createDesktopFolder(state, '메모', '자료').state;
  state = createDesktopFolder(state, '메모/자료', '하위').state;
  state = {
    ...state,
    noteFiles: [
      { id: 'note-1', name: '기록.txt', folder: '메모/자료/하위', content: '원문', updatedAt: 1 },
    ],
  };
  const original = JSON.stringify(state);
  const renamed = changeDesktopEntry(
    state,
    { type: 'folder', path: '메모/자료' },
    'rename',
    '이름 변경',
  );
  expect(renamed.error).toBe('');
  expect(renamed.state.noteFiles[0].folder).toBe('메모/이름 변경/하위');
  expect(JSON.stringify(state)).toBe(original);
  const moved = changeDesktopEntry(
    renamed.state,
    { type: 'folder', path: '메모/이름 변경' },
    'move',
    '조사 기록',
  );
  expect(moved.state.folders).toContain('조사 기록/이름 변경/하위');
  expect(moved.state.noteFiles[0]).toMatchObject({
    id: 'note-1',
    folder: '조사 기록/이름 변경/하위',
    content: '원문',
  });
  expect(decodeSave(JSON.stringify(moved.state))).toEqual(moved.state);
});

it('자기 하위로의 이동, 같은 이름 충돌, 경로 탈출을 거부한다', () => {
  let state = createDesktopFolder(initialState(), '메모', '자료').state;
  state = createDesktopFolder(state, '메모/자료', '하위').state;
  state = {
    ...state,
    noteFiles: [{ id: 'note-1', name: '파일.txt', folder: '메모', content: '', updatedAt: 1 }],
  };
  for (const result of [
    createDesktopFolder(state, '메모', '자료'),
    createDesktopFolder(state, '메모', '파일.txt'),
    createDesktopFolder(state, '메모', '..'),
    changeDesktopEntry(state, { type: 'folder', path: '메모/자료' }, 'move', '메모/자료/하위'),
    changeDesktopEntry(state, { type: 'file', id: 'note:note-1' }, 'rename', '../밖'),
    changeDesktopEntry(state, { type: 'file', id: 'note:note-1' }, 'move', '없는 폴더'),
  ]) {
    expect(result.error).not.toBe('');
    expect(result.state).toBe(state);
  }
  expect(noteFoldersForSave(state, '메모/파일.txt/하위').error).not.toBe('');
});

it('수집 전 증거 폴더 이름을 바꿔도 나중에 수집한 사본을 새 위치에 표시한다', () => {
  let state = changeDesktopEntry(
    initialState(),
    { type: 'folder', path: '증거' },
    'rename',
    '원본 자료',
  ).state;
  expect(desktopFiles(state)).toEqual([]);
  state = reduce(state, { type: 'accept' });
  for (const command of [
    'resolve haeon.test',
    'scan 10.17.0.11',
    'connect 10.17.0.11 auditor MORA-1017',
    'collect /audit/revision.log',
  ])
    state = execute(state, command).state;
  expect(desktopFiles(state)[0]).toMatchObject({
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
  const moved = changeDesktopEntry(renamed.state, { type: 'file', id: 'revision' }, 'move', '메모');
  expect(desktopFiles(moved.state)[0]).toMatchObject({ folder: '메모', name: '수정 이력.log' });
  expect(moved.state.evidence).toEqual(['revision']);
  expect(decodeSave(JSON.stringify(moved.state))).toEqual(moved.state);
});

it('파일 이름 충돌로 이동이 거부되면 두 파일 내용을 보존한다', () => {
  const state = {
    ...initialState(),
    noteFiles: [
      { id: 'one', name: '기록.txt', folder: '메모', content: '첫째', updatedAt: 1 },
      { id: 'two', name: '기록.txt', folder: '조사 기록', content: '둘째', updatedAt: 1 },
    ],
  };
  const result = changeDesktopEntry(state, { type: 'file', id: 'note:one' }, 'move', '조사 기록');
  expect(result.error).not.toBe('');
  expect(result.state).toBe(state);
});
