import React, { useId } from 'react';
import { BACKGROUND_THEMES, BackgroundThemeId } from '../../constants/backgroundThemes';

interface BackgroundWallpaperProps {
  themeId: BackgroundThemeId;
  isDarkMode: boolean;
  className?: string;
}

export const BackgroundWallpaper: React.FC<BackgroundWallpaperProps> = ({
  themeId,
  isDarkMode,
  className = '',
}) => {
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');

  if (themeId === 'none') {
    return (
      <div
        className={`w-full h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300 ${className}`}
      />
    );
  }

  const theme = BACKGROUND_THEMES.find((t) => t.id === themeId);
  const imageSrc = isDarkMode ? theme?.darkImage : theme?.lightImage;

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt=""
        className={`w-full h-full object-cover object-left-top transition-opacity duration-500 ${className}`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className={`w-full h-full ${className}`}
      aria-hidden="true"
    >
      {themeId === 'prisma' && renderPrismaDarkSvg(uid)}
      {themeId === 'aurora' && renderAuroraSvg(uid, isDarkMode)}
      {themeId === 'dunas' && renderDunasSvg(uid, isDarkMode)}
      {themeId === 'horizonte' && renderHorizonteSvg(uid, isDarkMode)}
      {themeId === 'nebulosa' && renderNebulosaSvg(uid, isDarkMode)}
    </svg>
  );
};

function renderPrismaDarkSvg(uid: string) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-pd-bg`} cx="20%" cy="25%" r="85%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="45%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
        <linearGradient id={`${uid}-pd-f1`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#312e81" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id={`${uid}-pd-f2`} x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.38" />
          <stop offset="50%" stopColor="#4f46e5" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id={`${uid}-pd-f3`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.34" />
          <stop offset="60%" stopColor="#3730a3" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${uid}-pd-bg)`} />
      <polygon points="-80,-40 480,-40 640,360 190,540 -80,320" fill={`url(#${uid}-pd-f1)`} stroke="rgba(165,180,252,0.34)" strokeWidth="1.5" />
      <polygon points="190,540 640,360 440,940 -80,940" fill={`url(#${uid}-pd-f2)`} stroke="rgba(125,211,252,0.28)" strokeWidth="1.5" />
      <polygon points="480,-40 940,-40 720,240 640,360" fill={`url(#${uid}-pd-f3)`} stroke="rgba(216,180,254,0.26)" strokeWidth="1.2" />
      <polygon points="60,120 390,40 490,340 260,640 -40,470" fill={`url(#${uid}-pd-f2)`} stroke="rgba(224,231,255,0.42)" strokeWidth="1.8" />
      <polygon points="390,40 760,170 590,430 490,340" fill={`url(#${uid}-pd-f1)`} stroke="rgba(199,210,254,0.3)" strokeWidth="1.2" />
      <line x1="0" y1="220" x2="680" y2="0" stroke="rgba(199,210,254,0.22)" strokeWidth="1" />
      <line x1="120" y1="900" x2="860" y2="140" stroke="rgba(125,211,252,0.16)" strokeWidth="1" />
    </>
  );
}

function renderAuroraSvg(uid: string, isDarkMode: boolean) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-au-bg`} cx="15%" cy="20%" r="90%">
          <stop offset="0%" stopColor={isDarkMode ? '#042f2e' : '#ecfdf5'} />
          <stop offset="50%" stopColor={isDarkMode ? '#091529' : '#f0f9ff'} />
          <stop offset="100%" stopColor={isDarkMode ? '#020617' : '#f8fafc'} />
        </radialGradient>
        <linearGradient id={`${uid}-au-r1`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isDarkMode ? '#34d399' : '#10b981'} stopOpacity={isDarkMode ? '0.42' : '0.32'} />
          <stop offset="55%" stopColor={isDarkMode ? '#22d3ee' : '#06b6d4'} stopOpacity={isDarkMode ? '0.26' : '0.22'} />
          <stop offset="100%" stopColor={isDarkMode ? '#6366f1' : '#818cf8'} stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={`${uid}-au-r2`} x1="0%" y1="100%" x2="90%" y2="0%">
          <stop offset="0%" stopColor={isDarkMode ? '#818cf8' : '#6366f1'} stopOpacity={isDarkMode ? '0.38' : '0.28'} />
          <stop offset="50%" stopColor={isDarkMode ? '#2dd4bf' : '#14b8a6'} stopOpacity={isDarkMode ? '0.24' : '0.18'} />
          <stop offset="100%" stopColor={isDarkMode ? '#0ea5e9' : '#38bdf8'} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${uid}-au-bg)`} />
      <path
        d="M-120,760 C80,520 120,240 440,140 C760,40 940,190 1320,-60 L-120,-60 Z"
        fill={`url(#${uid}-au-r1)`}
      />
      <path
        d="M-80,920 C160,640 240,360 560,250 C880,140 1080,260 1540,-40 L1660,120 C1180,360 880,260 540,420 C240,560 190,820 40,940 Z"
        fill={`url(#${uid}-au-r2)`}
      />
      <path
        d="M-60,340 C190,260 320,90 680,10 C960,-50 1240,40 1560,-30"
        fill="none"
        stroke={isDarkMode ? 'rgba(110,231,183,0.45)' : 'rgba(255,255,255,0.85)'}
        strokeWidth="2.5"
      />
      <path
        d="M-40,620 C210,480 340,260 660,180 C950,110 1160,180 1580,20"
        fill="none"
        stroke={isDarkMode ? 'rgba(56,189,248,0.34)' : 'rgba(165,243,252,0.75)'}
        strokeWidth="2"
      />
    </>
  );
}

