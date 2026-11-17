import { countArgs, integer, line, lines, options, type Command } from './command';
import {
  pathJoin,
  pathName,
  pathParent,
  pathPattern,
  ShellError,
  type ShellFS,
} from './filesystem';

function prettySize(bytes: number) {
  return bytes < 1024 ? String(bytes) : (bytes / 1024).toFixed(1) + 'K';
}
const byteLength = (text: string) => new TextEncoder().encode(text).length;
function descendants(fs: ShellFS, path: string, maxDepth: number, hidden: boolean) {
  const entries = fs.entries();
  const result: { path: string; depth: number }[] = [];
  function walk(current: string, depth: number) {
    result.push({ path: current, depth });
    if (depth === maxDepth || !entries.get(current)?.directory) return;
    for (const child of fs.children(current, entries)) {
      if (hidden || !pathName(child).startsWith('.')) walk(child, depth + 1);
    }
  }
  fs.require(path);
  walk(path, 0);
  return result;
}

const list: Command = (fs, args) => {
  const { enabled, operands } = options(args, 'aAlhRd1tFr', '', {
    '--all': 'a',
    '--almost-all': 'A',
    '--human-readable': 'h',
    '--recursive': 'R',
    '--directory': 'd',
    '--reverse': 'r',
    '--classify': 'F',
  });
  const entries = fs.entries();
  const targets = operands.length ? operands : ['.'];
  function render(path: string, label: string) {
    const entry = fs.require(path);
    const name = label + (enabled.has('F') && entry.directory ? '/' : '');
    if (!enabled.has('l')) return name;
    const mode = entry.directory ? 'drwxr-xr-x' : entry.file?.noteId ? '-rw-r--r--' : '-r--r--r--';
    const size = entry.directory ? 0 : byteLength(entry.content ?? '');
    const date =
      entry.file?.updatedAt === undefined
        ? '          '
        : new Date(entry.file.updatedAt).toISOString().slice(0, 10);
    return (
      mode +
      '  1 ' +
      fs.user +
      ' ' +
      fs.user +
      ' ' +
      (enabled.has('h') ? prettySize(size) : size) +
      ' ' +
      date +
      ' ' +
      name
    );
  }
  function directory(path: string, heading: string): string {
    let children = fs
      .children(path, entries)
      .filter((child) => enabled.has('a') || enabled.has('A') || !pathName(child).startsWith('.'));
    if (enabled.has('t'))
      children.sort(
        (a, b) => (entries.get(b)?.file?.updatedAt ?? 0) - (entries.get(a)?.file?.updatedAt ?? 0),
      );
    if (enabled.has('r')) children = children.reverse();
    const output = children.map((child) => render(child, pathName(child)));
    if (enabled.has('a')) output.unshift(render(path, '.'), render(pathParent(path), '..'));
    return (
      (heading ? heading + ':\n' : '') +
      lines(output) +
      (enabled.has('R')
        ? children
            .filter((child) => entries.get(child)?.directory)
            .map((child) => '\n' + directory(child, child))
            .join('')
        : '')
    );
  }
  return targets
    .map((operand) => {
      const path = fs.path(operand);
      const entry = fs.require(path);
      return entry.directory && !enabled.has('d')
        ? directory(path, targets.length > 1 || enabled.has('R') ? operand : '')
        : line(render(path, operand));
    })
    .join('\n');
};

function transfer(mode: 'cp' | 'mv'): Command {
  return (fs, args) => {
    const { enabled, operands } = options(args, mode === 'cp' ? 'rRafnv' : 'fnv', '', {
      '--no-clobber': 'n',
      '--force': 'f',
      '--verbose': 'v',
      ...(mode === 'cp' ? { '--recursive': 'r', '--archive': 'a' } : {}),
    });
    countArgs(operands, 2);
    const destination = fs.path(operands.at(-1)!);
    const directory = fs.entries().get(destination)?.directory;
    if (operands.length > 2 && !directory)
      throw new ShellError(destination + ': target is not a directory');
    const output: string[] = [];
    for (const operand of operands.slice(0, -1)) {
      const source = fs.path(operand);
      const target = directory ? pathJoin(destination, pathName(source)) : destination;
      if (mode === 'mv') fs.move(source, target, enabled.has('n'));
      else
        fs.copy(
          source,
          target,
          ['r', 'R', 'a'].some((flag) => enabled.has(flag)),
          enabled.has('n'),
        );
      if (enabled.has('v')) output.push(source + ' -> ' + target);
    }
    return lines(output);
  };
}

