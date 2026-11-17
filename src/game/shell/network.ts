import { countArgs, integer, line, lines, options, type Command } from './command';
import { pathJoin, pathName, ShellError, ShellFS } from './filesystem';
import { LOOPBACK, cidr, type Listener } from './state';
import { servers, sites } from '../world';

const webAddresses = new Map([
  ['haeon.test', '10.17.0.11'],
  ['tide.test', '10.17.0.12'],
  ['archive.test', '10.17.0.13'],
]);
const addressOnly = (cidrs: string[]) => cidrs.map((address) => address.split('/')[0]);
export const localAddresses = (fs: ShellFS) =>
  fs.state.shell.linkUp ? addressOnly(fs.state.shell.addresses) : [];
const serverAddress = (fs: ShellFS) => fs.server?.ip;
function resolveHost(fs: ShellFS, host: string) {
  const name = host.toLowerCase().replace(/\.$/, '');
  if (name === 'localhost' || name === LOOPBACK || name === '::1') return LOOPBACK;
  if (name === 'hackspot') return fs.server ? localAddresses(fs)[0] : LOOPBACK;
  if (webAddresses.has(name)) return webAddresses.get(name);
  const server = servers.find((server) => name === server.domain || name === server.ip);
  if (server) return server.ip;
  if (
    addressOnly(fs.state.shell.addresses).includes(name) ||
    [...webAddresses.values()].includes(name)
  )
    return name;
}

function isLocal(fs: ShellFS, address: string) {
  return (address === LOOPBACK && !fs.server) || localAddresses(fs).includes(address);
}

function hasRoute(fs: ShellFS, address: string) {
  if (addressOnly(fs.state.shell.addresses).includes(address) && !fs.state.shell.linkUp)
    return false;
  return (
    address === LOOPBACK ||
    !!fs.server ||
    (fs.state.shell.linkUp && fs.state.shell.addresses.length > 0)
  );
}

function portOpen(fs: ShellFS, address: string, port: number) {
  if (!hasRoute(fs, address)) return false;
  if (address === LOOPBACK && fs.server)
    return port === 22 || (port === 80 && webAddresses.has(fs.server.domain));
  if (isLocal(fs, address)) return !!listenerFor(fs, address, port);
  return (
    (port === 22 && servers.some((server) => server.ip === address)) ||
    (port === 80 && [...webAddresses.values()].includes(address))
  );
}

function listenerFor(fs: ShellFS, address: string, port: number) {
  return fs.state.shell.listeners.find(
    (item) => item.port === port && (item.address === address || item.address === '0.0.0.0'),
  );
}

function setNetwork(fs: ShellFS, patch: Partial<typeof fs.state.shell>) {
  if (fs.server) throw new ShellError('Operation not permitted on the investigation server');
  fs.state = { ...fs.state, shell: { ...fs.state.shell, ...patch } };
}

function requireNetworkRoot(fs: ShellFS) {
  if (fs.server) throw new ShellError('Operation not permitted on the investigation server');
  if (!fs.rootSession) throw new ShellError('Operation not permitted. Run sudo su root first.');
}

function route(address: string) {
  const [ip, prefix] = address.split('/');
  const bits = Number(prefix);
  const value = ip.split('.').reduce((result, part) => ((result << 8) | Number(part)) >>> 0, 0);
  const network = bits ? value & (0xffffffff << (32 - bits)) : 0;
  return [24, 16, 8, 0].map((shift) => (network >>> shift) & 255).join('.') + '/' + bits;
}

