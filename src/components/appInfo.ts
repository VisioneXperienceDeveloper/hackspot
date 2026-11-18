import {
  Terminal,
  Globe,
  Mail,
  FolderOpen,
  NotebookPen,
  Table2,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import type { AppId } from './Window';

export const appInfo: Record<AppId, { title: string; Icon: LucideIcon; keywords: string }> = {
  terminal: { title: '터미널', Icon: Terminal, keywords: 'terminal shell 명령어 콘솔' },
  browser: { title: '브라우저', Icon: Globe, keywords: 'browser web 인터넷 사이트' },
  mail: { title: '메일', Icon: Mail, keywords: 'mail email 이메일 편지' },
  files: { title: '폴더', Icon: FolderOpen, keywords: 'folder files 파일 증거 보관함' },
  notes: { title: '메모장', Icon: NotebookPen, keywords: 'notes notepad 메모 기록' },
  table: {
    title: '액셀',
    Icon: Table2,
    keywords: 'excel 엑셀 table spreadsheet csv 표 보기 스프레드시트',
  },
  trash: { title: '휴지통', Icon: Trash2, keywords: 'trash recycle bin deleted 삭제 복원' },
};
export const appOrder: AppId[] = [
  'terminal',
  'browser',
  'mail',
  'files',
  'notes',
  'table',
  'trash',
];
