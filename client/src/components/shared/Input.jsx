import "./shared.css";

export default function Input({ label, id, error, className = "", ...rest }) {
  const inputId = id || rest.name;
  return (
    <div className={`field${error ? " field--error" : ""} ${className}`.trim()}>
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="field__input"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
      />
      {error && (
        <span id={`${inputId}-error`} className="field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
