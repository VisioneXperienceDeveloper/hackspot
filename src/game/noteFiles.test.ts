import { it, expect } from 'vitest';
import { initialState } from './engine';
import { decodeSave } from './storage';
import { validNoteFiles, type NoteFile } from './noteFiles';

const file: NoteFile = {
  id: 'note-1',
  name: '조사.txt',
  folder: '조사 기록/해온',
  content: '원본과 대조',
  updatedAt: 1,
};
it('기존 v1 메모를 보존하고 파일 필드가 없는 저장을 읽는다', () => {
  const legacy = JSON.parse(JSON.stringify(initialState()));
  delete legacy.noteFiles;
  delete legacy.folders;
  delete legacy.fileLocations;
  legacy.notes = '기존 개인 메모';
  const loaded = decodeSave(JSON.stringify(legacy));
  expect(loaded.notes).toBe('기존 개인 메모');
  expect(loaded.noteFiles).toEqual([]);
});
it('여러 폴더의 메모 파일을 저장하고 다시 읽는다', () => {
  const state = {
    ...initialState(),
    folders: ['증거', '메모', '조사 기록', '조사 기록/해온'],
    noteFiles: [file, { ...file, id: 'note-2', folder: '메모' }],
  };
  expect(decodeSave(JSON.stringify(state))).toEqual(state);
});
it('중복 식별자·경로와 손상된 파일을 거부한다', () => {
  for (const files of [
    [file, file],
    [file, { ...file, id: 'note-2' }],
    [{ ...file, name: '../조사.txt' }],
    [{ ...file, folder: '메모/../증거' }],
    [{ ...file, content: '가'.repeat(10001) }],
    [{ ...file, updatedAt: -1 }],
    Array.from({ length: 101 }, (_, index) => ({
      ...file,
      id: `note-${index}`,
      name: `${index}.txt`,
    })),
  ]) {
    expect(validNoteFiles(files)).toBe(false);
    expect(() => decodeSave(JSON.stringify({ ...initialState(), noteFiles: files }))).toThrow();
  }
});
