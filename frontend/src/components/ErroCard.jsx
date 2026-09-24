import { RefreshCw, TriangleAlert } from "lucide-react";

export default function ErroCard({ mensagem, onRetry }) {
  return (
    <div className="card p-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: "var(--erro)", background: "var(--erro-bg)" }}>
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-card)" }}>
        <TriangleAlert size={16} color="var(--erro)" />
        {mensagem || "Não consegui carregar isso agora."}
      </div>
      {onRetry && (
        <button onClick={onRetry}
          className="flex items-center gap-1.5 text-xs font-semibold rounded-md px-3 h-8 shrink-0"
          style={{ border: "1px solid var(--erro)", color: "var(--erro)" }}>
          <RefreshCw size={13} /> tentar de novo
        </button>
      )}
    </div>
  );
}
