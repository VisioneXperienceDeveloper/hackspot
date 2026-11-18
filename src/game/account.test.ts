import { describe, expect, it } from 'vitest';
import { initialState, reduce, execute, submit, type GameState } from './engine';
import { bankBalance, creditReward, emailForHandle } from './account';
import { decodeSave } from './storage';
import { preparedGame } from './testFixtures';

function solvedGame() {
  let state = reduce(preparedGame(), { type: 'accept' });
  state = reduce(state, { type: 'visit', url: 'haeon.test/report' });
  for (const input of [
    'resolve haeon.test',
    'scan haeon.test',
    'connect haeon.test auditor MORA-1017',
    'collect /audit/revision.log',
    'resolve vault.archive.test',
    'scan vault.archive.test',
    'connect vault.archive.test custodian ECHO-2314',
    'collect /original/sensor.csv',
    'collect /original/approval.eml',
    'compare',
  ])
    state = execute(state, input).state;
  return state;
}
const answer = {
  person: '한기석',
  reason: '오염 은폐',
  interval: '23:14–23:25',
  route: 'review' as const,
};
const restored = (state: GameState) => decodeSave(JSON.stringify(state));

describe('시작 준비 순서와 메일', () => {
  it('준비 전에 의뢰 수락·사건 방문·힌트·조사·완료를 막는다', () => {
    const state = initialState();
    for (const action of [
      { type: 'accept' },
      { type: 'open-bank-account' },
      { type: 'complete-tutorial' },
      { type: 'read-case-mail' },
      { type: 'hint' },
      { type: 'visit', url: 'haeon.test/report' },
    ] as const)
      expect(reduce(state, action)).toBe(state);
    expect(execute(state, 'resolve haeon.test').output).toContain('현황판');
    expect(submit(state, answer).state).toBe(state);
  });
  it('메일 → 계좌 → 완료 순서로 저장 복원하며 메일 알림도 유지한다', () => {
    let state = restored(initialState());
    state = restored(reduce(state, { type: 'create-email', handle: '  Night_Owl-7  ' }));
    expect(state.onboarding.email).toBe('night_owl-7@hackspot.com');
    expect(reduce(state, { type: 'create-email', handle: 'other' })).toBe(state);
    expect(reduce(state, { type: 'complete-tutorial' })).toBe(state);
    state = restored(reduce(state, { type: 'open-bank-account' }));
    expect(bankBalance(state.bank)).toBe(0);
    expect(state.onboarding.completed).toBe(false);
    expect(reduce(state, { type: 'open-bank-account' })).toBe(state);
    state = restored(reduce(state, { type: 'complete-tutorial' }));
    expect(state.onboarding).toMatchObject({ completed: true, caseMailRead: false });
    expect(reduce(state, { type: 'complete-tutorial' })).toBe(state);
    state = restored(reduce(state, { type: 'read-case-mail' }));
    expect(state.onboarding.caseMailRead).toBe(true);
    expect(reduce(state, { type: 'accept' }).accepted).toBe(true);
  });
  it.each(['', 'a', 'a b', '-abc', 'abc@example.com', '<script>', '가나다', 'a'.repeat(21)])(
    '잘못된 아이디를 거부한다: %s',
    (handle) => {
      expect(emailForHandle(handle)).toBeNull();
      expect(reduce(initialState(), { type: 'create-email', handle }).onboarding.email).toBeNull();
    },
  );
});

describe('사례금 원장과 이전 저장 호환', () => {
  it.each(['review', 'public'] as const)(
    '%s 성공만 보상하고 재제출·재접속으로 중복 지급하지 않는다',
    (route) => {
      const before = solvedGame();
      expect(bankBalance(before.bank)).toBe(0);
      const wrong = submit(before, { ...answer, person: '정민우', route });
      expect(bankBalance(wrong.state.bank)).toBe(0);
      const result = restored(submit(wrong.state, { ...answer, route }).state);
      expect(bankBalance(result.bank)).toBe(2500);
      expect(result.bank?.transactions).toHaveLength(1);
      expect(submit(result, { ...answer, route }).state).toBe(result);
      expect(creditReward(result.bank!, 'case-01')).toBe(result.bank);
      expect(reduce(result, { type: 'open-bank-account' })).toBe(result);
    },
  );
  it.each([false, true])(
    '이전 v1 저장의 조사 진행을 보존하고 완료 보상을 정산한다: %s',
    (ended) => {
      const original = ended ? submit(solvedGame(), answer).state : solvedGame();
      const legacy = { ...original } as Partial<GameState>;
      delete legacy.onboarding;
      delete legacy.bank;
      const migrated = decodeSave(JSON.stringify(legacy));
      expect(migrated.evidence).toEqual(original.evidence);
      expect(migrated.ending).toBe(original.ending);
      expect(migrated.onboarding.completed).toBe(false);
      const prepared = restored(preparedGame(migrated));
      expect(bankBalance(prepared.bank)).toBe(ended ? 2500 : 0);
      expect(bankBalance(submit(prepared, answer).state.bank)).toBe(2500);
    },
  );
  it('완료 플래그·계좌 참조·가짜 입금·중복·잘못된 금액을 거부한다', () => {
    const state = preparedGame();
    const completed = submit(solvedGame(), answer).state;
    for (const patch of [
      { onboarding: { ...state.onboarding, email: 'invalid' } },
      { onboarding: { ...state.onboarding, email: null } },
      { bank: null },
      { bank: { ...state.bank, number: 'fake' } },
      { bank: completed.bank },
    ])
      expect(() => decodeSave(JSON.stringify({ ...state, ...patch }))).toThrow();
    const bank = completed.bank!;
    const entry = bank.transactions[0];
    for (const transactions of [
      [],
      [entry, entry],
      [{ ...entry, amount: -10 }],
      [{ ...entry, amount: 5000 }],
      [{ ...entry, creditedAt: 'today' }],
      [{ ...entry, caseId: '__proto__' }],
    ])
      expect(() =>
        decodeSave(JSON.stringify({ ...completed, bank: { ...bank, transactions } })),
      ).toThrow();
  });
});
