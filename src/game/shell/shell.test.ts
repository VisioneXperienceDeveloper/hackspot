import { describe, expect, it } from 'vitest';
import { desktopFiles } from '../desktopFiles';
import { commands, execute, initialState, reduce, suggestions } from '../engine';
import { decodeSave } from '../storage';
import { servers } from '../world';

describe('Hackspot shell', () => {
  it('기본 도움말은 자주 쓰는 명령만 보여주고 명령별 매뉴얼을 제공한다', () => {
    const state = initialState();
    const output = (input: string) => execute(state, input).output;
    expect(output('help')).toMatch(/^pwd - /);
    expect(output('help')).toContain('\nls - 파일과 폴더 목록');
    expect(output('help')).not.toMatch(/^(nmap|awk|collect|serve) - /m);
    for (const name of commands) {
      const manual = output('man ' + name);
      expect(manual.startsWith(name + ' - ')).toBe(true);
      expect(manual).toContain('\n사용법\n');
      expect(manual).toContain('\n예시\n');
      expect(output('help ' + name)).toBe(manual);
    }
    expect(output('man mkdir')).toContain('-v, --verbose');
    expect(output('man grep')).toContain('-v, --invert-match');
    expect(output('help 조사')).toContain('resolve → scan → connect');
    expect(output('help 문법')).toContain('2>&1');
    expect(suggestions(state, 'man nma')).toEqual(['man nmap']);
    expect(suggestions(state, 'help 조')).toEqual(['help 조사']);
  });

  it('공유 폴더의 파일을 만들고 파이프, 인용, 리다이렉션으로 처리한다', () => {
    let state = initialState();
    const run = (input: string) => {
      const result = execute(state, input);
      state = result.state;
      return result.output;
    };
    expect(run('pwd')).toBe('/home/analyst\n');
    expect(run("mkdir -p '실습 폴더/하위' && cd '실습 폴더/하위'")).toBe('');
    expect(run("printf '%s\\n' beta alpha beta > '기록 파일.txt'")).toBe('');
    expect(run("sort < '기록 파일.txt' | uniq -c | grep beta").trim()).toBe('2 beta');
    expect(run("cat *.txt | sed 's/beta/[&]/g' | head -2")).toBe('[beta]\nalpha\n');
    expect(run('export NAME="가상 사용자"; echo "$NAME"')).toBe('가상 사용자\n');
    expect(run("false && echo skipped || echo '$NAME'")).toBe('$NAME\n');
    expect(run('missing 2> error.txt; echo $?')).toBe('127\n');
    expect(run('grep -c missing error.txt')).toBe('1\n');
    expect(suggestions(state, 'cat 기록')).toEqual(['cat 기록\\ 파일.txt']);
    expect(run("mv '기록 파일.txt' result.txt; cp result.txt second.txt; rm second.txt")).toBe('');
    expect(desktopFiles(state)).toContainEqual(
      expect.objectContaining({
        folder: '실습 폴더/하위',
        name: 'result.txt',
        content: 'beta\nalpha\nbeta\n',
      }),
    );
    expect(decodeSave(JSON.stringify(state))).toEqual(state);
  });

  it('열 수 없는 리다이렉션과 구문 오류가 파일을 손상시키지 않는다', () => {
    const state = execute(initialState(), 'echo 원본 > original.txt').state;
    const invalid = execute(state, 'rm original.txt; echo "unclosed');
    expect(invalid.output).toContain('unclosed quote');
    expect(invalid.state.noteFiles).toEqual(state.noteFiles);
    const blocked = execute(state, 'rm original.txt > /etc/hosts');
    expect(blocked.output).toContain('Read-only file system');
    expect(blocked.state.noteFiles).toEqual(state.noteFiles);
    expect(execute(state, 'echo ok > safe.txt; missing 2>&1 | grep -F missing').output).toContain(
      'missing',
    );
  });

  it('가상 루트 권한을 명시적으로 획득하고 기본 사용자 셸로 돌아온다', () => {
    let state = initialState();
    const run = (input: string) => {
      const result = execute(state, input);
      state = result.state;
      return result.output;
    };
    expect(state.terminal).toEqual([]);
    expect(run('whoami; id -u')).toBe('analyst\n1000\n');
    expect(run('cd /root')).toContain('Permission denied');
    expect(run('ip addr add 192.168.50.10/24 dev eth0')).toContain('Operation not permitted');
    expect(run('serve 80')).toContain('Operation not permitted');
    expect(run('su root; whoami')).toMatch(/analyst\n$/);
    run('cd ~/메모; export LABEL=analyst');
    expect(run('sudo su root')).toBe('');
    expect(state.terminal.at(-1)?.prompt).toBe('analyst@hackspot:~/메모$');
    expect(run('whoami; id -u; echo "$HOME"')).toBe('root\n0\n/root\n');
    expect(state.terminal.at(-1)?.prompt).toBe('root@hackspot:/home/analyst/메모#');
    expect(run('cd ~; pwd')).toBe('/root\n');
    expect(run('ip addr add 192.168.50.10/24 dev eth0')).toBe('');
    expect(run('serve 80 /home/analyst')).toContain('Serving HTTP');
    const saved = decodeSave(JSON.stringify(state));
    expect(saved.shell.rootSession).toBeUndefined();
    expect(saved.shell.addresses).toContain('192.168.50.10/24');
    run('export LABEL=root; exit');
    expect(run('whoami; pwd; echo "$LABEL"')).toBe('analyst\n/home/analyst/메모\nanalyst\n');
    expect(run('stop 80')).toContain('Operation not permitted');
  });

  it('가상 주소의 열린 포트, 요청 응답, 바인딩 충돌과 종료를 처리한다', () => {
    let state = initialState();
    const run = (input: string) => {
      const result = execute(state, input);
      state = result.state;
      return result.output;
    };
    run('mkdir -p web; echo hello > web/index.html');
    run('sudo su root');
    run('ip addr add 192.168.50.10/24 dev eth0');
    expect(run('ip -br addr')).toContain('192.168.50.10/24');
    expect(run('ip route')).toContain('192.168.50.0/24');
    expect(run('python3 -m http.server 8080 --bind 192.168.50.10 --directory web &')).toContain(
      'Serving HTTP',
    );
    expect(run('ss -tulnp')).toContain('192.168.50.10:8080');
    expect(run('serve 8080')).toContain('Address already in use');
    expect(run('curl -i http://192.168.50.10:8080/')).toContain('200 OK');
    expect(run('curl http://192.168.50.10:8080/')).toBe('hello\n');
    expect(run('nc -zv localhost 8080')).toContain('Connection refused');
    expect(run('nmap -p 8080,8081 192.168.50.10')).toContain('8081/tcp    closed');
    expect(run('ping -c 1 192.168.50.10')).toContain('1 received');
    run('ip link set eth0 down');
    expect(run('curl http://192.168.50.10:8080/')).toContain('Network is unreachable');
    run('ip link set eth0 up');
    expect(run('curl http://192.168.50.10:8080/')).toBe('hello\n');
    run('exit');
    expect(decodeSave(JSON.stringify(state))).toEqual(state);
    run('stop 8080');
    expect(run('curl http://192.168.50.10:8080/')).toContain('Connection refused');
    expect(run('echo $?')).toBe('7\n');
    expect(run('curl https://example.com')).toContain('Could not resolve host');
  });

  it('가상 SSH와 cat이 조사 서버의 읽기 전용 경계와 진행 기록을 보존한다', () => {
    const [server] = servers;
    let state = reduce(initialState(), { type: 'accept' });
    state = execute(state, 'echo local > 증거/revision.log').state;
    const result = execute(
      state,
      'ssh ' + server.user + '@' + server.domain + ' ' + server.password,
    );
    state = result.state;
    expect(state.session).toBe(server.ip);
    expect(execute(state, 'sudo su root').output).toContain('Operation not permitted');
    expect(execute(state, 'ls /audit').output).toContain('transfer.txt');
    state = execute(state, 'cd /audit; cat transfer.txt | head -1; collect revision.log').state;
    expect(state.readFiles).toContain(server.ip + '/audit/transfer.txt');
    expect(state.evidence).toEqual(['revision']);
    const blocked = execute(state, 'echo overwrite > /audit/revision.log');
    expect(blocked.output).toContain('Read-only file system');
    expect(blocked.state.noteFiles).toEqual(state.noteFiles);
    expect(desktopFiles(blocked.state)).toEqual([
      expect.objectContaining({ id: 'revision', name: 'revision (2).log', readOnly: true }),
      expect.objectContaining({ name: 'revision.log', content: 'local\n' }),
    ]);
    expect(execute(blocked.state, 'exit; pwd').output).toContain('/home/analyst');
  });

  it('이전 저장에는 가상 셸을 기본값으로 추가하고 잘못된 바인딩은 거부한다', () => {
    const current = initialState();
    const old = Object.fromEntries(Object.entries(current).filter(([key]) => key !== 'shell'));
    expect(decodeSave(JSON.stringify(old)).shell).toEqual(current.shell);
    expect(
      decodeSave(JSON.stringify({ ...old, terminal: [{ input: '', output: 'ECHO Shell' }] }))
        .terminal,
    ).toEqual([]);
    expect(() =>
      decodeSave(
        JSON.stringify({
          ...current,
          shell: {
            ...current.shell,
            listeners: [{ port: 8000, address: '192.0.2.99', root: '/' }],
          },
        }),
      ),
    ).toThrow();
  });
});
