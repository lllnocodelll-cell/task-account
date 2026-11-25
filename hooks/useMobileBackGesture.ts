import React, { useEffect, useRef, useState, useCallback } from 'react';

interface UseMobileBackGestureOptions {
  /** Indica se a camada/conversa/drawer está atualmente aberta e visível no mobile. */
  isActive: boolean;
  /** Callback executado ao voltar via gesto nativo (popstate) ou deslize lateral. */
  onBack: () => void;
  /** Identificador único da camada para rastrear a entrada no history. */
  id: string;
  /** Largura máxima da borda esquerda (em px) onde o deslize inicia. Padrão: 52px. */
  edgeWidth?: number;
  /** Distância horizontal mínima (em px) para confirmar o retorno. Padrão: 76px. */
  threshold?: number;
  /** Quando true, ativa apenas em telas mobile (< 768px). Padrão: true. */
  mobileOnly?: boolean;
}

interface TouchHandlers {
  onTouchStart: (e: React.TouchEvent<HTMLElement>) => void;
  onTouchMove: (e: React.TouchEvent<HTMLElement>) => void;
  onTouchEnd: (e: React.TouchEvent<HTMLElement>) => void;
  onTouchCancel: () => void;
}

export function useMobileBackGesture({
  isActive,
  onBack,
  id,
  edgeWidth = 52,
  threshold = 76,
  mobileOnly = true,
}: UseMobileBackGestureOptions): {
  swipeOffset: number;
  isSwiping: boolean;
  touchHandlers: TouchHandlers;
} {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const historyTokenRef = useRef<string | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipeDirectionRef = useRef<'undecided' | 'horizontal' | 'vertical'>('undecided');

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const isMobileViewport = () =>
    typeof window !== 'undefined' && (!mobileOnly || window.innerWidth < 768);

  // Integração com o botão/gesto nativo Voltar do sistema (Android / Browser History)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isActive && isMobileViewport()) {
      const token = `${id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      historyTokenRef.current = token;
      try {
        window.history.pushState(
          { ...(window.history.state || {}), __backToken: token },
          '',
          window.location.href
        );
      } catch {
        // Ignora erro caso history API esteja restrita
      }

      const handlePopState = () => {
        const currentToken = historyTokenRef.current;
        if (!currentToken) return;

        const stateToken = window.history.state?.__backToken;
        if (stateToken !== currentToken) {
          historyTokenRef.current = null;
          setSwipeOffset(0);
          setIsSwiping(false);
          onBackRef.current();
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);

        // Agenda a limpeza do histórico após o commit completo do React (incluindo effects do componente pai).
        // Se uma navegação de aba (ex.: "Editar Perfil" ou clique em notificação) já atualizou o history.state
        // no mesmo clique, o __backToken não estará mais no topo e evitamos chamar history.back() indevidamente.
        const tokenToClean = historyTokenRef.current;
        historyTokenRef.current = null;
        if (tokenToClean) {
          window.setTimeout(() => {
            if (window.history.state?.__backToken === tokenToClean) {
              try {
                window.history.back();
              } catch {
                // Ignora falha silenciosa
              }
            }
          }, 0);
        }
      };
    }

    historyTokenRef.current = null;
    setSwipeOffset(0);
    setIsSwiping(false);
  }, [isActive, id, mobileOnly]);

  const resetSwipeState = useCallback(() => {
    swipeStartRef.current = null;
    swipeDirectionRef.current = 'undecided';
    setIsSwiping(false);
    setSwipeOffset(0);
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (!isActive || !isMobileViewport() || e.touches.length !== 1) return;

      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-no-swipe], input[type="range"]')) return;

      const touch = e.touches[0];
      if (touch.clientX > edgeWidth) return;

      swipeStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      swipeDirectionRef.current = 'undecided';
    },
    [isActive, edgeWidth, mobileOnly]
  );

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    const start = swipeStartRef.current;
    if (!start || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - start.x;
    const dy = Math.abs(touch.clientY - start.y);

    if (swipeDirectionRef.current === 'undecided') {
      if (dy > 14 && dy > Math.abs(dx)) {
        swipeDirectionRef.current = 'vertical';
        swipeStartRef.current = null;
        return;
      }
      if (dx > 12 && dx > dy * 1.25) {
        swipeDirectionRef.current = 'horizontal';
        setIsSwiping(true);
      } else {
        return;
      }
    }

    if (swipeDirectionRef.current === 'horizontal') {
      const clamped = Math.max(0, Math.min(dx, window.innerWidth));
      setSwipeOffset(clamped);
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      const start = swipeStartRef.current;
      const wasHorizontal = swipeDirectionRef.current === 'horizontal';
      if (!start || !wasHorizontal) {
        resetSwipeState();
        return;
      }

      const touch = e.changedTouches[0];
      const dx = Math.max(0, touch.clientX - start.x);
      const elapsed = Math.max(1, Date.now() - start.time);
      const velocity = dx / elapsed;

      resetSwipeState();

      if (dx >= threshold || (velocity >= 0.45 && dx >= 38)) {
        onBackRef.current();
      }
    },
    [threshold, resetSwipeState]
  );

  return {
    swipeOffset,
    isSwiping,
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: resetSwipeState,
    },
  };
}
