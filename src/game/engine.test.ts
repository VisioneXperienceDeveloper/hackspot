import { preparedGame } from './testFixtures';
import { describe, it, expect } from 'vitest';
import {
  initialState,
  reduce,
  execute,
  submit,
  completed,
  suggestions,
  type GameState,
} from './engine';
import { decodeSave } from './storage';
const cmd = (s: GameState, c: string) => execute(s, c).state;
function play() {
  let s = reduce(preparedGame(), { type: 'accept' });
  for (const url of ['haeon.test/report', 'haeon.test/notice', 'tide.test/handover'])
    s = reduce(s, { type: 'visit', url });
  for (const c of [
    'resolve haeon.test',
    'scan 10.17.0.11',
    'connect 10.17.0.11 auditor MORA-1017',
    'read /audit/transfer.txt',
    'collect /audit/revision.log',
  ])
    s = cmd(s, c);
  s = decodeSave(JSON.stringify(s));
  for (const c of [
    'resolve vault.archive.test',
    'scan vault.archive.test',
    'connect vault.archive.test custodian ECHO-2314',
    'collect /original/sensor.csv',
    'collect /original/approval.eml',
    'compare',
  ])
    s = cmd(s, c);
  return s;
}
describe('사건 상태와 세계', () => {
  it('모든 선행 조건을 거쳐 두 결말에 도달한다', () => {
    for (const route of ['review', 'public'] as const) {
      const s = play();
      expect(completed(s)).toEqual([true, true, true, true, false]);
      const r = submit(s, {
        person: '한기석',
        reason: '오염 은폐',
        interval: '23:14–23:25',
        route,
      });
      expect(r.error).toBe('');
      expect(r.state.ending).toBe(route);
      expect(decodeSave(JSON.stringify(r.state))).toEqual(r.state);
    }
  });
  it('선행 조건, 미등록 대상과 실제 주소를 거부한다', () => {
    let s = initialState();
    expect(execute(s, 'connect 10.17.0.11 auditor MORA-1017').output).toContain('수락');
    s = reduce(preparedGame(s), { type: 'accept' });
    expect(execute(s, 'connect 10.17.0.11 auditor MORA-1017').state.session).toBe(null);
    expect(execute(s, 'resolve google.com').state.resolved).toEqual([]);
    expect(execute(s, 'collect /original/sensor.csv').state.evidence).toEqual([]);
    expect(execute(s, 'rm -rf /').output).toContain('Read-only file system');
    expect(
      submit(s, { person: '한기석', reason: '오염 은폐', interval: '23:14–23:25', route: 'review' })
        .state.ending,
    ).toBe(null);
  });
  it('오류와 중복 행동은 증거를 훼손하지 않는다', () => {
    let s = play();
    s = cmd(s, 'collect /original/sensor.csv');
    s = cmd(s, 'connect 10.17.0.11 auditor BAD');
    s = cmd(s, 'read /audit/revision.log');
    expect(s.evidence.length).toBe(3);
    expect(s.session).toBe('10.17.0.28');
    const result = submit(s, {
      person: '정민우',
      reason: '오염 은폐',
      interval: '23:14–23:25',
      route: 'review',
    });
    expect(result.error).not.toBe('');
    expect(result.state.evidence).toEqual(s.evidence);
    expect(result.state.attempts).toBe(1);
    expect(result.state.ending).toBe(null);
  });
  it('공개본 없이 대조할 수 없고 clear는 증거를 유지한다', () => {
    let s = play();
    s = { ...s, compared: false, visited: [] };
    expect(execute(s, 'compare').state.compared).toBe(false);
    expect(cmd(s, 'clear').terminal).toEqual([]);
    expect(cmd(s, 'clear').evidence.length).toBe(3);
  });
  it('힌트는 현재 단계별 세 번까지만 공개한다', () => {
    let s = preparedGame();
    for (let i = 0; i < 8; i++) s = reduce(s, { type: 'hint' });
    expect(s.hints.accept).toBe(3);
    s = reduce(preparedGame(s), { type: 'accept' });
    s = reduce(s, { type: 'hint' });
    expect(s.hints.research).toBe(1);
  });
  it('저장 데이터 손상과 버전 불일치를 검출한다', () => {
    expect(() => decodeSave('{')).toThrow();
    expect(() => decodeSave('{}')).toThrow();
    expect(() => decodeSave(JSON.stringify({ ...initialState(), version: 2 }))).toThrow();
    expect(() =>
      decodeSave(JSON.stringify({ ...initialState(), evidence: ['raw', 'raw'] })),
    ).toThrow();
  });
  it('자동완성은 현재 세계에서 발견 가능한 항목만 제안한다', () => {
    expect(suggestions(initialState(), 'co')).toEqual(['connect', 'collect', 'compare', 'command']);
    expect(suggestions(initialState(), 'read ')).toEqual([]);
    expect(suggestions(play(), 'read /original/s')).toEqual(['read /original/sensor.csv']);
  });
  it('이미 끝난 조사는 중복 보상과 다른 결말로 변경되지 않는다', () => {
    const r = submit(play(), {
      person: '한기석',
      reason: '오염 은폐',
      interval: '23:14–23:25',
      route: 'review',
    });
    expect(
      submit(r.state, {
        person: '한기석',
        reason: '오염 은폐',
        interval: '23:14–23:25',
        route: 'public',
      }).state.ending,
    ).toBe('review');
  });
});

