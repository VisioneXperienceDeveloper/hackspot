import { useState } from 'react';
import { ArrowDownLeft, ArrowRight, Landmark, ShieldCheck, Wallet, Check } from 'lucide-react';
import type { GameState } from '../game/engine';
import { bankBalance, CASE_REWARDS, formatCredits } from '../game/account';

export function Bank({
  state,
  openAccount,
  openMail,
}: {
  state: GameState;
  openAccount: () => void;
  openMail: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const [consent, setConsent] = useState(false);
  return (
    <article className="bank-site">
      <header className="bank-header">
        <span>
          <Landmark size={23} />
          <b>VAULT BANK</b>
        </span>
        <small>HACKSPOT NETWORK</small>
      </header>
      <div className="bank-content">
        {!state.bank ? (
          <>
            <span className="bank-eyebrow">YOUR WORK. YOUR REWARD.</span>
            <h1>
              당신의 실력에,
              <br />
              차곡차곡 쌓이는 보상.
            </h1>
            <p>
              해결한 의뢰의 가치를 한곳에.
              <br />
              Hackspot 전용 계좌로 사례금을 안전하게 보관하세요.
            </p>
            <div className="bank-benefits">
              <span>
                <ShieldCheck size={17} />
                개설 수수료 0 CR
              </span>
              <span>
                <ArrowDownLeft size={17} />
                사례금 자동 입금
              </span>
            </div>
            {!opening ? (
              <button
                className="primary"
                disabled={!state.onboarding.email}
                onClick={() => setOpening(true)}
              >
                새 계좌 개설
                <ArrowRight size={17} />
              </button>
            ) : (
              <form
                className="bank-signup"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (consent) openAccount();
                }}
              >
                <h2>사례금 수령 계좌 개설</h2>
                <label htmlFor="bank-email">연결할 해커 메일</label>
                <input id="bank-email" value={state.onboarding.email ?? ''} readOnly />
                <label className="bank-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  게임 내 사례금 수령용 가상 계좌임을 확인했어요.
                </label>
                <button type="submit" className="primary" disabled={!consent}>
                  계좌 개설하기
                  <ArrowRight size={17} />
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <div className="bank-account-heading">
              <div>
                <span className="bank-eyebrow">MY VAULT</span>
                <h1>내 사례금 계좌</h1>
              </div>
              <span className="bank-active">
                <Check size={13} />
                입금 가능
              </span>
            </div>
            <section className="balance-card" aria-label="계좌 잔액">
              <div>
                <span>보유 크레딧</span>
                <Wallet size={23} />
              </div>
              <strong>{formatCredits(bankBalance(state.bank))}</strong>
              <div className="account-details">
                <span>{state.onboarding.email}</span>
                <span>{state.bank.number}</span>
              </div>
            </section>
            <section className="bank-transactions" aria-label="입금 내역">
              <div className="bank-section-heading">
                <h2>입금 내역</h2>
                <span>{state.bank.transactions.length}건</span>
              </div>
              {state.bank.transactions.length === 0 ? (
                <div className="bank-empty">
                  <ArrowDownLeft size={25} />
                  <b>첫 사례금을 기다리고 있어요.</b>
                  <p>
                    사건을 해결하고 조사 결과를 제출하면
                    <br />
                    이곳에 입금 내역이 쌓입니다.
                  </p>
                  <button onClick={openMail}>
                    의뢰 메일 확인하기
                    <ArrowRight size={15} />
                  </button>
                </div>
              ) : (
                <ul>
                  {[...state.bank.transactions].reverse().map((entry) => (
                    <li key={entry.id}>
                      <span className="transaction-icon">
                        <ArrowDownLeft size={19} />
                      </span>
                      <div>
                        <b>{CASE_REWARDS[entry.caseId].title} · 해결 사례금</b>
                        <small>
                          {CASE_REWARDS[entry.caseId].sender} ·{' '}
                          {new Date(entry.creditedAt).toLocaleDateString('ko-KR')}
                        </small>
                      </div>
                      <strong>+{formatCredits(entry.amount)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
        <aside className="bank-future">
          <Wallet size={18} />
          <div>
            <b>크레딧의 다음 쓰임을 준비하고 있어요.</b>
            <p>현재는 사례금 수령과 보관만 가능합니다. 상점과 이벤트는 추후 추가될 예정입니다.</p>
          </div>
          <span>준비 중</span>
        </aside>
      </div>
      <footer className="bank-footer">
        VAULT BANK · 게임 전용 가상 은행 · 실제 금융 거래 없음
      </footer>
    </article>
  );
}
