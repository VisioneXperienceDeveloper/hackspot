import type { RefObject } from 'react';
import { ArrowRight, Check, Keyboard, Radio, RotateCcw, ShieldCheck } from 'lucide-react';
import { FileActionForm } from '../../pages/Files';
import { SaveNoteForm } from '../../pages/Notes';
import { Modal } from '../common/Modal';
import { CASE_REWARDS, formatCredits } from '../../game/account';
import type { DesktopEntry, DesktopFile, FileAction } from '../../game/desktopFiles';
import type { GameState } from '../../game/engine';
import type { NoteFile } from '../../game/noteFiles';
import type { AppId } from '../Window';

export type GameDialogType =
  'help' | 'new' | 'ending' | 'noteSave' | 'discardNote' | 'fileAction' | null;

type Props = {
  modal: GameDialogType;
  state: GameState;
  restoreFocus: RefObject<HTMLElement | null>;
  saveEnabled: boolean;
  saveFailed: boolean;
  editingNote?: NoteFile;
  openedText?: DesktopFile;
  pendingNoteId: string | null;
  visibleFolder: string;
  storedFiles: DesktopFile[];
  fileAction: { kind: FileAction; entry?: DesktopEntry } | null;
  close: () => void;
  setModal: (modal: GameDialogType) => void;
  openApp: (id: AppId) => void;
  saveNote: (file: NoteFile) => string;
  createFolder: (parent: string, name: string) => string;
  fileOperation: (value: string) => string;
  loadNote: (id: string | null) => void;
  startNew: () => void;
  openBank: () => void;
};

