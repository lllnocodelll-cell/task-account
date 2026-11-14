export type BackgroundThemeId =
  | 'arquitetura'
  | 'prisma'
  | 'aurora'
  | 'dunas'
  | 'horizonte'
  | 'nebulosa'
  | 'none';

export interface BackgroundThemeOption {
  id: BackgroundThemeId;
  name: string;
  description: string;
  lightImage?: string;
  darkImage?: string;
}

export const DEFAULT_BACKGROUND_THEME: BackgroundThemeId = 'arquitetura';

export const BACKGROUND_THEMES: BackgroundThemeOption[] = [
  {
    id: 'arquitetura',
    name: 'Arquitetura Fluida',
    description: 'Fitas esculturais translúcidas com profundidade minimalista.',
    lightImage: '/bg-glass-light.jpg',
    darkImage: '/bg-glass-dark.jpg',
  },
  {
    id: 'prisma',
    name: 'Prisma Cristal',
    description: 'Facetas geométricas de vidro com refrações sutis em azul e índigo.',
    lightImage: '/bg-theme-prisma-light.jpg',
  },
  {
    id: 'aurora',
    name: 'Aurora Boreal',
    description: 'Ondas de luz sedosas em tons de esmeralda, ciano e índigo.',
  },
  {
    id: 'dunas',
    name: 'Dunas de Seda',
    description: 'Curvas arquitetônicas suaves em areia clara ou ônix dourado.',
  },
  {
    id: 'horizonte',
    name: 'Horizonte Alpino',
    description: 'Camadas atmosféricas em azul cobalto e neblina minimalista.',
  },
  {
    id: 'nebulosa',
    name: 'Nebulosa Índigo',
    description: 'Esferas foscas e anéis orbitais com iluminação de estúdio.',
  },
  {
    id: 'none',
    name: 'Clássico (Sem imagem)',
    description: 'Fundo sólido tradicional sem papel de parede.',
  },
];

const VALID_THEME_IDS = new Set<BackgroundThemeId>(BACKGROUND_THEMES.map((t) => t.id));

export const isValidBackgroundTheme = (value: unknown): value is BackgroundThemeId => {
  return typeof value === 'string' && VALID_THEME_IDS.has(value as BackgroundThemeId);
};

const getThemeStorageKey = (userId?: string) => `taskaccount:bg_theme:${userId || 'guest'}`;

export const getStoredBackgroundTheme = (userId?: string): BackgroundThemeId | null => {
  try {
    const raw = window.localStorage.getItem(getThemeStorageKey(userId));
    return isValidBackgroundTheme(raw) ? raw : null;
  } catch {
    return null;
  }
};

export const setStoredBackgroundTheme = (userId: string | undefined, themeId: BackgroundThemeId): void => {
  try {
    window.localStorage.setItem(getThemeStorageKey(userId), themeId);
  } catch {
    // Ignore storage quota/private mode errors silently
  }
};
