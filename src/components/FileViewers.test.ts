import { expect, it } from 'vitest';
import { parseCSV } from './FileViewers';
it('CSV의 따옴표·쉼표·줄바꿈·이스케이프된 따옴표를 보존한다', () => {
  expect(parseCSV('이름,메모\r\n가,"쉼표, 포함"\r\n나,"두\n줄과 ""인용"""')).toEqual([
    ['이름', '메모'],
    ['가', '쉼표, 포함'],
    ['나', '두\n줄과 "인용"'],
  ]);
});
