import React from 'react';
import { Zap } from 'lucide-react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showVersion?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  size = 'md', 
  className = '',
  showVersion = true
}) => {
  const iconSizes = {
    sm: { box: 'w-6 h-6 rounded-md', icon: 14, text: 'text-xs', version: 'text-[7px]' },
    md: { box: 'w-8 h-8 rounded-xl', icon: 18, text: 'text-base', version: 'text-[8px]' },
    lg: { box: 'w-10 h-10 rounded-2xl', icon: 22, text: 'text-xl', version: 'text-[9px]' },
  };

  const current = iconSizes[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className={`${current.box} bg-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(250,204,21,0.4)] shrink-0`}>
        <Zap size={current.icon} className="fill-slate-950 stroke-slate-950" />
      </div>
      <div className="flex flex-col leading-none text-left">
        <span className={`${current.text} font-black tracking-tight text-slate-900 dark:text-white uppercase`}>
          Task<span className="text-amber-500 dark:text-yellow-400">Account</span>
        </span>
        {showVersion && (
          <span className={`${current.version} font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase mt-0.5`}>
            Core v2.6
          </span>
        )}
      </div>
    </div>
  );
};
