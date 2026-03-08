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

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878a4.5 4.5 0 106.262 6.262M4.031 4.031a10.05 10.05 0 011.563 3.029 9.97 9.97 0 011.563 3.029m12.015-6.058a10.05 10.05 0 01-1.563 3.029 9.97 9.97 0 01-1.563 3.029m-2.121-2.121a4.5 4.5 0 00-6.262-6.262M9.88 9.88a4.5 4.5 0 01-6.262-6.262" />
  </svg>
);

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
  const [showPassword, setShowPassword] = useState(false);
  const isFloating = focused || value.length > 0;
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="relative">
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        disabled={disabled}
        placeholder={placeholder ?? " "}
        className={`peer w-full pt-6 pb-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:bg-slate-50 ${isPassword ? "pl-4 pr-12" : "px-4"}`}
      />
      <label
        className={`absolute left-4 transition-all duration-200 pointer-events-none text-slate-500 ${
          isFloating ? "top-2 text-xs text-teal-600" : "top-4 text-base"
        }`}
      >
        {label}
        {required && " *"}
      </label>
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
          aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      )}
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
