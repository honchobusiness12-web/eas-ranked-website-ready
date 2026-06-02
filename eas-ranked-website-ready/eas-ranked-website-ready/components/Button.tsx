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
    "bg-gradient-to-r from-[#FF7F50] to-[#FF8C42] text-white border-transparent shadow-[0_4px_20px_rgba(255,127,80,0.45)] hover:shadow-[0_8px_32px_rgba(255,127,80,0.65)] hover:opacity-92 hover:-translate-y-0.5",
  secondary:
    "border text-[#00CFFF] hover:-translate-y-0.5",
  ghost:
    "bg-transparent border-transparent hover:-translate-y-0.5",
  danger:
    "border hover:-translate-y-0.5",
  gold:
    "bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-transparent shadow-[0_4px_16px_rgba(255,165,0,0.25)] hover:shadow-[0_8px_24px_rgba(255,165,0,0.4)] hover:opacity-92 hover:-translate-y-0.5",
  success:
    "bg-gradient-to-r from-green-500 to-emerald-400 text-white border-transparent shadow-[0_4px_16px_rgba(34,197,94,0.25)] hover:shadow-[0_8px_24px_rgba(34,197,94,0.4)] hover:opacity-92 hover:-translate-y-0.5",
  outline:
    "bg-transparent border hover:-translate-y-0.5",
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

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {},
    secondary: { background: "rgba(0,207,255,0.10)", borderColor: "rgba(0,207,255,0.28)", color: "#00CFFF" },
    ghost: { color: "rgba(168,255,246,0.65)" },
    danger: { background: "rgba(255,127,80,0.10)", borderColor: "rgba(255,127,80,0.28)", color: "#FF7F50" },
    gold: {},
    success: {},
    outline: { borderColor: "rgba(0,207,255,0.35)", color: "#00CFFF" },
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      style={variantStyles[variant]}
      className={`
        inline-flex items-center justify-center font-bold border
        transition-all duration-200 active:scale-[0.97] active:translate-y-0
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00CFFF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#062B45]
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
