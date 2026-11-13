import { useEffect, useRef, useId } from "react";
import {
  AlertCircle,
  LoaderCircle,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { STATUS_LABELS } from "../utils/format";
export function Badge({ code, children }) {
  return (
    <span className={`badge status-${code}`}>
      <span className="status-dot" />
      {children || STATUS_LABELS[code] || code}
    </span>
  );
}
export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} /> Loading your workspace…
    </div>
  );
}
export function ErrorState({ message, retry }) {
  return (
    <div className="error-panel" role="alert">
      <AlertCircle size={20} />
      <div>{message}</div>
      {retry && (
        <button className="btn small" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Empty({ title = "No records yet", description, children }) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = "Search units or drivers…",
}) {
  return (
    <div className="search-input">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search">
          <X size={15} />
        </button>
      )}
    </div>
  );
}
export function Pagination({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) return null;
  return (
    <div className="pagination">
      <span>
        {meta.total} records · Page {meta.current_page} of {meta.last_page}
      </span>
      <div>
        <button
          className="btn small"
          disabled={meta.current_page === 1}
          onClick={() => onPage(meta.current_page - 1)}
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <button
          className="btn small"
          disabled={meta.current_page === meta.last_page}
          onClick={() => onPage(meta.current_page + 1)}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null),
    closeRef = useRef(onClose),
    id = useId();
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const initialFocus =
      ref.current?.querySelector("input,select,textarea") ||
      ref.current?.querySelector("button");
    initialFocus?.focus();
    const handle = (e) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = ref.current.querySelectorAll(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <div className="modal-heading">
          <h2 id={id}>{title}</h2>
          <button
            className="icon-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Field({ label, error, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}{" "}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
