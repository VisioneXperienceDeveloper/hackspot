export const BANK_HOST = 'vaultbank.test';
export const CASE_REWARDS = {
  'case-01': { title: '사라진 11분', sender: '윤서진', amount: 2500 },
} as const;
export type RewardCaseId = keyof typeof CASE_REWARDS;

export interface Onboarding {
  email: string | null;
  completed: boolean;
  caseMailRead: boolean;
}
export interface BankTransaction {
  id: string;
  kind: 'reward';
  caseId: RewardCaseId;
  amount: number;
  creditedAt: number;
}
export interface BankAccount {
  number: string;
  transactions: BankTransaction[];
}
export const initialOnboarding = (): Onboarding => ({
  email: null,
  completed: false,
  caseMailRead: false,
});
export function emailForHandle(input: string): string | null {
  const handle = input.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{2,19}$/.test(handle) ? `${handle}@hackspot.com` : null;
}
export function accountNumber(email: string): string {
  // A stable fictional account identifier; no external account is created.
  let hash = 2166136261;
  for (const char of email) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const digits = (hash >>> 0).toString().padStart(10, '0');
  return `410-${digits.slice(0, 4)}-${digits.slice(4)}`;
}
export const bankBalance = (bank: BankAccount | null) =>
  bank?.transactions.reduce((total, entry) => total + entry.amount, 0) ?? 0;
export const formatCredits = (amount: number) => `${amount.toLocaleString('en-US')} CR`;

export function creditReward(bank: BankAccount, caseId: RewardCaseId): BankAccount {
  const id = `reward:${caseId}`;
  if (bank.transactions.some((entry) => entry.id === id)) return bank;
  return {
    ...bank,
    transactions: [
      ...bank.transactions,
      { id, kind: 'reward', caseId, amount: CASE_REWARDS[caseId].amount, creditedAt: Date.now() },
    ],
  };
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function decodeAccount(
  onboarding: unknown,
  bank: unknown,
  ended: boolean,
): { onboarding: Onboarding; bank: BankAccount | null } {
  // Pre-tutorial v1 saves retain their investigation and go through account setup once.
  if (onboarding === undefined && bank === undefined)
    return { onboarding: initialOnboarding(), bank: null };
  const invalid = () => new Error('메일·계좌 정보가 올바르지 않은 저장 파일');
  if (
    !record(onboarding) ||
    typeof onboarding.completed !== 'boolean' ||
    typeof onboarding.caseMailRead !== 'boolean' ||
    !(
      onboarding.email === null ||
      (typeof onboarding.email === 'string' &&
        emailForHandle(onboarding.email.replace(/@hackspot\.com$/, '')) === onboarding.email)
    ) ||
    (onboarding.caseMailRead && !onboarding.completed)
  )
    throw invalid();
  let account: BankAccount | null = null;
  if (bank !== null) {
    if (
      !record(bank) ||
      typeof onboarding.email !== 'string' ||
      bank.number !== accountNumber(onboarding.email) ||
      !Array.isArray(bank.transactions) ||
      bank.transactions.length > Object.keys(CASE_REWARDS).length
    )
      throw invalid();
    const transactions: BankTransaction[] = [];
    for (const entry of bank.transactions) {
      if (
        !record(entry) ||
        typeof entry.caseId !== 'string' ||
        !Object.hasOwn(CASE_REWARDS, entry.caseId) ||
        entry.id !== `reward:${entry.caseId}` ||
        entry.kind !== 'reward' ||
        entry.amount !== CASE_REWARDS[entry.caseId as RewardCaseId].amount ||
        typeof entry.creditedAt !== 'number' ||
        !Number.isSafeInteger(entry.creditedAt) ||
        entry.creditedAt < 0 ||
        entry.creditedAt > 8.64e15 ||
        transactions.some((previous) => previous.id === entry.id) ||
        (entry.caseId === 'case-01' && !ended)
      )
        throw invalid();
      transactions.push({
        id: entry.id as string,
        kind: 'reward',
        caseId: entry.caseId as RewardCaseId,
        amount: entry.amount as number,
        creditedAt: entry.creditedAt,
      });
    }
    if (ended && !transactions.some((entry) => entry.caseId === 'case-01')) throw invalid();
    account = { number: bank.number as string, transactions };
  }
  if (onboarding.completed && (!onboarding.email || !account)) throw invalid();
  return {
    onboarding: {
      email: onboarding.email as string | null,
      completed: onboarding.completed,
      caseMailRead: onboarding.caseMailRead,
    },
    bank: account,
  };
}
