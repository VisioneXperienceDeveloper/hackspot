import type { GameState } from '../engine';
import { servers } from '../world';
import {
  countArgs,
  integer,
  line,
  lines,
  options,
  type Command,
  type CommandResult,
} from './command';
import { fileCommands } from './fileCommands';
import { pathName, ShellError, ShellFS } from './filesystem';
import {
  commandUsage,
  helpOverview,
  helpTopics,
  investigationCommands,
  renderManual,
} from './manual';
import { localAddresses, networkCommands } from './network';
import { variableName } from './state';
import { expandWord, parse, type Word } from './syntax';
import { textCommands } from './textCommands';

type Investigation = (fs: ShellFS, command: string, args: string[]) => CommandResult;
const OUTPUT_LIMIT = 16000;
const PIPE_LIMIT = 150000;
const own = (values: Record<string, string>, name: string) =>
  Object.hasOwn(values, name) ? values[name] : undefined;

function environment(fs: ShellFS): Record<string, string> {
  return {
    HOME: fs.home,
    USER: fs.user,
    LOGNAME: fs.user,
    HOSTNAME: fs.host,
    PATH: '/usr/local/bin:/usr/bin:/bin',
    TERM: 'xterm-256color',
    SHELL: '/bin/bash',
    ...fs.variables,
    PWD: fs.directory,
    OLDPWD: fs.previousDirectory,
  };
}

