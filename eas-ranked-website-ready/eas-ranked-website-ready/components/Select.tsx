"use client";

import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export default function Select({
  label,
  options,
  error,
  hint,
  wrapperClassName = "",
  className = "",
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-[11px] font-bold uppercase tracking-widest text-zinc-500"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        {...props}
        className={`
          w-full rounded-xl border bg-[#0b0b1f] py-2.5 px-3.5 text-sm text-white
          outline-none transition-all duration-200 cursor-pointer
          focus:ring-1
          ${error
            ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/20"
            : "border-white/[0.08] focus:border-purple-500/40 focus:ring-purple-500/20"
          }
          ${className}
        `}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {hint && !error && <p className="text-[11px] text-zinc-600">{hint}</p>}
    </div>
  );
}
