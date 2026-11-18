import { useState } from 'react';
import { Mail as MailIcon, ArrowRight, Send, FileCheck2, CheckCircle2 } from 'lucide-react';
import { type GameState, type Submission } from '../game/engine';
import { CASE_REWARDS, formatCredits } from '../game/account';
import { AccountSetup } from '../components/Onboarding';
export function Mail({
  state,
  createEmail,
  accept,
  openBrowser,
  onSubmit,
}: {
  state: GameState;
  createEmail: (handle: string) => void;
  accept: () => void;
  openBrowser: () => void;
  onSubmit: (f: Submission) => string;
}) {
  const [selected, setSelected] = useState('brief'),
    [error, setError] = useState(''),
    [form, setForm] = useState<Submission>({
      person: '',
      reason: '',
      interval: '',
      route: 'review',
    });
  if (!state.onboarding.email) return <AccountSetup createEmail={createEmail} />;
  const email = state.onboarding.email;
  const handle = email.slice(0, email.lastIndexOf('@'));
  const isLongEmail = handle.length >= 10;
  const displayEmail = isLongEmail
    ? `${handle.slice(0, 10)}-...${email.slice(email.lastIndexOf('@'))}`
    : email;
  return (
    <div className="mail-layout">
      <aside className="mail-list">
        <button
          className="compose-button"
          disabled={!state.onboarding.completed}
          onClick={() => setSelected('submit')}
        >
          <Send size={15} />
          {state.onboarding.completed ? '조사 결과 제출' : '메일 작성'}
        </button>
        <span className="list-label">
          받은편지함 <span>{state.onboarding.completed ? (state.compared ? 2 : 1) : 0}</span>
        </span>
        {state.onboarding.completed && (
          <button
            className={selected === 'brief' ? 'mail-item selected' : 'mail-item'}
            onClick={() => setSelected('brief')}
          >
            <MailIcon size={18} />
            <span>
              <b>윤서진</b>
              <small>사라진 11분</small>
            </span>
            <time>10:24</time>
          </button>
        )}
        {state.compared && (
          <button
            className={selected === 'followup' ? 'mail-item selected' : 'mail-item'}
            onClick={() => setSelected('followup')}
          >
            <MailIcon size={18} />
            <span>
              <b>윤서진</b>
              <small>기록이 돌아왔네요</small>
            </span>
            <time>지금</time>
          </button>
        )}
        <div className="mail-list-bottom">
          <span className="status-dot" />
          <span
            className={`mail-account-email${isLongEmail ? ' truncated' : ''}`}
            title={isLongEmail ? email : undefined}
            aria-label={email}
            tabIndex={isLongEmail ? 0 : undefined}
          >
            {displayEmail}
          </span>
        </div>
      </aside>
      <div className="mail-body">
        {!state.onboarding.completed ? (
          <section className="mail-empty-state">
            <MailIcon size={30} />
            <h2>받은편지함</h2>
            <p>새 메일이 없습니다.</p>
          </section>
        ) : selected === 'brief' ? (
          <>
            <h2>사라진 11분</h2>
            <div className="sender">
              <span className="avatar">윤</span>
              <div>
                <b>
                  윤서진 <small>research.sy@haeon.test</small>
                </b>
                <p>
                  2031년 10월 19일 · 오전 10:24
                  <br />
                  받는 사람 · {state.onboarding.email}
                </p>
              </div>
            </div>
            <div className="mail-copy">
              <p>
                안녕하세요.
                <br />
                해온 해양관측소에서 일했던 연구원 윤서진입니다.
              </p>
              <p>
                10월 17일 밤, 공개 수질 보고서에서 정확히 <strong>11분의 기록</strong>이
                사라졌습니다. 관측소는 정기 보정이라고 설명했지만, 그날은 예정된 보정일이
                아니었습니다.
              </p>
              <p>
                누군가는 기록을 바꿨습니다. 하지만 수정 계정 하나만으로 그 사람을 범인이라고 단정할
                수는 없습니다. <strong>무엇이 지워졌고, 누가 왜 지시했는지</strong> 원본으로 확인해
                주세요.
              </p>
              <p>출발점은 세 곳입니다.</p>
              <ul>
                <li>
                  <code>haeon.test</code> — 공개 보고서와 운영 공지
                </li>
                <li>
                  <code>tide.test</code> — 시민들이 남긴 관측·교대 기록
                </li>
                <li>
                  <code>archive.test</code> — 독립 원본 보관과 검증 안내
                </li>
              </ul>
              <p>
                외부 감사 계정은 아직 유효합니다. 인증키는 공개된 인계 자료를 연결하면 알 수
                있습니다. 원본 보관 서버의 위치는 감사 노드의 인계 메모에 있습니다.
              </p>
              <p>
                결론보다 증거를 먼저 모아 주세요.
                <br />
                기록은 누군가의 이름보다 정확할 수 있으니까요.
              </p>
              <p className="mail-reward">
                해결 사례금 · <strong>{formatCredits(CASE_REWARDS['case-01'].amount)}</strong>
                <br />
                정확한 조사 결과가 확인되면 연결한 VAULT BANK 계좌로 입금하겠습니다.
              </p>
              <p>윤서진 드림</p>
            </div>
            <div className="mail-footer">
              <span>
                <FileCheck2 size={17} />
                사건 01 · 단일 조사
              </span>
              <button
                className="primary"
                onClick={() => {
                  if (!state.accepted) accept();
                  else openBrowser();
                }}
              >
                {state.accepted ? '자료 조사하기' : '조사 시작'}
                <ArrowRight size={17} />
              </button>
            </div>
          </>
        ) : selected === 'followup' ? (
          <>
            <h2>기록이 돌아왔네요</h2>
            <div className="sender">
              <span className="avatar">윤</span>
              <div>
                <b>윤서진</b>
                <p>방금 수신</p>
              </div>
            </div>
            <div className="mail-copy">
              <p>세 기록의 대조 결과를 확인했습니다. 고맙습니다.</p>
              <p>
                정민우의 계정이 수정에 쓰였다는 사실과, 그가 삭제를 지시했다는 주장은 다릅니다. 승인
                메시지를 끝까지 읽어 주세요.
              </p>
              <p>
                이제 자료를 어디로 전달할지 결정해야 합니다. 독립 검증 기관에 보내면 시간이 걸리지만
                원본 확인과 소명 절차가 남습니다. 시민에게 공개하면 빠르게 알려지지만 판단도 빠르게
                퍼질 것입니다.
              </p>
              <p>
                어느 쪽이든 제 개인 연락처와 관계없는 정보는 제외해 주세요. 당신이 고른 경로를
                따르겠습니다.
              </p>
              <button className="primary" onClick={() => setSelected('submit')}>
                조사 결과 작성
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>조사 결과 제출</h2>
            <p className="muted">판단의 근거와 전달 경로를 남겨 주세요.</p>
            <div className="submission-status">
              <CheckCircle2 size={17} />
              증거 {state.evidence.length}/3 · {state.compared ? '대조 완료' : '대조 필요'}
            </div>
            {state.ending ? (
              <p>이미 제출한 조사입니다. 상단의 「결말 보기」에서 결과를 다시 볼 수 있습니다.</p>
            ) : (
              <form
                className="submission"
                onSubmit={(e) => {
                  e.preventDefault();
                  setError(onSubmit(form));
                }}
              >
                <label>
                  기록 변경을 지시한 사람
                  <select
                    required
                    aria-label="지시자"
                    value={form.person}
                    onChange={(e) => setForm({ ...form, person: e.target.value })}
                  >
                    <option value="">기록을 근거로 선택</option>
                    {['정민우', '한기석', '윤서진'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  기록을 제외한 이유
                  <select
                    required
                    aria-label="은폐 사유"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  >
                    <option value="">이유 선택</option>
                    <option value="센서 고장">센서 고장으로 측정 불가</option>
                    <option value="정기 보정">예정된 정기 보정</option>
                    <option value="오염 은폐">항만 심사 전 오염 은폐</option>
                  </select>
                </label>
                <label>
                  누락된 시간대
                  <select
                    required
                    aria-label="누락 시간대"
                    value={form.interval}
                    onChange={(e) => setForm({ ...form, interval: e.target.value })}
                  >
                    <option value="">시간대 선택</option>
                    <option>23:00–23:11</option>
                    <option>23:14–23:25</option>
                    <option>23:25–23:36</option>
                  </select>
                </label>
                <fieldset>
                  <legend>증거 전달 경로</legend>
                  <label className="route-option">
                    <input
                      type="radio"
                      name="route"
                      value="review"
                      checked={form.route === 'review'}
                      onChange={() => setForm({ ...form, route: 'review' })}
                    />
                    <span>
                      <b>독립 검증 기관에 제출</b>
                      <small>원본 확인과 관계자 소명을 거쳐 공개합니다.</small>
                    </span>
                  </label>
                  <label className="route-option">
                    <input
                      type="radio"
                      name="route"
                      value="public"
                      checked={form.route === 'public'}
                      onChange={() => setForm({ ...form, route: 'public' })}
                    />
                    <span>
                      <b>시민에게 공개</b>
                      <small>개인정보를 제외한 자료를 즉시 공개합니다.</small>
                    </span>
                  </label>
                </fieldset>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <p className="muted">
                  선택한 경로에 따라 결말이 달라집니다. 실제 외부 전송은 없습니다.
                </p>
                <button
                  className="primary"
                  type="submit"
                  disabled={!state.compared || state.evidence.length !== 3}
                >
                  증거와 함께 제출
                  <Send size={16} />
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