const ip: Command = (fs, input) => {
  const brief = input[0] === '-br' || input[0] === '-brief';
  const args = brief ? input.slice(1) : input;
  const [category = '', operation = 'show', ...rest] = args;
  const addresses = fs.server ? [fs.server.ip + '/24'] : fs.state.shell.addresses;
  const up = !!fs.server || fs.state.shell.linkUp;
  if (['r', 'route'].includes(category) && ['show', 'list'].includes(operation) && !rest.length)
    return up
      ? lines(
          addresses.map(
            (address) =>
              route(address) + ' dev eth0 proto kernel scope link src ' + address.split('/')[0],
          ),
        )
      : '';
  const addressCommand = ['a', 'addr', 'address'].includes(category);
  const linkCommand = ['l', 'link'].includes(category);
  if ((addressCommand || linkCommand) && ['show', 'list', 'ls', 'dev'].includes(operation)) {
    const selected = operation === 'dev' ? rest[0] : rest[0] === 'dev' ? rest[1] : rest[0];
    if (selected && !['lo', 'eth0'].includes(selected))
      throw new ShellError('Device "' + selected + '" does not exist');
    const loopback = brief
      ? 'lo               UNKNOWN        127.0.0.1/8'
      : '1: lo: <LOOPBACK,UP> mtu 65536 state UNKNOWN' +
        (addressCommand ? '\n    inet 127.0.0.1/8 scope host lo' : '');
    const ethernet = brief
      ? 'eth0             ' + (up ? 'UP             ' : 'DOWN           ') + addresses.join(' ')
      : '2: eth0: <BROADCAST,MULTICAST' +
        (up ? ',UP,LOWER_UP' : '') +
        '> mtu 1500 state ' +
        (up ? 'UP' : 'DOWN') +
        (addressCommand
          ? addresses.map((address) => '\n    inet ' + address + ' scope global eth0').join('')
          : '');
    return lines(
      selected === 'lo' ? [loopback] : selected === 'eth0' ? [ethernet] : [loopback, ethernet],
    );
  }
  if (linkCommand && operation === 'set') {
    const [device, status, ...extra] = rest[0] === 'dev' ? rest.slice(1) : rest;
    if (device !== 'eth0' || !['up', 'down'].includes(status) || extra.length)
      throw new ShellError('usage: ip link set eth0 up|down', 2);
    requireNetworkRoot(fs);
    setNetwork(fs, { linkUp: status === 'up' });
    return '';
  }
  if (addressCommand && ['add', 'del', 'delete', 'replace', 'flush'].includes(operation)) {
    requireNetworkRoot(fs);
    if (operation === 'flush') {
      if (rest.join(' ') !== 'dev eth0') throw new ShellError('usage: ip addr flush dev eth0', 2);
      setNetwork(fs, {
        addresses: [],
        listeners: fs.state.shell.listeners.filter((item) =>
          ['0.0.0.0', LOOPBACK].includes(item.address),
        ),
      });
      return '';
    }
    const [address, dev, name, ...extra] = rest;
    if (!address || !cidr(address) || dev !== 'dev' || name !== 'eth0' || extra.length)
      throw new ShellError('usage: ip addr add|del|replace ADDRESS/PREFIX dev eth0', 2);
    const host = address.split('/')[0];
    const old = fs.state.shell.addresses.find((item) => item.split('/')[0] === host);
    if (operation === 'del' || operation === 'delete') {
      if (old !== address)
        throw new ShellError('RTNETLINK answers: Cannot assign requested address');
      setNetwork(fs, {
        addresses: fs.state.shell.addresses.filter((item) => item !== address),
        listeners: fs.state.shell.listeners.filter((item) => item.address !== host),
      });
    } else {
      if (
        Number(host.split('.')[0]) === 0 ||
        host.startsWith('127.') ||
        Number(host.split('.')[0]) >= 224 ||
        [...webAddresses.values()].includes(host) ||
        servers.some((server) => server.ip === host)
      )
        throw new ShellError('Address is reserved in this network');
      if (old && operation === 'add') throw new ShellError('RTNETLINK answers: File exists');
      if (!old && fs.state.shell.addresses.length >= 16)
        throw new ShellError('Address limit reached');
      setNetwork(fs, {
        addresses: [...fs.state.shell.addresses.filter((item) => item !== old), address],
      });
    }
    return '';
  }
  return line(
    'Usage: ip [-br] addr show | ip addr add|del ADDRESS/PREFIX dev eth0 | ip link set eth0 up|down | ip route',
  );
};

