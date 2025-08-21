import { useState, useEffect, useMemo, useCallback } from 'react';
import { ValidationError, ValidationResult } from '@/utils/formValidation';

interface UseFormValidationOptions<T> {
  validateFn: (data: T) => ValidationResult;
  formData: T;
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void;
}

export function useFormValidation<T>({ validateFn, formData, onValidationChange }: UseFormValidationOptions<T>) {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  
  // Memoize validation result to prevent unnecessary recalculations
  const validationResult = useMemo(() => {
    return validateFn(formData);
  }, [formData, validateFn]);

  // Use callback to prevent parent re-renders from affecting this hook
  const notifyValidationChange = useCallback((isValid: boolean, errors: ValidationError[]) => {
    onValidationChange?.(isValid, errors);
  }, [onValidationChange]);

  // Update validation errors only when validation result actually changes
  useEffect(() => {
    const errorsChanged = JSON.stringify(validationResult.errors) !== JSON.stringify(validationErrors);
    
    if (errorsChanged) {
      setValidationErrors(validationResult.errors);
      notifyValidationChange(validationResult.isValid, validationResult.errors);
    }
  }, [validationResult, notifyValidationChange]); // Removed validationErrors from dependencies to prevent infinite loop

  return {
    validationErrors,
    isValid: validationResult.isValid,
    hasFieldError: (fieldName: string) => validationErrors.some(e => e.field === fieldName),
    getFieldError: (fieldName: string) => validationErrors.find(e => e.field === fieldName)?.message
  };
}
