export type EvidenceId = 'revision' | 'raw' | 'approval';
export interface VirtualFile {
  path: string;
  title: string;
  content: string;
  evidence?: EvidenceId;
  discovers?: string;
}
export interface Server {
  ip: string;
  domain: string;
  name: string;
  service: string;
  user: string;
  password: string;
  files: VirtualFile[];
}
export const servers: Server[] = [
  {
    ip: '10.17.0.11',
    domain: 'haeon.test',
    name: '해온 관측소 · 감사 노드',
    service: '22/tcp  audit-shell  [외부 감사 계정 필요]',
    user: 'auditor',
    password: 'MORA-1017',
    files: [
      {
        path: '/audit/transfer.txt',
        title: '인계 메모',
        discovers: 'vault.archive.test',
        content: `해온 관측소 / 감사 인계 메모\n작성: 윤서진 · 10월 18일 08:40\n\n공개 보고서는 이미 덮어씌워졌습니다. 하지만 매일 23:30에 독립 기록원으로 전송하는 원본까지 바꿀 수는 없습니다.\n\n원본 보관 호스트: vault.archive.test\n보관 담당 계정: custodian\n일회 보관 키: ECHO-2314\n\n이 서버의 revision.log는 '누가 값을 바꿨는가'를 보여 줍니다. 이유와 원래 값은 백업에 남아 있습니다. 두 기록을 함께 확보해 주세요. 단순히 열람하는 것과 증거로 보관하는 것은 다릅니다. collect 명령으로 사본을 남기세요.\n\n접속 방법이 기억나지 않으면 help connect를 확인하세요. 현재 서버에서 disconnect 후 백업 서버를 조사할 수 있습니다.`,
      },
      {
        path: '/audit/revision.log',
        title: '보고서 수정 이력',
        evidence: 'revision',
        content: `HAEON / append-only audit trail\n날짜: 2031-10-17 (관측소 시각)\n\n23:12:04   sensor-04    heartbeat=OK   power=STABLE\n23:14:00   sensor-04    raw interval begins\n23:25:00   sensor-04    raw interval ends\n23:26:18   operator.jm  report.write /public/summary.csv\n23:26:18   operator.jm  interval=[23:14,23:25) → status=CALIBRATION\n23:26:18   operator.jm  value=WITHHELD\n23:27:02   director.hk  report.approve ref=CHANGE-1017\n23:30:00   archive     original uploaded → ACK\n\n주의: operator.jm은 수정 실행 계정입니다. 실행자와 지시자가 같은 사람이라는 뜻은 아닙니다. 승인 메시지와 대조해야 합니다.\n센서 하트비트는 삭제 구간 전후에도 정상입니다.`,
      },
      {
        path: '/audit/accounts.txt',
        title: '담당자 목록',
        content: `관측소 담당자\n\noperator.jm — 정민우 / 야간 관측 담당\ndirector.hk — 한기석 / 관측소 소장\nresearch.sy — 윤서진 / 전 수질 연구원\n\n실행 계정만 보고 책임자를 단정하지 마세요. 조사 결과에는 기록을 변경하도록 지시한 사람을 적어야 합니다.`,
      },
    ],
  },
  {
    ip: '10.17.0.28',
    domain: 'vault.archive.test',
    name: '독립 해양기록원 · 원본 보관 노드',
    service: '22/tcp  archive-shell  [보관 키 인증]',
    user: 'custodian',
    password: 'ECHO-2314',
    files: [
      {
        path: '/original/sensor.csv',
        title: '삭제 전 센서 원본',
        evidence: 'raw',
        content: `독립 해양기록원 / 수신 원본\n수신 시각 2031-10-17 23:30:00 / SOURCE sensor-04\n변조 확인: 수신 당시 봉인과 일치\n\ntime,solvent_mg_l,power,sensor\n23:10,0.2,STABLE,OK\n23:14,7.8,STABLE,OK\n23:18,8.4,STABLE,OK\n23:22,8.1,STABLE,OK\n23:25,0.3,STABLE,OK\n23:30,0.2,STABLE,OK\n\n기준치: 0.5 mg/L\n검출 물질: 공업용 용제\n초과 구간: [23:14, 23:25), 11분\n\n보정 기록이 아니라 실제 측정치입니다. 동일 시간대 센서 진단과 전원 기록은 정상입니다.`,
      },
      {
        path: '/original/approval.eml',
        title: '변경 승인 메시지',
        evidence: 'approval',
        content: `From: 한기석 <director.hk@haeon.test>\nTo: 정민우 <operator.jm@haeon.test>\nDate: 2031-10-17 23:25:42\nSubject: CHANGE-1017 / 오늘 보고서 처리\n\n정 연구원,\n\n23:14부터 23:25 전까지 용제 수치가 기준을 넘은 구간은 오늘 공개본에서 제외하세요. 내일 항만 증설 심사를 앞두고 배출 문제가 드러나면 안 됩니다. '정기 보정'으로 표시하고, 원본은 내부에만 남기세요. 최종 승인은 제가 합니다.\n\n한기석 / 관측소장\n\n--- 답신 23:26:31 / 정민우 ---\n지시한 대로 공개 보고서를 변경했습니다. 센서 결함은 발견되지 않았습니다. 자동 원본 보관은 중단할 권한이 없어 그대로 전송됩니다.`,
      },
      {
        path: '/original/manifest.txt',
        title: '원본 보관 목록',
        content: `보관 묶음 ECHO-2314\n\nsensor.csv — 시간대별 센서 원본\napproval.eml — 변경 지시와 실행 답신\n\n수신 후 파일 수정은 허용되지 않습니다. 공개본의 값, 수정 이력, 원본, 지시 메시지를 함께 검토해야 합니다.\n세 증거를 collect로 보관한 뒤 compare를 실행하면 조사용 대조표가 만들어집니다. 최종 판단은 조사자의 몫입니다.`,
      },
    ],
  },
];
export const evidenceInfo: Record<EvidenceId, { title: string; source: string; summary: string }> =
  {
    revision: {
      title: '보고서 수정 이력',
      source: '해온 감사 노드',
      summary: '정상 센서 기록을 보정 구간으로 바꾼 실행·승인 이력.',
    },
    raw: {
      title: '삭제 전 센서 원본',
      source: '독립 해양기록원',
      summary: '23:14~23:25 공업용 용제의 기준치 초과.',
    },
    approval: {
      title: '변경 승인 메시지',
      source: '독립 해양기록원',
      summary: '소장의 삭제 지시와 야간 담당자의 실행 답신.',
    },
  };
