import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FieldErrorProps {
  error?: string;
  show?: boolean;
}

export default function FieldError({ error, show = true }: FieldErrorProps) {
  if (!error || !show) return null;

  return (
    <div className="flex items-center gap-1 mt-1 text-red-600">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      <span className="text-xs">{error}</span>
    </div>
  );
}

interface InputFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function InputField({ label, required, error, children, className = "" }: InputFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      <FieldError error={error} />
    </div>
  );
}