export function GameDialogs({
  modal,
  state,
  restoreFocus,
  saveEnabled,
  saveFailed,
  editingNote,
  openedText,
  pendingNoteId,
  visibleFolder,
  storedFiles,
  fileAction,
  close,
  setModal,
  openApp,
  saveNote,
  createFolder,
  fileOperation,
  loadNote,
  startNew,
  openBank,
}: Props) {
  return (
    <>
      {modal === 'noteSave' && (
        <Modal
          className="save-file-dialog"
          restoreFocus={restoreFocus}
          title="메모 저장"
          close={close}
        >
          <SaveNoteForm
            content={openedText?.content ?? state.notes}
            file={openedText ? undefined : editingNote}
            sourceFile={openedText}
            files={state.noteFiles}
            entries={storedFiles}
            folders={state.folders}
            createFolder={createFolder}
            save={saveNote}
            cancel={close}
          />
        </Modal>
      )}
      {modal === 'discardNote' && (
        <Modal restoreFocus={restoreFocus} title="작성 중인 메모" close={close}>
          <h2>작성 중인 내용을 버릴까요?</h2>
          <p>아직 파일에 저장하지 않은 수정 내용이 있습니다.</p>
          <div className="modal-actions">
            <button
              onClick={() => {
                close();
                openApp('notes');
              }}
            >
              계속 작성하기
            </button>
            <button className="primary" onClick={() => loadNote(pendingNoteId)}>
              버리고 계속
            </button>
          </div>
        </Modal>
      )}
      {modal === 'fileAction' && fileAction && (
        <Modal
          restoreFocus={restoreFocus}
          title={
            fileAction.kind === 'create'
              ? '새 폴더 만들기'
              : fileAction.kind === 'rename'
                ? '이름 변경'
                : '항목 이동'
          }
          close={close}
        >
          <FileActionForm
            kind={fileAction.kind}
            entry={fileAction.entry}
            folder={visibleFolder}
            state={state}
            submit={fileOperation}
            cancel={close}
          />
        </Modal>
      )}
      {modal === 'help' && (
        <Modal restoreFocus={restoreFocus} title="조작 안내" close={close}>
          <Keyboard size={30} className="accent" />
          <h2>당신의 데스크톱입니다.</h2>
          <p>
            앱은 데스크톱 아이콘이나 아래 작업 표시줄에서 열 수 있습니다. 진행 단계와 힌트는 상단
            현황판에서 확인하세요.
          </p>
          <div className="help-grid">
            <kbd>Alt + 1~7</kbd>
            <span>앱 열기</span>
            <kbd>↑ / ↓</kbd>
            <span>터미널 입력 기록</span>
            <kbd>Tab</kbd>
            <span>명령어·발견한 경로 자동완성</span>
            <kbd>Ctrl / ⌘ + L</kbd>
            <span>터미널 출력 지우기</span>
          </div>
          <p>
            창 제목을 끌어 이동하고 모서리를 끌어 크기를 조절하세요. 제목을 두 번 누르면
            최대화합니다.
          </p>
          <p className="muted">
            시간 제한이 없습니다. 자동 저장은 이 브라우저에 보관됩니다. 작은 화면에서는 창이 화면에
            맞춰 표시됩니다.
          </p>
          <button className="primary" onClick={close}>
            조사로 돌아가기
            <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {modal === 'new' && (
        <Modal restoreFocus={restoreFocus} title="새 조사 시작" close={close}>
          <RotateCcw className="accent" size={28} />
          <h2>처음부터 다시 조사할까요?</h2>
          <p>
            메일 주소, 은행 계좌와 잔액, 현재 사건의 진행, 증거, 저장한 메모 파일과 편집 초안이
            초기화됩니다. 두 번째 결말은 새 조사에서 다른 전달 경로를 골라 확인할 수 있습니다.
          </p>
          <div className="modal-actions">
            <button onClick={close}>계속 조사하기</button>
            <button className="primary" onClick={startNew}>
              새 조사 시작
            </button>
          </div>
        </Modal>
      )}
      {modal === 'ending' && state.ending && (
        <Modal restoreFocus={restoreFocus} title="조사 완료" close={close}>
          <div className="ending-symbol">
            {state.ending === 'review' ? <ShieldCheck size={35} /> : <Radio size={35} />}
          </div>
          <span className="ending-label">
            조사 완료 · {state.ending === 'review' ? '기록의 무게' : '바다의 목소리'}
          </span>
          <h2>{state.ending === 'review' ? '진실은 절차를 남겼다.' : '침묵은 끝났다.'}</h2>
          <p>
            {state.ending === 'review'
              ? '독립 검증 기관은 세 기록의 일치를 확인했습니다. 한기석 소장의 변경 지시가 공식 조사 대상이 되었고, 항만 증설 심사는 보류되었습니다. 정민우의 실행과 소장의 지시가 구분되어 기록되었습니다.'
              : '개인정보를 제외한 원본과 대조표가 시민 기록실에 공개되었습니다. 누락된 11분은 더 이상 숨길 수 없게 되었습니다. 항만 심사에 대한 공개 질의가 시작되었지만, 자료의 맥락을 둘러싼 논쟁도 함께 커졌습니다.'}
          </p>
          <blockquote>
            {state.ending === 'review'
              ? '“늦더라도, 누가 무엇을 했는지 정확히 남았네요.”'
              : '“이제 우리가 본 것을 모두가 확인할 수 있겠네요.”'}
            <cite>— 윤서진</cite>
          </blockquote>
          <div className="ending-facts">
            <span>
              <Check size={14} />
              사례금 {formatCredits(CASE_REWARDS['case-01'].amount)} 입금 완료
            </span>
            <span>
              <Check size={14} />
              원본 증거 3개 확보
            </span>
            <span>
              <Check size={14} />
              11분의 기록 복원
            </span>
            <span>
              <Check size={14} />
              지시자와 실행자 구분
            </span>
          </div>
          <p className="muted">
            ECHO / 잔향 · 첫 번째 사건을 마쳤습니다.
            <br />
            {saveEnabled && !saveFailed
              ? '현재 결말과 증거는 자동 저장됩니다.'
              : '현재 저장이 중단되어 있습니다. 기록으로 돌아가 저장 상태를 확인하세요.'}
          </p>
          <div className="modal-actions">
            <button onClick={() => setModal('new')}>다른 경로로 다시 조사</button>
            <button
              onClick={() => {
                close();
                openBank();
              }}
            >
              입금 내역 확인
            </button>
            <button
              className="primary"
              onClick={() => {
                close();
                openApp('files');
              }}
            >
              기록 돌아보기
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
