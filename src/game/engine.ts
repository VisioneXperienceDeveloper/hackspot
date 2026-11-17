import { servers, sites, evidenceInfo, objectives, comparison, type EvidenceId } from './world';
import { placeEvidence } from './desktopFiles';
import { pathSuggestions, runShell, shellCommands, shellPrompt } from './shell';
import { line, type CommandResult } from './shell/command';
import type { ShellFS } from './shell/filesystem';
import { commandUsage, helpTopics, investigationCommands } from './shell/manual';
import { initialShell, type ShellState } from './shell/state';
export { comparison } from './world';
import { DEFAULT_FOLDERS, type NoteFile, type FileLocations } from './noteFiles';
export const MAX_COMMAND_LENGTH = 512;
export type Ending = 'review' | 'public';
export interface GameState {
  version: 1;
  accepted: boolean;
  visited: string[];
  resolved: string[];
  scanned: string[];
  session: string | null;
  readFiles: string[];
  evidence: EvidenceId[];
  compared: boolean;
  hints: Record<string, number>;
  ending: Ending | null;
  attempts: number;
  log: string[];
  notes: string;
  noteFiles: NoteFile[];
  folders: string[];
  fileLocations: FileLocations;
  shell: ShellState;
  terminal: { input: string; output: string; prompt?: string }[];
  history: string[];
}
export const initialState = (): GameState => ({
  version: 1,
  accepted: false,
  visited: [],
  resolved: [],
  scanned: [],
  session: null,
  readFiles: [],
  evidence: [],
  compared: false,
  hints: {},
  ending: null,
  attempts: 0,
  log: [],
  notes: '',
  noteFiles: [],
  folders: [...DEFAULT_FOLDERS],
  fileLocations: {},
  shell: initialShell(),
  terminal: [],
  history: [],
});
const unique = <T>(a: T[], v: T) => (a.includes(v) ? a : [...a, v]);
function event(s: GameState, line: string): GameState {
  return { ...s, log: unique(s.log, line) };
}
export function completed(s: GameState): boolean[] {
  return [
    s.accepted,
    s.compared ||
      ['haeon.test/report', 'haeon.test/notice', 'tide.test/handover'].every((x) =>
        s.visited.includes(x),
      ),
    s.evidence.length === 3,
    s.compared,
    !!s.ending,
  ];
}
export function currentObjective(s: GameState) {
  const i = completed(s).findIndex((x) => !x);
  return objectives[i < 0 ? 4 : i];
}
export type Action =
  | { type: 'accept' }
  | { type: 'visit'; url: string }
  | { type: 'hint' }
  | { type: 'notes'; text: string };
export function reduce(s: GameState, a: Action): GameState {
  if (a.type === 'accept')
    return s.accepted ? s : event({ ...s, accepted: true }, '윤서진의 조사 의뢰를 수락했습니다.');
  if (a.type === 'notes') return { ...s, notes: a.text.slice(0, 10000) };
  if (a.type === 'hint') {
    if (s.ending) return s;
    const key = currentObjective(s).id;
    return { ...s, hints: { ...s.hints, [key]: Math.min(3, (s.hints[key] || 0) + 1) } };
  }
  if (a.type === 'visit') {
    const page = getPage(a.url);
    if (!page) return s;
    return event(
      { ...s, visited: unique(s.visited, page.site.host + page.page.path) },
      `웹 열람 · ${page.page.title}`,
    );
  }
  return s;
}
export function getPage(input: string) {
  const u = input
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  const [host, ...rest] = u.split('/');
  const site = sites.find((x) => x.host === host.toLowerCase());
  const path = '/' + rest.join('/');
  const page = site?.pages.find((x) => x.path === path);
  return site && page ? { site, page } : null;
}
export const commands = [...investigationCommands, ...shellCommands];