function renderDunasSvg(uid: string, isDarkMode: boolean) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-du-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isDarkMode ? '#1c1917' : '#fafaf9'} />
          <stop offset="55%" stopColor={isDarkMode ? '#0c0a09' : '#f5f5f4'} />
          <stop offset="100%" stopColor={isDarkMode ? '#020617' : '#ffffff'} />
        </linearGradient>
        <linearGradient id={`${uid}-du-w1`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isDarkMode ? '#d97706' : '#e7e5e4'} stopOpacity={isDarkMode ? '0.32' : '0.95'} />
          <stop offset="60%" stopColor={isDarkMode ? '#44403c' : '#d6d3d1'} stopOpacity={isDarkMode ? '0.28' : '0.55'} />
          <stop offset="100%" stopColor={isDarkMode ? '#09090b' : '#fafaf9'} stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id={`${uid}-du-w2`} x1="10%" y1="100%" x2="90%" y2="0%">
          <stop offset="0%" stopColor={isDarkMode ? '#fbbf24' : '#f5f5f4'} stopOpacity={isDarkMode ? '0.22' : '0.95'} />
          <stop offset="50%" stopColor={isDarkMode ? '#292524' : '#e7e5e4'} stopOpacity={isDarkMode ? '0.45' : '0.7'} />
          <stop offset="100%" stopColor={isDarkMode ? '#020617' : '#ffffff'} stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${uid}-du-bg)`} />
      <path
        d="M-80,-40 L920,-40 C680,140 520,260 390,520 C280,740 160,860 -80,940 Z"
        fill={`url(#${uid}-du-w1)`}
      />
      <path
        d="M-80,180 C180,140 360,260 480,480 C600,700 840,780 1220,940 L-80,940 Z"
        fill={`url(#${uid}-du-w2)`}
      />
      <path
        d="M920,-40 C680,140 520,260 390,520 C280,740 160,860 -80,940"
        fill="none"
        stroke={isDarkMode ? 'rgba(251,191,36,0.38)' : 'rgba(255,255,255,0.95)'}
        strokeWidth="2.5"
      />
      <path
        d="M-80,180 C180,140 360,260 480,480 C600,700 840,780 1220,940"
        fill="none"
        stroke={isDarkMode ? 'rgba(245,158,11,0.24)' : 'rgba(168,162,158,0.35)'}
        strokeWidth="2"
      />
    </>
  );
}

