import { useEffect, useRef, useState } from 'react';
import { Search, X, FileText, NotebookPen, Mail, Table2, type LucideIcon } from 'lucide-react';
import type { GameState } from '../game/engine';
import { desktopFiles, fileApp, joinPath } from '../game/desktopFiles';
import { appInfo, appOrder } from './appInfo';
import type { AppId } from './Window';
import type { DesktopFileId } from '../game/noteFiles';

interface SearchItem {
  id: string;
  kind: 'app' | 'file';
  title: string;
  detail: string;
  keywords: string;
  Icon: LucideIcon;
  open: () => void;
}

export function DesktopSearch({
  state,
  openApp,
  openFile,
  close,
}: {
  state: GameState;
  openApp: (id: AppId) => void;
  openFile: (id: DesktopFileId) => void;
  close: () => void;
}) {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);

  const items: SearchItem[] = appOrder.map((id) => ({
    id: `app-${id}`,
    kind: 'app',
    title: appInfo[id].title,
    detail: '설치된 앱',
    keywords: appInfo[id].keywords,
    Icon: appInfo[id].Icon,
    open: () => openApp(id),
  }));
  for (const file of desktopFiles(state)) {
    const app = fileApp(file.name);
    items.push({
      id: `file-${file.id}`,
      kind: 'file',
      title: file.name,
      detail: joinPath(file.folder, file.name),
      keywords: `${file.title} ${file.content}`,
      Icon: app === 'mail' ? Mail : app === 'table' ? Table2 : file.noteId ? NotebookPen : FileText,
      open: () => openFile(file.id),
    });
  }
  const terms = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/);
  const results = items.filter((item) => {
    const text = `${item.title} ${item.detail} ${item.keywords}`
      .normalize('NFKC')
      .toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
  const active = Math.min(highlighted, Math.max(0, results.length - 1));
  const activeId = results[active] ? `search-result-${results[active].id}` : undefined;
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  return (
    <section
      id="desktop-search"
      className="desktop-search"
      role="dialog"
      aria-label="앱 및 파일 검색"
    >
      <div className="search-input-row">
        <Search size={20} aria-hidden="true" />
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-label="앱 및 파일 검색어"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls="desktop-search-results"
          aria-activedescendant={activeId}
          placeholder="앱 또는 파일 검색"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const delta = event.key === 'ArrowDown' ? 1 : -1;
              setHighlighted((active + delta + results.length) % (results.length || 1));
            } else if (event.key === 'Enter' && results[active]) {
              event.preventDefault();
              results[active].open();
            }
          }}
        />
        <button aria-label="검색 닫기" onClick={close}>
          <X size={17} />
        </button>
      </div>
      <div
        id="desktop-search-results"
        className="search-results"
        role="listbox"
        aria-label="검색 결과"
      >
        {(['app', 'file'] as const).map((kind) => {
          const group = results.filter((item) => item.kind === kind);
          if (!group.length) return null;
          return (
            <div key={kind} role="group" aria-label={kind === 'app' ? '설치된 앱' : '저장된 파일'}>
              <div className="search-group-label">
                {kind === 'app' ? '설치된 앱' : '저장된 파일'}
              </div>
              {group.map((item) => {
                const index = results.indexOf(item);
                const Icon = item.Icon;
                return (
                  <button
                    key={item.id}
                    id={`search-result-${item.id}`}
                    className="search-result"
                    role="option"
                    aria-selected={active === index}
                    onPointerMove={() => setHighlighted(index)}
                    onClick={item.open}
                  >
                    <span className={`search-result-icon ${kind}`}>
                      <Icon size={21} />
                    </span>
                    <span className="search-result-copy">
                      <b>{item.title}</b>
                      <small>{item.detail}</small>
                    </span>
                    <span className="search-result-action">열기</span>
                  </button>
                );
              })}
            </div>
          );
        })}
        {!results.length && <p className="search-empty">“{query}” 검색 결과가 없습니다.</p>}
        {!query.trim() && !items.some((item) => item.kind === 'file') && (
          <p className="search-empty">수집한 파일과 작성한 메모가 여기에 표시됩니다.</p>
        )}
      </div>
      <div className="search-footer">
        <span>↑↓ 이동 · Enter 열기</span>
        <span>Esc 닫기</span>
      </div>
    </section>
  );
}
