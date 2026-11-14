import React, { useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion
} from 'framer-motion';

/* ─── MOTION PRIMITIVES: BLUR-FADE ENTRANCE ─── */

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
}

export const BlurFade: React.FC<BlurFadeProps> = ({
  children,
  className = '',
  delay = 0,
  yOffset = 14
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ─── MOTION PRIMITIVES: ANIMATED CURRENCY COUNTER ─── */

interface AnimatedCurrencyProps {
  value: number;
  className?: string;
  duration?: number;
}

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const AnimatedCurrency: React.FC<AnimatedCurrencyProps> = ({
  value,
  className = '',
  duration = 0.85
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(shouldReduceMotion ? value : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }
    if (!isInView) return;

    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplayValue(latest)
    });

    return () => controls.stop();
  }, [isInView, value, duration, shouldReduceMotion]);

  return (
    <span ref={ref} className={className}>
      {brlFormatter.format(displayValue)}
    </span>
  );
};

/* ─── MAGIC UI: PERIMETER-ONLY BORDER BEAM ─── */

interface BorderBeamProps {
  isDarkMode: boolean;
  duration?: number;
  borderWidth?: number;
}

/**
 * Renderiza um feixe luminoso animado restrito estritamente ao contorno externo do card
 * (mask-composite: exclude), sem gerar brilho sobre o conteúdo interno.
 */
export const BorderBeam: React.FC<BorderBeamProps> = ({
  isDarkMode,
  duration = 6,
  borderWidth = 2
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return null;
  }

  const beamGradient = isDarkMode
    ? 'conic-gradient(from 0deg, transparent 0deg 250deg, rgba(250, 204, 21, 0.35) 285deg, rgba(250, 204, 21, 1) 325deg, rgba(245, 158, 11, 0.85) 345deg, transparent 360deg)'
    : 'conic-gradient(from 0deg, transparent 0deg 250deg, rgba(245, 158, 11, 0.35) 285deg, rgba(217, 119, 6, 1) 325deg, rgba(245, 158, 11, 0.85) 345deg, transparent 360deg)';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-[1px] rounded-[inherit] overflow-hidden z-20"
      style={{
        padding: `${borderWidth}px`,
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude'
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[220%] aspect-square"
        style={{ background: beamGradient }}
      />
    </div>
  );
};

/* ─── ACETERNITY UI: MOUSE-TRACKING SPOTLIGHT CARD ─── */

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  isDarkMode: boolean;
  isHighlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  isDarkMode,
  isHighlighted = false,
  onMouseEnter,
  onMouseLeave
}) => {
  const mouseX = useMotionValue(-999);
  const mouseY = useMotionValue(-999);
  const shouldReduceMotion = useReducedMotion();

  const spotlightColor = isHighlighted
    ? isDarkMode
      ? 'rgba(250, 204, 21, 0.12)'
      : 'rgba(245, 158, 11, 0.09)'
    : isDarkMode
      ? 'rgba(148, 163, 184, 0.09)'
      : 'rgba(245, 158, 11, 0.06)';

  const spotlightBackground = useMotionTemplate`radial-gradient(360px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 70%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group/spotlight relative ${className}`}
    >
      {!shouldReduceMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover/spotlight:opacity-100 transition-opacity duration-300 z-0"
          style={{ background: spotlightBackground }}
        />
      )}
      {children}
    </div>
  );
};

/* ─── MAGIC UI + ANIMATE UI: SHIMMER CTA BUTTON ─── */

interface ShimmerCtaButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'gold' | 'neutral';
  className?: string;
}

export const ShimmerCtaButton: React.FC<ShimmerCtaButtonProps> = ({
  children,
  onClick,
  variant = 'neutral',
  className = ''
}) => {
  const shouldReduceMotion = useReducedMotion();
  const isGold = variant === 'gold';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={shouldReduceMotion ? undefined : { y: -1.5 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className={`group/cta relative overflow-hidden w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-shadow cursor-pointer flex items-center justify-center gap-2 ${
        isGold
          ? 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 hover:from-yellow-300 hover:via-amber-300 hover:to-yellow-300 text-slate-950 shadow-[0_8px_24px_-4px_rgba(245,158,11,0.45)] dark:shadow-[0_0_26px_rgba(250,204,21,0.4)]'
          : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-800 dark:border-white/10 shadow-sm'
      } ${className}`}
    >
      {isGold && !shouldReduceMotion && (
        <motion.span
          aria-hidden="true"
          initial={{ x: '-140%' }}
          animate={{ x: '240%' }}
          transition={{
            duration: 1.3,
            repeat: Infinity,
            repeatDelay: 2.8,
            ease: 'easeInOut'
          }}
          className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
};

/* ─── MOTION PRIMITIVES: ANIMATED INTEGER COUNTER ─── */

interface AnimatedIntegerProps {
  value: number;
  startFrom?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

export const AnimatedInteger: React.FC<AnimatedIntegerProps> = ({
  value,
  startFrom = 0,
  prefix = '',
  suffix = '',
  duration = 0.85,
  className = ''
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(
    shouldReduceMotion ? value : startFrom
  );

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }
    if (!isInView) return;

    const controls = animate(startFrom, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplayValue(Math.round(latest))
    });

    return () => controls.stop();
  }, [isInView, startFrom, value, duration, shouldReduceMotion]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};

/* ─── MAGIC UI: ANIMATED TECHNICAL GRID BACKGROUND ─── */

interface AnimatedGridBackgroundProps {
  isDarkMode: boolean;
}

const GRID_HIGHLIGHT_CELLS: ReadonlyArray<{
  col: number;
  row: number;
  delay: number;
  duration: number;
}> = [
  { col: 3, row: 2, delay: 0.2, duration: 4.5 },
  { col: 7, row: 4, delay: 1.4, duration: 5.2 },
  { col: 11, row: 1, delay: 0.8, duration: 4.8 },
  { col: 15, row: 5, delay: 2.1, duration: 5.6 },
  { col: 19, row: 3, delay: 0.5, duration: 4.4 },
  { col: 23, row: 6, delay: 1.9, duration: 5.0 },
  { col: 5, row: 7, delay: 2.6, duration: 5.4 },
  { col: 13, row: 3, delay: 1.1, duration: 4.6 },
  { col: 21, row: 2, delay: 2.9, duration: 5.1 },
  { col: 9, row: 8, delay: 0.4, duration: 4.9 }
];

export const AnimatedGridBackground: React.FC<AnimatedGridBackgroundProps> = ({
  isDarkMode
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        WebkitMaskImage:
          'radial-gradient(ellipse 80% 70% at 50% 35%, #000 35%, transparent 100%)',
        maskImage:
          'radial-gradient(ellipse 80% 70% at 50% 35%, #000 35%, transparent 100%)'
      }}
    >
      {/* Malha técnica base 48x48 */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.045]"
        style={{
          backgroundImage: isDarkMode
            ? 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)'
            : 'linear-gradient(#000000 1px, transparent 1px), linear-gradient(90deg, #000000 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      {/* Células com respiração sutil alinhadas à malha 48px */}
      {!shouldReduceMotion &&
        GRID_HIGHLIGHT_CELLS.map((cell, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, isDarkMode ? 0.14 : 0.12, 0] }}
            transition={{
              duration: cell.duration,
              delay: cell.delay,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="absolute w-[47px] h-[47px] bg-amber-400/80 dark:bg-yellow-400/70"
            style={{
              left: `${cell.col * 48 + 1}px`,
              top: `${cell.row * 48 + 1}px`
            }}
          />
        ))}
    </div>
  );
};