export const fileCommands: Record<string, Command> = {
  pwd(fs, args) {
    countArgs(options(args, 'LP').operands, 0, 0);
    return line(fs.directory);
  },
  cd(fs, args) {
    const { operands } = options(args, 'LP');
    countArgs(operands, 0, 1);
    const previous = fs.previousDirectory;
    if (operands[0] === '-' && !previous) throw new ShellError('OLDPWD not set');
    fs.cd(operands[0] === '-' ? previous : operands.length ? fs.path(operands[0]) : fs.home);
    return operands[0] === '-' ? line(fs.directory) : '';
  },
  ls: list,
  mkdir(fs, args) {
    const { enabled, operands } = options(args, 'pv', '', { '--parents': 'p', '--verbose': 'v' });
    countArgs(operands, 1);
    for (const operand of operands) fs.mkdir(fs.path(operand), enabled.has('p'));
    return enabled.has('v') ? lines(operands.map((operand) => 'created directory ' + operand)) : '';
  },
  rmdir(fs, args) {
    const { operands } = options(args);
    countArgs(operands, 1);
    for (const operand of operands) fs.remove(fs.path(operand), false, false, true);
    return '';
  },
  touch(fs, args) {
    const { enabled, operands } = options(args, 'c', '', { '--no-create': 'c' });
    countArgs(operands, 1);
    for (const operand of operands) {
      const path = fs.path(operand);
      if (!enabled.has('c') || fs.entries().has(path)) fs.write(path, '', true);
    }
    return '';
  },
  rm(fs, args) {
    const { enabled, operands } = options(args, 'frRv', '', {
      '--force': 'f',
      '--recursive': 'r',
      '--verbose': 'v',
    });
    countArgs(operands, enabled.has('f') ? 0 : 1);
    for (const operand of operands)
      fs.remove(fs.path(operand), enabled.has('r') || enabled.has('R'), enabled.has('f'));
    return enabled.has('v') ? lines(operands.map((operand) => 'removed ' + operand)) : '';
  },
  cp: transfer('cp'),
  mv: transfer('mv'),
  find(fs, args) {
    const paths: string[] = [];
    let index = 0;
    while (args[index] && !args[index].startsWith('-')) paths.push(args[index++]);
    let max = 1000;
    let min = 0;
    let name: ReturnType<typeof pathPattern> | undefined;
    let insensitive = false;
    let type = '';
    for (; index < args.length; index++) {
      const option = args[index];
      if (option === '-print') continue;
      if (!['-maxdepth', '-mindepth', '-name', '-iname', '-type'].includes(option))
        throw new ShellError('unsupported find expression: ' + option, 2);
      const value = args[++index];
      if (!value) throw new ShellError('missing argument to ' + option, 2);
      if (option === '-maxdepth') max = integer(value);
      else if (option === '-mindepth') min = integer(value);
      else if (option === '-type' && ['d', 'f'].includes(value)) type = value;
      else if (option === '-name' || option === '-iname') {
        insensitive = option === '-iname';
        name = pathPattern(insensitive ? value.toLowerCase() : value);
      } else throw new ShellError('invalid argument to ' + option, 2);
    }
    const entries = fs.entries();
    return lines(
      (paths.length ? paths : ['.']).flatMap((operand) => {
        const root = fs.path(operand);
        return descendants(fs, root, max, true)
          .filter(
            ({ path, depth }) =>
              depth >= min &&
              (!type || entries.get(path)?.directory === (type === 'd')) &&
              (!name || name.test(insensitive ? pathName(path).toLowerCase() : pathName(path))),
          )
          .map(({ path }) =>
            path === root
              ? operand
              : pathJoin(
                  operand.replace(/\/$/, '') || '/',
                  path.slice(root === '/' ? 1 : root.length + 1),
                ),
          );
      }),
    );
  },
  tree(fs, args) {
    const { enabled, values, operands } = options(args, 'ad', 'L');
    countArgs(operands, 0, 1);
    const root = fs.path(operands[0] ?? '.');
    const entries = fs.entries();
    const tree = descendants(fs, root, integer(values.get('L') ?? '1000'), enabled.has('a'));
    return lines(
      tree
        .filter(({ path }) => !enabled.has('d') || entries.get(path)?.directory)
        .map(({ path, depth }) =>
          depth ? '  '.repeat(depth - 1) + '├── ' + pathName(path) : (operands[0] ?? '.'),
        ),
    );
  },
  stat(fs, args) {
    countArgs(args, 1);
    return lines(
      args.map((operand) => {
        const entry = fs.require(fs.path(operand));
        return (
          '  File: ' +
          operand +
          '\n  Size: ' +
          byteLength(entry.content ?? '') +
          ' bytes\t' +
          (entry.directory ? 'directory' : 'regular file') +
          (entry.file?.updatedAt === undefined
            ? ''
            : '\nModify: ' + new Date(entry.file.updatedAt).toISOString())
        );
      }),
    );
  },
  du(fs, args) {
    const { enabled, operands } = options(args, 'shak', '', {
      '--summarize': 's',
      '--human-readable': 'h',
      '--all': 'a',
    });
    const entries = fs.entries();
    return lines(
      (operands.length ? operands : ['.']).flatMap((operand) => {
        const root = fs.path(operand);
        const tree = descendants(fs, root, 1000, true);
        return tree
          .filter(
            ({ path, depth }) =>
              !depth || (!enabled.has('s') && (enabled.has('a') || entries.get(path)?.directory)),
          )
          .map(({ path }) => {
            const size = tree
              .filter(
                (item) =>
                  item.path === path || item.path.startsWith(path === '/' ? '/' : path + '/'),
              )
              .reduce((sum, item) => sum + byteLength(entries.get(item.path)?.content ?? ''), 0);
            return (
              (enabled.has('h') ? prettySize(size) : Math.ceil(size / 1024)) +
              '\t' +
              (path === root ? operand : path)
            );
          });
      }),
    );
  },
  basename(_fs, args) {
    countArgs(args, 1, 2);
    const name = pathName(args[0].replace(/\/+$/, ''));
    return line(
      args[1] && name.endsWith(args[1]) && name !== args[1] ? name.slice(0, -args[1].length) : name,
    );
  },
  dirname(_fs, args) {
    countArgs(args, 1, 1);
    const path = args[0].replace(/\/+$/, '');
    return line(path.includes('/') || args[0].startsWith('/') ? pathParent(path) : '.');
  },
  realpath(fs, args) {
    countArgs(args, 1);
    return lines(args.map((operand) => fs.path(operand)));
  },
  file(fs, args) {
    countArgs(args, 1);
    return lines(
      args.map((operand) => {
        const entry = fs.require(fs.path(operand));
        return (
          operand + ': ' + (entry.directory ? 'directory' : entry.content ? 'UTF-8 text' : 'empty')
        );
      }),
    );
  },
};
