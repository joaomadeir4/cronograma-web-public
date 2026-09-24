import { ChevronRight } from "lucide-react";
import { useState } from "react";

const ACCENT = {
  ativa: "transparent",
  pausada: "var(--muted-2)",
  disponivel: "var(--border-tracejada)",
  concluida: "var(--sucesso)",
  fila: "var(--border-tracejada)",
};

export default function Secao({ titulo, itens, children, aberto = false, tipo = "ativa" }) {
  const [open, setOpen] = useState(aberto);
  if (!itens.length) return null;
  return (
    <div className="mb-6">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left px-2 py-2 -mx-2 rounded-lg hover:bg-[var(--bg-raso)] transition-colors duration-150 active:scale-[0.99]"
        style={{ borderLeft: `2px solid ${ACCENT[tipo]}` }}>
        <ChevronRight size={16} color="var(--muted-2)" style={{ transition: "transform 180ms cubic-bezier(0.16,1,0.3,1)", transform: open ? "rotate(90deg)" : "none" }} />
        <span className="label-secao">{titulo} ({itens.length})</span>
      </button>
      {open && <div className="space-y-2 mt-2 entrada">{children}</div>}
    </div>
  );
}
