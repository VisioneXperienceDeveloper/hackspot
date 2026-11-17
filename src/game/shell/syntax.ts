import { ShellError } from './filesystem';

type Mode = 'bare' | 'single' | 'double' | 'literal';
type Fragment = { text: string; mode: Mode };
export type Word = Fragment[];
type Operator = '|' | '&&' | '||' | ';' | '<' | '>' | '>>' | '2>' | '2>>' | '2>&1' | '&';
type Token = Word | Operator;
type Redirect = { operator: '<' | '>' | '>>' | '2>' | '2>>'; target: Word } | { operator: '2>&1' };
interface SimpleCommand {
  words: Word[];
  redirects: Redirect[];
}
interface Pipeline {
  gate: ';' | '&&' | '||';
  commands: SimpleCommand[];
  background: boolean;
}

const operators: Operator[] = ['2>&1', '2>>', '2>', '&&', '||', '>>', '|', ';', '<', '>', '&'];

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let word: Word = [];
  let mode: Mode = 'bare';
  const push = (text: string, kind: Mode) => {
    const last = word.at(-1);
    if (last?.mode === kind) last.text += text;
    else word.push({ text, mode: kind });
  };
  const flush = () => {
    if (word.length) tokens.push(word);
    word = [];
  };
  for (let i = 0; i < input.length; i++) {
    const character = input[i];
    if (character === '\\' && mode !== 'single') {
      const next = input[i + 1];
      if (!next) throw new ShellError('syntax error: trailing backslash', 2);
      if (mode === 'double' && !['\\', '"', '$', String.fromCharCode(96), '\n'].includes(next)) {
        push(character, mode);
      } else {
        i++;
        if (next !== '\n') push(next, 'literal');
      }
      continue;
    }
    if (mode === 'bare' && (character === '"' || character === "'")) {
      mode = character === '"' ? 'double' : 'single';
      push('', mode);
      continue;
    }
    if ((mode === 'double' && character === '"') || (mode === 'single' && character === "'")) {
      mode = 'bare';
      continue;
    }
    if (
      mode !== 'single' &&
      (character.charCodeAt(0) === 96 || (character === '$' && input[i + 1] === '('))
    )
      throw new ShellError('command substitution is not supported', 2);
    if (mode === 'bare') {
      if (character === '#' && !word.length) {
        const nextLine = input.indexOf('\n', i);
        if (nextLine < 0) break;
        i = nextLine - 1;
        continue;
      }
      const operator = operators.find(
        (item) => (!item.startsWith('2') || !word.length) && input.startsWith(item, i),
      );
      if (operator || character === '\n') {
        flush();
        tokens.push(operator ?? ';');
        i += (operator?.length ?? 1) - 1;
        continue;
      }
      if (/\s/.test(character)) {
        flush();
        continue;
      }
      if ('()'.includes(character))
        throw new ShellError('syntax error: subshells are not supported', 2);
    }
    push(character, mode);
  }
  if (mode !== 'bare') throw new ShellError('syntax error: unclosed quote', 2);
  flush();
  return tokens;
}

export function parse(input: string): Pipeline[] {
  const tokens = tokenize(input);
  const pipelines: Pipeline[] = [];
  let commands: SimpleCommand[] = [];
  let gate: Pipeline['gate'] = ';';
  let words: Word[] = [];
  let redirects: Redirect[] = [];
  function pushCommand() {
    if (!words.length && !redirects.length)
      throw new ShellError('syntax error: expected command', 2);
    commands.push({ words, redirects });
    words = [];
    redirects = [];
  }
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (typeof token !== 'string') {
      words.push(token);
      continue;
    }
    if (token === '2>&1') {
      redirects.push({ operator: token });
      continue;
    }
    if (token === '<' || token === '>' || token === '>>' || token === '2>' || token === '2>>') {
      const target = tokens[++i];
      if (!target || typeof target === 'string')
        throw new ShellError('syntax error: expected redirect path', 2);
      redirects.push({ operator: token, target });
      continue;
    }
    if (token === ';' && !words.length && !redirects.length && !commands.length && gate === ';')
      continue;
    pushCommand();
    if (token === '|') continue;
    pipelines.push({ gate, commands, background: token === '&' });
    gate = token === '&' ? ';' : token;
    commands = [];
  }
  if (words.length || redirects.length) {
    pushCommand();
    pipelines.push({ gate, commands, background: false });
  } else if (commands.length || gate !== ';')
    throw new ShellError('syntax error: unexpected end of line', 2);
  return pipelines;
}

export function expandWord(word: Word, home: string, getVariable: (name: string) => string) {
  let value = '';
  let pattern = '';
  let glob = false;
  let quoted = false;
  for (const [index, fragment] of word.entries()) {
    let text = fragment.text;
    if (fragment.mode === 'bare' && index === 0)
      text = text.replace(/^~(?=\/|$)/, home === '/' && text.startsWith('~/') ? '' : home);
    if (fragment.mode === 'bare' || fragment.mode === 'double') {
      text = text.replace(
        /\$(\?|[a-zA-Z_][a-zA-Z0-9_]*|\{[a-zA-Z_][a-zA-Z0-9_]*\})/g,
        (_, name: string) => getVariable(name.replace(/^\{|\}$/g, '')),
      );
    }
    value += text;
    if (fragment.mode === 'bare') {
      pattern += text;
      glob ||= /[*?[]/.test(text);
    } else {
      quoted = true;
      pattern += text.replace(/[\\*?[\]]/g, '\\$&');
    }
  }
  return { value, pattern, glob, quoted };
}
