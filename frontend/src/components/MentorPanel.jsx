import { Send } from "lucide-react";
import { useState } from "react";
import { api } from "../api.js";
import Modal from "./Modal.jsx";
import RespostaMentor from "./RespostaMentor.jsx";

export default function MentorPanel({ disciplinaId, onClose }) {
  const [pergunta, setPergunta] = useState(disciplinaId ? "" : "O que eu devia estudar agora?");
  const [resposta, setResposta] = useState(null);
  const [estado, setEstado] = useState("idle");

  const perguntar = async () => {
    if (!pergunta.trim()) return;
    setEstado("carregando");
    setResposta(null);
    try {
      const r = await api.perguntarMentor(pergunta, disciplinaId);
      setResposta(r.resposta);
      setEstado("pronto");
    } catch {
      setEstado("erro");
    }
  };

  return (
    <Modal title="Perguntar ao mentor" onClose={onClose} maxWidth="min(85vw, 980px)" disableOuterScroll>
      <div className="flex gap-2 mb-3 shrink-0">
        <input value={pergunta} onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && perguntar()}
          placeholder="Escreva sua dúvida..." autoFocus
          className="flex-1 rounded-lg px-3 py-2 text-sm"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-card)" }} />
        <button onClick={perguntar} disabled={estado === "carregando" || !pergunta.trim()}
          className="btn-acao rounded-lg px-4 flex items-center gap-1.5 text-sm font-semibold text-white disabled:opacity-50">
          <Send size={14} /> perguntar
        </button>
      </div>

      {estado === "carregando" && (
        <p className="text-sm flex items-center gap-2" style={{ color: "var(--muted)" }}>
          <span className="inline-block w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--mentor)", borderTopColor: "transparent" }} />
          pensando, pode levar alguns segundos...
        </p>
      )}
      {estado === "erro" && (
        <div className="flex items-center gap-3">
          <p className="text-sm" style={{ color: "var(--erro)" }}>não consegui responder agora.</p>
          <button onClick={perguntar} className="text-sm font-semibold" style={{ color: "var(--mentor)" }}>tentar de novo</button>
        </div>
      )}
      {estado === "pronto" && (
        <RespostaMentor texto={resposta} className="p-4 rounded-lg text-sm leading-relaxed overflow-y-auto flex-1 min-h-0"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-card)", maxHeight: "50vh" }} />
      )}
      {estado === "idle" && (
        <p className="text-xs" style={{ color: "var(--muted)" }}>A resposta usa seu progresso real (checkpoints, dependências, ritmo) e já fica salva como dúvida resolvida em Mentoria.</p>
      )}
    </Modal>
  );
}
