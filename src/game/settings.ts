export type Wallpaper = 'ocean' | 'midnight' | 'dusk';
export type ClockFormat = '24h' | '12h';

export interface GameSettings {
  wallpaper: Wallpaper;
  animations: boolean;
  clockFormat: ClockFormat;
  showDesktopShortcuts: boolean;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  wallpaper: 'ocean',
  animations: true,
  clockFormat: '24h',
  showDesktopShortcuts: true,
};

export const DEFAULT_SETTINGS_CONTENT = JSON.stringify(DEFAULT_GAME_SETTINGS, null, 2);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isWallpaper(value: unknown): value is Wallpaper {
  return value === 'ocean' || value === 'midnight' || value === 'dusk';
}

export function parseGameSettings(content: string): { settings: GameSettings; error: string } {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return { settings: DEFAULT_GAME_SETTINGS, error: 'JSON 형식이 올바르지 않습니다.' };
  }
  if (!isRecord(value))
    return { settings: DEFAULT_GAME_SETTINGS, error: '설정은 JSON 객체여야 합니다.' };

  const allowedKeys = ['wallpaper', 'animations', 'clockFormat', 'showDesktopShortcuts'];
  const unknownKey = Object.keys(value).find((key) => !allowedKeys.includes(key));
  if (unknownKey)
    return { settings: DEFAULT_GAME_SETTINGS, error: `알 수 없는 설정 항목: ${unknownKey}` };

  const wallpaper = Object.prototype.hasOwnProperty.call(value, 'wallpaper')
    ? value.wallpaper
    : DEFAULT_GAME_SETTINGS.wallpaper;
  const animations = Object.prototype.hasOwnProperty.call(value, 'animations')
    ? value.animations
    : DEFAULT_GAME_SETTINGS.animations;
  const clockFormat = Object.prototype.hasOwnProperty.call(value, 'clockFormat')
    ? value.clockFormat
    : DEFAULT_GAME_SETTINGS.clockFormat;
  const showDesktopShortcuts = Object.prototype.hasOwnProperty.call(value, 'showDesktopShortcuts')
    ? value.showDesktopShortcuts
    : DEFAULT_GAME_SETTINGS.showDesktopShortcuts;
  if (!isWallpaper(wallpaper))
    return {
      settings: DEFAULT_GAME_SETTINGS,
      error: 'wallpaper는 ocean, midnight, dusk 중 하나여야 합니다.',
    };
  if (typeof animations !== 'boolean')
    return { settings: DEFAULT_GAME_SETTINGS, error: 'animations는 true 또는 false여야 합니다.' };
  if (clockFormat !== '24h' && clockFormat !== '12h')
    return { settings: DEFAULT_GAME_SETTINGS, error: 'clockFormat은 24h 또는 12h여야 합니다.' };
  if (typeof showDesktopShortcuts !== 'boolean')
    return {
      settings: DEFAULT_GAME_SETTINGS,
      error: 'showDesktopShortcuts는 true 또는 false여야 합니다.',
    };

  return {
    settings: { wallpaper, animations, clockFormat, showDesktopShortcuts },
    error: '',
  };
}
