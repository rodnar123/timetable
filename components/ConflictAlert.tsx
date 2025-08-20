// components/ConflictAlert.tsx
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ConflictCheckResult } from '@/utils/conflictUtils';

interface ConflictAlertProps {
  result: ConflictCheckResult;
}

export const ConflictAlert: React.FC<ConflictAlertProps> = ({ result }) => {
  if (!result.hasConflicts) return null;

  return (
    <div className="space-y-3">
      {result.conflicts.map((conflict, index) => (
        <div
          key={index}
          className={`p-3 rounded-lg border ${
            conflict.severity === 'error'
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertCircle
              className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                conflict.severity === 'error' ? 'text-red-600' : 'text-amber-600'
              }`}
            />
            <div className="flex-1">
              <p
                className={`font-medium ${
                  conflict.severity === 'error' ? 'text-red-800' : 'text-amber-800'
                }`}
              >
                {conflict.type.charAt(0).toUpperCase() + conflict.type.slice(1)} Conflict
              </p>
              <p
                className={`text-sm mt-1 ${
                  conflict.severity === 'error' ? 'text-red-700' : 'text-amber-700'
                }`}
              >
                {conflict.message}
              </p>
            </div>
          </div>
        </div>
      ))}
      
      {result.suggestions && result.suggestions.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-medium text-blue-800 mb-1">Suggestions:</p>
          <ul className="list-disc list-inside space-y-1">
            {result.suggestions.map((suggestion, index) => (
              <li key={index} className="text-sm text-blue-700">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {!result.canProceed && (
        <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg">
          <p className="text-sm text-gray-700 font-medium">
            ⚠️ Cannot save this time slot due to conflicts. Please adjust the schedule.
          </p>
        </div>
      )}
    </div>
  );
};