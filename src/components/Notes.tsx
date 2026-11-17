import { useEffect, useRef, useState } from 'react';
import {
  FilePlus2,
  Save,
  Folder,
  FolderOpen,
  FolderPlus,
  FileText,
  ChevronLeft,
  ArrowUp,
  NotebookPen,
  Check,
} from 'lucide-react';
import { validFileName, validFolder, type NoteFile } from '../game/noteFiles';
import { parentPath, type DesktopFile } from '../game/desktopFiles';

export function Notes({
  notes,
  active,
  file,
  sourceFile,
  setNotes,
  save,
  create,
}: {
  notes: string;
  active: boolean;
  file?: NoteFile;
  sourceFile?: DesktopFile;
  setNotes: (value: string) => void;
  save: () => void;
  create: () => void;
}) {
  const editor = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (active) editor.current?.focus({ preventScroll: true });
  }, [active]);
  return (
    <div className="notes-document">
      <div className="notes-toolbar">
        <button onClick={create}>
          <FilePlus2 size={15} />새 메모
        </button>
        <span
          title={
            sourceFile
              ? `${sourceFile.folder}/${sourceFile.name}`
              : file
                ? `${file.folder}/${file.name}`
                : undefined
          }
        >
          {sourceFile?.name ?? file?.name ?? '제목 없음'}
          {sourceFile ? ' · 읽기 전용' : notes !== (file?.content ?? '') ? ' · 수정됨' : ''}
        </span>
        <button onClick={save}>
          <Save size={15} />
          저장하기
        </button>
      </div>
      <textarea
        ref={editor}
        aria-label="개인 메모"
        value={sourceFile?.content ?? notes}
        readOnly={!!sourceFile}
        onChange={(event) => setNotes(event.target.value)}
        spellCheck={false}
      />
    </div>
  );
}

