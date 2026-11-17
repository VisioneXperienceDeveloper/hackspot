import type { GameState } from '../engine';
import {
  changeDesktopEntry,
  createDesktopFolder,
  desktopFiles,
  staticLocations,
  type DesktopFile,
} from '../desktopFiles';
import { validFileName, type StaticFileId } from '../noteFiles';
import { ROOT_HOME, SHELL_HOME, shellPath } from './state';
import { servers, type VirtualFile } from '../world';

export class ShellError extends Error {
  constructor(
    message: string,
    public code = 1,
  ) {
    super(message);
  }
}

interface Entry {
  directory: boolean;
  content?: string;
  file?: DesktopFile;
  remote?: VirtualFile;
}

export const pathName = (path: string) => path.split('/').at(-1) || '/';
export const pathParent = (path: string) => path.slice(0, path.lastIndexOf('/')) || '/';
export const pathJoin = (parent: string, name: string) =>
  parent === '/' ? '/' + name : parent + '/' + name;
const inside = (path: string, root: string) =>
  root === '/' || path === root || path.startsWith(root + '/');

function absolute(path: string, base: string): string {
  const parts: string[] = [];
  for (const part of (path.startsWith('/') ? path : pathJoin(base, path)).split('/')) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part.normalize('NFC'));
  }
  const result = '/' + parts.join('/');
  if (!shellPath(result)) throw new ShellError('invalid path');
  return result;
}

