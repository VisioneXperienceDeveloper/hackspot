import {
  countArgs,
  escapes,
  integer,
  line,
  lines,
  options,
  readInput,
  splitLines,
  type Command,
} from './command';
import { escapeRegex, ShellError } from './filesystem';

function boundedRegex(pattern: string, flags: string, fixed = false) {
  if (!fixed) {
    const plain = pattern.replace(/\\./g, 'x').replace(/\[[^\]]*\]/g, 'x');
    if (
      pattern.length > 160 ||
      /[(){}]/.test(plain) ||
      (plain.match(/[*+]/g)?.length ?? 0) > 1 ||
      (plain.match(/\?/g)?.length ?? 0) > 8 ||
      /\\[1-9]/.test(pattern)
    )
      throw new ShellError(
        'complex regular expression is not supported; use -F for literal matching',
        2,
      );
  }
  try {
    return new RegExp(fixed ? escapeRegex(pattern) : pattern, flags);
  } catch {
    throw new ShellError('invalid regular expression: ' + pattern, 2);
  }
}

function sliceText(mode: 'head' | 'tail'): Command {
  return (fs, args, input) => {
    const normalized =
      args[0] && /^-\d+$/.test(args[0]) ? ['-n', args[0].slice(1), ...args.slice(1)] : args;
    const { enabled, operands, values } = options(normalized, 'qv', 'nc', {
      '--lines': 'n',
      '--bytes': 'c',
      '--quiet': 'q',
      '--verbose': 'v',
    });
    const bytes = values.has('c');
    const amount = values.get('c') ?? values.get('n') ?? '10';
    const count = integer(amount.replace(/^\+/, ''), mode === 'head' ? -1000000 : 0);
    const fromStart = mode === 'tail' && amount.startsWith('+');
    const files = readInput(fs, operands, input);
    return files
      .map(({ text, path }) => {
        const data = bytes ? new TextEncoder().encode(text) : splitLines(text);
        const sliced =
          mode === 'head'
            ? data.slice(0, count)
            : data.slice(fromStart ? Math.max(0, count - 1) : Math.max(0, data.length - count));
        const body =
          sliced instanceof Uint8Array
            ? new TextDecoder().decode(sliced)
            : sliced.join('\n') +
              (sliced.length &&
              (text.endsWith('\n') || (mode === 'head' && sliced.length < data.length))
                ? '\n'
                : '');
        return (
          (enabled.has('v') || (!enabled.has('q') && files.length > 1)
            ? '==> ' + path + ' <==\n'
            : '') + body
        );
      })
      .join(files.length > 1 && !enabled.has('q') ? '\n' : '');
  };
}

function selection(fieldList: string): (number: number) => boolean {
  const ranges = fieldList.split(',').map((range) => {
    const match = range.match(/^(\d+)?(-)?(\d+)?$/);
    if (!match || (!match[1] && !match[3])) throw new ShellError('invalid field list', 2);
    const from = match[1] ? integer(match[1], 1) : 1;
    const to = match[2] ? (match[3] ? integer(match[3], from) : Infinity) : from;
    return { from, to };
  });
  return (number) => ranges.some(({ from, to }) => number >= from && number <= to);
}

