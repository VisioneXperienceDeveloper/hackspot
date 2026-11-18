import { useState } from 'react';
import { AlertTriangle, FileText, Folder, RotateCcw, Trash2 } from 'lucide-react';
import type { TrashEntry } from '../game/desktopFiles';

type Confirmation = { kind: 'entry'; id: string } | { kind: 'empty' };

export function TrashApp({
  entries,
  restore,
  permanentlyDelete,
  empty,
}: {
  entries: TrashEntry[];
  restore: (id: string) => string;
  permanentlyDelete: (id: string) => string;
  empty: () => void;
}) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [message, setMessage] = useState('');
  const pendingEntry =
    confirmation?.kind === 'entry' ? entries.find((entry) => entry.id === confirmation.id) : null;

  function restoreEntry(id: string) {
    const error = restore(id);
    setMessage(error || '항목을 복원했습니다.');
  }

  function confirmPermanentDelete() {
    if (!confirmation) return;
    if (confirmation.kind === 'empty') {
      empty();
      setMessage('휴지통을 비웠습니다.');
    } else {
      const error = permanentlyDelete(confirmation.id);
      setMessage(error || '항목을 영구 삭제했습니다.');
    }
    setConfirmation(null);
  }

  return (
    <div className="trash-app">
      <header className="trash-toolbar">
        <div>
          <span className="trash-toolbar-icon">
            <Trash2 size={17} />
          </span>
          <span>
            <b>휴지통</b>
            <small>{entries.length}개 항목</small>
          </span>
        </div>
        <button
          aria-label="휴지통 비우기"
          disabled={!entries.length}
          onClick={() => {
            setMessage('');
            setConfirmation({ kind: 'empty' });
          }}
        >
          <Trash2 size={14} />
          휴지통 비우기
        </button>
      </header>
      {message && (
        <p className="trash-message" role="status">
          {message}
        </p>
      )}
      {!entries.length ? (
        <div className="trash-empty">
          <Trash2 size={42} strokeWidth={1.2} />
          <b>휴지통이 비어 있습니다.</b>
          <span>폴더 앱에서 삭제한 파일과 폴더가 여기에 보관됩니다.</span>
        </div>
      ) : (
        <div className="trash-list" aria-label="휴지통 항목">
          <div className="trash-list-heading">
            <span>이름</span>
            <span>원래 위치</span>
            <span>삭제한 날짜</span>
            <span>작업</span>
          </div>
          {entries
            .slice()
            .sort((a, b) => b.deletedAt - a.deletedAt)
            .map((entry) => {
              const Icon = entry.kind === 'folder' ? Folder : FileText;
              const details =
                entry.kind === 'folder'
                  ? `${entry.folders.length}개 폴더 · ${entry.files.length}개 파일 포함`
                  : '파일';
              return (
                <div className="trash-row" key={entry.id}>
                  <span className="trash-item-name">
                    <Icon size={18} />
                    <span>
                      <b>{entry.name}</b>
                      <small>{details}</small>
                    </span>
                  </span>
                  <span className="trash-original-path">{entry.path}</span>
                  <time className="trash-deleted-date">
                    {new Intl.DateTimeFormat('ko-KR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(entry.deletedAt)}
                  </time>
                  <span className="trash-row-actions">
                    <button
                      aria-label={`${entry.name} 복원`}
                      title="원래 위치로 복원"
                      onClick={() => restoreEntry(entry.id)}
                    >
                      <RotateCcw size={14} />
                      복원
                    </button>
                    <button
                      className="trash-delete"
                      aria-label={`${entry.name} 영구 삭제`}
                      title="영구 삭제"
                      onClick={() => {
                        setMessage('');
                        setConfirmation({ kind: 'entry', id: entry.id });
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </div>
              );
            })}
        </div>
      )}
      {confirmation && (
        <div className="trash-confirm-backdrop">
          <section
            className="trash-confirmation"
            role="alertdialog"
            aria-modal="true"
            aria-label={confirmation.kind === 'empty' ? '휴지통 비우기 확인' : '영구 삭제 확인'}
          >
            <AlertTriangle size={25} />
            <h2>{confirmation.kind === 'empty' ? '휴지통을 비울까요?' : '영구 삭제할까요?'}</h2>
            <p>
              {confirmation.kind === 'empty'
                ? '휴지통의 모든 항목을 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.'
                : `${pendingEntry?.name ?? '선택한 항목'}을(를) 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
            </p>
            <div className="trash-confirm-actions">
              <button onClick={() => setConfirmation(null)}>취소</button>
              <button className="trash-confirm-delete" onClick={confirmPermanentDelete}>
                영구 삭제
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