function listening(fs: ShellFS): Listener[] {
  if (!fs.server) return fs.state.shell.listeners;
  const ports = webAddresses.has(fs.server.domain) ? [22, 80] : [22];
  return ports.map((port) => ({ port, address: '0.0.0.0', root: '/' }));
}
const processId = (item: Listener) => item.port + 1000;
const sockets: Command = (fs, args) => {
  const { enabled, operands } = options(args, 'tulnap46', '', {
    '--tcp': 't',
    '--udp': 'u',
    '--listening': 'l',
    '--numeric': 'n',
    '--all': 'a',
    '--processes': 'p',
  });
  countArgs(operands, 0, 0);
  const output = ['Netid  State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port'];
  if (!enabled.has('6') && (!enabled.has('u') || enabled.has('t'))) {
    for (const item of listening(fs))
      output.push(
        'tcp    LISTEN  0       128     ' +
          item.address +
          ':' +
          item.port +
          '          0.0.0.0:*' +
          (enabled.has('p')
            ? '  ' + (fs.server && item.port === 22 ? 'sshd' : 'httpd') + ',pid=' + processId(item)
            : ''),
      );
  }
  return lines(output);
};

const serve: Command = (fs, args) => {
  const { operands, values } = options(args, '', 'bd', { '--bind': 'b', '--directory': 'd' });
  countArgs(operands, 0, 2);
  const port = integer(operands[0] ?? '8000', 1, 65535);
  if (port < 1024) requireNetworkRoot(fs);
  const address = values.get('b') ?? '0.0.0.0';
  if (!['0.0.0.0', LOOPBACK, ...addressOnly(fs.state.shell.addresses)].includes(address))
    throw new ShellError('Cannot assign requested address: ' + address);
  if (
    fs.state.shell.listeners.some(
      (item) =>
        item.port === port &&
        (item.address === address || item.address === '0.0.0.0' || address === '0.0.0.0'),
    )
  )
    throw new ShellError('Address already in use: ' + address + ':' + port);
  if (fs.state.shell.listeners.length >= 16) throw new ShellError('Listener limit reached');
  const root = fs.path(values.get('d') ?? operands[1] ?? '.');
  fs.require(root);
  setNetwork(fs, { listeners: [...fs.state.shell.listeners, { address, port, root }] });
  return line(
    'Serving HTTP on ' +
      address +
      ':' +
      port +
      ' from ' +
      root +
      ' (virtual PID ' +
      (port + 1000) +
      ')',
  );
};

