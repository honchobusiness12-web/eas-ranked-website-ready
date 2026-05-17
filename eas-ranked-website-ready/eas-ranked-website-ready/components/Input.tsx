"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  wrapperClassName?: string;
}

export default function Input({
  label,
  error,
  hint,
  prefixIcon,
  suffixIcon,
  wrapperClassName = "",
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[11px] font-bold uppercase tracking-widest text-zinc-500"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {prefixIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">
            {prefixIcon}
          </span>
        )}
        <input
          id={inputId}
          {...props}
          className={`
            w-full rounded-xl border bg-white/[0.04] py-2.5 text-sm text-white
            placeholder-zinc-600 outline-none backdrop-blur-sm
            transition-all duration-200
            focus:bg-white/[0.06] focus:ring-1
            ${error
              ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/20"
              : "border-white/[0.07] focus:border-purple-500/40 focus:ring-purple-500/20"
            }
            ${prefixIcon ? "pl-9" : "pl-3.5"}
            ${suffixIcon ? "pr-9" : "pr-3.5"}
            ${className}
          `}
        />
        {suffixIcon && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">
            {suffixIcon}
          </span>
        )}
      </div>
      {error && (
        <p className="text-[11px] text-red-400">{error}</p>
      )}
      {hint && !error && (
        <p className="text-[11px] text-zinc-600">{hint}</p>
      )}
    </div>
  );
}
