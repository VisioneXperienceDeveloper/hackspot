interface Manual {
  summary: string;
  usage?: string;
  options?: string[];
  note?: string;
  example: string;
}

const lineSliceOptions = [
  '-n N, --lines=N — N줄을 출력합니다. 기본값은 10입니다.',
  '-c N, --bytes=N — 줄 대신 바이트 수를 지정합니다.',
  '-N — 첫 번째 인자로 쓰면 -n N과 같습니다.',
  '-q, --quiet — 파일 이름 머리말을 숨깁니다.',
  '-v, --verbose — 파일이 하나여도 파일 이름을 표시합니다.',
];
const socketOptions = [
  '-t, --tcp — TCP 포트를 표시합니다.',
  '-u, --udp — UDP만 요청하면 빈 목록을 표시합니다. 가상 서비스는 TCP를 사용합니다.',
  '-p, --processes — 서비스 이름과 가상 PID를 표시합니다.',
  '-6 — IPv6만 요청합니다. 가상 서비스는 IPv4를 사용합니다.',
  '-l, --listening / -a, --all — 현재는 대기 중인 소켓만 표시합니다.',
  '-n, --numeric / -4 — 가상 소켓은 항상 숫자 IPv4 주소와 포트로 표시합니다.',
];
const serveOptions = [
  '-b IP, --bind=IP — 지정한 가상 IP에서 대기합니다. 기본값은 0.0.0.0입니다.',
  '-d 경로, --directory=경로 — 제공할 파일 또는 폴더를 지정합니다.',
];
const lookupOptions = ['-4, +short — IPv4 주소만 출력합니다.'];
const testOperators = [
  '-e 경로 / -f 경로 / -d 경로 / -s 경로 — 존재 / 일반 파일 / 폴더 / 내용이 있는 파일을 확인합니다.',
  '-n 문자열 / -z 문자열 — 문자열에 내용이 있는지 또는 비어 있는지 확인합니다.',
  '=, ==, != — 문자열을 비교합니다.',
  '-eq, -ne, -lt, -le, -gt, -ge — 정수를 비교합니다.',
  '! 조건 — 결과를 반전합니다.',
];
const manuals: Record<string, Manual> = {
  pwd: {
    summary: '현재 폴더의 절대 경로를 표시합니다.',
    usage: '[-L|-P]',
    options: ['-L, -P — 가상 파일 시스템에는 심볼릭 링크가 없어 같은 경로를 출력합니다.'],
    example: 'pwd',
  },
  ls: {
    summary: '파일과 폴더 목록을 표시합니다.',
    usage: '[-aAlhRd1tFr] [경로 ...]',
    options: [
      '-l — 종류, 크기, 수정일 등 상세 정보를 표시합니다.',
      '-a, --all — 숨김 항목과 . 및 ..을 포함합니다.',
      '-A, --almost-all — 숨김 항목을 포함하되 .과 ..은 생략합니다.',
      '-h, --human-readable — -l과 함께 크기를 읽기 쉬운 단위로 표시합니다.',
      '-R, --recursive — 하위 폴더까지 표시합니다.',
      '-d, --directory — 폴더의 내용 대신 폴더 자체를 표시합니다.',
      '-F, --classify — 폴더 이름 뒤에 /를 붙입니다.',
      '-t — 수정 시간이 최신인 항목부터 표시합니다.',
      '-r, --reverse — 표시 순서를 뒤집습니다.',
      '-1 — 한 줄에 하나씩 표시합니다. 기본값과 같습니다.',
    ],
    example: 'ls -alh ~',
  },
  cd: {
    summary: '다른 폴더로 이동합니다.',
    usage: '[-L|-P] [경로|-]',
    options: [
      '- — 직전에 있던 폴더로 돌아갑니다.',
      '-L, -P — 가상 파일 시스템에는 심볼릭 링크가 없어 같은 방식으로 이동합니다.',
    ],
    note: '경로를 생략하거나 ~를 입력하면 홈 폴더로 이동합니다. ..은 상위 폴더입니다.',
    example: 'cd ~/메모',
  },
  mkdir: {
    summary: '새 폴더를 만듭니다.',
    usage: '[-pv] 폴더 ...',
    options: [
      '-p, --parents — 필요한 상위 폴더를 함께 만듭니다.',
      '-v, --verbose — 처리한 폴더 이름을 출력합니다.',
    ],
    example: 'mkdir -pv 실습/로그',
  },
  rmdir: {
    summary: '빈 폴더를 삭제합니다.',
    usage: '폴더 ...',
    note: '내용이 남아 있는 폴더는 먼저 비워야 합니다.',
    example: 'rmdir 실습',
  },
  touch: {
    summary: '빈 파일을 만들거나 기존 파일의 수정 시각을 갱신합니다.',
    usage: '[-c] 파일 ...',
    options: ['-c, --no-create — 파일이 이미 있을 때만 수정 시각을 갱신합니다.'],
    example: 'touch ~/메모/기록.txt',
  },
  cp: {
    summary: '파일이나 폴더를 복사합니다.',
    usage: '[-rRafnv] 원본 ... 대상',
    options: [
      '-r, -R, --recursive — 하위 항목을 포함해 폴더를 복사합니다.',
      '-a, --archive — 이 셸에서는 재귀 복사와 같습니다.',
      '-n, --no-clobber — 이미 있는 파일을 덮어쓰지 않습니다.',
      '-f, --force — 일반 파일 덮어쓰기를 허용합니다. 기본 동작과 같습니다.',
      '-v, --verbose — 원본과 대상 경로를 표시합니다.',
    ],
    note: '원본을 여러 개 지정할 때 대상은 기존 폴더여야 합니다.',
    example: 'cp -nv 기록.txt ~/메모/',
  },
  mv: {
    summary: '파일이나 폴더를 옮기거나 이름을 바꿉니다.',
    usage: '[-fnv] 원본 ... 대상',
    options: [
      '-n, --no-clobber — 같은 이름의 항목이 있으면 덮어쓰지 않습니다.',
      '-f, --force — 일반 파일 덮어쓰기를 허용합니다. 기본 동작과 같습니다.',
      '-v, --verbose — 원본과 대상 경로를 표시합니다.',
    ],
    example: 'mv -v 기록.txt 새이름.txt',
  },
  rm: {
    summary: '가상 파일을 삭제합니다.',
    usage: '[-frRv] 경로 ...',
    options: [
      '-r, -R, --recursive — 폴더와 하위 항목을 함께 삭제합니다.',
      '-f, --force — 이미 없는 항목의 오류를 무시합니다.',
      '-v, --verbose — 처리한 경로를 표시합니다.',
    ],
    note: '읽기 전용 증거 파일과 보호된 증거 위치는 삭제할 수 없습니다.',
    example: 'rm -v 임시.txt',
  },
  find: {
    summary: '폴더 안에서 조건에 맞는 항목을 찾습니다.',
    usage: '[경로 ...] [조건 ...]',
    options: [
      '-name 패턴 / -iname 패턴 — 이름을 비교합니다. -iname은 대소문자를 구분하지 않습니다.',
      '-type f|d — 파일(f) 또는 폴더(d)만 찾습니다.',
      '-maxdepth N / -mindepth N — 탐색할 최대 깊이 또는 출력할 최소 깊이를 지정합니다.',
      '-print — 찾은 경로를 출력합니다. 기본 동작과 같습니다.',
    ],
    example: "find ~/메모 -type f -iname '*.txt'",
  },
  tree: {
    summary: '폴더 구조를 트리로 표시합니다.',
    usage: '[-ad] [-L 깊이] [경로]',
    options: [
      '-a — 숨김 항목을 포함합니다.',
      '-d — 폴더만 표시합니다.',
      '-L N — 최대 깊이를 지정합니다.',
    ],
    example: 'tree -L 2 ~',
  },
  stat: {
    summary: '종류, 바이트 크기와 수정 시각을 확인합니다.',
    usage: '경로 ...',
    example: 'stat 기록.txt',
  },
  du: {
    summary: '파일과 폴더의 크기를 합산합니다.',
    usage: '[-shak] [경로 ...]',
    options: [
      '-s, --summarize — 지정한 경로의 합계만 표시합니다.',
      '-h, --human-readable — 크기를 읽기 쉬운 단위로 표시합니다.',
      '-a, --all — 개별 파일의 크기도 표시합니다.',
      '-k — 1024바이트 단위로 표시합니다. 기본값과 같습니다.',
    ],
    example: 'du -sh ~/메모',
  },
  file: {
    summary: '경로가 폴더, 빈 파일, UTF-8 텍스트 중 무엇인지 확인합니다.',
    usage: '경로 ...',
    example: 'file 기록.txt',
  },
  basename: {
    summary: '경로 끝의 이름을 추출합니다.',
    usage: '경로 [제거할 접미사]',
    example: 'basename ~/메모/기록.txt .txt',
  },
  dirname: {
    summary: '경로에서 마지막 이름을 빼고 상위 경로를 표시합니다.',
    usage: '경로',
    example: 'dirname ~/메모/기록.txt',
  },
  realpath: {
    summary: '상대 경로를 정리해 절대 경로로 표시합니다.',
    usage: '경로 ...',
    example: 'realpath ../analyst/메모',
  },
  cat: {
    summary: '파일 내용을 표시하거나 여러 파일을 이어 붙입니다.',
    usage: '[-nb] [파일 ...]',
    options: [
      '-n, --number — 모든 줄에 번호를 붙입니다.',
      '-b, --number-nonblank — 빈 줄을 제외하고 번호를 붙입니다.',
    ],
    note: '파일을 생략하거나 -를 지정하면 파이프나 리다이렉션의 입력을 읽습니다.',
    example: 'cat -n 기록.txt',
  },
  head: {
    summary: '입력의 앞부분을 표시합니다.',
    usage: '[-qv] [-n 줄수|-c 바이트수] [파일 ...]',
    options: lineSliceOptions,
    note: '-n -N을 쓰면 마지막 N줄을 제외합니다.',
    example: 'head -n 5 기록.txt',
  },
  tail: {
    summary: '입력의 뒷부분을 표시합니다.',
    usage: '[-qv] [-n 줄수|-c 바이트수] [파일 ...]',
    options: lineSliceOptions,
    note: '-n +N을 쓰면 N번째 줄부터 끝까지 표시합니다.',
    example: 'tail -n 5 기록.txt',
  },
  grep: {
    summary: '패턴과 일치하는 줄을 찾습니다.',
    usage: '[-invcFlqHE] 패턴 [파일 ...]\ngrep [옵션] -e 패턴 [파일 ...]',
    options: [
      '-i, --ignore-case — 대소문자를 구분하지 않습니다.',
      '-n, --line-number — 일치한 줄의 번호를 표시합니다.',
      '-v, --invert-match — 패턴과 일치하지 않는 줄을 표시합니다.',
      '-c, --count — 선택된 줄 수만 표시합니다.',
      '-F, --fixed-strings — 패턴을 정규식 대신 일반 문자열로 처리합니다.',
      '-l, --files-with-matches — 결과가 있는 파일 이름만 표시합니다.',
      '-q, --quiet — 출력 없이 종료 상태로 일치 여부를 알립니다.',
      '-H, --with-filename — 입력 파일이 하나여도 줄 앞에 파일 이름을 붙입니다.',
      '-E, --extended-regexp — 기본과 같은 가상 셸의 정규식 범위를 사용합니다.',
      '-e 패턴, --regexp=패턴 — 검색 패턴을 명시합니다. -로 시작하는 패턴에도 쓸 수 있습니다.',
    ],
    note: '파일을 생략하면 파이프에서 읽습니다. 검색어에 공백이나 기호가 있으면 따옴표로 감싸세요.',
    example: "grep -in 'error' 기록.txt",
  },
  wc: {
    summary: '줄, 단어, 문자 또는 바이트 수를 셉니다.',
    usage: '[-lwcm] [파일 ...]',
    options: [
      '-l, --lines — 줄바꿈 수.',
      '-w, --words — 공백으로 구분한 단어 수.',
      '-m, --chars — 문자 수.',
      '-c, --bytes — UTF-8 바이트 수.',
    ],
    example: 'cat 기록.txt | wc -l',
  },
  sort: {
    summary: '텍스트를 줄 단위로 정렬합니다.',
    usage: '[-nruif] [파일 ...]',
    options: [
      '-n, --numeric-sort — 줄 앞의 숫자를 기준으로 정렬합니다.',
      '-r, --reverse — 정렬 순서를 뒤집습니다.',
      '-u, --unique — 같은 정렬 키를 가진 줄은 하나만 표시합니다.',
      '-f, --ignore-case — 대소문자를 구분하지 않습니다.',
      '-i — 호환 옵션으로, 가상 셸의 정렬 방식은 그대로입니다.',
    ],
    example: 'sort -nr 점수.txt',
  },
  uniq: {
    summary: '연속해서 같은 줄을 합칩니다.',
    usage: '[-cdui] [입력파일 [출력파일]]',
    options: [
      '-c, --count — 각 줄 앞에 반복 횟수를 표시합니다.',
      '-d, --repeated — 반복된 줄만 표시합니다.',
      '-u, --unique — 반복되지 않은 줄만 표시합니다.',
      '-i, --ignore-case — 대소문자를 구분하지 않습니다.',
    ],
    example: 'sort 기록.txt | uniq -c',
  },
  cut: {
    summary: '각 줄에서 지정한 열, 문자 또는 바이트를 꺼냅니다.',
    usage: '[-s] [-d 구분자] -f 목록 [파일 ...]\ncut -c 목록 [파일 ...]\ncut -b 목록 [파일 ...]',
    options: [
      '-f 목록, --fields=목록 — 구분자로 나눈 열을 선택합니다.',
      '-d 문자, --delimiter=문자 — 기본 탭 대신 구분자 한 글자를 씁니다.',
      '-s, --only-delimited — 열을 선택할 때 구분자가 없는 줄을 건너뜁니다.',
      '-c 목록, --characters=목록 — 문자 위치를 선택합니다.',
      '-b 목록, --bytes=목록 — UTF-8 바이트 위치를 선택합니다.',
    ],
    note: '위치는 1부터 시작합니다. 1,3 또는 2-4처럼 쉼표와 범위를 사용할 수 있습니다.',
    example: "cut -d ',' -f 1,3 표.csv",
  },
  tr: {
    summary: '파이프로 들어온 문자를 바꾸거나 삭제합니다.',
    usage: '[-s] 문자집합1 [문자집합2]\ntr -d 문자집합',
    options: [
      '-d — 지정한 문자를 삭제합니다.',
      '-s — 지정한 문자가 연달아 반복되면 하나로 줄입니다.',
    ],
    example: "cat 기록.txt | tr 'a-z' 'A-Z'",
  },
  sed: {
    summary: '텍스트에서 문자열을 바꾸거나 특정 줄을 출력 또는 제거합니다.',
    usage: '[-nE] [-e] 표현식 [파일 ...]',
    options: [
      '-n — 기본 출력을 끄고 p로 선택한 결과만 표시합니다.',
      '-e 표현식 — 적용할 표현식 하나를 지정합니다.',
      '-E — 기본과 같은 가상 셸의 정규식 범위를 사용합니다.',
      'g / i / p — 치환식 끝에 붙여 전체 치환 / 대소문자 무시 / 바뀐 줄 출력을 지정합니다.',
    ],
    note: 's/이전/새값/, 3p, 2,5p, 3d 같은 표현식을 지원합니다.',
    example: "sed -n 's/error/warning/gp' 기록.txt",
  },
  awk: {
    summary: '줄을 열로 나누어 원하는 열과 줄 번호를 출력합니다.',
    usage: '[-F 구분자] 프로그램 [파일 ...]',
    options: ['-F 구분자 — 기본 공백 대신 열 구분자를 지정합니다.'],
    note: '{print ...} 형식을 지원합니다. $1은 첫 열, $0은 줄 전체, NR은 줄 번호, NF는 열 개수입니다.',
    example: "awk -F ',' '{print NR,$1}' 표.csv",
  },
  diff: {
    summary: '두 파일의 내용 차이를 표시합니다.',
    usage: '[-qu] 파일1 파일2',
    options: ['-q — 두 파일이 다른지만 표시합니다.', '-u — 통합 형식으로 비교 내용을 표시합니다.'],
    note: '내용이 같으면 종료 상태 0, 다르면 1입니다.',
    example: 'diff -u 이전.txt 최신.txt',
  },
  tee: {
    summary: '입력을 화면에 출력하면서 파일에도 씁니다.',
    usage: '[-a] [파일 ...]',
    options: ['-a, --append — 기존 내용을 유지하고 끝에 덧붙입니다.'],
    example: 'echo ready | tee -a 기록.txt',
  },
  echo: {
    summary: '입력한 텍스트를 출력합니다.',
    usage: '[-neE] [텍스트 ...]',
    options: [
      '-n — 끝의 줄바꿈을 생략합니다.',
      '-e — \\n과 \\t 같은 이스케이프를 해석합니다.',
      '-E — 이스케이프 해석을 끕니다. 기본값입니다.',
    ],
    example: "echo '준비 완료' > 기록.txt",
  },
  printf: {
    summary: '형식에 맞춰 텍스트와 숫자를 출력합니다.',
    usage: '형식 [값 ...]',
    options: ['%s — 문자열.', '%d — 정수.', '%b — 이스케이프를 해석한 문자열.', '%% — % 문자.'],
    note: '줄바꿈이 필요하면 형식에 \\n을 넣습니다.',
    example: "printf '%s: %d\\n' count 3",
  },
  history: {
    summary: '최근 실행한 명령을 표시합니다.',
    usage: '[개수|-c]',
    options: ['-c — 명령 기록을 지웁니다.'],
    example: 'history 10',
  },
  clear: {
    summary: '터미널의 표시 내용을 지웁니다.',
    note: '↑ 키로 이전 명령을 다시 불러올 수 있습니다.',
    example: 'clear',
  },
  whoami: { summary: '현재 가상 세션의 사용자 이름을 표시합니다.', example: 'whoami' },
  hostname: {
    summary: '현재 가상 장치의 호스트 이름이나 IP를 표시합니다.',
    usage: '[-iIsf]',
    options: [
      '-i, -I — 가상 IP 주소를 표시합니다.',
      '-s — 짧은 호스트 이름을 표시합니다. 기본값과 같습니다.',
      '-f — 조사 서버에 접속한 경우 전체 도메인을 표시합니다.',
    ],
    example: 'hostname -I',
  },
  id: {
    summary: '가상 사용자의 ID와 그룹을 표시합니다.',
    usage: '[-ugGn] [사용자]',
    options: [
      '-u / -g / -G — 사용자 ID / 기본 그룹 ID / 그룹 ID를 요청합니다.',
      '-n — 숫자 대신 이름을 표시합니다.',
    ],
    note: '기본 사용자 analyst의 숫자 ID는 1000, 가상 관리자 root는 0입니다.',
    example: 'id -un',
  },
  uname: {
    summary: '가상 시스템 정보를 표시합니다.',
    usage: '[-asnrvmpio]',
    options: [
      '-a — 가상 시스템 정보를 한 번에 표시합니다.',
      '-s / -n / -r / -v — 커널 이름 / 호스트 / 릴리스 / 버전을 각각 표시합니다.',
      '-m / -o — 가상 장치 유형 / 운영체제를 표시합니다.',
      '-p, -i — 가상 CPU 및 플랫폼 정보는 unknown으로 표시합니다.',
    ],
    example: 'uname -a',
  },
  date: {
    summary: '현재 날짜와 시각을 표시합니다.',
    usage: '[-u] [+형식]',
    options: [
      '-u, --utc — UTC 시각으로 표시합니다.',
      '+형식 — %F는 날짜, %T는 시각, %s는 Unix 초입니다. %Y, %m, %d, %H, %M, %S로 조합할 수도 있습니다.',
    ],
    example: "date -u '+%F %T'",
  },
  env: { summary: '현재 셸 환경 변수를 이름=값 형식으로 표시합니다.', example: 'env | grep HOME' },
  printenv: {
    summary: '지정한 환경 변수의 값을 표시합니다.',
    usage: '[변수 ...]',
    note: '이름을 생략하면 모든 환경 변수를 표시합니다.',
    example: 'printenv HOME USER',
  },
  export: {
    summary: '환경 변수를 설정하거나 설정한 변수 목록을 표시합니다.',
    usage: '[-p] [이름[=값] ...]',
    options: ['-p — 셸에서 설정한 변수와 값을 출력합니다.'],
    example: 'export LAB="$HOME/메모"',
  },
  unset: {
    summary: '셸에 저장한 환경 변수를 제거합니다.',
    usage: '이름 ...',
    example: 'unset LAB',
  },
  seq: {
    summary: '지정한 범위의 정수를 한 줄에 하나씩 출력합니다.',
    usage: '[시작 [간격]] 끝',
    note: '시작과 간격의 기본값은 1입니다. 간격에 음수를 쓰면 내림차순으로 출력합니다.',
    example: 'seq 2 2 10',
  },
  test: {
    summary: '조건을 확인해 참이면 종료 상태 0, 거짓이면 1을 반환합니다.',
    usage: '조건',
    options: testOperators,
    example: 'test -d ~/메모 && echo found',
  },
  '[': {
    summary: 'test와 같은 조건 검사를 대괄호 형식으로 실행합니다.',
    usage: '조건 ]',
    options: testOperators,
    note: '대괄호와 조건 사이에 공백을 넣습니다.',
    example: '[ -f 기록.txt ] && cat 기록.txt',
  },
  true: { summary: '출력 없이 종료 상태 0을 반환합니다.', example: 'true && echo success' },
  false: { summary: '출력 없이 종료 상태 1을 반환합니다.', example: 'false || echo fallback' },
  ':': { summary: '아무 작업 없이 종료 상태 0을 반환합니다.', example: ': > 기록.txt' },
  which: {
    summary: '셸에서 찾을 수 있는 명령이나 가상 경로를 확인합니다.',
    usage: '명령어 ...',
    example: 'which ls grep',
  },
  type: {
    summary: '명령이 셸 내장 명령인지 가상 실행 경로인지 확인합니다.',
    usage: '명령어 ...',
    example: 'type cd ls',
  },
  command: {
    summary: '이름으로 명령을 찾습니다.',
    usage: '-v 명령어 ...',
    options: ['-v — 찾은 내장 명령의 이름이나 가상 경로를 출력합니다.'],
    example: 'command -v grep',
  },
  help: {
    summary: '기본 명령 목록이나 지정한 명령의 매뉴얼을 표시합니다.',
    usage: '[명령어|조사|문법]',
    note: 'help를 입력하고 한 칸 띄운 뒤 Tab을 누르면 명령과 도움말 주제를 찾아볼 수 있습니다.',
    example: 'help grep',
  },
  man: {
    summary: '명령의 용도, 사용법, 옵션, 예시를 표시합니다.',
    usage: '명령어',
    note: 'help 명령어와 같은 매뉴얼을 표시합니다.',
    example: 'man ls',
  },
  exit: {
    summary: '현재 셸에서 나옵니다.',
    note: '조사 서버에서는 연결을 끝냅니다. 로컬 root 셸에서는 analyst로 돌아가고, analyst 셸에서 실행하면 터미널을 닫습니다.',
    example: 'exit',
  },
  sudo: {
    summary: '로컬 가상 셸을 관리자 권한으로 전환합니다.',
    usage: 'su root',
    note: '전환하면 프롬프트가 #으로 바뀝니다. exit로 기본 사용자 analyst에게 돌아갑니다.',
    example: 'sudo su root',
  },
  ip: {
    summary: '가상 네트워크 인터페이스와 IPv4 주소를 조회하거나 설정합니다.',
    usage:
      '[-br] addr [show] [dev lo|eth0]\nip [-br] link [show] [dev lo|eth0]\nip addr add|del|replace 주소/접두사 dev eth0\nip addr flush dev eth0\nip link set eth0 up|down\nip route [show]',
    options: [
      '-br, -brief — 인터페이스와 주소를 한 줄씩 요약합니다.',
      'add / del / replace / flush — 주소 추가 / 삭제 / 등록 또는 수정 / 전체 비우기.',
      'dev 인터페이스 — 조회하거나 설정할 인터페이스를 지정합니다.',
      'up / down — 로컬 eth0 링크를 켜거나 끕니다.',
    ],
    note: 'addr는 a 또는 address, link는 l, route는 r로 줄일 수 있습니다. 설정을 변경하려면 로컬에서 sudo su root로 전환하세요.',
    example: 'ip addr add 192.168.50.10/24 dev eth0',
  },
  ifconfig: {
    summary: '가상 인터페이스의 상태와 주소를 표시합니다.',
    usage: '[-a] [lo|eth0]',
    options: ['-a — 모든 인터페이스를 표시합니다. 기본값과 같습니다.'],
    example: 'ifconfig eth0',
  },
  ss: {
    summary: '접속을 기다리는 가상 소켓과 포트를 표시합니다.',
    usage: '[-tulnap46]',
    options: socketOptions,
    example: 'ss -tlnp',
  },
  netstat: {
    summary: '가상 소켓과 포트를 표시합니다. 이 셸에서는 ss와 같은 결과를 표시합니다.',
    usage: '[-tulnap46]',
    options: socketOptions,
    example: 'netstat -tln',
  },
  ping: {
    summary: '가상 호스트의 도달 여부를 확인합니다.',
    usage: '[-nq4] [-c 횟수] [-W 초] 호스트',
    options: [
      '-c N — 요청 횟수를 1~20으로 지정합니다. 기본값은 4입니다.',
      '-q — 개별 응답 대신 요약을 표시합니다.',
      '-n, -4 — 가상 응답은 항상 숫자 IPv4 주소를 표시합니다.',
      '-W 초 — 호환 인자입니다. 가상 응답은 즉시 계산됩니다.',
    ],
    example: 'ping -c 2 localhost',
  },
  curl: {
    summary: '가상 HTTP 주소로 요청을 보내고 응답을 표시하거나 저장합니다.',
    usage: '[-siIfSL] [-o 파일] URL',
    options: [
      '-i, --include — 본문 앞에 응답 헤더를 함께 표시합니다.',
      '-I, --head — 헤더만 표시합니다.',
      '-f, --fail — HTTP 404를 오류로 처리합니다.',
      '-s, --silent — 요청 실패 메시지를 숨깁니다.',
      '-S, --show-error — -s로 숨긴 오류 메시지를 다시 표시합니다.',
      '-o 파일, --output=파일 — 응답을 지정한 파일에 저장합니다. -를 주면 화면에 표시합니다.',
      '-L, --location — 호환 옵션입니다. 가상 HTTP 서비스는 리다이렉트를 반환하지 않습니다.',
    ],
    example: 'curl -i http://localhost:8080/',
  },
  wget: {
    summary: '가상 HTTP 응답을 파일로 저장합니다.',
    usage: '[-q] [-O 파일] URL',
    options: [
      '-O 파일, --output-document=파일 — 저장 이름을 지정합니다. -를 주면 화면에 표시합니다.',
      '-q, --quiet — 호환 옵션입니다. 가상 다운로드는 진행률을 표시하지 않습니다.',
    ],
    example: 'wget -O 상태.txt http://localhost:8080/',
  },
  nc: {
    summary: '가상 호스트의 TCP 포트가 열렸는지 확인합니다.',
    usage: '[-zvn4] [-w 초] 호스트 포트',
    options: [
      '-z, -v — 포트 확인 모드와 결과 메시지입니다. 가상 nc는 항상 이 방식으로 동작합니다.',
      '-n, -4, -w 초 — 호환 옵션입니다. 가상 IPv4 포트의 상태는 즉시 계산됩니다.',
    ],
    example: 'nc -zv localhost 8080',
  },
  nmap: {
    summary: '한 가상 호스트의 TCP 포트를 검사합니다.',
    usage: '[-n] [-Pn] [-sT] [-sV] [-p 포트목록] 호스트',
    options: [
      '-p 포트목록 — 포트 번호 또는 범위를 쉼표로 구분합니다. 최대 256개를 검사합니다.',
      '-n, -Pn, -sT, -sV — 호환 옵션입니다. 가상 스캔은 포트 상태와 알려진 서비스 이름을 즉시 표시합니다.',
    ],
    example: 'nmap -p 22,80,8080-8082 localhost',
  },
  dig: {
    summary: '가상 DNS에 등록된 주소를 조회합니다.',
    usage: '[-4] [+short] 호스트',
    options: lookupOptions,
    example: 'dig +short haeon.test',
  },
  host: {
    summary: '가상 호스트의 등록 주소를 조회합니다.',
    usage: '[-4] [+short] 호스트',
    options: lookupOptions,
    example: 'host haeon.test',
  },
  nslookup: {
    summary: '가상 DNS에서 호스트를 찾습니다.',
    usage: '[-4] [+short] 호스트',
    options: lookupOptions,
    example: 'nslookup localhost',
  },
  getent: {
    summary: '가상 호스트 목록에서 주소를 조회합니다.',
    usage: '[-4] [+short] hosts 호스트',
    options: lookupOptions,
    example: 'getent hosts localhost',
  },
  ssh: {
    summary: '계정과 인계 키로 가상 조사 서버에 접속합니다.',
    usage: '[-p 22] 계정@호스트 인증키',
    options: ['-p 포트 — 가상 SSH는 22번 포트를 사용합니다.'],
    note: '메일에서 조사 의뢰를 수락한 뒤 접속할 수 있습니다. 인증키는 마지막 인자로 입력합니다.',
    example: 'ssh -p 22 계정@haeon.test 인증키',
  },
  serve: {
    summary: '가상 IP와 포트에 HTTP 서비스를 엽니다.',
    usage: '[-b IP] [-d 경로] [포트] [경로]',
    options: serveOptions,
    note: '기본 포트는 8000, 기본 경로는 현재 폴더입니다. 1024 미만의 포트는 root 권한이 필요합니다. stop 포트로 서비스를 종료합니다.',
    example: 'serve --bind 127.0.0.1 8080 .',
  },
  python3: {
    summary: '가상 HTTP 서비스를 실행합니다.',
    usage: '-m http.server [포트] [--bind IP] [--directory 경로]',
    options: ['-m http.server — 가상 HTTP 서비스를 선택합니다.', ...serveOptions],
    note: '이 명령은 http.server 실행을 지원하며 서비스는 가상 백그라운드에서 동작합니다.',
    example: 'python3 -m http.server 8080 --bind 127.0.0.1 --directory .',
  },
  stop: {
    summary: '지정한 포트의 가상 HTTP 서비스를 종료합니다.',
    usage: '포트',
    example: 'stop 8080',
  },
  ps: {
    summary: '가상 셸과 서비스의 PID를 표시합니다.',
    usage: '[aux|-auefx]',
    options: [
      'aux, -a, -u, -e, -f, -x — 호환 옵션입니다. 가상 프로세스 목록과 표시 형식은 같습니다.',
    ],
    example: 'ps aux',
  },
  kill: {
    summary: '가상 HTTP 서비스를 PID로 종료합니다.',
    usage: '[-9|-15|-TERM|-KILL] PID',
    options: ['-9, -15, -TERM, -KILL — 이 셸에서는 모두 지정한 서비스를 종료합니다.'],
    note: 'PID는 ps 또는 ss -tlnp로 확인할 수 있습니다.',
    example: 'kill 9080',
  },
  resolve: {
    summary: '조사 대상 도메인의 가상 IP를 확인합니다.',
    usage: '도메인',
    note: '메일에서 의뢰를 수락한 뒤 실행합니다. 확인한 주소로 scan을 실행할 수 있습니다.',
    example: 'resolve haeon.test',
  },
  scan: {
    summary: '주소를 확인한 조사 서버의 서비스를 확인합니다.',
    usage: 'IP 또는 도메인',
    note: '먼저 resolve로 조사 대상 주소를 확인합니다.',
    example: 'scan haeon.test',
  },
  connect: {
    summary: '계정과 인증키로 가상 조사 서버에 접속합니다.',
    usage: '호스트 계정 인증키',
    note: 'resolve와 scan으로 확인한 서버에 읽기 전용으로 접속합니다.',
    example: 'connect haeon.test 계정 인증키',
  },
  read: {
    summary: '연결된 조사 서버의 문서를 읽고 열람을 기록합니다.',
    usage: '파일 경로',
    note: 'ls -R로 조사 서버의 파일 경로를 확인할 수 있습니다.',
    example: 'read /경로/문서.txt',
  },
  collect: {
    summary: '조사 서버에서 확보한 증거를 폴더 앱에 사본으로 저장합니다.',
    usage: '파일 경로',
    note: '수집 대상 증거를 지정합니다. 참고 문서는 read로 열람합니다.',
    example: 'collect /경로/증거.log',
  },
  compare: {
    summary: '공개 보고서와 수집한 원본 증거를 대조합니다.',
    note: '공개 보고서를 읽고 원본 증거 3개를 확보하면 결과를 폴더 앱에서도 열 수 있습니다.',
    example: 'compare',
  },
  disconnect: {
    summary: '조사 서버 연결을 끝내고 로컬 셸로 돌아갑니다.',
    note: '확보한 증거와 열람 기록은 보존됩니다.',
    example: 'disconnect',
  },
};

