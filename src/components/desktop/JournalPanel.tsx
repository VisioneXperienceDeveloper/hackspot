import { forwardRef } from 'react';
import { ArrowRight, Check, HelpCircle, X } from 'lucide-react';
import { OnboardingChecklist } from '../Onboarding';
import { completed, currentObjective, type GameState } from '../../game/engine';
import { hints, objectives } from '../../game/world';

type Props = {
  state: GameState;
  visible: boolean;
  showSetupChecklist: boolean;
  animatedSteps: { setup: number[]; investigation: number[] };
  close: () => void;
  showNextHint: () => void;
  openNotes: () => void;
};

export const JournalPanel = forwardRef<HTMLElement, Props>(function JournalPanel(
  { state, visible, showSetupChecklist, animatedSteps, close, showNextHint, openNotes },
  ref,
) {
  const setupProgress = [!!state.onboarding.email, !!state.bank, state.onboarding.completed];
  const done = completed(state);
  const objective = currentObjective(state);
  const hintCount = state.hints[objective.id] || 0;

  return (
    <aside
      id="investigation-journal"
      ref={ref}
      className="journal"
      role="dialog"
      aria-label="조사 진행"
      hidden={!visible}
      tabIndex={-1}
    >
      {!state.onboarding.completed || showSetupChecklist ? (
        <>
          <div className="journal-heading">
            <div>
              <span className="case-number">WELCOME</span>
              <h1>시작 준비</h1>
            </div>
            <button className="journal-close" aria-label="진행 기록 닫기" onClick={close}>
              <X size={17} />
            </button>
          </div>
          <div className="journal-label">
            진행 상황
            <span>{setupProgress.filter(Boolean).length} / 3</span>
          </div>
          <OnboardingChecklist state={state} animatedSteps={animatedSteps.setup} />
        </>
      ) : (
        <>
          <div className="journal-heading">
            <div>
              <span className="case-number">사건 01</span>
              <h1>사라진 11분</h1>
            </div>
            <button className="journal-close" aria-label="진행 기록 닫기" onClick={close}>
              <X size={17} />
            </button>
          </div>
          <div className="case-rule" />
          <div className="journal-label">
            진행 기록 <span>{done.filter(Boolean).length} / 5</span>
          </div>
          <ol className="objectives">
            {objectives.map((item, index) => (
              <li
                key={item.id}
                className={[
                  done[index] ? 'done' : objective.id === item.id ? 'current' : '',
                  animatedSteps.investigation.includes(index) ? 'just-completed' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="step-dot">{done[index] ? <Check size={12} /> : null}</span>
                <span
                  className="journal-hint"
                  data-hint={item.hint}
                  tabIndex={0}
                  aria-label={`${item.label}. 힌트: ${item.hint}`}
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ol>
          <p className="current-task">
            {state.ending ? '조사가 마무리되었습니다.' : objective.detail}
          </p>
          <div className="case-rule" />
          <button
            className="hint-button"
            disabled={!!state.ending || hintCount === 3}
            onClick={showNextHint}
          >
            {hintCount === 0 ? '힌트 보기' : hintCount < 3 ? '다음 힌트' : '힌트 모두 펼침'}
            <HelpCircle size={16} />
          </button>
          {hintCount > 0 && !state.ending && (
            <div className="hint-content">
              <span>도움말 {hintCount}/3</span>
              {hints[objective.id].slice(0, hintCount).map((hint, index) => (
                <p key={index}>{hint}</p>
              ))}
            </div>
          )}
          <button className="journal-notes" onClick={openNotes}>
            메모장 열기
            <ArrowRight size={13} />
          </button>
        </>
      )}
    </aside>
  );
});