function investigate(fs: ShellFS, cmd: string, args: string[]): CommandResult {
  const s = fs.state;
  const fail = (error: string, code = 1): CommandResult => ({ out: '', error, code });
  const invalid = () => fail(commandUsage(cmd), 2);
  if (!s.accepted)
    return fail('먼저 메일에서 조사 의뢰를 수락하세요. help 조사로 명령을 확인할 수 있습니다.');
  if (cmd === 'resolve' || cmd === 'scan' || cmd === 'connect') {
    if (args.length !== (cmd === 'connect' ? 3 : 1)) return invalid();
    const server = servers.find((entry) => entry.ip === args[0] || entry.domain === args[0]);
    if (cmd === 'resolve') {
      if (!server) return fail('등록된 가상 도메인이 없습니다. 주소 철자를 확인하세요.');
      fs.state = event(
        { ...s, resolved: unique(s.resolved, server.domain) },
        '주소 확인 · ' + server.domain,
      );
      return { out: line(server.domain + '\n  ↳ ' + server.ip + ' / ' + server.name) };
    }
    if (cmd === 'scan') {
      if (!server || !s.resolved.includes(server.domain))
        return fail('먼저 resolve로 대상 도메인의 주소를 확인하세요.');
      fs.state = event(
        { ...s, scanned: unique(s.scanned, server.ip) },
        '서비스 확인 · ' + server.name,
      );
      return {
        out: line(
          server.name +
            '\nHOST ' +
            server.ip +
            '\n' +
            server.service +
            '\n\n인증 정보는 웹의 인계 단서 또는 서버 인계 메모에 있습니다.',
        ),
      };
    }
    if (!server || !s.scanned.includes(server.ip))
      return fail('서비스를 먼저 확인해야 합니다. resolve와 scan을 사용하세요.');
    if (args[1] !== server.user || args[2] !== server.password)
      return fail(
        '인증 실패. 계정, 대문자와 하이픈을 확인하세요.\n해온 계정은 운영 공지, 인계 키 규칙은 물때 기록실에서 찾을 수 있습니다.\n기존 연결과 확보한 증거는 유지됩니다.',
      );
    fs.state = event(
      {
        ...s,
        session: server.ip,
        shell: { ...s.shell, remoteDirectory: '/', previousDirectory: '' },
      },
      '접속 · ' + server.name,
    );
    return {
      out: line(
        '연결됨: ' +
          server.name +
          '\n사용자: ' +
          server.user +
          ' / 읽기 전용 감사 권한\nls -R로 파일 경로를 확인하세요.',
      ),
    };
  }
  if (cmd === 'disconnect') {
    if (args.length) return invalid();
    fs.state = {
      ...s,
      session: null,
      shell: { ...s.shell, remoteDirectory: '/', previousDirectory: '' },
    };
    return {
      out: line(
        fs.server || s.session
          ? '연결을 종료했습니다. 보관한 증거는 유지됩니다.'
          : '현재 연결된 서버가 없습니다.',
      ),
    };
  }
  if (cmd === 'compare') {
    if (args.length) return invalid();
    if (s.evidence.length !== 3)
      return fail(
        '증거가 부족합니다 (' +
          s.evidence.length +
          '/3).\n필요: ' +
          Object.entries(evidenceInfo)
            .filter(([id]) => !s.evidence.includes(id as EvidenceId))
            .map(([, value]) => value.title)
            .join(', '),
      );
    if (!s.visited.includes('haeon.test/report'))
      return fail('대조 기준이 필요합니다. haeon.test/report 공개 보고서를 읽으세요.');
    const placed = s.compared ? s : placeEvidence(s, 'comparison');
    fs.state = event(
      { ...placed, compared: true },
      '공개 보고서와 세 원본 증거의 대조를 완료했습니다.',
    );
    return { out: line(comparison) };
  }
  if (args.length !== 1) return invalid();
  const server = fs.server;
  if (!server) return fail('연결된 서버가 없습니다. connect로 감사 서버에 접속하세요.');
  const path = fs.path(args[0]);
  const file =
    server.files.find((entry) => entry.path === path) ??
    server.files.find((entry) => entry.path.split('/').pop() === args[0]);
  if (!file)
    return fail('파일을 찾을 수 없거나 현재 서버에서 접근할 수 없습니다. ls로 목록을 확인하세요.');
  if (cmd === 'read') return { out: line(fs.read(file.path)) };
  if (!file.evidence) return fail('이 문서는 조사 참고 자료입니다. read로 내용을 확인하세요.');
  const alreadyCollected = s.evidence.includes(file.evidence);
  const placed = alreadyCollected ? s : placeEvidence(s, file.evidence);
  fs.state = event(
    {
      ...placed,
      readFiles: unique(s.readFiles, server.ip + file.path),
      evidence: unique(s.evidence, file.evidence),
    },
    '증거 확보 · ' + file.title,
  );
  return {
    out: line(
      alreadyCollected
        ? '이미 보관한 증거입니다. 중복 사본을 만들지 않았습니다.'
        : '증거 보관 완료: ' +
            file.title +
            '\n폴더에서 다시 읽을 수 있습니다. (' +
            fs.state.evidence.length +
            '/3)',
    ),
  };
}