export function pathPattern(pattern: string): { test(value: string): boolean } {
  const atoms: ('*' | ((character: string) => boolean))[] = [];
  const characters = Array.from(pattern);
  for (let i = 0; i < characters.length; i++) {
    const character = characters[i];
    if (character === '*') {
      if (atoms.at(-1) !== '*') atoms.push('*');
    } else if (character === '?') {
      atoms.push(() => true);
    } else if (character === '\\' && characters[i + 1] !== undefined) {
      const literal = characters[++i];
      atoms.push((value) => value === literal);
    } else if (character === '[') {
      const end = characters.indexOf(']', i + 1);
      const members = end < 0 ? '' : characters.slice(i + 1, end).join('');
      if (/^!?[\w.-]+$/.test(members)) {
        try {
          const regex = new RegExp(
            '^[' + (members.startsWith('!') ? '^' + members.slice(1) : members) + ']$',
            'u',
          );
          atoms.push((value) => regex.test(value));
          i = end;
          continue;
        } catch {
          // Invalid ranges are matched literally.
        }
      }
      atoms.push((value) => value === '[');
    } else atoms.push((value) => value === character);
  }
  return {
    test(value) {
      const input = Array.from(value);
      let matched = [true, ...input.map(() => false)];
      for (const atom of atoms) {
        const next = [atom === '*' && matched[0]];
        for (let i = 0; i < input.length; i++)
          next.push(atom === '*' ? matched[i + 1] || next[i] : matched[i] && atom(input[i]));
        matched = next;
      }
      return matched[input.length];
    },
  };
}
export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class ShellFS {
  constructor(public state: GameState) {}

  get server() {
    return servers.find((server) => server.ip === this.state.session);
  }
  get rootSession() {
    return this.server ? undefined : this.state.shell.rootSession;
  }
  get home() {
    return this.server ? '/' : this.rootSession ? ROOT_HOME : SHELL_HOME;
  }
  get host() {
    return this.server?.domain.split('.')[0] ?? 'hackspot';
  }
  get user() {
    return this.server?.user ?? (this.rootSession ? 'root' : 'analyst');
  }
  get uid() {
    return this.rootSession ? 0 : 1000;
  }
  get variables() {
    return this.rootSession?.variables ?? this.state.shell.variables;
  }
  set variables(variables: Record<string, string>) {
    const shell = this.state.shell;
    const rootSession = this.rootSession;
    this.state = {
      ...this.state,
      shell: rootSession
        ? { ...shell, rootSession: { ...rootSession, variables } }
        : { ...shell, variables },
    };
  }
  get previousDirectory() {
    return this.rootSession?.previousDirectory ?? this.state.shell.previousDirectory;
  }
  get directory() {
    const directory = this.server
      ? this.state.shell.remoteDirectory
      : (this.rootSession?.directory ?? this.state.shell.localDirectory);
    return this.entries().get(directory)?.directory ? directory : this.home;
  }

  path(input: string) {
    return absolute(input, this.directory);
  }

  entries(): Map<string, Entry> {
    const entries = new Map<string, Entry>();
    for (const path of ['/', '/etc', '/dev', '/proc', '/bin', '/tmp'])
      entries.set(path, { directory: true });
    const ip = this.server?.ip ?? this.state.shell.addresses[0]?.split('/')[0];
    const system = {
      '/etc/hostname': this.host + '\n',
      '/etc/hosts': '127.0.0.1 localhost\n' + (ip ? ip + ' ' + this.host + '\n' : ''),
      '/etc/os-release': 'NAME="Hackspot Linux"\nID=hackspot\n',
      '/etc/passwd': this.server
        ? this.user + ':x:1000:1000::/:/bin/bash\n'
        : 'root:x:0:0::/root:/bin/bash\nanalyst:x:1000:1000::/home/analyst:/bin/bash\n',
      '/dev/null': '',
      '/proc/version': 'Linux virtual shell (Hackspot)\n',
    };
    for (const [path, content] of Object.entries(system))
      entries.set(path, { directory: false, content });
    if (this.server) {
      for (const remote of this.server.files) {
        entries.set(remote.path, { directory: false, content: remote.content, remote });
        for (let parent = pathParent(remote.path); parent !== '/'; parent = pathParent(parent))
          entries.set(parent, { directory: true });
      }
      return entries;
    }
    for (const path of ['/home', SHELL_HOME]) entries.set(path, { directory: true });
    if (this.rootSession) entries.set(ROOT_HOME, { directory: true });
    const putDesktopEntry = (path: string, entry: Entry) => {
      entries.set(pathJoin(SHELL_HOME, path), entry);
      if (path.startsWith('tmp/') || (path === 'tmp' && entry.directory))
        entries.set('/' + path, entry);
    };
    for (const path of this.state.folders) putDesktopEntry(path, { directory: true });
    for (const file of desktopFiles(this.state))
      putDesktopEntry(file.folder ? file.folder + '/' + file.name : file.name, {
        directory: false,
        content: file.content,
        file,
      });
    return entries;
  }

  children(path: string, entries = this.entries()) {
    return [...entries.keys()].filter((name) => name !== path && pathParent(name) === path).sort();
  }

  require(path: string): Entry {
    this.checkRootPath(path);
    const entry = this.entries().get(path);
    if (!entry) throw new ShellError(path + ': No such file or directory');
    return entry;
  }

  cd(path: string) {
    const next = this.require(path);
    if (!next.directory) throw new ShellError(path + ': Not a directory');
    const shell = this.state.shell;
    const rootSession = this.rootSession;
    const previousDirectory = this.directory;
    const directoryKey = this.server ? 'remoteDirectory' : 'localDirectory';
    this.state = {
      ...this.state,
      shell: rootSession
        ? { ...shell, rootSession: { ...rootSession, directory: path, previousDirectory } }
        : { ...shell, [directoryKey]: path, previousDirectory },
    };
  }

  read(path: string): string {
    const entry = this.require(path);
    if (entry.directory) throw new ShellError(path + ': Is a directory');
    if (entry.remote && this.server) {
      const readId = this.server.ip + path;
      const log = '문서 열람 · ' + entry.remote.title;
      if (!this.state.readFiles.includes(readId) || !this.state.log.includes(log))
        this.state = {
          ...this.state,
          readFiles: this.state.readFiles.includes(readId)
            ? this.state.readFiles
            : [...this.state.readFiles, readId],
          log: this.state.log.includes(log) ? this.state.log : [...this.state.log, log],
        };
    }
    return entry.content ?? '';
  }

  private checkRootPath(path: string) {
    if (!this.server && !this.rootSession && inside(path, ROOT_HOME))
      throw new ShellError(path + ': Permission denied');
  }

  private desktopPath(path: string): string {
    if (this.server) throw new ShellError(path + ': Read-only file system');
    this.checkRootPath(path);
    if (path.startsWith(SHELL_HOME + '/')) return path.slice(SHELL_HOME.length + 1);
    if (path.startsWith('/tmp/')) return path.slice(1);
    throw new ShellError(path + ': Read-only file system');
  }

  private ensureTmp(path: string) {
    if (!path.startsWith('/tmp/') || this.state.folders.includes('tmp')) return;
    const result = createDesktopFolder(this.state, '', 'tmp');
    if (result.error) throw new ShellError('/tmp: ' + result.error);
    this.state = result.state;
  }

  mkdir(path: string, parents = false) {
    const present = this.entries().get(path);
    if (present) {
      if (parents && present.directory) return;
      throw new ShellError(path + ': File exists');
    }
    const stored = this.desktopPath(path);
    const previous = this.state;
    try {
      this.ensureTmp(path);
      const parent = pathParent(path);
      if (parents && !this.entries().has(parent)) this.mkdir(parent, true);
      if (!this.require(parent).directory) throw new ShellError(parent + ': Not a directory');
      const folder = stored.slice(0, stored.lastIndexOf('/') + 1).replace(/\/$/, '');
      const result = createDesktopFolder(this.state, folder, pathName(path));
      if (result.error) throw new ShellError(path + ': ' + result.error);
      this.state = result.state;
    } catch (error) {
      this.state = previous;
      throw error;
    }
  }

  write(path: string, content: string, append = false) {
    if (path === '/dev/null') return;
    const stored = this.desktopPath(path);
    const entry = this.entries().get(path);
    if (entry?.directory) throw new ShellError(path + ': Is a directory');
    if (entry?.file?.readOnly) throw new ShellError(path + ': Read-only file');
    const name = pathName(path);
    const text = (append ? (entry?.content ?? '') : '') + content;
    if (!validFileName(name) || text.length > 10000)
      throw new ShellError(path + ': Invalid name or file exceeds 10000 characters');
    if (!entry && this.state.noteFiles.length >= 100) throw new ShellError('File limit reached');
    if (!this.require(pathParent(path)).directory) throw new ShellError(path + ': Not a directory');
    const previous = this.state;
    try {
      this.ensureTmp(path);
      const folder = stored.slice(0, stored.lastIndexOf('/') + 1).replace(/\/$/, '');
      const id = entry?.file?.noteId;
      const updated = {
        id: id ?? crypto.randomUUID(),
        name,
        folder,
        content: text,
        updatedAt: Date.now(),
      };
      this.state = {
        ...this.state,
        noteFiles: id
          ? this.state.noteFiles.map((file) => (file.id === id ? updated : file))
          : [...this.state.noteFiles, updated],
      };
    } catch (error) {
      this.state = previous;
      throw error;
    }
  }

  remove(path: string, recursive: boolean, force = false, directoryOnly = false) {
    const entry = this.entries().get(path);
    if (!entry && force) return;
    if (!entry) this.require(path);
    const stored = this.desktopPath(path);
    if (entry?.directory) {
      if (!recursive && !directoryOnly) throw new ShellError(path + ': Is a directory');
      if (!recursive && this.children(path).length)
        throw new ShellError(path + ': Directory not empty');
      const reserved = (Object.keys(staticLocations) as StaticFileId[]).some((id) =>
        inside((this.state.fileLocations[id] ?? staticLocations[id]).folder, stored),
      );
      if (reserved)
        throw new ShellError(path + ': Directory contains protected evidence locations');
      this.state = {
        ...this.state,
        folders: this.state.folders.filter((folder) => !inside(folder, stored)),
        noteFiles: this.state.noteFiles.filter((file) => !inside(file.folder, stored)),
      };
      return;
    }
    if (directoryOnly) throw new ShellError(path + ': Not a directory');
    if (!entry?.file?.noteId) throw new ShellError(path + ': Read-only file');
    this.state = {
      ...this.state,
      noteFiles: this.state.noteFiles.filter((file) => file.id !== entry.file?.noteId),
    };
  }

  copy(source: string, destination: string, recursive: boolean, noClobber: boolean) {
    const entries = this.entries();
    const entry = this.require(source);
    const canonical = (path: string) =>
      path === '/tmp' || path.startsWith('/tmp/') ? SHELL_HOME + path : path;
    if (canonical(source) === canonical(destination))
      throw new ShellError(source + ': source and destination are the same file');
    if (entry.directory && !recursive)
      throw new ShellError(source + ': omitting directory (use -r)');
    if (entry.directory && inside(canonical(destination), canonical(source)))
      throw new ShellError(source + ': cannot copy a directory into itself');
    if (!this.require(pathParent(destination)).directory)
      throw new ShellError(destination + ': Not a directory');
    const previous = this.state;
    try {
      if (entry.directory) {
        for (const [path, child] of [...entries].sort(([a], [b]) => a.length - b.length)) {
          if (!inside(path, source)) continue;
          const suffix = path === source ? '' : source === '/' ? path : path.slice(source.length);
          const target = destination + suffix;
          if (child.directory) this.mkdir(target, true);
          else if (!noClobber || !this.entries().has(target)) this.write(target, this.read(path));
        }
      } else if (!noClobber || !entries.has(destination))
        this.write(destination, this.read(source));
    } catch (error) {
      this.state = previous;
      throw error;
    }
  }

  move(source: string, destination: string, noClobber: boolean) {
    const from = this.require(source);
    const sourcePath = this.desktopPath(source);
    const targetPath = this.desktopPath(destination);
    if (sourcePath === targetPath) return;
    const target = this.entries().get(destination);
    if (target && noClobber) return;
    const previous = this.state;
    try {
      this.ensureTmp(destination);
      if (target) {
        if (from.directory || target.directory || !target.file?.noteId)
          throw new ShellError(destination + ': cannot overwrite this entry');
        this.remove(destination, false);
      }
      const folder = targetPath.slice(0, targetPath.lastIndexOf('/') + 1).replace(/\/$/, '');
      if (!from.directory && !from.file) throw new ShellError(source + ': Read-only file');
      const entry = from.directory
        ? { type: 'folder' as const, path: sourcePath }
        : { type: 'file' as const, id: from.file!.id };
      const result = changeDesktopEntry(this.state, entry, 'move', folder, pathName(destination));
      if (result.error) throw new ShellError(result.error);
      this.state = result.state;
      if (result.folderChange) {
        const oldPath = SHELL_HOME + '/' + result.folderChange.from;
        const newPath = SHELL_HOME + '/' + result.folderChange.to;
        const movedDirectory = (cwd: string) => {
          const current = cwd.startsWith('/tmp/') ? SHELL_HOME + cwd : cwd;
          return inside(current, oldPath) ? newPath + current.slice(oldPath.length) : cwd;
        };
        const shell = this.state.shell;
        const rootSession = shell.rootSession;
        this.state = {
          ...this.state,
          shell: {
            ...shell,
            localDirectory: movedDirectory(shell.localDirectory),
            ...(rootSession
              ? {
                  rootSession: { ...rootSession, directory: movedDirectory(rootSession.directory) },
                }
              : {}),
          },
        };
      }
    } catch (error) {
      this.state = previous;
      throw error;
    }
  }

  glob(pattern: string): string[] {
    const rooted = pattern.startsWith('/');
    const parts = pattern.split('/').filter(Boolean);
    let paths = [{ path: rooted ? '/' : this.directory, label: rooted ? '/' : '' }];
    const entries = this.entries();
    for (const part of parts) {
      const match = pathPattern(part);
      paths = paths.flatMap(({ path, label }) => {
        const wildcard = /[\\*?[]/.test(part);
        const names = wildcard
          ? this.children(path, entries)
              .map(pathName)
              .filter((name) => (part.startsWith('.') || !name.startsWith('.')) && match.test(name))
          : [part];
        return names
          .map((name) => ({
            path: absolute(name, path),
            label: label ? pathJoin(label, name) : name,
          }))
          .filter((item) => entries.has(item.path));
      });
    }
    return paths.map(({ label }) => label);
  }
}