export function SaveNoteForm({
  content,
  file,
  sourceFile,
  files,
  entries,
  folders,
  createFolder: addFolder,
  save,
  cancel,
}: {
  content: string;
  file?: NoteFile;
  sourceFile?: DesktopFile;
  folders: string[];
  createFolder: (parent: string, name: string) => string;
  files: NoteFile[];
  entries: DesktopFile[];
  save: (file: NoteFile) => string;
  cancel: () => void;
}) {
  const [name, setName] = useState(file?.name ?? sourceFile?.name ?? '메모.txt');
  const [folder, setFolder] = useState(
    file?.folder ?? sourceFile?.folder ?? (folders.includes('메모') ? '메모' : (folders[0] ?? '')),
  );
  const [format, setFormat] = useState(
    (file ?? sourceFile) && !(file ?? sourceFile)!.name.toLowerCase().endsWith('.txt')
      ? 'all'
      : 'text',
  );
  const [error, setError] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const nameField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      nameField.current?.focus();
      nameField.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const locations = folders;
  const childFolders = locations.filter((path) =>
    folder
      ? path.startsWith(folder + '/') && !path.slice(folder.length + 1).includes('/')
      : !path.includes('/'),
  );
  const visibleFiles = entries.filter(
    (item) =>
      item.folder === folder && (format === 'all' || item.name.toLowerCase().endsWith('.txt')),
  );
  function navigate(path: string) {
    setHistory((past) => [...past, folder]);
    setFolder(path);
    setOverwrite(false);
    setError('');
  }
  function createFolder() {
    const segment = newFolderName.trim().normalize('NFC');
    const path = folder ? `${folder}/${segment}` : segment;
    if (!validFileName(segment) || !validFolder(path)) {
      setError('올바른 새 폴더 이름을 입력해 주세요.');
      return;
    }
    const error = addFolder(folder, segment);
    if (error) {
      setError(error);
      return;
    }
    navigate(path);
    setNewFolderOpen(false);
    setNewFolderName('');
  }
  return (
    <form
      className="note-save-form"
      onSubmit={(event) => {
        event.preventDefault();
        const enteredName = name.trim().normalize('NFC');
        const nextName =
          format === 'text' && !enteredName.toLowerCase().endsWith('.txt')
            ? `${enteredName}.txt`
            : enteredName;
        const nextFolder = folder.trim().normalize('NFC');
        if (!validFileName(enteredName) || !validFileName(nextName)) {
          setError('파일 이름은 1~100자로 입력하고 경로 구분자를 제외해 주세요.');
          return;
        }
        if (!validFolder(nextFolder)) {
          setError('저장할 폴더를 선택하거나 올바른 경로를 입력해 주세요.');
          return;
        }
        const existing = files.find((item) => item.name === nextName && item.folder === nextFolder);
        if (existing && existing.id !== file?.id && !overwrite) {
          setError('같은 이름의 파일이 있습니다. 덮어쓰기를 누르면 기존 내용을 바꿉니다.');
          setOverwrite(true);
          return;
        }
        if (!existing && files.length >= 100) {
          setError('최대 100개의 메모 파일을 보관할 수 있습니다.');
          return;
        }
        const error = save({
          id: existing?.id ?? crypto.randomUUID(),
          name: nextName,
          folder: nextFolder,
          content,
          updatedAt: Date.now(),
        });
        if (error) setError(error);
      }}
    >
      <header className="save-dialog-heading">
        <NotebookPen size={18} />
        <h2>다른 이름으로 저장</h2>
      </header>
      <div className="save-browser-toolbar">
        <button
          type="button"
          aria-label="이전 저장 위치"
          disabled={!history.length}
          onClick={() => {
            setFolder(history.at(-1)!);
            setHistory((past) => past.slice(0, -1));
            setOverwrite(false);
            setError('');
          }}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          aria-label="상위 폴더"
          disabled={!folder}
          onClick={() => navigate(parentPath(folder))}
        >
          <ArrowUp size={16} />
        </button>
        <div className="save-path">
          <FolderOpen size={16} />
          <input
            aria-label="저장할 폴더"
            placeholder="내 파일"
            value={folder}
            maxLength={120}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.nativeEvent.isComposing &&
                event.nativeEvent.keyCode !== 229
              ) {
                event.preventDefault();
                nameField.current?.focus();
              }
            }}
            onChange={(event) => {
              setFolder(event.target.value);
              setOverwrite(false);
              setError('');
            }}
          />
        </div>
        <button
          className="new-folder-button"
          aria-label="새 폴더"
          type="button"
          onClick={() => setNewFolderOpen((open) => !open)}
        >
          <FolderPlus size={16} />
          <span>새 폴더</span>
        </button>
      </div>
      {newFolderOpen && (
        <div className="save-new-folder">
          <FolderPlus size={16} />
          <input
            aria-label="새 폴더 이름"
            placeholder="새 폴더 이름"
            value={newFolderName}
            maxLength={100}
            onChange={(event) => setNewFolderName(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.nativeEvent.isComposing &&
                event.nativeEvent.keyCode !== 229
              ) {
                event.preventDefault();
                createFolder();
              }
            }}
          />
          <button type="button" onClick={createFolder}>
            만들기
          </button>
        </div>
      )}
      <div className="save-browser">
        <nav className="save-locations" aria-label="저장 위치">
          <span>저장 위치</span>
          <button type="button" onClick={() => navigate('')}>
            <Folder size={16} />
            <span>내 파일</span>
          </button>
          {locations.map((path) => (
            <button
              key={path}
              type="button"
              className={folder === path ? 'selected' : ''}
              aria-pressed={folder === path}
              title={path}
              onClick={() => navigate(path)}
            >
              <Folder size={16} />
              <span>{path.split('/').pop()}</span>
            </button>
          ))}
        </nav>
        <div className="save-directory" role="region" aria-label="저장 위치 파일 목록">
          <div className="save-directory-head">
            <span>이름</span>
            <span>수정한 날짜</span>
          </div>
          {childFolders.map((path) => (
            <button
              className="save-directory-row"
              key={path}
              type="button"
              aria-label={`${path.split('/').pop()} 폴더 열기`}
              onClick={() => navigate(path)}
            >
              <Folder size={18} />
              <span>{path.split('/').pop()}</span>
              <small>폴더</small>
            </button>
          ))}
          {visibleFiles.map((item) => (
            <button
              className={`save-directory-row ${name === item.name ? 'selected' : ''}`}
              key={item.id}
              type="button"
              title={item.name}
              onClick={() => {
                setName(item.name);
                setOverwrite(false);
                setError('');
              }}
            >
              <FileText size={17} />
              <span>{item.name}</span>
              <small>
                {item.updatedAt === undefined
                  ? '읽기 전용'
                  : new Date(item.updatedAt).toLocaleDateString('ko-KR')}
              </small>
              {name === item.name && <Check size={13} />}
            </button>
          ))}
          {!childFolders.length && !visibleFiles.length && (
            <div className="save-directory-empty">
              <FolderOpen size={30} />
              <span>이 폴더는 비어 있습니다.</span>
            </div>
          )}
        </div>
      </div>
      <footer className="save-dialog-footer">
        <div className="save-fields">
          <label>
            <span>파일 이름</span>
            <input
              ref={nameField}
              aria-label="파일 이름"
              value={name}
              maxLength={100}
              onChange={(event) => {
                setName(event.target.value);
                setOverwrite(false);
                setError('');
              }}
            />
          </label>
          <label>
            <span>파일 형식</span>
            <select
              aria-label="파일 형식"
              value={format}
              onChange={(event) => {
                setFormat(event.target.value);
                setOverwrite(false);
                setError('');
              }}
            >
              <option value="text">텍스트 문서 (*.txt)</option>
              <option value="all">모든 파일 (*.*)</option>
            </select>
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="save-dialog-actions">
          <span>인코딩: UTF-8</span>
          <button type="button" onClick={cancel}>
            취소
          </button>
          <button className="primary" type="submit">
            {overwrite ? '덮어쓰기' : '파일 저장'}
          </button>
        </div>
      </footer>
    </form>
  );
}