describe('안정성 회귀', () => {
  it.each([
    { resolved: ['unknown.test'] },
    { visited: ['haeon.test/missing'] },
    { scanned: ['10.17.0.11'] },
    { readFiles: ['10.17.0.11/audit/transfer.txt'] },
    { evidence: ['raw'] },
    { session: '10.17.0.11' },
    { compared: true },
    { ending: 'public' },
    { attempts: 1 },
    { hints: { unknown: 1 } },
    { hints: [] },
    { terminal: [null] },
    { notes: 'a'.repeat(10001) },
    { visited: ['haeon.test/', 'haeon.test/'] },
  ])('잘못된 저장 경계를 거부한다: %j', (patch) => {
    expect(() => decodeSave(JSON.stringify({ ...initialState(), ...patch }))).toThrow();
  });
  it('허용하지 않는 루트 필드를 버리고 기존 v1 진행을 보존한다', () => {
    const s = play();
    expect(decodeSave(JSON.stringify({ ...s, extra: 'ignored' }))).toEqual(s);
  });
  it('알 수 없는 도메인도 자동완성에서 예외를 내지 않는다', () => {
    expect(suggestions({ ...initialState(), resolved: ['unknown.test'] }, 'scan ')).toEqual([]);
  });
  it('이미 단서를 아는 재플레이도 대조 후 조사 완료로 표시한다', () => {
    let s = { ...play(), visited: ['haeon.test/report'] };
    s = submit(s, {
      person: '한기석',
      reason: '오염 은폐',
      interval: '23:14–23:25',
      route: 'review',
    }).state;
    expect(completed(s)).toEqual([true, true, true, true, true]);
    expect(reduce(s, { type: 'hint' })).toBe(s);
    expect(decodeSave(JSON.stringify(s))).toEqual(s);
  });
  it('너무 긴 명령은 실행하거나 저장하지 않고 안내한다', () => {
    const s = play();
    const r = execute(s, 'x'.repeat(100000));
    expect(r.state.evidence).toEqual(s.evidence);
    expect(r.state.history).toEqual(s.history);
    expect(r.output).toContain('512');
    expect(decodeSave(JSON.stringify(r.state))).toEqual(r.state);
  });
  it('clear와 disconnect의 잘못된 인자는 기존 상태를 지킨다', () => {
    const s = play();
    expect(execute(s, 'disconnect extra').state.session).toBe(s.session);
    expect(execute(s, 'clear extra').state.terminal.length).toBe(s.terminal.length + 1);
  });
  it('이력이 길어져도 저장 크기와 순서를 제한한다', () => {
    let s = initialState();
    for (let i = 0; i < 200; i++) s = cmd(s, `unknown-${i}`);
    expect(s.history.length).toBe(100);
    expect(s.terminal.length).toBe(160);
    expect(s.history.at(-1)).toBe('unknown-199');
    expect(decodeSave(JSON.stringify(s))).toEqual(s);
  });
});

it('참고 문서 collect 실패는 단서 열람으로 처리하지 않는다', () => {
  let s = reduce(preparedGame(), { type: 'accept' });
  for (const c of ['resolve haeon.test', 'scan haeon.test', 'connect haeon.test auditor MORA-1017'])
    s = cmd(s, c);
  s = cmd(s, 'collect /audit/transfer.txt');
  expect(s.readFiles).toEqual([]);
  expect(suggestions(s, 'resolve vault')).toEqual([]);
  s = cmd(s, 'read /audit/transfer.txt');
  expect(suggestions(s, 'resolve vault')).toEqual(['resolve vault.archive.test']);
});

it.each(['__proto__', 'constructor', 'toString'])('help %s도 문자열 오류로 복구한다', (name) => {
  const result = execute(initialState(), `help ${name}`);
  expect(result.output).toContain('알 수 없는 명령어');
  expect(decodeSave(JSON.stringify(result.state))).toEqual(result.state);
});
