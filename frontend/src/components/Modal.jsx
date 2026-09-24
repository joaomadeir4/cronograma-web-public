import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const FOCAVEIS = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ title, onClose, children, wide, maxWidth, disableOuterScroll }) {
  const [shown, setShown] = useState(false);
  const dialogRef = useRef(null);
  const gatilhoRef = useRef(document.activeElement);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const alvoAnterior = gatilhoRef.current;
    const primeiro = dialogRef.current?.querySelector(FOCAVEIS);
    (primeiro || dialogRef.current)?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focaveis = Array.from(dialogRef.current.querySelectorAll(FOCAVEIS));
      if (focaveis.length === 0) return;
      const primeiroF = focaveis[0];
      const ultimoF = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiroF) {
        e.preventDefault();
        ultimoF.focus();
      } else if (!e.shiftKey && document.activeElement === ultimoF) {
        e.preventDefault();
        primeiroF.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (alvoAnterior && typeof alvoAnterior.focus === "function") alvoAnterior.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-opacity duration-150"
      style={{ backdropFilter: "blur(4px)", opacity: shown ? 1 : 0 }} onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        className={`card p-5 w-full ${!maxWidth ? (wide ? "max-w-lg" : "max-w-md") : ""} ${disableOuterScroll ? "max-h-[85vh] flex flex-col" : "max-h-[85vh] overflow-y-auto"} transition-all duration-150 outline-none`}
        style={{ boxShadow: "0 20px 40px -12px rgba(0,0,0,.5)", transform: shown ? "scale(1)" : "scale(.96)", opacity: shown ? 1 : 0, ...(maxWidth ? { maxWidth } : {}) }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-[15px]" style={{ color: "var(--text-card)" }}>{title}</h3>
          <button onClick={onClose} aria-label="Fechar"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--border)] transition-colors"
            style={{ color: "var(--muted)" }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
