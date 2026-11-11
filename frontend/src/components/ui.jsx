export const Logo = () => (
  <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M11 39V10.5C11 8.6 12.6 7 14.5 7H33v32" stroke="#1f4d3a" strokeWidth="3.4" strokeLinecap="round"/><path d="M18 39V13h15v26" fill="#dceadf" stroke="#3f7658" strokeWidth="2.4"/><path d="M24 39c2.2-6.4 5.7-10.9 12-14" stroke="#82a78f" strokeWidth="3" strokeLinecap="round"/><circle cx="28.5" cy="25" r="1.6" fill="#1f4d3a"/></svg>
);
export const Field = ({ id, label, hint, error, children }) => (
  <div className="field">
    <label htmlFor={id}>{label}</label>
    {hint && <div className="small" id={id + '-h'}>{hint}</div>}
    {children}
    {error && <div className="err" role="alert">{error}</div>}
  </div>
);
export const Pill = ({ children, tone = '' }) => <span className={'pill ' + tone}>{children}</span>;
export const prioTone = (k) => (k === 'inmediata' ? 'red' : k === 'prioritaria' ? 'orange' : 'gray');
export const fmt = (iso) => (iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
