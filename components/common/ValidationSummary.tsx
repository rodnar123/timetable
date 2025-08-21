import React from 'react';
import { ValidationError } from '@/utils/formValidation';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ValidationSummaryProps {
  errors: ValidationError[];
  isValid: boolean;
  showSuccess?: boolean;
}

export default function ValidationSummary({ errors, isValid, showSuccess = true }: ValidationSummaryProps) {
  if (isValid && showSuccess) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium">All required fields are completed</span>
      </div>
    );
  }

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
        <span className="text-sm font-medium text-red-800">
          Please correct the following errors:
        </span>
      </div>
      <ul className="list-disc list-inside space-y-1 text-sm text-red-700 ml-6">
        {errors.map((error, index) => (
          <li key={index}>{error.message}</li>
        ))}
      </ul>
    </div>
  );
}