function request(fs: ShellFS, target: string) {
  let url: URL;
  try {
    url = new URL(target.includes('://') ? target : 'http://' + target);
  } catch {
    throw new ShellError('malformed URL', 3);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    throw new ShellError('unsupported protocol', 1);
  const address = resolveHost(fs, url.hostname);
  if (!address) throw new ShellError('Could not resolve host: ' + url.hostname, 6);
  if (!hasRoute(fs, address)) throw new ShellError('Network is unreachable', 7);
  const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
  const listener = isLocal(fs, address) ? listenerFor(fs, address, port) : undefined;
  let path: string;
  try {
    path = decodeURIComponent(url.pathname).normalize('NFC');
  } catch {
    throw new ShellError('malformed URL path', 3);
  }
  let body: string | undefined;
  let type = 'text/plain; charset=utf-8';
  if (listener && url.protocol === 'http:') {
    const local = fs.server ? new ShellFS({ ...fs.state, session: null }) : fs;
    const entries = local.entries();
    const root = entries.get(listener.root);
    const relative = path.split('/').filter(Boolean);
    if (!relative.includes('..') && !relative.includes('.') && root) {
      const target = root.directory ? relative.reduce(pathJoin, listener.root) : listener.root;
      const entry = entries.get(target);
      if (entry?.directory) {
        const index = entries.get(pathJoin(target, 'index.html'));
        if (index && !index.directory) {
          body = index.content;
          type = 'text/html; charset=utf-8';
        } else body = lines(local.children(target, entries).map(pathName));
      } else if (
        entry &&
        (root.directory || !relative.length || pathName(listener.root) === relative.join('/'))
      ) {
        body = entry.content;
        if (target.endsWith('.html')) type = 'text/html; charset=utf-8';
        else if (target.endsWith('.csv')) type = 'text/csv; charset=utf-8';
      }
    }
  } else if (port === 80 && url.protocol === 'http:' && portOpen(fs, address, port)) {
    const webAddress = address === LOOPBACK ? serverAddress(fs) : address;
    const site = sites.find((site) => webAddresses.get(site.host) === webAddress);
    const page = site?.pages.find(
      (page) => page.path === path.replace(/\/$/, '') || (path === '/' && page.path === '/'),
    );
    if (page && site) {
      body = lines([
        page.title,
        page.intro,
        ...page.paragraphs,
        ...(page.table?.map((row) => row.join('\t')) ?? []),
      ]);
      if (fs.state.accepted && !fs.state.visited.includes(site.host + page.path)) {
        const event = '웹 열람 · ' + page.title;
        fs.state = {
          ...fs.state,
          visited: [...fs.state.visited, site.host + page.path],
          log: fs.state.log.includes(event) ? fs.state.log : [...fs.state.log, event],
        };
      }
    }
  } else
    throw new ShellError(
      'Failed to connect to ' + url.hostname + ' port ' + port + ': Connection refused',
      7,
    );
  const status = body === undefined ? '404 Not Found' : '200 OK';
  return { status, type, body: body ?? line('404 Not Found'), path };
}

const lookup: Command = (fs, args) => {
  const { enabled, operands } = options(
    args.filter((arg) => arg !== '+short'),
    '4',
  );
  countArgs(operands, 1, 2);
  const host = operands[0] === 'hosts' ? operands[1] : operands[0];
  const address = resolveHost(fs, host ?? '');
  if (!address) throw new ShellError('Name or service not known: ' + (host ?? ''), 1);
  return line(args.includes('+short') || enabled.has('4') ? address : address + '\t' + host);
};

export const networkCommands: Record<string, Command> = {
  ip,
  ifconfig: (fs, args) => ip(fs, ['addr', 'show', ...args.filter((arg) => arg !== '-a')], ''),
  ss: sockets,
  netstat: sockets,
  serve,
  python3(fs, args) {
    if (args[0] !== '-m' || args[1] !== 'http.server')
      throw new ShellError(
        'supported invocation: python3 -m http.server [PORT] [--bind IP] [--directory PATH]',
        2,
      );
    return serve(fs, args.slice(2), '');
  },
  stop(fs, args) {
    countArgs(args, 1, 1);
    const port = integer(args[0], 1, 65535);
    if (port < 1024) requireNetworkRoot(fs);
    if (!fs.state.shell.listeners.some((item) => item.port === port))
      throw new ShellError('No listener on port ' + port);
    setNetwork(fs, { listeners: fs.state.shell.listeners.filter((item) => item.port !== port) });
    return line('Stopped HTTP listener on port ' + port);
  },
  ps(fs, args) {
    const { operands } = options(
      args.filter((arg) => arg !== 'aux'),
      'auefx',
    );
    countArgs(operands, 0, 0);
    return lines([
      '  PID TTY      COMMAND',
      '    1 pts/0    shell',
      ...listening(fs).map(
        (item) =>
          String(processId(item)).padStart(5) +
          ' ?        ' +
          (fs.server && item.port === 22 ? 'sshd' : 'httpd :' + item.port),
      ),
    ]);
  },
  kill(fs, args) {
    const operands =
      args[0] && ['-9', '-15', '-TERM', '-KILL'].includes(args[0]) ? args.slice(1) : args;
    countArgs(operands, 1, 1);
    const pid = integer(operands[0], 1);
    const listener = fs.state.shell.listeners.find((item) => processId(item) === pid);
    if (!listener) throw new ShellError('No such process: ' + pid);
    if (listener.port < 1024) requireNetworkRoot(fs);
    setNetwork(fs, {
      listeners: fs.state.shell.listeners.filter((item) => processId(item) !== pid),
    });
    return '';
  },
  ping(fs, args) {
    const { enabled, values, operands } = options(args, 'nq4', 'cW');
    countArgs(operands, 1, 1);
    const host = operands[0];
    const address = resolveHost(fs, host);
    if (!address) throw new ShellError(host + ': Name or service not known', 2);
    if (!hasRoute(fs, address)) throw new ShellError('Network is unreachable', 2);
    const count = integer(values.get('c') ?? '4', 1, 20);
    const replies = Array.from(
      { length: count },
      (_, index) =>
        '64 bytes from ' + address + ': icmp_seq=' + (index + 1) + ' ttl=64 time=0.100 ms',
    );
    return lines([
      'PING ' + host + ' (' + address + ')',
      ...(!enabled.has('q') ? replies : []),
      '',
      '--- ' + host + ' ping statistics ---',
      count + ' packets transmitted, ' + count + ' received, 0% packet loss (virtual)',
    ]);
  },
  curl(fs, args) {
    const { enabled, operands, values } = options(args, 'siIfSL', 'o', {
      '--silent': 's',
      '--include': 'i',
      '--head': 'I',
      '--fail': 'f',
      '--show-error': 'S',
      '--location': 'L',
      '--output': 'o',
    });
    countArgs(operands, 1, 1);
    let response: ReturnType<typeof request>;
    try {
      response = request(fs, operands[0]);
    } catch (error) {
      if (error instanceof ShellError && enabled.has('s') && !enabled.has('S'))
        return { out: '', code: error.code };
      throw error;
    }
    if (response.status.startsWith('404') && enabled.has('f'))
      return {
        out: '',
        code: 22,
        error:
          enabled.has('s') && !enabled.has('S')
            ? undefined
            : 'The requested URL returned error: 404',
      };
    const headers = lines([
      'HTTP/1.1 ' + response.status,
      'Content-Type: ' + response.type,
      'Content-Length: ' + new TextEncoder().encode(response.body).length,
      '',
    ]);
    const output = enabled.has('I') ? headers : (enabled.has('i') ? headers : '') + response.body;
    if (values.has('o') && values.get('o') !== '-') {
      fs.write(fs.path(values.get('o')!), output);
      return '';
    }
    return output;
  },
  wget(fs, args) {
    const { operands, values } = options(args, 'q', 'O', {
      '--quiet': 'q',
      '--output-document': 'O',
    });
    countArgs(operands, 1, 1);
    const response = request(fs, operands[0]);
    if (response.status.startsWith('404')) throw new ShellError('ERROR 404: Not Found', 8);
    const file =
      values.get('O') ?? (response.path.endsWith('/') ? 'index.html' : pathName(response.path));
    if (file === '-') return response.body;
    fs.write(fs.path(file), response.body);
    return line("Saved to '" + file + "'");
  },
  nc(fs, args) {
    const { operands } = options(args, 'zvn4', 'w');
    countArgs(operands, 2, 2);
    const address = resolveHost(fs, operands[0]);
    const port = integer(operands[1], 1, 65535);
    if (!address) throw new ShellError('Name or service not known: ' + operands[0]);
    if (!portOpen(fs, address, port))
      throw new ShellError(
        'connect to ' + operands[0] + ' port ' + port + ' failed: Connection refused',
      );
    return line('Connection to ' + operands[0] + ' ' + port + ' port [tcp] succeeded!');
  },
  nmap(fs, input) {
    const args = input.filter((arg) => !['-Pn', '-sV', '-sT'].includes(arg));
    const { operands, values } = options(args, 'n', 'p');
    countArgs(operands, 1, 1);
    const address = resolveHost(fs, operands[0]);
    if (!address) throw new ShellError('Failed to resolve ' + operands[0]);
    if (!hasRoute(fs, address)) throw new ShellError('Network is unreachable');
    const defaultPorts = [22, 80, 443, ...fs.state.shell.listeners.map((item) => item.port)];
    const ports = values.has('p')
      ? values
          .get('p')!
          .split(',')
          .flatMap((value) => {
            const [start, end, extra] = value.split('-');
            const from = integer(start, 1, 65535);
            const to = end === undefined ? from : integer(end, from, 65535);
            if (extra !== undefined || to - from >= 256)
              throw new ShellError('port scan supports ranges of up to 256 ports');
            return Array.from({ length: to - from + 1 }, (_, index) => from + index);
          })
      : defaultPorts;
    if (ports.length > 256) throw new ShellError('port scan supports up to 256 ports');
    const output: string[] = [];
    for (const port of [...new Set(ports)].sort((a, b) => a - b)) {
      const open = portOpen(fs, address, port);
      if (!open && !values.has('p')) continue;
      const service =
        isLocal(fs, address) && listenerFor(fs, address, port)
          ? 'http'
          : port === 22
            ? 'ssh'
            : port === 80
              ? 'http'
              : port === 443
                ? 'https'
                : 'unknown';
      output.push(port + '/tcp    ' + (open ? 'open' : 'closed') + '    ' + service);
    }
    return lines([
      'Nmap scan report for ' + operands[0] + ' (' + address + ')',
      'PORT       STATE    SERVICE',
      ...output,
    ]);
  },
  dig: lookup,
  host: lookup,
  nslookup: lookup,
  getent: lookup,
};