export function execute(s: GameState, input: string): { state: GameState; output: string } {
  if (input.length > MAX_COMMAND_LENGTH) {
    const output = '명령어는 ' + MAX_COMMAND_LENGTH + '자까지 입력할 수 있습니다.';
    return {
      state: { ...s, terminal: [...s.terminal, { input: '[너무 긴 명령어]', output }].slice(-160) },
      output,
    };
  }
  const text = input.trim();
  if (!text) return { state: s, output: '' };
  const prompt = shellPrompt(s);
  const { state, output } = runShell(s, text, investigate);
  const terminal =
    text === 'clear' && !output
      ? state.terminal
      : [...state.terminal, { input: text, output, prompt }].slice(-160);
  const history = text === 'history -c' ? state.history : [...state.history, text].slice(-100);
  return { state: { ...state, terminal, history }, output };
}

export function suggestions(s: GameState, text: string): string[] {
  const parts = text.split(/\s+/);
  if (parts.length <= 1) return commands.filter((name) => name.startsWith(text));
  const [cmd] = parts;
  const prefix = parts.at(-1) || '';
  let choices: string[] | undefined;
  if (cmd === 'help') choices = [...commands, ...Object.keys(helpTopics)];
  if (cmd === 'man') choices = commands;
  if (cmd === 'resolve')
    choices = [
      'haeon.test',
      ...(s.readFiles.includes('10.17.0.11/audit/transfer.txt') ? ['vault.archive.test'] : []),
    ];
  if (cmd === 'scan' || cmd === 'connect')
    choices = s.resolved.flatMap((domain) => {
      const server = servers.find((entry) => entry.domain === domain);
      return server ? [server.ip, server.domain] : [];
    });
  if (cmd === 'read' || cmd === 'collect') {
    const server = servers.find((entry) => entry.ip === s.session);
    if (!server) return [];
    if (!prefix || prefix.startsWith('/')) choices = server.files.map((file) => file.path);
  }
  if (choices)
    return parts.length === 2
      ? choices.filter((name) => name.startsWith(prefix)).map((name) => cmd + ' ' + name)
      : [];
  if (
    [
      'cd',
      'ls',
      'cat',
      'mkdir',
      'rmdir',
      'cp',
      'mv',
      'rm',
      'touch',
      'find',
      'tree',
      'stat',
      'du',
      'file',
      'head',
      'tail',
      'read',
      'collect',
    ].includes(cmd)
  )
    return pathSuggestions(s, text);
  return [];
}
export interface Submission {
  person: string;
  reason: string;
  interval: string;
  route: Ending;
}
export function submit(s: GameState, form: Submission): { state: GameState; error: string } {
  if (s.ending)
    return { state: s, error: '이미 조사를 마쳤습니다. 결말 화면에서 결과를 확인하세요.' };
  if (!s.accepted || s.evidence.length !== 3 || !s.compared)
    return { state: s, error: '세 증거를 보관하고 공개 보고서와 대조한 뒤 제출할 수 있습니다.' };
  if (!['review', 'public'].includes(form.route))
    return { state: s, error: '증거 전달 경로를 선택하세요.' };
  if (form.person !== '한기석' || form.reason !== '오염 은폐' || form.interval !== '23:14–23:25')
    return {
      state: { ...s, attempts: Math.min(Number.MAX_SAFE_INTEGER, s.attempts + 1) },
      error:
        '기록과 일치하지 않는 판단이 있습니다. 실행자와 지시자를 구분하고, 센서 상태와 승인 메시지를 다시 확인하세요. 증거는 그대로 유지됩니다.',
    };
  return {
    state: event(
      { ...s, ending: form.route },
      `조사 완료 · ${form.route === 'review' ? '독립 검증 기관 제출' : '시민 공개'}`,
    ),
    error: '',
  };
}
