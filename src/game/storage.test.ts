import { expect, it } from 'vitest';
import { initialState } from './engine';
import { decodeSave } from './storage';

it('즐겨찾기를 저장하고 이전 저장에는 빈 즐겨찾기 목록을 보완한다', () => {
  const state = { ...initialState(), bookmarks: ['vaultbank.test', 'haeon.test/report'] };
  expect(decodeSave(JSON.stringify(state)).bookmarks).toEqual(state.bookmarks);

  const legacy = JSON.parse(JSON.stringify(initialState()));
  delete legacy.bookmarks;
  expect(decodeSave(JSON.stringify(legacy)).bookmarks).toEqual([]);
});

it('휴지통 필드가 없는 이전 저장을 빈 휴지통으로 불러온다', () => {
  const legacy = JSON.parse(JSON.stringify(initialState()));
  delete legacy.trash;
  delete legacy.deletedFiles;

  expect(decodeSave(JSON.stringify(legacy))).toMatchObject({
    trash: [],
    deletedFiles: [],
  });
});

it('잘못되거나 중복된 즐겨찾기 저장을 거부한다', () => {
  for (const bookmarks of [[''], [' vaultbank.test '], ['vaultbank.test', 'vaultbank.test']]) {
    expect(() => decodeSave(JSON.stringify({ ...initialState(), bookmarks }))).toThrow();
  }
});
