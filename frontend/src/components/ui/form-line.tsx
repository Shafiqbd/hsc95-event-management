import type { ReactNode } from "react";


/** Input styled like the dotted lines of the paper registration form. */
export const lineInputClass =
  "w-full border-0 border-b-2 border-dotted border-border bg-transparent px-1 py-1 text-[15px] leading-6 text-fg placeholder:text-muted/60 transition-colors outline-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 aria-[invalid=true]:border-danger";

/** Boxed input for login screens and admin tools. */
export const boxInputClass =
  "h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-[15px] text-fg placeholder:text-muted/70 transition-colors outline-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 aria-[invalid=true]:border-danger";


export function FormLine({
  id,
  label,
  required,
  error,
  hint,
  children,
  className = "",
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-1 sm:grid-cols-[9.5rem_1fr] sm:items-baseline sm:gap-3 ${className}`}>
      <label htmlFor={id} className="text-[15px] font-medium text-fg">
        {label} :{required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
      </label>
      <div>
        {children}
        {hint && !error && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/** aria props tying an input to its FormLine error/hint. */
export function fieldAria(id: string, error?: string, hint?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}
