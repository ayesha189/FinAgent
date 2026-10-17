// src/pages/admin/AdminIcons.tsx
import React from 'react';

export type AdminIconName =
  | 'overview'
  | 'users'
  | 'policy'
  | 'plug'
  | 'monitor'
  | 'bell'
  | 'chevron'
  | 'menu'
  | 'close'
  | 'check'
  | 'warning'
  | 'error'
  | 'search'
  | 'filter'
  | 'shield'
  | 'bot'
  | 'database'
  | 'server'
  | 'calendar'
  | 'clock'
  | 'mail'
  | 'backup'
  | 'download'
  | 'refresh'
  | 'activity'
  | 'lock'
  | 'more'
  | 'arrow'
  | 'logout'
  | 'settings'
  | 'user'
  | 'upload'
  | 'plus'
  | 'eye'
  | 'report'
  | 'tax'
  | 'chat';

interface AdminIconProps {
  name: AdminIconName | string;
  size?: number;
  className?: string;
}

export const AdminIcon: React.FC<AdminIconProps> = ({ name, size = 18, className = '' }) => {
  const iconContent: Record<string, React.ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21c0-4 3-7 7-7s7 3 7 7M16 4c3 0 5 2 5 5 0 2-1 3-3 4M18 15c3 1 4 3 4 6" />
      </>
    ),
    policy: (
      <>
        <path d="M6 2h9l4 4v16H6zM14 2v5h5M9 12h6M9 16h4" />
        <path d="m9 8 1 1 2-2" />
      </>
    ),
    plug: (
      <path d="M8 12 4 8l4-4 4 4M16 12l4 4-4 4-4-4M10 10l4 4" />
    ),
    monitor: (
      <>
        <rect x="3" y="4" width="18" height="14" rx="1" />
        <path d="M8 22h8M12 18v4M6 13l3-3 3 2 5-5" />
      </>
    ),
    bell: (
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4" />
    ),
    chevron: (
      <path d="m8 10 4 4 4-4" />
    ),
    menu: (
      <path d="M4 7h16M4 12h16M4 17h16" />
    ),
    close: (
      <path d="m6 6 12 12M18 6 6 18" />
    ),
    check: (
      <path d="m4 12 5 5L20 6" />
    ),
    warning: (
      <>
        <path d="M12 3 2.8 20h18.4Z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
    error: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6M15 9l-6 6" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    filter: (
      <path d="M3 5h18l-7 8v6l-4 2v-8Z" />
    ),
    shield: (
      <>
        <path d="M12 3 4.5 6v5.5c0 4.8 3.2 8 7.5 9.5 4.3-1.5 7.5-4.7 7.5-9.5V6Z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    bot: (
      <>
        <rect x="4" y="7" width="16" height="12" rx="2" />
        <path d="M12 3v4M8 12h.01M16 12h.01M8 16h8" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </>
    ),
    server: (
      <>
        <rect x="3" y="4" width="18" height="6" rx="1" />
        <rect x="3" y="14" width="18" height="6" rx="1" />
        <path d="M7 7h.01M7 17h.01M11 7h7M11 17h7" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="1" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6l4 2" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="1" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    backup: (
      <>
        <path d="M5 7v5h5M5.8 12A7 7 0 1 0 8 6.9L5 9" />
        <path d="M12 9v4l3 2" />
      </>
    ),
    download: (
      <path d="M12 3v13M7 11l5 5 5-5M4 21h16" />
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M6 8a7 7 0 0 1 12 1l2 3M18 16a7 7 0 0 1-12-1l-2-3" />
      </>
    ),
    activity: (
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="1" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </>
    ),
    arrow: (
      <path d="M5 12h14M14 7l5 5-5 5" />
    ),
    logout: (
      <path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" />
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.4 6A7 7 0 0 0 9 7L6.5 6l-2 3.4 2 1.5a7 7 0 0 0 0 2.1l-2 1.5 2 3.4 2.4-1A7 7 0 0 0 10.4 18l.3 2.6h4L15 18a7 7 0 0 0 1.5-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-5 3-8 8-8s8 3 8 8" />
      </>
    ),
    upload: (
      <path d="M12 16V3M7 8l5-5 5 5M4 14v7h16v-7" />
    ),
    plus: (
      <path d="M12 5v14M5 12h14" />
    ),
    eye: (
      <>
        <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    report: (
      <>
        <path d="M5 3h14v18H5zM8 16v-3M12 16V8M16 16v-6" />
        <path d="M8 6h4" />
      </>
    ),
    tax: (
      <path d="M6 2h9l4 4v16H6zM14 2v5h5M9 11h6M9 15h6M9 19h4" />
    ),
    chat: (
      <>
        <path d="M4 4h16v12H9l-5 4z" />
        <path d="M8 9h8M8 12h5" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={`icon ${className}`.trim()}
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      {iconContent[name] ?? null}
    </svg>
  );
};