function renderHorizonteSvg(uid: string, isDarkMode: boolean) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-hz-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isDarkMode ? '#0f172a' : '#e0f2fe'} />
          <stop offset="55%" stopColor={isDarkMode ? '#091124' : '#f1f5f9'} />
          <stop offset="100%" stopColor={isDarkMode ? '#020617' : '#f8fafc'} />
        </linearGradient>
        <linearGradient id={`${uid}-hz-m1`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isDarkMode ? '#3b82f6' : '#93c5fd'} stopOpacity={isDarkMode ? '0.32' : '0.45'} />
          <stop offset="100%" stopColor={isDarkMode ? '#0f172a' : '#e2e8f0'} stopOpacity={isDarkMode ? '0.18' : '0.2'} />
        </linearGradient>
        <linearGradient id={`${uid}-hz-m2`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isDarkMode ? '#6366f1' : '#cbd5e1'} stopOpacity={isDarkMode ? '0.36' : '0.62'} />
          <stop offset="100%" stopColor={isDarkMode ? '#020617' : '#f8fafc'} stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${uid}-hz-bg)`} />
      <circle
        cx="230"
        cy="150"
        r="130"
        fill={isDarkMode ? 'rgba(96,165,250,0.16)' : 'rgba(255,255,255,0.88)'}
      />
      <path
        d="M-60,420 L210,210 L460,360 L780,190 L1140,390 L1660,260 L1660,940 L-60,940 Z"
        fill={`url(#${uid}-hz-m1)`}
      />
      <path
        d="M-60,640 L180,390 L430,520 L690,340 L1020,580 L1660,470 L1660,940 L-60,940 Z"
        fill={`url(#${uid}-hz-m2)`}
      />
      <path
        d="M-60,420 L210,210 L460,360 L780,190 L1140,390 L1660,260"
        fill="none"
        stroke={isDarkMode ? 'rgba(147,197,253,0.4)' : 'rgba(255,255,255,0.9)'}
        strokeWidth="2"
      />
      <path
        d="M-60,640 L180,390 L430,520 L690,340 L1020,580 L1660,470"
        fill="none"
        stroke={isDarkMode ? 'rgba(165,180,252,0.32)' : 'rgba(255,255,255,0.8)'}
        strokeWidth="2"
      />
    </>
  );
}

function renderNebulosaSvg(uid: string, isDarkMode: boolean) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-nb-bg`} cx="18%" cy="22%" r="85%">
          <stop offset="0%" stopColor={isDarkMode ? '#1e1b4b' : '#eef2ff'} />
          <stop offset="50%" stopColor={isDarkMode ? '#0f172a' : '#f5f3ff'} />
          <stop offset="100%" stopColor={isDarkMode ? '#020617' : '#f8fafc'} />
        </radialGradient>
        <radialGradient id={`${uid}-nb-s1`} cx="32%" cy="30%" r="70%">
          <stop offset="0%" stopColor={isDarkMode ? '#818cf8' : '#ffffff'} stopOpacity={isDarkMode ? '0.48' : '0.95'} />
          <stop offset="55%" stopColor={isDarkMode ? '#3730a3' : '#c7d2fe'} stopOpacity={isDarkMode ? '0.32' : '0.65'} />
          <stop offset="100%" stopColor={isDarkMode ? '#0f172a' : '#e0e7ff'} stopOpacity="0.18" />
        </radialGradient>
        <radialGradient id={`${uid}-nb-s2`} cx="35%" cy="28%" r="70%">
          <stop offset="0%" stopColor={isDarkMode ? '#c084fc' : '#ffffff'} stopOpacity={isDarkMode ? '0.42' : '0.92'} />
          <stop offset="60%" stopColor={isDarkMode ? '#4c1d95' : '#ddd6fe'} stopOpacity={isDarkMode ? '0.26' : '0.55'} />
          <stop offset="100%" stopColor={isDarkMode ? '#020617' : '#ede9fe'} stopOpacity="0.15" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${uid}-nb-bg)`} />
      <circle
        cx="220"
        cy="240"
        r="270"
        fill="none"
        stroke={isDarkMode ? 'rgba(165,180,252,0.22)' : 'rgba(99,102,241,0.18)'}
        strokeWidth="1.5"
      />
      <circle
        cx="220"
        cy="240"
        r="390"
        fill="none"
        stroke={isDarkMode ? 'rgba(192,132,252,0.14)' : 'rgba(139,92,246,0.14)'}
        strokeWidth="1.5"
      />
      <circle
        cx="200"
        cy="210"
        r="190"
        fill={`url(#${uid}-nb-s1)`}
        stroke={isDarkMode ? 'rgba(199,210,254,0.36)' : 'rgba(255,255,255,0.95)'}
        strokeWidth="1.5"
      />
      <circle
        cx="450"
        cy="95"
        r="95"
        fill={`url(#${uid}-nb-s2)`}
        stroke={isDarkMode ? 'rgba(216,180,254,0.34)' : 'rgba(255,255,255,0.92)'}
        strokeWidth="1.2"
      />
      <circle
        cx="135"
        cy="560"
        r="130"
        fill={`url(#${uid}-nb-s2)`}
        stroke={isDarkMode ? 'rgba(165,180,252,0.28)' : 'rgba(255,255,255,0.9)'}
        strokeWidth="1.2"
      />
    </>
  );
}
