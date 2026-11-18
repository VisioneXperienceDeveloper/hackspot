import type { NoteFile } from './noteFiles';
import { DEFAULT_SETTINGS_CONTENT } from './settings';

export const HANDBOOK_FILE_ID = 'system-handbook';
export const SETTINGS_FILE_ID = 'system-settings';
export const SYSTEM_FILE_IDS = [HANDBOOK_FILE_ID, SETTINGS_FILE_ID] as const;
export const isSystemFileId = (id: string) => SYSTEM_FILE_IDS.some((systemId) => systemId === id);

export const DEFAULT_SYSTEM_FILES: NoteFile[] = [
  {
    id: HANDBOOK_FILE_ID,
    name: 'handbook.txt',
    folder: 'notes',
    content: `HACKSPOT HANDBOOK

앱 실행
desktop 폴더에는 데스크톱과 같은 기본 앱 바로가기가 있습니다. 앱은 Alt+1부터 Alt+7으로도 열 수 있습니다.
Alt+1 터미널 · Alt+2 브라우저 · Alt+3 메일 · Alt+4 폴더 · Alt+5 메모장 · Alt+6 액셀 · Alt+7 휴지통

창 조작
창 제목 표시줄을 끌어 이동하고, 최소화·최대화·닫기 버튼으로 창을 관리합니다.
창 가장자리나 모서리를 끌어 크기를 조절하고, 최대화하면 앱 작업 영역을 채웁니다.
상단의 ... 버튼을 누르면 진행 현황판을 열고 닫을 수 있습니다.

조사 도구
브라우저 주소창에 사이트 주소를 입력하고 Enter를 누릅니다.
터미널에서 help 또는 help 명령어를 입력하면 사용 가능한 명령과 도움말을 볼 수 있습니다.
ls로 목록을 확인하고 read로 파일을 읽습니다. collect로 증거 사본을 보관하고 compare로 기록을 대조합니다.

파일과 메모
폴더 앱에서 항목을 더블클릭해 열고, 새 폴더 만들기·이름 변경·이동·삭제를 할 수 있습니다. 삭제한 항목은 휴지통에서 복원하거나 영구 삭제합니다.
메모장은 저장하기를 눌러 파일 이름과 폴더를 지정합니다.

설정
config/settings.json을 편집하고 저장하면 배경화면, 애니메이션, 시계 형식, 데스크톱 바로가기에 적용됩니다.
wallpaper는 ocean, midnight, dusk 중 하나, clockFormat은 24h 또는 12h입니다.
animations와 showDesktopShortcuts는 true 또는 false로 설정합니다.`,
    updatedAt: 0,
  },
  {
    id: SETTINGS_FILE_ID,
    name: 'settings.json',
    folder: 'config',
    content: DEFAULT_SETTINGS_CONTENT,
    updatedAt: 0,
  },
];
