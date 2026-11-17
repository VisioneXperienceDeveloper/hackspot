import { ShellError, type ShellFS } from './filesystem';

export interface CommandResult {
  out: string;
  error?: string;
  code?: number;
}
export type Command = (fs: ShellFS, args: string[], input: string) => string | CommandResult;
export const line = (text: string) => text + '\n';
export const lines = (values: string[]) => (values.length ? values.join('\n') + '\n' : '');

export function options(
  args: string[],
  flags = '',
  valueFlags = '',
  aliases: Record<string, string> = {},
) {
  const enabled = new Set<string>();
  const values = new Map<string, string>();
  const operands: string[] = [];
  let literal = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!literal && arg === '--') {
      literal = true;
      continue;
    }
    if (literal || !arg.startsWith('-') || arg === '-') {
      operands.push(arg);
      continue;
    }
    const long = arg.startsWith('--');
    const equal = arg.indexOf('=');
    const name = equal < 0 ? arg : arg.slice(0, equal);
    const short = long ? (Object.hasOwn(aliases, name) ? aliases[name] : '') : arg.slice(1);
    if (!short) throw new ShellError('unrecognized option: ' + arg, 2);
    for (let j = 0; j < short.length; j++) {
      const flag = short[j];
      if (flags.includes(flag)) enabled.add(flag);
      else if (valueFlags.includes(flag)) {
        const value = long && equal >= 0 ? arg.slice(equal + 1) : short.slice(j + 1) || args[++i];
        if (value === undefined) throw new ShellError('option requires an argument: -' + flag, 2);
        values.set(flag, value);
        break;
      } else throw new ShellError('invalid option: -' + flag, 2);
    }
  }
  return { enabled, values, operands };
}

export function countArgs(operands: string[], minimum: number, maximum = Infinity) {
  if (operands.length < minimum) throw new ShellError('missing operand', 2);
  if (operands.length > maximum) throw new ShellError('too many arguments', 2);
}

export function integer(text: string, minimum = 0, maximum = 1000000) {
  const number = Number(text);
  if (
    !/^-?\d+$/.test(text) ||
    !Number.isSafeInteger(number) ||
    number < minimum ||
    number > maximum
  )
    throw new ShellError('invalid number: ' + text, 2);
  return number;
}

export function readInput(fs: ShellFS, paths: string[], input: string) {
  const texts = (paths.length ? paths : ['-']).map((path) => ({
    path,
    text: path === '-' ? input : fs.read(fs.path(path)),
  }));
  if (texts.reduce((size, item) => size + item.text.length, 0) > 150000)
    throw new ShellError('input exceeds the terminal processing limit');
  return texts;
}

export function splitLines(text: string) {
  return text ? text.replace(/\n$/, '').split('\n') : [];
}

export function escapes(text: string): string {
  const substitutions: Record<string, string> = { n: '\n', r: '\r', t: '\t', '\\': '\\' };
  return text.replace(/\\([nrt\\])/g, (_, character: string) => substitutions[character]);
}
