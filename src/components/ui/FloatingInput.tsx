"use client";

import { useState } from "react";

interface FloatingInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function FloatingInput({
  label,
  type = "text",
  value,
  onChange,
  required,
  disabled,
  placeholder,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || value.length > 0;

  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        disabled={disabled}
        placeholder={placeholder ?? " "}
        className="peer w-full px-4 pt-6 pb-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:bg-slate-50"
      />
      <label
        className={`absolute left-4 transition-all duration-200 pointer-events-none text-slate-500 ${
          isFloating ? "top-2 text-xs text-teal-600" : "top-4 text-base"
        }`}
      >
        {label}
        {required && " *"}
      </label>
    </div>
  );
}

interface FloatingTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
}

export function FloatingTextarea({
  label,
  value,
  onChange,
  required,
  disabled,
  rows = 3,
}: FloatingTextareaProps) {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || value.length > 0;

  return (
    <div className="relative">
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        disabled={disabled}
        placeholder=" "
        className="peer w-full px-4 pt-6 pb-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:bg-slate-50 resize-none"
      />
      <label
        className={`absolute left-4 transition-all duration-200 pointer-events-none text-slate-500 ${
          isFloating ? "top-2 text-xs text-teal-600" : "top-4 text-base"
        }`}
      >
        {label}
        {required && " *"}
      </label>
    </div>
  );
}