export interface SitePage {
  path: string;
  label: string;
  title: string;
  intro: string;
  paragraphs: string[];
  table?: string[][];
}
export interface Site {
  host: string;
  brand: string;
  subtitle: string;
  theme: string;
  pages: SitePage[];
}
export const sites: Site[] = [
  {
    host: 'haeon.test',
    brand: '해온 해양관측소',
    subtitle: '바다를 관측하고, 내일을 기록합니다.',
    theme: 'ocean',
    pages: [
      {
        path: '/',
        label: '관측소 소개',
        title: '기록이 만드는 안전한 바다',
        intro: '모라 연안의 수질과 조류를 24시간 관측합니다.',
        paragraphs: [
          '해온 해양관측소는 모라 항만과 인접한 수질 관측 기관입니다. 관측 결과는 매일 공개 보고서로 발행하며, 원본은 독립 해양기록원에 자동 보관합니다.',
          '10월 18일 항만 증설 심사에 앞서 10월 17일의 관측 보고서를 공개합니다. 해당 보고서에는 야간 정기 보정 구간이 포함되어 있습니다.',
          '운영 투명성을 위해 공지의 외부 감사 접속 안내를 유지하고 있습니다. 공개 보고서와 운영 공지를 함께 확인해 주세요.',
        ],
      },
      {
        path: '/report',
        label: '공개 보고서',
        title: '10월 17일 수질 보고서',
        intro: '공개본 · 최종 승인 한기석 소장 · 2031.10.17 23:27',
        paragraphs: [
          '당일 수질은 정상 범위로 보고되었습니다. 23:14부터 23:25까지는 정기 보정으로 인해 측정값을 제공하지 않습니다.',
          '장비 점검에 따른 누락이며 별도의 위해 상황은 없었다는 것이 관측소의 공식 설명입니다.',
        ],
        table: [
          ['구간', '용제 농도', '공개 상태'],
          ['23:00–23:14', '0.2 mg/L', '정상'],
          ['23:14–23:25', '—', '정기 보정'],
          ['23:25–24:00', '0.3 mg/L', '정상'],
        ],
      },
      {
        path: '/notice',
        label: '운영 공지',
        title: '외부 감사 계정 안내',
        intro: '운영지원팀 · 10월 16일',
        paragraphs: [
          '기관 명칭은 해온으로 바뀌었지만 관측소의 기존 영문 코드는 MORA를 그대로 사용합니다. 코드 입력은 대문자입니다.',
          '외부 감사 담당자는 auditor 계정을 사용합니다. 야간 인계 인증키의 형식은 시민 조석 아카이브(tide.test)의 「교대 기록」에 보관되어 있습니다.',
          '감사 노드는 haeon.test 도메인으로 찾을 수 있습니다. 터미널에서 resolve로 주소를 찾고 scan으로 서비스를 확인한 다음 connect로 접속하세요.',
          '담당자: 정민우(야간 관측), 한기석(최종 승인), 윤서진(전 수질 연구원). 최종 승인과 실제 수정은 별도의 권한입니다.',
        ],
      },
    ],
  },
  {
    host: 'tide.test',
    brand: '물때 기록실',
    subtitle: '모라 사람들의 관측 노트',
    theme: 'paper',
    pages: [
      {
        path: '/',
        label: '현장 노트',
        title: '그날 밤, 바다는 조용하지 않았다',
        intro: '10월 17일 · 모라 부두 / 시민 관측자 은오',
        paragraphs: [
          '밤 11시가 조금 넘자 바다 쪽에서 낯선 냄새가 났다. 정전은 없었다. 관측탑의 녹색 상태등은 계속 켜져 있었다. 배출구 주변 물빛이 달라 보였지만, 사진만으로 원인을 단정하고 싶지는 않다.',
          '다음 날 공개 보고서에는 그 시간이 ‘정기 보정’이라고 적혀 있었다. 하지만 이번 달 예정된 보정일은 10월 12일이었다. 변경 공지는 없었다.',
          '우리는 증거 없이 누군가를 지목하지 않는다. 직접 본 것, 기록으로 확인한 것, 아직 모르는 것을 구분한다. 관측소 교대 기록도 이곳에 남겨 두었다.',
        ],
      },
      {
        path: '/handover',
        label: '교대 기록',
        title: '야간 인계 키 규칙',
        intro: '관측 자원봉사자 인수인계 · 10월 1일',
        paragraphs: [
          '인계 키는 「기존 관측소 코드-관측 날짜」로 구성한다. 날짜는 월 두 자리와 일 두 자리(MMDD)를 붙인다. 기호는 하이픈 하나만 사용한다.',
          '예: 기존 코드가 WAVE이고 관측일이 2월 3일이면 WAVE-0203이다. 기관의 새 이름이 아니라 기존 영문 코드를 쓰는 점에 주의한다.',
          '이번 조사 대상 날짜는 10월 17일이다. 관측소 코드는 해온 운영 공지에서 확인할 수 있다.',
          '접속 계정은 기관 공지에 명시되어 있다. 서로 다른 두 기록을 읽어야 인계 키를 재구성할 수 있다.',
        ],
      },
    ],
  },
  {
    host: 'archive.test',
    brand: '독립 해양기록원',
    subtitle: '기록은 설명보다 오래 남습니다.',
    theme: 'archive',
    pages: [
      {
        path: '/',
        label: '보관 원칙',
        title: '원본의 맥락까지 보관합니다',
        intro: '독립 검증 · 원본 봉인 · 변경 이력',
        paragraphs: [
          '기관이 작성한 공개 보고서와 센서에서 전송한 원본은 서로 다른 기록입니다. 공개본이 바뀌어도 수신한 원본을 덮어쓰지 않습니다.',
          '개별 보관 서버 주소와 인증키는 해당 기관의 감사 인계 메모로 전달됩니다. 보안상 공개 웹에는 개별 보관 주소를 싣지 않습니다.',
          '조사 결과를 제출할 때에는 누가 실행했는지뿐 아니라 누가 지시했는지, 어떤 자료로 그 판단을 했는지를 함께 적어야 합니다.',
        ],
      },
      {
        path: '/guide',
        label: '증거 검증 안내',
        title: '세 기록을 연결하는 방법',
        intro: '조사자를 위한 짧은 안내',
        paragraphs: [
          '1. 수정 이력: 어느 계정이 공개본을 언제 바꿨는지 확인합니다. 실행 계정만으로 지시자를 단정하지 않습니다.',
          '2. 센서 원본: 삭제 구간의 실제 값과 센서 상태를 확인합니다. 시간 구간은 시작 시각을 포함하고 끝 시각은 제외합니다.',
          '3. 승인 메시지: 변경 목적과 책임자를 확인합니다. 세 파일을 collect로 보관하고 compare로 공개본과 대조하세요.',
          '메일 앱의 「조사 결과 제출」에서 지시자, 은폐 사유, 누락 시간대를 선택합니다. 근거가 부족하거나 서로 맞지 않으면 보완할 수 있습니다.',
          '독립 검증 제출은 원본 검증과 관계자 소명을 먼저 진행합니다. 시민 공개는 자료를 즉시 공개합니다. 어느 경로를 택하든 제보자의 개인정보는 제외됩니다.',
        ],
      },
    ],
  },
];
export const objectives = [
  { id: 'accept', label: '의뢰 확인', detail: '윤서진이 남긴 메일을 읽으세요.' },
  {
    id: 'research',
    label: '공개 자료 조사',
    detail: '공개 보고서와 두 곳의 인계 단서를 연결하세요.',
  },
  {
    id: 'evidence',
    label: '원본 기록 확보',
    detail: '수정 이력, 센서 원본, 승인 메시지를 보관하세요.',
  },
  { id: 'compare', label: '증거 대조', detail: '세 기록을 공개 보고서와 대조하세요.' },
  {
    id: 'submit',
    label: '조사 결과 제출',
    detail: '사실과 책임자를 판단하고 전달 경로를 선택하세요.',
  },
] as const;
export const hints: Record<string, string[]> = {
  accept: [
    '새 메일에 조사 배경과 출발점이 있습니다.',
    '메일 앱에서 윤서진의 의뢰를 여세요.',
    '메일 아래의 「조사 시작」을 누르세요.',
  ],
  research: [
    '해온의 공식 설명과 시민 기록이 같은 이야기를 하는지 살펴보세요.',
    'haeon.test의 운영 공지와 tide.test의 교대 기록을 함께 읽으세요.',
    '공개 보고서도 확인하세요. 기존 코드 MORA와 사건 날짜 1017을 합치면 MORA-1017입니다. 계정은 auditor입니다.',
  ],
  evidence: [
    '공개 사이트의 주소를 터미널에서 조사해 보세요. 접속 후에는 인계 메모부터 읽으세요.',
    'resolve haeon.test → scan 10.17.0.11 → connect 10.17.0.11 auditor MORA-1017. ls로 목록, read로 내용, collect로 증거를 보관합니다.',
    '첫 서버: collect /audit/revision.log. read /audit/transfer.txt에서 백업 주소를 찾으세요. resolve vault.archive.test → scan 10.17.0.28 → connect 10.17.0.28 custodian ECHO-2314. collect /original/sensor.csv 와 collect /original/approval.eml.',
  ],
  compare: [
    '공개 보고서와 확보한 세 기록의 시간대, 계정, 승인 내용을 비교해 보세요.',
    '터미널에 compare를 입력하면 대조표가 생성됩니다.',
    '수정 실행자는 정민우지만 지시자는 한기석입니다. 정상 센서에서 나온 기준치 초과 수치를 보정으로 위장했습니다.',
  ],
  submit: [
    '실행 계정과 지시자를 구분하고, 공개본의 설명을 원본과 비교하세요.',
    '메일 앱에서 「조사 결과 제출」을 여세요. 세 증거와 대조표가 필요합니다.',
    '지시자는 한기석, 사유는 항만 심사 전 오염 은폐, 구간은 23:14–23:25입니다. 전달 경로는 원하는 쪽을 고르세요.',
  ],
};

export const comparison = `기록 대조 완료\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n공개본   23:14–23:25 / 정기 보정 / 측정값 비공개\n원본     같은 11분 / 용제 7.8~8.4 mg/L / 기준 0.5\n진단     센서 정상 · 전원 안정\n수정     정민우 계정으로 공개본 변경\n지시     한기석 소장의 승인 메시지\n목적     다음 날 항만 증설 심사를 앞두고 배출 문제 은폐\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n대조표가 폴더에 저장되었습니다.\n메일에서 조사 결과를 제출하세요. 전달 경로는 직접 선택합니다.`;