const common = ['pwd', 'ls', 'cd', 'mkdir', 'touch', 'cp', 'mv', 'rm', 'cat', 'grep', 'clear'];
export const investigationCommands = [
  'resolve',
  'scan',
  'connect',
  'read',
  'collect',
  'compare',
  'disconnect',
];

export function commandUsage(name: string) {
  const usage = manuals[name].usage;
  return usage ? name + ' ' + usage : name;
}

export const helpOverview = [
  ...common.map((name) => name + ' - ' + manuals[name].summary),
  '',
  '자세한 사용법은 man <명령어> 또는 help <명령어>로 확인하세요.',
  '조사 명령은 help 조사, 파이프와 변수는 help 문법을 입력하세요.',
].join('\n');

export const helpTopics = {
  조사: [
    ...investigationCommands.map((name) => name + ' - ' + manuals[name].summary),
    '',
    '메일에서 의뢰를 수락한 뒤 resolve → scan → connect로 접속하세요.',
    'ls -R로 경로를 찾고 read 또는 cat으로 열람한 뒤 collect와 compare를 실행하세요.',
  ].join('\n'),
  문법: [
    '| - 왼쪽 명령의 출력을 오른쪽 명령으로 전달합니다.',
    '< / > / >> - 파일에서 읽기 / 파일에 쓰기 / 파일 끝에 덧붙이기.',
    '2> / 2>> / 2>&1 - 오류를 파일에 쓰기 / 덧붙이기 / 일반 출력에 합치기.',
    '&& / || / ; - 성공할 때 / 실패할 때 / 상태와 무관하게 다음 명령을 실행합니다.',
    '작은따옴표는 내용을 그대로 전달하고, 큰따옴표 안에서는 $변수를 사용할 수 있습니다.',
    '~는 홈 폴더, $?는 직전 명령의 종료 상태입니다. *와 ?로 파일 이름을 맞출 수 있습니다.',
    '예시  grep -n error 기록.txt | head -n 5 > 결과.txt',
  ].join('\n'),
};

export function renderManual(name: string) {
  const { summary, options, note, example } = manuals[name];
  return [
    name + ' - ' + summary,
    '',
    '사용법',
    ...commandUsage(name)
      .split('\n')
      .map((syntax) => '  ' + syntax),
    ...(options?.length ? ['', '옵션', ...options.map((option) => '  ' + option)] : []),
    ...(note ? ['', note] : []),
    '',
    '예시',
    '  ' + example,
  ].join('\n');
}
