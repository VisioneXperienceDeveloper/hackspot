import { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  FileText,
  Mail,
  Table2,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  LayoutGrid,
  List,
  Search,
  Pencil,
  Move,
  ExternalLink,
  HardDrive,
  Home,
} from 'lucide-react';
import type { GameState } from '../game/engine';
import {
  desktopFiles,
  fileApp,
  parentPath,
  baseName,
  type DesktopEntry,
  type FileAction,
} from '../game/desktopFiles';
import type { DesktopFileId } from '../game/noteFiles';

export function Files({
  state,
  folder,
  setFolder,
  openFile,
  action,
}: {
  state: GameState;
  folder: string;
  setFolder: (folder: string) => void;
  openFile: (id: DesktopFileId) => void;
  action: (action: FileAction, entry?: DesktopEntry) => void;
}) {
  const [selection, setSelection] = useState<DesktopEntry | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [list, setList] = useState(false);
  const exists = (path: string) => path === '' || state.folders.includes(path);
  const backPaths = history.filter(exists);
  const forwardPaths = future.filter(exists);
  const files = desktopFiles(state);
  const items = [
    ...state.folders
      .filter((path) => parentPath(path) === folder)
      .map((path) => ({
        key: `folder:${path}`,
        name: baseName(path),
        kind: 'folder' as const,
        entry: { type: 'folder' as const, path },
      })),
    ...files
      .filter((file) => file.folder === folder)
      .map((file) => ({
        key: file.id,
        name: file.name,
        kind: fileApp(file.name),
        entry: { type: 'file' as const, id: file.id },
      })),
  ].filter((item) => item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const selected = items.find(
    (item) =>
      item.entry.type === selection?.type &&
      (item.entry.type === 'folder'
        ? selection?.type === 'folder' && item.entry.path === selection.path
        : selection?.type === 'file' && item.entry.id === selection.id),
  );
  function navigate(path: string) {
    if (path !== folder) setHistory((past) => [...past.filter(exists), folder]);
    setFuture([]);
    setSelection(null);
    setQuery('');
    setFolder(path);
  }
  function open(entry: DesktopEntry) {
    if (entry.type === 'folder') navigate(entry.path);
    else openFile(entry.id);
  }
  const crumbs = folder ? folder.split('/') : [];
  return (
    <div className="finder-layout">
      <nav className="finder-sidebar" aria-label="폴더 사이드바">
        <span className="finder-section-label">즐겨찾기</span>
        <button className={!folder ? 'selected' : ''} onClick={() => navigate('')}>
          <HardDrive size={17} />내 파일
        </button>
        {state.folders
          .filter((path) => !path.includes('/'))
          .map((path) => (
            <button
              key={path}
              aria-label={`${path} 폴더`}
              className={folder === path || folder.startsWith(path + '/') ? 'selected' : ''}
              onClick={() => navigate(path)}
            >
              <Folder size={17} />
              <span>{path}</span>
            </button>
          ))}
      </nav>
      <div className="finder-main">
        <header className="finder-toolbar">
          <div className="finder-navigation">
            <button
              aria-label="폴더 뒤로"
              disabled={!backPaths.length}
              onClick={() => {
                setFuture([folder, ...forwardPaths]);
                setFolder(backPaths.at(-1)!);
                setHistory(backPaths.slice(0, -1));
                setSelection(null);
                setQuery('');
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="폴더 앞으로"
              disabled={!forwardPaths.length}
              onClick={() => {
                setHistory([...backPaths, folder]);
                setFolder(forwardPaths[0]);
                setFuture(forwardPaths.slice(1));
                setSelection(null);
                setQuery('');
              }}
            >
              <ChevronRight size={18} />
            </button>
            <button
              aria-label="상위 폴더로"
              disabled={!folder}
              onClick={() => navigate(parentPath(folder))}
            >
              <ArrowUp size={16} />
            </button>
          </div>
          <h2>{folder ? baseName(folder) : '내 파일'}</h2>
          <div className="finder-view-controls">
            <button aria-label="아이콘 보기" aria-pressed={!list} onClick={() => setList(false)}>
              <LayoutGrid size={16} />
            </button>
            <button aria-label="목록 보기" aria-pressed={list} onClick={() => setList(true)}>
              <List size={17} />
            </button>
          </div>
        </header>
        <div className="finder-actions">
          <button aria-label="새 폴더" onClick={() => action('create')}>
            <FolderPlus size={16} />
            <span>새 폴더</span>
          </button>
          <button
            aria-label="열기"
            disabled={!selected}
            onClick={() => selected && open(selected.entry)}
          >
            <ExternalLink size={15} />
            <span>열기</span>
          </button>
          <button
            aria-label="이름 변경"
            disabled={!selected}
            onClick={() => selected && action('rename', selected.entry)}
          >
            <Pencil size={15} />
            <span>이름 변경</span>
          </button>
          <button
            aria-label="이동"
            disabled={!selected}
            onClick={() => selected && action('move', selected.entry)}
          >
            <Move size={15} />
            <span>이동</span>
          </button>
          <label className="finder-search">
            <Search size={14} />
            <input
              aria-label="현재 폴더 검색"
              placeholder="검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div className={`finder-items ${list ? 'list-view' : ''}`} aria-label="폴더 항목">
          {list && (
            <div className="finder-list-heading">
              <span>이름</span>
              <span>종류</span>
            </div>
          )}
          {items.map((item) => {
            const Icon =
              item.kind === 'folder'
                ? Folder
                : item.kind === 'mail'
                  ? Mail
                  : item.kind === 'table'
                    ? Table2
                    : FileText;
            const kind =
              item.kind === 'folder'
                ? '폴더'
                : item.kind === 'mail'
                  ? '메일'
                  : item.kind === 'table'
                    ? 'CSV 문서'
                    : '텍스트 문서';
            return (
              <button
                key={item.key}
                className={`finder-item ${item.kind} ${selected?.key === item.key ? 'selected' : ''}`}
                aria-label={item.name}
                aria-pressed={selected?.key === item.key}
                onClick={() => setSelection(item.entry)}
                onDoubleClick={() => open(item.entry)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    open(item.entry);
                  }
                }}
              >
                <span className="finder-item-icon">
                  <Icon size={list ? 20 : 45} strokeWidth={1.3} />
                </span>
                <span className="finder-item-name">{item.name}</span>
                <small>{kind}</small>
              </button>
            );
          })}
          {!items.length && (
            <div className="finder-empty">
              <FolderOpen size={38} />
              <span>{query ? '검색 결과가 없습니다.' : '이 폴더는 비어 있습니다.'}</span>
            </div>
          )}
        </div>
        <footer className="finder-footer">
          <nav aria-label="현재 폴더 경로">
            <button aria-label="내 파일로" onClick={() => navigate('')}>
              <Home size={13} />
            </button>
            {crumbs.map((part, index) => (
              <span key={index}>
                <ChevronRight size={12} />
                <button onClick={() => navigate(crumbs.slice(0, index + 1).join('/'))}>
                  {part}
                </button>
              </span>
            ))}
          </nav>
          <span>{items.length}개 항목</span>
        </footer>
      </div>
    </div>
  );
}

export function FileActionForm({
  kind,
  entry,
  folder,
  state,
  submit,
  cancel,
}: {
  kind: FileAction;
  entry?: DesktopEntry;
  folder: string;
  state: GameState;
  submit: (value: string) => string;
  cancel: () => void;
}) {
  const original =
    entry?.type === 'folder'
      ? baseName(entry.path)
      : entry?.type === 'file'
        ? (desktopFiles(state).find((file) => file.id === entry.id)?.name ?? '')
        : '';
  const [name, setName] = useState(kind === 'create' ? '새 폴더' : original);
  const [destination, setDestination] = useState(folder);
  const [error, setError] = useState('');
  const title =
    kind === 'create' ? '새 폴더 만들기' : kind === 'rename' ? '이름 변경' : '항목 이동';
  const destinations = ['', ...state.folders].filter(
    (path) =>
      entry?.type !== 'folder' || (path !== entry.path && !path.startsWith(entry.path + '/')),
  );
  return (
    <form
      className="file-action-form"
      onSubmit={(event) => {
        event.preventDefault();
        setError(submit(kind === 'move' ? destination : name));
      }}
    >
      <h2>{title}</h2>
      {kind === 'move' ? (
        <>
          <p>{original}</p>
          <label>
            이동할 폴더
            <select
              aria-label="이동할 폴더"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            >
              {destinations.map((path) => (
                <option key={path} value={path}>
                  {path || '내 파일'}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <label>
          {kind === 'create' ? '폴더 이름' : '새 이름'}
          <input
            aria-label={kind === 'create' ? '폴더 이름' : '새 이름'}
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button type="button" onClick={cancel}>
          취소
        </button>
        <button className="primary" type="submit">
          {kind === 'move' ? '여기로 이동' : kind === 'create' ? '만들기' : '변경'}
        </button>
      </div>
    </form>
  );
}
