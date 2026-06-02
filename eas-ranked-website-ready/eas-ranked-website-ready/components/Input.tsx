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
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "rgba(168,255,246,0.55)" }}
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
            w-full rounded-xl py-2.5 text-sm outline-none backdrop-blur-sm
            transition-all duration-200
            ${prefixIcon ? "pl-9" : "pl-3.5"}
            ${suffixIcon ? "pr-9" : "pr-3.5"}
            ${className}
          `}
          style={{
            background: "rgba(6,43,69,0.75)",
            border: error ? "1px solid rgba(255,127,80,0.45)" : "1px solid rgba(0,207,255,0.22)",
            color: "#e0f7ff",
          }}
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
