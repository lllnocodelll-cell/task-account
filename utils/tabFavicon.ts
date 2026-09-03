export interface TabMeta {
  title: string;
  color: string;
  svgIcon: string;
}

export const TAB_CONFIG: Record<string, TabMeta> = {
  dashboard: {
    title: 'Dashboard',
    color: '#6366f1', // Indigo
    svgIcon: `
      <rect width="7" height="9" x="3" y="3" rx="1"/>
      <rect width="7" height="5" x="14" y="3" rx="1"/>
      <rect width="7" height="9" x="14" y="12" rx="1"/>
      <rect width="7" height="5" x="3" y="16" rx="1"/>
    `
  },
  tasks: {
    title: 'Tarefas',
    color: '#0ea5e9', // Sky
    svgIcon: `
      <rect x="3" y="5" width="6" height="6" rx="1"/>
      <path d="m3 17 2 2 4-4"/>
      <path d="M13 6h8"/>
      <path d="M13 12h8"/>
      <path d="M13 18h8"/>
    `
  },
  clients: {
    title: 'Cadastros',
    color: '#f59e0b', // Amber
    svgIcon: `
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    `
  },
  chat: {
    title: 'Chat',
    color: '#8b5cf6', // Violet
    svgIcon: `
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <path d="M8 10h.01"/>
      <path d="M12 10h.01"/>
      <path d="M16 10h.01"/>
    `
  },
  settings: {
    title: 'Configurações',
    color: '#64748b', // Slate
    svgIcon: `
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    `
  },
  profile: {
    title: 'Meu Perfil',
    color: '#10b981', // Emerald
    svgIcon: `
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="10" r="3"/>
      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
    `
  },
  notifications: {
    title: 'Notificações',
    color: '#ec4899', // Pink
    svgIcon: `
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    `
  },
  'client-portal': {
    title: 'Área do Cliente',
    color: '#4f46e5', // Indigo
    svgIcon: `
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <polyline points="16 11 18 13 22 9"/>
    `
  },
  support: {
    title: 'Suporte',
    color: '#06b6d4', // Cyan
    svgIcon: `
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <path d="M12 17h.01"/>
    `
  }
};

/**
 * Atualiza dinamicamente o título e o favicon da aba nativa do navegador
 * conforme o módulo ativo e status de notificações.
 */
export function updateTabMeta(tabId: string, role?: string, unreadCount?: number) {
  if (typeof document === 'undefined') return;

  const config = TAB_CONFIG[tabId] || {
    title: 'Task Account',
    color: '#4f46e5',
    svgIcon: `
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.29 7 12 12 20.71 7"/>
      <line x1="12" y1="22" x2="12" y2="12"/>
    `
  };

  const displayTitle = tabId === 'chat' && role === 'cliente' ? 'Atendimento' : config.title;
  const prefix = unreadCount && unreadCount > 0 ? `(${unreadCount > 99 ? '99+' : unreadCount}) ` : '';

  // 1. Atualizar título da aba
  document.title = `${prefix}${displayTitle} • Task Account`;

  // 2. Gerar SVG do Favicon
  const badgeSvg = unreadCount && unreadCount > 0 ? `
    <circle cx="26" cy="6" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="1.5" />
  ` : '';

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <defs>
        <linearGradient id="tabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${config.color}"/>
          <stop offset="100%" stop-color="${config.color}ee"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#tabGrad)"/>
      <g transform="translate(4, 4)" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        ${config.svgIcon}
      </g>
      ${badgeSvg}
    </svg>
  `.trim();

  // 3. Atualizar ou criar tag link[rel="icon"]
  let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    document.head.appendChild(link);
  }
  link.href = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
}
