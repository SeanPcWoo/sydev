import { useState, useCallback } from 'react';
import type { z } from 'zod';

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: Record<string, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFormValidation<T>(
  schema: z.ZodType<T, any, any>,
  initialValues: Partial<T> = {}
) {
  const [values, setValues] = useState<Partial<T>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const validateField = useCallback(
    (name: string, currentValues: Partial<T>) => {
      const result = schema.safeParse(currentValues);
      if (result.success) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      } else {
        const fieldIssue = result.error.issues.find(
          (issue) => issue.path[0] === name
        );
        setErrors((prev) => {
          if (fieldIssue) {
            return { ...prev, [name]: fieldIssue.message };
          }
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    },
    [schema]
  );

  const setField = useCallback(
    (name: string, value: unknown) => {
      const next = { ...values, [name]: value } as Partial<T>;
      setValues(next);
      if (touched.has(name)) {
        validateField(name, next);
      }
    },
    [values, touched, validateField]
  );

  const touchField = useCallback(
    (name: string) => {
      setTouched((prev) => {
        const next = new Set(prev);
        next.add(name);
        return next;
      });
      validateField(name, values);
    },
    [values, validateField]
  );

  const validate = useCallback((): ValidationResult<T> => {
    const result = schema.safeParse(values);
    if (result.success) {
      setErrors({});
      return { valid: true, data: result.data };
    }
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    setErrors(fieldErrors);
    // Mark all fields with errors as touched
    setTouched((prev) => {
      const next = new Set(prev);
      for (const key of Object.keys(fieldErrors)) {
        next.add(key);
      }
      return next;
    });
    return { valid: false, errors: fieldErrors };
  }, [schema, values]);

  const reset = useCallback(
    (newValues?: Partial<T>) => {
      setValues(newValues ?? initialValues);
      setErrors({});
      setTouched(new Set());
    },
    [initialValues]
  );

  return {
    values,
    errors,
    touched,
    submitting,
    setSubmitting,
    setField,
    touchField,
    validate,
    reset,
  };
}
