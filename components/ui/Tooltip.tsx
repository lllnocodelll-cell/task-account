import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    children: React.ReactNode;
    content: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
    style?: React.CSSProperties;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content, position = 'top', className = '', style }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let top = window.scrollY;
            let left = window.scrollX;

            if (position === 'top') {
                top += rect.top - 8;
                left += rect.left + rect.width / 2;
            } else if (position === 'bottom') {
                top += rect.bottom + 8;
                left += rect.left + rect.width / 2;
            } else if (position === 'right') {
                top += rect.top + rect.height / 2;
                left += rect.right + 8;
            } else if (position === 'left') {
                top += rect.top + rect.height / 2;
                left += rect.left - 8;
            }

            setCoords({ top, left });
        }
    };

    useEffect(() => {
        if (isVisible) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible, position]);

    return (
        <div
            ref={triggerRef}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            className={className || "inline-block"}
            style={style}
        >
            {children}
            {isVisible && createPortal(
                <div
                    style={{
                        position: 'absolute',
                        top: coords.top,
                        left: coords.left,
                        transform: position === 'top' ? 'translate(-50%, -100%)' : 
                                   position === 'bottom' ? 'translate(-50%, 0)' :
                                   position === 'right' ? 'translate(0, -50%)' :
                                   'translate(-100%, -50%)',
                        zIndex: 9999,
                    }}
                    className="pointer-events-none"
                >
                    <div className="w-max px-2 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[10px] rounded shadow-xl animate-in fade-in zoom-in-95 duration-200 border border-slate-700/50">
                        {content}
                        <div 
                            className={`absolute border-[4px] border-transparent ${
                                position === 'top' ? 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 dark:border-t-slate-800' :
                                position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 dark:border-b-slate-800' :
                                position === 'right' ? 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 dark:border-r-slate-800' :
                                'left-full top-1/2 -translate-y-1/2 border-l-slate-900 dark:border-l-slate-800'
                            }`} 
                        />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
