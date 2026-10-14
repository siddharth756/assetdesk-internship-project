// Purpose: Accessible form field wrapper with label, error message, and hint text

export default function FormField({
  label,
  id,
  error,
  hint,
  required = false,
  children
}) {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="required" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <div className="form-hint">{hint}</div>}
      {error && (
        <div id={`${id}-error`} className="form-error" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
