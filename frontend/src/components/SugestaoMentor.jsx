import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { api } from "../api.js";

const ACAO_LABEL = { ativar: "ativar", manter: "manter", pausar: "pausar", focar: "focar" };

export default function SugestaoMentor({ disc, onAplicar }) {
  const [estado, setEstado] = useState("idle");
  const [sugestao, setSugestao] = useState(null);

  const pedir = async () => {
    setEstado("carregando");
    try {
      setSugestao(await api.sugestaoPlano());
      setEstado("pronto");
    } catch {
      setEstado("erro");
    }
  };

  const aplicar = async (s) => {
    const status = { ativar: "ativa", pausar: "pausada", focar: "ativa" }[s.acao];
    if (status) await onAplicar(s.disciplina_id, status);
  };

  if (estado === "idle") {
    return (
      <button onClick={pedir} className="flex items-center gap-1.5 text-xs mb-6" style={{ color: "var(--mentor)" }}>
        <MessageCircle size={13} /> pedir sugestão de plano ao mentor
      </button>
    );
  }

  return (
    <div className="card p-4 mb-6" style={{ borderColor: "var(--mentor)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase" style={{ color: "var(--mentor)" }}>sugestão do mentor</span>
        <button onClick={() => setEstado("idle")} className="text-xs" style={{ color: "var(--muted)" }}>descartar</button>
      </div>
      {estado === "carregando" && (
        <p className="text-sm flex items-center gap-2" style={{ color: "var(--muted)" }}>
          <span className="inline-block w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--mentor)", borderTopColor: "transparent" }} />
          pensando no seu plano, pode levar alguns segundos...
        </p>
      )}
      {estado === "erro" && (
        <div className="flex items-center gap-3">
          <p className="text-sm" style={{ color: "var(--erro)" }}>não consegui gerar agora.</p>
          <button onClick={pedir} className="text-sm font-semibold" style={{ color: "var(--mentor)" }}>tentar de novo</button>
        </div>
      )}
      {estado === "pronto" && sugestao && (
        <div className="max-w-3xl">
          <p className="text-sm mb-3" style={{ color: "var(--text-card)" }}>{sugestao.resumo}</p>
          <div className="space-y-2">
            {sugestao.sugestoes?.map((s, i) => {
              const d = disc.find((x) => x.id === s.disciplina_id);
              return (
                <div key={i} className="flex items-center justify-between gap-3 text-sm p-2 rounded-lg" style={{ background: "var(--bg-raso)" }}>
                  <div className="max-w-3xl">
                    <b style={{ color: "var(--text-card)" }}>{d?.nome || s.disciplina_id}</b>
                    <span style={{ color: "var(--muted)" }}> — {ACAO_LABEL[s.acao] || s.acao}
                      {s.horas_sugeridas_semana ? ` · ${s.horas_sugeridas_semana}h/semana` : ""}</span>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{s.justificativa}</p>
                  </div>
                  {["ativar", "pausar", "focar"].includes(s.acao) && (
                    <button onClick={() => aplicar(s)} className="text-xs rounded-md px-2.5 h-7 shrink-0"
                      style={{ border: "1px solid var(--border)", color: "var(--text-card)" }}>aplicar</button>
                  )}
                </div>
              );
            })}
          </div>
          {sugestao.pergunta_checagem && (
            <p className="text-xs mt-3 italic" style={{ color: "var(--mentor)" }}>{sugestao.pergunta_checagem}</p>
          )}
        </div>
      )}
    </div>
  );
}
