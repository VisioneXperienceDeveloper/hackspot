export const SHELL_HOME = '/home/analyst';
export const ROOT_HOME = '/root';
export const LOOPBACK = '127.0.0.1';

export interface Listener {
  port: number;
  address: string;
  root: string;
}

export interface ShellState {
  localDirectory: string;
  remoteDirectory: string;
  previousDirectory: string;
  status: number;
  variables: Record<string, string>;
  addresses: string[];
  linkUp: boolean;
  listeners: Listener[];
  rootSession?: {
    directory: string;
    previousDirectory: string;
    variables: Record<string, string>;
  };
}

export const initialShell = (): ShellState => ({
  localDirectory: SHELL_HOME,
  remoteDirectory: '/',
  previousDirectory: '',
  status: 0,
  variables: {},
  addresses: ['10.17.0.42/24'],
  linkUp: true,
  listeners: [],
});

export function ipv4(address: string): boolean {
  const octets = address.split('.');
  return (
    octets.length === 4 &&
    octets.every((part) => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255)
  );
}

export function cidr(address: string): boolean {
  const [ip, bits, extra] = address.split('/');
  return extra === undefined && ipv4(ip) && /^(0|[1-9]\d?)$/.test(bits) && Number(bits) <= 32;
}

export const variableName = (value: string) => /^[A-Za-z_][A-Za-z0-9_]{0,49}$/.test(value);
export const shellPath = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  value.length <= 512 &&
  !Array.from(value).some((character) => character.charCodeAt(0) < 32);

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function decodeShell(value: unknown): ShellState {
  if (value === undefined) return initialShell();
  if (!record(value)) throw Error('터미널 상태가 올바르지 않습니다.');
  const {
    localDirectory,
    remoteDirectory,
    previousDirectory,
    status,
    variables,
    addresses,
    linkUp,
    listeners,
  } = value;
  if (
    !shellPath(localDirectory) ||
    !shellPath(remoteDirectory) ||
    !(previousDirectory === '' || shellPath(previousDirectory)) ||
    typeof status !== 'number' ||
    !Number.isInteger(status) ||
    status < 0 ||
    status > 255 ||
    !record(variables) ||
    Object.keys(variables).length > 32 ||
    !Object.entries(variables).every(
      ([key, text]) => variableName(key) && typeof text === 'string' && text.length <= 1000,
    ) ||
    !Array.isArray(addresses) ||
    addresses.length > 16 ||
    !addresses.every((address) => typeof address === 'string' && cidr(address)) ||
    new Set(addresses.map((address: string) => address.split('/')[0])).size !== addresses.length ||
    typeof linkUp !== 'boolean' ||
    !Array.isArray(listeners) ||
    listeners.length > 16
  )
    throw Error('터미널 상태가 올바르지 않습니다.');
  const bindings = new Set<string>();
  const services: Listener[] = [];
  for (const listener of listeners as unknown[]) {
    if (!record(listener)) throw Error('가상 서비스 설정이 올바르지 않습니다.');
    const { port, address, root } = listener;
    if (
      typeof port !== 'number' ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      typeof address !== 'string' ||
      !ipv4(address) ||
      !shellPath(root) ||
      (address !== '0.0.0.0' &&
        address !== LOOPBACK &&
        !addresses.some((item: string) => item.split('/')[0] === address)) ||
      bindings.has(port + ':' + address) ||
      services.some(
        (service) =>
          service.port === port && (address === '0.0.0.0' || service.address === '0.0.0.0'),
      )
    )
      throw Error('가상 서비스 설정이 올바르지 않습니다.');
    bindings.add(port + ':' + address);
    services.push({ port, address, root });
  }
  return {
    // Root elevation belongs to the open terminal session, not the saved game.
    localDirectory,
    remoteDirectory,
    previousDirectory,
    status,
    variables: Object.fromEntries(Object.entries(variables)) as Record<string, string>,
    addresses: [...addresses],
    linkUp,
    listeners: services,
  };
}
