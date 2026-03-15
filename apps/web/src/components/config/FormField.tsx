import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  description?: string;
  children: ReactNode;
}

export function FormField({ label, name, error, required, description, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