function assign(fs: ShellFS, args: string[]) {
  const variables = { ...fs.variables };
  for (const entry of args) {
    const equal = entry.indexOf('=');
    const name = equal >= 0 ? entry.slice(0, equal) : entry;
    if (!variableName(name)) throw new ShellError('invalid variable name: ' + name, 2);
    const value = equal >= 0 ? entry.slice(equal + 1) : (own(environment(fs), name) ?? '');
    if (value.length > 1000) throw new ShellError('variable value is too long');
    Object.defineProperty(variables, name, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  if (Object.keys(variables).length > 32) throw new ShellError('variable limit reached');
  fs.variables = variables;
}

function test(fs: ShellFS, args: string[]): boolean {
  if (!args.length) return false;
  if (args[0] === '!') return !test(fs, args.slice(1));
  if (args.length === 1) return !!args[0];
  if (args.length === 2) {
    if (args[0] === '-n' || args[0] === '-z') return args[0] === '-n' ? !!args[1] : !args[1];
    const entry = fs.entries().get(fs.path(args[1]));
    if (args[0] === '-e') return !!entry;
    if (args[0] === '-f') return !!entry && !entry.directory;
    if (args[0] === '-d') return !!entry?.directory;
    if (args[0] === '-s') return !!entry?.content;
  }
  if (args.length === 3) {
    const [a, operator, b] = args;
    if (operator === '=' || operator === '==') return a === b;
    if (operator === '!=') return a !== b;
    if (['-eq', '-ne', '-gt', '-ge', '-lt', '-le'].includes(operator)) {
      const x = integer(a, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
      const y = integer(b, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
      return (
        {
          '-eq': x === y,
          '-ne': x !== y,
          '-gt': x > y,
          '-ge': x >= y,
          '-lt': x < y,
          '-le': x <= y,
        }[operator] ?? false
      );
    }
  }
  throw new ShellError('unsupported test expression', 2);
}

const systemCommands: Record<string, Command> = {
  whoami(fs, args) {
    countArgs(args, 0, 0);
    return line(fs.user);
  },
  hostname(fs, args) {
    const { enabled, operands } = options(args, 'iIsf');
    countArgs(operands, 0, 0);
    if (enabled.has('i') || enabled.has('I'))
      return line(fs.server?.ip ?? localAddresses(fs).join(' '));
    return line(enabled.has('f') ? (fs.server?.domain ?? fs.host) : fs.host);
  },
  uname(fs, args) {
    const { enabled, operands } = options(args, 'asnrvmpio');
    countArgs(operands, 0, 0);
    const fields = [
      ['s', 'Linux'],
      ['n', fs.host],
      ['r', '6.6-hackspot'],
      ['v', 'virtual'],
      ['m', 'virtual'],
      ['o', 'Hackspot Linux'],
    ];
    if (enabled.has('a')) return line(fields.map(([, value]) => value).join(' '));
    if (!enabled.size) return line('Linux');
    const values = fields.filter(([key]) => enabled.has(key)).map(([, value]) => value);
    if (enabled.has('p') || enabled.has('i')) values.push('unknown');
    return line(values.join(' '));
  },
  id(fs, args) {
    const { enabled, operands } = options(args, 'ugGn');
    countArgs(operands, 0, 1);
    const user = operands[0] ?? fs.user;
    if (user !== fs.user && (fs.server || !['root', 'analyst'].includes(user)))
      throw new ShellError(user + ': no such user');
    const uid = user === fs.user ? fs.uid : user === 'root' ? 0 : 1000;
    const identity = uid + '(' + user + ')';
    return line(
      enabled.size
        ? enabled.has('n')
          ? user
          : String(uid)
        : 'uid=' + identity + ' gid=' + identity + ' groups=' + identity,
    );
  },
  date(_fs, args) {
    const { enabled, operands } = options(args, 'u', '', { '--utc': 'u' });
    countArgs(operands, 0, 1);
    const now = new Date();
    const utc = enabled.has('u');
    if (!operands[0]) return line(utc ? now.toUTCString() : now.toString());
    if (!operands[0].startsWith('+')) throw new ShellError('expected +FORMAT', 2);
    const two = (value: number) => String(value).padStart(2, '0');
    const parts: Record<string, string> = {
      Y: String(utc ? now.getUTCFullYear() : now.getFullYear()),
      m: two((utc ? now.getUTCMonth() : now.getMonth()) + 1),
      d: two(utc ? now.getUTCDate() : now.getDate()),
      H: two(utc ? now.getUTCHours() : now.getHours()),
      M: two(utc ? now.getUTCMinutes() : now.getMinutes()),
      S: two(utc ? now.getUTCSeconds() : now.getSeconds()),
      s: String(Math.floor(now.getTime() / 1000)),
      '%': '%',
      n: '\n',
      t: '\t',
    };
    parts.F = [parts.Y, parts.m, parts.d].join('-');
    parts.T = [parts.H, parts.M, parts.S].join(':');
    return line(
      operands[0].slice(1).replace(/%(.)/g, (value, key: string) => own(parts, key) ?? value),
    );
  },
  env(fs, args) {
    countArgs(args, 0, 0);
    return lines(Object.entries(environment(fs)).map(([name, value]) => name + '=' + value));
  },
  printenv(fs, args) {
    const values = environment(fs);
    if (!args.length) return systemCommands.env(fs, [], '');
    const selected = args.flatMap((arg) => (Object.hasOwn(values, arg) ? [values[arg]] : []));
    return { out: lines(selected), code: selected.length === args.length ? 0 : 1 };
  },
  export(fs, args) {
    if (!args.length || (args.length === 1 && args[0] === '-p'))
      return lines(
        Object.entries(fs.variables).map(
          ([key, value]) => 'export ' + key + '=' + JSON.stringify(value),
        ),
      );
    assign(fs, args);
    return '';
  },
  unset(fs, args) {
    const variables = { ...fs.variables };
    for (const name of args) {
      if (!variableName(name)) throw new ShellError('invalid variable name: ' + name, 2);
      delete variables[name];
    }
    fs.variables = variables;
    return '';
  },
  history(fs, args) {
    countArgs(args, 0, 1);
    if (args[0] === '-c') {
      fs.state = { ...fs.state, history: [] };
      return '';
    }
    const history = fs.state.history;
    const from = args[0] ? Math.max(0, history.length - integer(args[0])) : 0;
    return lines(
      history
        .slice(from)
        .map((value, index) => String(from + index + 1).padStart(4) + '  ' + value),
    );
  },
  clear(fs, args) {
    countArgs(args, 0, 0);
    fs.state = { ...fs.state, terminal: [] };
    return '';
  },
  sudo(fs, args) {
    if (args.length !== 2 || args[0] !== 'su' || args[1] !== 'root')
      throw new ShellError(commandUsage('sudo'), 2);
    if (fs.server) throw new ShellError('Operation not permitted on the investigation server');
    if (!fs.rootSession) {
      fs.state = {
        ...fs.state,
        shell: {
          ...fs.state.shell,
          rootSession: { directory: fs.directory, previousDirectory: '', variables: {} },
        },
      };
    }
    return '';
  },
  seq(_fs, args) {
    countArgs(args, 1, 3);
    const values = args.map((arg) => integer(arg, -1000000));
    const start = args.length === 1 ? 1 : values[0];
    const end = values.at(-1)!;
    const step = args.length === 3 ? values[1] : 1;
    if (!step) throw new ShellError('zero increment', 2);
    const length = Math.max(0, Math.floor((end - start) / step) + 1);
    if (length > 5000) throw new ShellError('sequence exceeds 5000 values');
    return lines(Array.from({ length }, (_, index) => String(start + index * step)));
  },
  true: () => '',
  false: () => ({ out: '', code: 1 }),
  ':': () => '',
  test: (fs, args) => ({ out: '', code: test(fs, args) ? 0 : 1 }),
  '['(fs, args) {
    if (args.at(-1) !== ']') throw new ShellError('missing ]', 2);
    return { out: '', code: test(fs, args.slice(0, -1)) ? 0 : 1 };
  },
};

const builtins = { ...fileCommands, ...textCommands, ...systemCommands, ...networkCommands };
export const shellCommands = [
  ...Object.keys(builtins),
  'ssh',
  'exit',
  'help',
  'man',
  'which',
  'type',
  'command',
];
function commandLookup(args: string[], available: string[], kind: string) {
  const operands = kind === 'command' && args[0] === '-v' ? args.slice(1) : args;
  if (kind === 'command' && args[0] !== '-v') throw new ShellError('usage: command -v NAME', 2);
  countArgs(operands, 1);
  const found = operands.filter((name) => available.includes(name));
  const shellBuiltins = [
    'cd',
    'pwd',
    'echo',
    'export',
    'unset',
    'history',
    'test',
    '[',
    'true',
    'false',
    ':',
    'exit',
  ];
  return {
    out: lines(
      found.map((name) => {
        const path = shellBuiltins.includes(name) ? name : '/bin/' + name;
        return kind === 'type'
          ? name + (path === name ? ' is a shell builtin' : ' is ' + path)
          : path;
      }),
    ),
    code: found.length === operands.length ? 0 : 1,
  };
}

function invoke(
  fs: ShellFS,
  argv: string[],
  input: string,
  investigation: Investigation,
): CommandResult {
  const [raw, ...args] = argv;
  if (!raw) return { out: '' };
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(raw)) {
    if (!argv.every((word) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(word)))
      throw new ShellError('use export NAME=value before the command', 2);
    assign(fs, argv);
    return { out: '' };
  }
  const command = raw.startsWith('/bin/') || raw.startsWith('/usr/bin/') ? pathName(raw) : raw;
  const available = [...shellCommands, ...investigationCommands];
  if (command === 'help' || command === 'man') {
    countArgs(args, command === 'man' ? 1 : 0, 1);
    if (!args.length) return { out: line(helpOverview) };
    const name = args[0];
    if (command === 'help' && Object.hasOwn(helpTopics, name))
      return { out: line(helpTopics[name as keyof typeof helpTopics]) };
    if (!available.includes(name))
      return {
        out: '',
        error: '알 수 없는 명령어입니다. help 뒤에 공백과 Tab을 입력해 찾아보세요.',
        code: 1,
      };
    return { out: line(renderManual(name)) };
  }
  if (['which', 'type', 'command'].includes(command))
    return commandLookup(args, available, command);
  if (command === 'exit') {
    countArgs(args, 0, 0);
    if (fs.server) return investigation(fs, 'disconnect', []);
    if (fs.rootSession) {
      const shell = { ...fs.state.shell };
      delete shell.rootSession;
      fs.state = { ...fs.state, shell };
    }
    return { out: '' };
  }
  if (command === 'ssh') {
    const { operands, values } = options(args, '', 'p');
    countArgs(operands, 1, 2);
    const match = operands[0].match(/^([^@]+)@([^@]+)$/);
    if (!match || operands.length !== 2) throw new ShellError(commandUsage('ssh'), 2);
    if (integer(values.get('p') ?? '22', 1, 65535) !== 22)
      throw new ShellError('connect to host ' + match[2] + ': Connection refused', 255);
    const server = servers.find((server) => server.ip === match[2] || server.domain === match[2]);
    if (!server) throw new ShellError('Could not resolve hostname ' + match[2], 255);
    if (!fs.server && !localAddresses(fs).length)
      throw new ShellError('Network is unreachable', 255);
    for (const step of ['resolve', 'scan']) {
      const result = investigation(fs, step, [server.domain]);
      if (result.code) return result;
    }
    return investigation(fs, 'connect', [server.domain, match[1], operands[1]]);
  }
  if (investigationCommands.includes(command)) return investigation(fs, command, args);
  if (!Object.hasOwn(builtins, command))
    return { out: '', error: '명령어를 찾을 수 없습니다: ' + raw, code: 127 };
  const result = builtins[command](fs, args, input);
  return typeof result === 'string' ? { out: result } : result;
}

function expand(fs: ShellFS, word: Word) {
  const variables = environment(fs);
  const expanded = expandWord(word, fs.home, (name) =>
    name === '?' ? String(fs.state.shell.status) : (own(variables, name) ?? ''),
  );
  return expanded;
}

export function runShell(state: GameState, text: string, investigate: Investigation) {
  const fs = new ShellFS(state);
  const result: string[] = [];
  let status = state.shell.status;
  try {
    for (const pipeline of parse(text)) {
      if ((pipeline.gate === '&&' && status !== 0) || (pipeline.gate === '||' && status === 0))
        continue;
      if (pipeline.background) {
        const command = pipeline.commands[0].words[0];
        const name = command ? expand(fs, command).value : '';
        if (pipeline.commands.length !== 1 || !['serve', 'python3'].includes(name))
          throw new ShellError(
            'background execution is supported for virtual HTTP services only',
            2,
          );
      }
      let pipe = '';
      for (const [index, command] of pipeline.commands.entries()) {
        let input = pipe;
        let stdout = { path: '', channel: 'stdout' };
        let stderr = { path: '', channel: 'stderr' };
        let prefix = '';
        try {
          for (const redirect of command.redirects) {
            if (redirect.operator === '2>&1') {
              stderr = stdout;
              continue;
            }
            const target = expand(fs, redirect.target);
            const paths = target.glob ? fs.glob(target.pattern) : [];
            if (!target.value || paths.length > 1) throw new ShellError('ambiguous redirect');
            const path = fs.path(paths[0] ?? target.value);
            if (redirect.operator === '<') {
              input = fs.read(path);
              continue;
            }
            fs.write(path, '', redirect.operator.endsWith('>>'));
            const output = { path, channel: '' };
            if (redirect.operator.startsWith('2')) stderr = output;
            else stdout = output;
          }
          const argv = command.words.flatMap((word) => {
            const expanded = expand(fs, word);
            if (!expanded.value && !expanded.quoted) return [];
            const paths = expanded.glob ? fs.glob(expanded.pattern) : [];
            return paths.length ? paths : [expanded.value];
          });
          prefix = argv[0] ? argv[0] + ': ' : '';
          const executed = invoke(fs, argv, input, investigate);
          status = executed.code ?? 0;
          pipe = '';
          const send = (destination: { path: string; channel: string }, output: string) => {
            if (!output) return;
            if (destination.path) fs.write(destination.path, output, true);
            else if (destination.channel === 'stdout') pipe = (pipe + output).slice(0, PIPE_LIMIT);
            else result.push(output);
          };
          send(stdout, executed.out);
          if (executed.error) send(stderr, line(prefix + executed.error));
        } catch (error) {
          if (!(error instanceof ShellError)) throw error;
          pipe = '';
          status = error.code;
          const message = line(prefix + error.message);
          if (stderr.path) {
            try {
              fs.write(stderr.path, message, true);
            } catch (redirectError) {
              if (!(redirectError instanceof ShellError)) throw redirectError;
              result.push(message, line(redirectError.message));
            }
          } else if (stderr.channel === 'stdout') pipe = message;
          else result.push(message);
        }
        if (index === pipeline.commands.length - 1 && pipe) result.push(pipe);
      }
      fs.state = { ...fs.state, shell: { ...fs.state.shell, status } };
    }
  } catch (error) {
    if (!(error instanceof ShellError)) throw error;
    status = error.code;
    result.push(line(error.message));
  }
  const combined = result.join('');
  const output =
    combined.length <= OUTPUT_LIMIT
      ? combined
      : combined.slice(0, OUTPUT_LIMIT - 24) + '\n[output truncated]\n';
  return { state: { ...fs.state, shell: { ...fs.state.shell, status } }, output };
}

export function shellPrompt(state: GameState) {
  const fs = new ShellFS(state);
  const directory = fs.directory;
  const display =
    !fs.server && (directory === fs.home || directory.startsWith(fs.home + '/'))
      ? '~' + directory.slice(fs.home.length)
      : directory;
  return fs.user + '@' + fs.host + ':' + display + (fs.rootSession ? '#' : '$');
}

export function pathSuggestions(state: GameState, text: string): string[] {
  const fs = new ShellFS(state);
  const tail = text.match(/(?:^|\s)((?:\\.|[^\s\\])*)$/)?.[1] ?? '';
  if (/^['"]/.test(tail)) return [];
  const prefix = text.slice(0, text.length - tail.length);
  const fragment = tail.replace(/\\(.)/g, '$1');
  const boundary = fragment.lastIndexOf('/') + 1;
  const directory = fragment.slice(0, boundary);
  const name = fragment.slice(boundary);
  try {
    const base = fs.path(
      directory.startsWith('~/') ? fs.home + directory.slice(1) : directory || '.',
    );
    const entries = fs.entries();
    return fs
      .children(base, entries)
      .flatMap((path) => {
        const candidate = pathName(path);
        if (!candidate.startsWith(name) || (candidate.startsWith('.') && !name.startsWith('.')))
          return [];
        const completed = (directory + candidate).replace(/[\s\\'"|&;<>#$*?()[\]]/g, '\\$&');
        return [prefix + completed + (entries.get(path)?.directory ? '/' : '')];
      })
      .slice(0, 16);
  } catch (error) {
    if (!(error instanceof ShellError)) throw error;
    return [];
  }
}
