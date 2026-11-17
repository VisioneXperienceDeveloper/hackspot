import { Table2, Mail, ArrowLeft, FileText, FolderOpen } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { DesktopFile } from '../game/desktopFiles';

const sheetDirections: Partial<Record<string, readonly [number, number]>> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

export function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      if (quoted && content[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && content[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function TableDocument({
  file,
  openFolder,
  openText,
}: {
  file?: DesktopFile;
  openFolder: () => void;
  openText: () => void;
}) {
  const grid = useRef<HTMLTableElement>(null);
  const [active, setActive] = useState({ row: 0, column: 0 });
  const content = file?.content ?? '';
  const rows = useMemo(() => {
    const csvStart = content.indexOf('time,solvent_mg_l,power,sensor');
    return parseCSV(csvStart >= 0 ? content.slice(csvStart).split('\n\n')[0] : content);
  }, [content]);
  const columns = Math.max(0, ...rows.map((row) => row.length));
  const columnNames = Array.from({ length: columns }, (_, column) => {
    let label = '';
    for (let number = column + 1; number > 0; number = Math.floor((number - 1) / 26)) {
      label = String.fromCharCode(65 + ((number - 1) % 26)) + label;
    }
    return label;
  });
  if (!file)
    return (
      <div className="document-empty">
        <Table2 size={44} />
        <h2>액셀</h2>
        <p>CSV 파일을 열어 시트에서 확인하세요.</p>
        <button onClick={openFolder}>
          <FolderOpen size={16} />
          폴더 열기
        </button>
      </div>
    );
  return (
    <div className="table-document">
      <div className="document-app-toolbar">
        <Table2 size={18} />
        <span>{file.name}</span>
        <button onClick={openFolder}>
          <FolderOpen size={14} />
          폴더 열기
        </button>
        <button onClick={openText}>
          <FileText size={14} />
          원문 보기
        </button>
      </div>
      <div className="sheet-formula-bar">
        <output aria-label="셀 위치" className="sheet-cell-address">
          {columnNames[active.column] ? `${columnNames[active.column]}${active.row + 1}` : '—'}
        </output>
        <span className="sheet-fx" aria-hidden="true">
          fx
        </span>
        <output aria-label="셀 값" className="sheet-cell-value">
          {rows[active.row]?.[active.column] ?? ''}
        </output>
      </div>
      <div className="table-scroll">
        <table ref={grid} aria-label={`${file.name} 시트`}>
          <thead>
            <tr>
              <th aria-label="행 번호" />
              {columnNames.map((name, index) => (
                <th key={name} className={active.column === index ? 'selected-index' : ''}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <th className={active.row === index ? 'selected-index' : ''}>{index + 1}</th>
                {columnNames.map((name, column) => (
                  <td
                    key={name}
                    data-row={index}
                    data-column={column}
                    className={
                      active.row === index && active.column === column ? 'selected-cell' : ''
                    }
                    tabIndex={active.row === index && active.column === column ? 0 : -1}
                    onFocus={() => setActive({ row: index, column })}
                    onClick={(event) => event.currentTarget.focus()}
                    onKeyDown={(event) => {
                      const direction = sheetDirections[event.key];
                      if (!direction) return;
                      event.preventDefault();
                      const nextRow = Math.max(0, Math.min(rows.length - 1, index + direction[0]));
                      const nextColumn = Math.max(0, Math.min(columns - 1, column + direction[1]));
                      grid.current
                        ?.querySelector<HTMLTableCellElement>(
                          `[data-row="${nextRow}"][data-column="${nextColumn}"]`,
                        )
                        ?.focus();
                    }}
                  >
                    {row[column] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="document-app-status">
        <span className="sheet-tab">시트1</span>
        <span>
          {rows.length}개 행 · {columns}개 열{file.readOnly ? ' · 읽기 전용' : ''}
        </span>
      </div>
    </div>
  );
}

export function MailDocument({
  file,
  inbox,
  openText,
}: {
  file: DesktopFile;
  inbox: () => void;
  openText: () => void;
}) {
  const headerEnd = file.content.indexOf('\n\n');
  const header = headerEnd >= 0 ? file.content.slice(0, headerEnd) : '';
  const field = (name: string) =>
    header
      .split('\n')
      .find((line) => line.toLowerCase().startsWith(name.toLowerCase() + ':'))
      ?.slice(name.length + 1)
      .trim();
  return (
    <div className="stored-mail">
      <div className="document-app-toolbar">
        <button onClick={inbox}>
          <ArrowLeft size={15} />
          수신함
        </button>
        <Mail size={17} />
        <span>{file.name}</span>
        <button onClick={openText}>원문 보기</button>
      </div>
      <article>
        <h2>{field('Subject') || file.title}</h2>
        <dl>
          <dt>보낸 사람</dt>
          <dd>{field('From') || '—'}</dd>
          <dt>받는 사람</dt>
          <dd>{field('To') || '—'}</dd>
          <dt>날짜</dt>
          <dd>{field('Date') || '—'}</dd>
        </dl>
        <pre>{headerEnd >= 0 ? file.content.slice(headerEnd + 2) : file.content}</pre>
      </article>
    </div>
  );
}
