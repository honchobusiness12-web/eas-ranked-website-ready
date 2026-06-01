"use client";

import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold" | "success" | "outline";
type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-[#7C3AED] to-[#4F8EF7] text-white border-transparent shadow-[0_4px_16px_rgba(124,58,237,0.35)] hover:shadow-[0_8px_24px_rgba(124,58,237,0.5)] hover:opacity-92 hover:-translate-y-0.5",
  secondary:
    "bg-white/[0.05] text-zinc-300 border-white/[0.09] hover:bg-white/[0.09] hover:border-white/[0.15] hover:text-white hover:-translate-y-0.5",
  ghost:
    "bg-transparent text-zinc-400 border-transparent hover:bg-white/[0.05] hover:text-zinc-200",
  danger:
    "bg-red-950/20 text-red-400 border-red-700/30 hover:bg-red-950/40 hover:border-red-600/50 hover:text-red-300 hover:-translate-y-0.5",
  gold:
    "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-transparent shadow-[0_4px_16px_rgba(255,215,0,0.25)] hover:shadow-[0_8px_24px_rgba(255,215,0,0.4)] hover:opacity-92 hover:-translate-y-0.5",
  success:
    "bg-gradient-to-r from-green-600 to-emerald-500 text-white border-transparent shadow-[0_4px_16px_rgba(34,197,94,0.25)] hover:shadow-[0_8px_24px_rgba(34,197,94,0.4)] hover:opacity-92 hover:-translate-y-0.5",
  outline:
    "bg-transparent text-purple-300 border-purple-500/30 hover:bg-purple-500/[0.08] hover:border-purple-400/50 hover:text-purple-200 hover:-translate-y-0.5",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "px-2.5 py-1 text-[11px] rounded-lg gap-1",
  sm: "px-3.5 py-1.5 text-xs rounded-xl gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-7 py-3.5 text-base rounded-2xl gap-2.5",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "left",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-bold border
        transition-all duration-200 active:scale-[0.97] active:translate-y-0
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#04040e]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {loading ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon && iconPosition === "left" && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!loading && icon && iconPosition === "right" && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
}