export const textCommands: Record<string, Command> = {
  echo(_fs, args) {
    let newline = true;
    let interpret = false;
    let index = 0;
    while (/^-[neE]+$/.test(args[index] ?? '')) {
      for (const flag of args[index++].slice(1)) {
        if (flag === 'n') newline = false;
        else interpret = flag === 'e';
      }
    }
    const text = args.slice(index).join(' ');
    return (interpret ? escapes(text) : text) + (newline ? '\n' : '');
  },
  printf(_fs, args) {
    countArgs(args, 1);
    const format = escapes(args[0]);
    let index = 1;
    let output = '';
    do {
      const before = index;
      output += format.replace(/%([sdb%])/g, (_, type: string) => {
        if (type === '%') return '%';
        const value = args[index++] ?? '';
        if (type === 'd') {
          if (value && !/^[+-]?\d+$/.test(value)) throw new ShellError('invalid integer: ' + value);
          return String(Number(value));
        }
        return type === 'b' ? escapes(value) : value;
      });
      if (index === before) break;
    } while (index < args.length);
    return output;
  },
  cat(fs, args, input) {
    const { enabled, operands } = options(args, 'nb', '', {
      '--number': 'n',
      '--number-nonblank': 'b',
    });
    const text = readInput(fs, operands, input)
      .map((item) => item.text)
      .join('');
    if (!enabled.has('n') && !enabled.has('b')) return text;
    let number = 0;
    return (
      splitLines(text)
        .map((value) =>
          enabled.has('b') && !value ? value : String(++number).padStart(6) + '\t' + value,
        )
        .join('\n') + (text.endsWith('\n') ? '\n' : '')
    );
  },
  head: sliceText('head'),
  tail: sliceText('tail'),
  grep(fs, args, input) {
    const { enabled, operands, values } = options(args, 'invcFlqHE', 'e', {
      '--ignore-case': 'i',
      '--line-number': 'n',
      '--invert-match': 'v',
      '--count': 'c',
      '--fixed-strings': 'F',
      '--files-with-matches': 'l',
      '--quiet': 'q',
      '--with-filename': 'H',
      '--extended-regexp': 'E',
      '--regexp': 'e',
    });
    const pattern = values.get('e') ?? operands.shift();
    if (pattern === undefined) throw new ShellError('missing pattern', 2);
    const regex = boundedRegex(pattern, enabled.has('i') ? 'iu' : 'u', enabled.has('F'));
    const files = readInput(fs, operands, input);
    let matched = false;
    const output: string[] = [];
    for (const { path, text } of files) {
      const prefix = files.length > 1 || enabled.has('H') ? path + ':' : '';
      let count = 0;
      for (const [index, value] of splitLines(text).entries()) {
        if (regex.test(value) === enabled.has('v')) continue;
        matched = true;
        count++;
        if (enabled.has('q')) return '';
        if (!enabled.has('c') && !enabled.has('l'))
          output.push(prefix + (enabled.has('n') ? index + 1 + ':' : '') + value);
      }
      if (enabled.has('l') && count) output.push(path);
      else if (enabled.has('c')) output.push(prefix + count);
    }
    return { out: lines(output), code: matched ? 0 : 1 };
  },
  wc(fs, args, input) {
    const { enabled, operands } = options(args, 'lwcm', '', {
      '--lines': 'l',
      '--words': 'w',
      '--bytes': 'c',
      '--chars': 'm',
    });
    const flags = enabled.size ? enabled : new Set(['l', 'w', 'c']);
    const files = readInput(fs, operands, input);
    const counts = files.map(({ path, text }) => ({
      path,
      values: [
        (text.match(/\n/g) ?? []).length,
        (text.match(/\S+/gu) ?? []).length,
        Array.from(text).length,
        new TextEncoder().encode(text).length,
      ],
    }));
    if (counts.length > 1)
      counts.push({
        path: 'total',
        values: [0, 1, 2, 3].map((index) =>
          counts.reduce((sum, item) => sum + item.values[index], 0),
        ),
      });
    return lines(
      counts.map(
        ({ path, values }) =>
          values.filter((_, index) => flags.has('lwmc'[index])).join(' ') +
          (operands.length ? ' ' + path : ''),
      ),
    );
  },
  sort(fs, args, input) {
    const { enabled, operands } = options(args, 'nruif', '', {
      '--numeric-sort': 'n',
      '--reverse': 'r',
      '--unique': 'u',
      '--ignore-case': 'f',
    });
    const normalize = (value: string) => (enabled.has('f') ? value.toLowerCase() : value);
    const comparator = enabled.has('n')
      ? (a: string, b: string) => (parseFloat(a) || 0) - (parseFloat(b) || 0)
      : (a: string, b: string) => normalize(a).localeCompare(normalize(b));
    let rows = readInput(fs, operands, input)
      .flatMap(({ text }) => splitLines(text))
      .sort(comparator);
    if (enabled.has('u'))
      rows = rows.filter((value, index) => !index || comparator(rows[index - 1], value) !== 0);
    if (enabled.has('r')) rows.reverse();
    return lines(rows);
  },
  uniq(fs, args, input) {
    const { enabled, operands } = options(args, 'cdui', '', {
      '--count': 'c',
      '--repeated': 'd',
      '--unique': 'u',
      '--ignore-case': 'i',
    });
    countArgs(operands, 0, 2);
    const groups: { value: string; count: number; key: string }[] = [];
    for (const value of splitLines(readInput(fs, operands.slice(0, 1), input)[0].text)) {
      const key = enabled.has('i') ? value.toLowerCase() : value;
      const previous = groups.at(-1);
      if (previous?.key === key) previous.count++;
      else groups.push({ value, count: 1, key });
    }
    const output = lines(
      groups
        .filter(
          ({ count }) => (!enabled.has('d') || count > 1) && (!enabled.has('u') || count === 1),
        )
        .map(
          ({ value, count }) => (enabled.has('c') ? String(count).padStart(7) + ' ' : '') + value,
        ),
    );
    if (operands[1]) {
      fs.write(fs.path(operands[1]), output);
      return '';
    }
    return output;
  },
  cut(fs, args, input) {
    const { enabled, operands, values } = options(args, 's', 'dfcb', {
      '--delimiter': 'd',
      '--fields': 'f',
      '--characters': 'c',
      '--bytes': 'b',
      '--only-delimited': 's',
    });
    const field = values.get('f');
    const spec = field ?? values.get('c') ?? values.get('b');
    if (!spec || ['f', 'c', 'b'].filter((flag) => values.has(flag)).length !== 1)
      throw new ShellError('specify exactly one of -f, -c or -b', 2);
    const delimiter = values.get('d') ?? '\t';
    if (Array.from(delimiter).length !== 1)
      throw new ShellError('delimiter must be a single character', 2);
    const selected = selection(spec);
    return lines(
      readInput(fs, operands, input).flatMap(({ text }) =>
        splitLines(text).flatMap((value) => {
          if (field)
            return value.includes(delimiter)
              ? [
                  value
                    .split(delimiter)
                    .filter((_, i) => selected(i + 1))
                    .join(delimiter),
                ]
              : enabled.has('s')
                ? []
                : [value];
          if (values.has('b'))
            return [
              new TextDecoder().decode(
                new TextEncoder().encode(value).filter((_, i) => selected(i + 1)),
              ),
            ];
          return [
            Array.from(value)
              .filter((_, i) => selected(i + 1))
              .join(''),
          ];
        }),
      ),
    );
  },
  tr(_fs, args, input) {
    const { enabled, operands } = options(args, 'ds');
    const remove = enabled.has('d');
    countArgs(operands, remove || enabled.has('s') ? 1 : 2, 2);
    if (remove && !enabled.has('s') && operands.length !== 1)
      throw new ShellError('extra operand', 2);
    const expand = (value: string) =>
      escapes(value)
        .replace(/\[:lower:\]/g, 'a-z')
        .replace(/\[:upper:\]/g, 'A-Z')
        .replace(/\[:digit:\]/g, '0-9')
        .replace(/([a-zA-Z0-9])-([a-zA-Z0-9])/g, (_, a: string, b: string) =>
          Array.from({ length: Math.max(0, b.charCodeAt(0) - a.charCodeAt(0) + 1) }, (__, i) =>
            String.fromCharCode(a.charCodeAt(0) + i),
          ).join(''),
        );
    const from = Array.from(expand(operands[0]));
    const to = Array.from(expand(operands[1] ?? ''));
    const squeeze = new Set(to.length ? to : from);
    const output: string[] = [];
    for (const character of input) {
      const index = from.indexOf(character);
      if (remove && index >= 0) continue;
      const next =
        !remove && index >= 0 && to.length ? to[Math.min(index, to.length - 1)] : character;
      if (!enabled.has('s') || !squeeze.has(next) || output.at(-1) !== next) output.push(next);
    }
    return output.join('');
  },
  tee(fs, args, input) {
    const { enabled, operands } = options(args, 'a', '', { '--append': 'a' });
    for (const path of operands) fs.write(fs.path(path), input, enabled.has('a'));
    return input;
  },
  sed(fs, args, input) {
    const { enabled, operands, values } = options(args, 'nE', 'e');
    const script = values.get('e') ?? operands.shift();
    if (!script) throw new ShellError('missing sed expression', 2);
    const substitute = script.match(/^s([/|#])((?:\\.|(?!\1).)*)\1((?:\\.|(?!\1).)*)\1([gip]*)$/);
    const address = script.match(/^(\d+)(?:,(\d+|\$))?([pd])$/);
    if (!substitute && !address && script !== 'p' && script !== 'd')
      throw new ShellError('supported sed expressions: s/old/new/g, Np, N,Mp, Nd', 2);
    const regex = substitute
      ? boundedRegex(substitute[2], substitute[4].replace(/p/g, '') + 'u')
      : undefined;
    const data = readInput(fs, operands, input).flatMap(({ text }) => splitLines(text));
    return lines(
      data.flatMap((value, index) => {
        const selected = address
          ? index + 1 >= Number(address[1]) &&
            index + 1 <= (address[2] === '$' ? Infinity : Number(address[2] ?? address[1]))
          : true;
        if (regex) {
          regex.lastIndex = 0;
          const matched = regex.test(value);
          regex.lastIndex = 0;
          const output = value.replace(regex, (match) =>
            substitute![3].replace(
              /\\(.)|&/g,
              (_token, literal: string | undefined) => literal ?? match,
            ),
          );
          return [
            ...(!enabled.has('n') ? [output] : []),
            ...(matched && substitute?.[4].includes('p') ? [output] : []),
          ];
        }
        const action = address?.[3] ?? script;
        return [
          ...(!enabled.has('n') && !(selected && action === 'd') ? [value] : []),
          ...(selected && action === 'p' ? [value] : []),
        ];
      }),
    );
  },
  awk(fs, args, input) {
    const { operands, values } = options(args, '', 'F');
    const script = operands.shift();
    const match = script?.match(
      /^\{\s*print(?:\s+((?:\$\d+|NF|NR)(?:\s*,\s*(?:\$\d+|NF|NR))*))?\s*;?\s*\}$/,
    );
    if (!match)
      throw new ShellError("supported awk expressions: '{print $1}', '{print NR,$0}' and -F", 2);
    const fields = match[1]?.split(/\s*,\s*/) ?? ['$0'];
    const delimiter = values.get('F');
    return lines(
      readInput(fs, operands, input)
        .flatMap(({ text }) => splitLines(text))
        .map((row, index) => {
          const columns =
            delimiter === undefined || delimiter === ' '
              ? row.trim().split(/\s+/).filter(Boolean)
              : row.split(escapes(delimiter));
          return fields
            .map((field) =>
              field === 'NR'
                ? String(index + 1)
                : field === 'NF'
                  ? String(columns.length)
                  : field === '$0'
                    ? row
                    : (columns[Number(field.slice(1)) - 1] ?? ''),
            )
            .join(' ');
        }),
    );
  },
  diff(fs, args) {
    const { enabled, operands } = options(args, 'qu');
    countArgs(operands, 2, 2);
    const [a, b] = operands.map((path) => fs.read(fs.path(path)));
    if (a === b) return '';
    if (enabled.has('q'))
      return { out: line('Files ' + operands.join(' and ') + ' differ'), code: 1 };
    const left = splitLines(a);
    const right = splitLines(b);
    const header = enabled.has('u')
      ? [
          '--- ' + operands[0],
          '+++ ' + operands[1],
          '@@ -' +
            (left.length ? '1' : '0') +
            ',' +
            left.length +
            ' +' +
            (right.length ? '1' : '0') +
            ',' +
            right.length +
            ' @@',
        ]
      : [
          String(left.length ? '1,' + left.length : '0') +
            'c' +
            String(right.length ? '1,' + right.length : '0'),
        ];
    return {
      out: lines([
        ...header,
        ...left.map((value) => (enabled.has('u') ? '-' : '< ') + value),
        ...(!enabled.has('u') ? ['---'] : []),
        ...right.map((value) => (enabled.has('u') ? '+' : '> ') + value),
      ]),
      code: 1,
    };
  },
};
