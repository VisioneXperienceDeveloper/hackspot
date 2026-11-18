import { expect, it } from 'vitest';
import { DEFAULT_GAME_SETTINGS, parseGameSettings } from './settings';

it('게임 설정의 유효한 부분값에 기본값을 보완한다', () => {
  expect(parseGameSettings('{"wallpaper":"midnight","clockFormat":"12h"}')).toEqual({
    settings: {
      ...DEFAULT_GAME_SETTINGS,
      wallpaper: 'midnight',
      clockFormat: '12h',
    },
    error: '',
  });
});

it('잘못된 설정을 적용하지 않고 오류를 반환한다', () => {
  for (const content of ['{', '{"animations":"yes"}', '{"unknown":true}']) {
    expect(parseGameSettings(content)).toEqual({
      settings: DEFAULT_GAME_SETTINGS,
      error: expect.any(String),
    });
  }
});
