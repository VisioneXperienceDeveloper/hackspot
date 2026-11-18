import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import type { GameState } from '../game/engine';
import { emailForHandle } from '../game/account';

export function OnboardingChecklist({
  state,
  animatedSteps,
}: {
  state: GameState;
  animatedSteps: number[];
}) {
  const steps = [
    {
      label: '메일 계정 만들기',
      hint: '메일 앱을 열어 사용할 주소를 입력하고 계정을 만드세요.',
      complete: !!state.onboarding.email,
    },
    {
      label: '사례금 계좌 개설',
      hint: '브라우저 주소창에 vaultbank.test를 입력해 계좌를 개설하세요.',
      complete: !!state.bank,
    },
    {
      label: '첫 의뢰 받기',
      hint: '메일 앱에서 도착한 의뢰를 열고 「조사 시작」을 누르세요.',
      complete: state.onboarding.completed,
    },
  ];
  return (
    <ol className="setup-checklist" aria-label="시작 준비 체크리스트">
      {steps.map(({ label, hint, complete }, index) => (
        <li
          key={label}
          className={[complete ? 'done' : '', animatedSteps.includes(index) ? 'just-completed' : '']
            .filter(Boolean)
            .join(' ')}
        >
          <span className="setup-check">{complete ? <Check size={12} /> : null}</span>
          <span
            className="journal-hint"
            data-hint={hint}
            tabIndex={0}
            aria-label={`${label}. 힌트: ${hint}`}
          >
            {label}
          </span>
          <small>{complete ? '완료' : '대기'}</small>
        </li>
      ))}
    </ol>
  );
}

export function AccountSetup({ createEmail }: { createEmail: (handle: string) => void }) {
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  return (
    <main className="mail-account-setup">
      <div className="mail-account-content">
        <span className="mail-account-eyebrow">WELCOME</span>
        <h1>메일 계정을 만들어 주세요</h1>
        <form
          className="email-setup"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!emailForHandle(handle)) {
              setError(
                '영문·숫자로 시작하는 3~20자를 입력하세요. 영문, 숫자, _ , -를 사용할 수 있어요.',
              );
              return;
            }
            setError('');
            createEmail(handle);
          }}
        >
          <label htmlFor="hacker-handle">메일 주소</label>
          <div className={`email-address-field ${error ? 'invalid' : ''}`}>
            <input
              id="hacker-handle"
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value);
                setError('');
              }}
              maxLength={20}
              placeholder="nightowl"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby="handle-help"
              aria-invalid={!!error}
            />
            <span>@hackspot.com</span>
          </div>
          <p id="handle-help" className="mail-setup-caption">
            영문·숫자·밑줄·하이픈, 3~20자. 영문은 소문자로 저장됩니다.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" type="submit">
            계정 만들기
            <ArrowRight size={17} />
          </button>
        </form>
      </div>
    </main>
  );
}
