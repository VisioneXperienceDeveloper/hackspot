import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MAX_COMMAND_LENGTH, suggestions, type GameState } from '../game/engine';
import { shellPrompt } from '../game/shell';
export function Terminal({
  state,
  run,
  active,
}: {
  state: GameState;
  run: (input: string) => void;
  active: boolean;
}) {
  const [input, setInput] = useState(''),
    [historyIndex, setHistoryIndex] = useState(-1),
    [completion, setCompletion] = useState<string[]>([]);
  const body = useRef<HTMLDivElement>(null),
    field = useRef<HTMLInputElement>(null),
    draft = useRef(''),
    composing = useRef(false),
    compositionEnded = useRef(-Infinity);
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight });
  }, [state.terminal, completion.length]);
  useEffect(() => {
    if (active) field.current?.focus({ preventScroll: true });
  }, [active]);
  function complete(value: string) {
    setInput(value.endsWith('/') ? value : value + ' ');
    setCompletion([]);
  }
  function key(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing || composing.current || e.nativeEvent.keyCode === 229) {
      if (e.key === 'Enter') e.preventDefault();
      return;
    }
    if (e.key === 'Enter' && performance.now() - compositionEnded.current < 50) {
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex === -1) draft.current = input;
      const i = Math.min(state.history.length - 1, historyIndex + 1);
      if (i >= 0) {
        setHistoryIndex(i);
        setInput(state.history[state.history.length - 1 - i]);
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const i = Math.max(-1, historyIndex - 1);
      setHistoryIndex(i);
      setInput(i === -1 ? draft.current : state.history[state.history.length - 1 - i]);
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const found = suggestions(state, input);
      setCompletion(found);
      if (found.length === 1) complete(found[0]);
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      run('clear');
    }
    if (e.ctrlKey && !e.metaKey && !e.altKey) {
      const control = e.key.toLowerCase();
      const element = e.currentTarget;
      const start = element.selectionStart ?? input.length;
      const end = element.selectionEnd ?? start;
      if (control === 'c' && start === end && !window.getSelection()?.toString()) {
        e.preventDefault();
        setInput('');
        setCompletion([]);
        setHistoryIndex(-1);
      } else if (control === 'd' && !input) {
        e.preventDefault();
        run('exit');
      } else if (control === 'a' || control === 'e') {
        e.preventDefault();
        const position = control === 'a' ? 0 : input.length;
        element.setSelectionRange(position, position);
      } else if (control === 'u' || control === 'k' || control === 'w') {
        e.preventDefault();
        const from =
          control === 'u' ? 0 : control === 'w' ? input.slice(0, start).search(/\S+\s*$/) : start;
        const to = control === 'k' ? input.length : end;
        const position = Math.max(0, from);
        setInput(input.slice(0, position) + input.slice(to));
        setCompletion([]);
        requestAnimationFrame(() => element.setSelectionRange(position, position));
      }
    }
  }
  const prompt = shellPrompt(state);
  return (
    <div className="terminal-shell">
      <div className="terminal-output" ref={body}>
        <div role="log" aria-label="터미널 출력" aria-live="polite">
          {state.terminal.map((line, i) => (
            <div className="terminal-entry" key={i}>
              {line.input && (
                <div className="command-line">
                  <b>{line.prompt ?? '$'}</b> {line.input}
                </div>
              )}
              {line.output && <pre>{line.output.replace(/\n$/, '')}</pre>}
            </div>
          ))}
        </div>
        <form
          className="terminal-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              composing.current ||
              performance.now() - compositionEnded.current < 50 ||
              !input.trim()
            )
              return;
            run(input);
            setInput('');
            setHistoryIndex(-1);
            setCompletion([]);
          }}
        >
          <span className="terminal-prompt" title={prompt}>
            {prompt}
          </span>
          <input
            ref={field}
            maxLength={MAX_COMMAND_LENGTH}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
              compositionEnded.current = performance.now();
            }}
            aria-label="터미널 명령어"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCompletion([]);
            }}
            onKeyDown={key}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
          />
        </form>
      </div>
      {completion.length > 0 && (
        <div className="completions">
          {completion.map((c) => (
            <button
              key={c}
              onClick={() => {
                complete(c);
                field.current?.focus();
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
