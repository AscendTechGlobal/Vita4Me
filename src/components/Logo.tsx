import React from "react";

interface LogoProps {
  variant?: "full" | "icon" | "horizontal";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showText?: boolean;
  withContainer?: boolean;
}

const sizeClasses = {
  xs: "h-6 w-auto",
  sm: "h-8 w-auto",
  md: "h-10 w-auto",
  lg: "h-12 w-auto",
  xl: "h-16 w-auto",
  "2xl": "h-20 w-auto",
};

export const Logo: React.FC<LogoProps> = ({
  variant = "full",
  size = "md",
  className = "",
  showText = true,
  withContainer = false,
}) => {
  // If user wants just the icon symbol
  if (variant === "icon") {
    const iconContent = (
      <img
        src="/logo-icon-transparent.png"
        alt="Vita4Me"
        className={`${sizeClasses[size]} object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-105 ${className}`}
        loading="eager"
      />
    );

    if (withContainer) {
      return (
        <div className="p-2 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-emerald-500/20 shadow-xs flex items-center justify-center">
          {iconContent}
        </div>
      );
    }
    return iconContent;
  }

  // If user wants horizontal logo (Icon + Typography text)
  if (variant === "horizontal") {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <div className="relative flex items-center justify-center">
          <img
            src="/logo-icon-transparent.png"
            alt="Vita4Me Icon"
            className={`${size === "xs" ? "h-6" : size === "sm" ? "h-8" : size === "lg" ? "h-11" : "h-9"} w-auto object-contain drop-shadow-xs`}
          />
        </div>
        {showText && (
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-0.5">
              vita<span className="text-emerald-500 font-black">4</span>me
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-1">
              Saúde Inteligente
            </span>
          </div>
        )}
      </div>
    );
  }

  // Default: Full Logo with text
  const fullContent = (
    <img
      src="/logo-full-transparent.png"
      alt="Vita4Me — Saúde Inteligente"
      className={`${sizeClasses[size]} object-contain drop-shadow-xs transition-transform duration-200 hover:scale-[1.02] ${className}`}
      loading="eager"
    />
  );

  if (withContainer) {
    return (
      <div className="p-3 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center">
        {fullContent}
      </div>
    );
  }

  return fullContent;
};
