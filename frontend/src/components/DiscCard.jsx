import { CheckCircle2, ListChecks, Lock, MessageCircle, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../api";

const RITMO_COR = { alto: "var(--sucesso)", medio: "var(--alerta)", baixo: "var(--puc)" };
function corRitmo(pct) {
  if (pct >= 0.66) return RITMO_COR.alto;
  if (pct >= 0.33) return RITMO_COR.medio;
  return RITMO_COR.baixo;
}

const ESTILO_ESTADO = {
  ativa: (cor) => ({ borderLeft: `3px solid ${cor}` }),
  pausada: { borderStyle: "dashed", borderColor: "var(--border-tracejada)" },
  disponivel: { background: "var(--bg-raso)" },
  concluida: {},
};

export default function DiscCard({ d, timerAtivo, onIniciar, onStatus, onMentor, onOpenCheckpoints, onConcluirJa }) {
  const [acervoStatus, setAcervoStatus] = useState(null);
  const cor = corRitmo(d.pct_real);
  const estiloBase = d.status === "ativa" ? ESTILO_ESTADO.ativa(cor) : ESTILO_ESTADO[d.status] || {};
  const opacoConteudo = d.status === "concluida";
  const podeArquivar = ["ativa", "pausada"].includes(d.status);

  const pollRef = useRef(null);
  useEffect(() => {
    if (d.status !== "ativa") {
      setAcervoStatus(null);
      return;
    }
    let cancelado = false;
    const checar = () => {
      api.acervoStatus(d.id)
        .then((r) => {
          if (cancelado) return;
          setAcervoStatus(r.status);
          if (r.status === "baixando") {
            pollRef.current = setTimeout(checar, 3500);
          }
        })
        .catch(() => {});
    };
    checar();
    return () => {
      cancelado = true;
      clearTimeout(pollRef.current);
    };
  }, [d.status, d.id]);

  return (
    <div className="card card-interativo p-4 entrada" style={estiloBase}>
      <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3">
        <div className="min-w-0 w-full sm:w-auto" style={opacoConteudo ? { opacity: 0.65 } : {}}>
          <div className="flex items-center gap-2 flex-wrap" style={opacoConteudo ? { opacity: 1 } : {}}>
            {d.status === "concluida" && <CheckCircle2 size={15} color="var(--sucesso)" />}
            <span className="text-[15px]" style={{ color: "var(--text-card)", fontWeight: 600 }}>{d.nome}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold border-[1.5px]" style={{
              color: d.curso === "EED" ? "var(--eed)" : "var(--puc)",
              borderColor: d.curso === "EED" ? "var(--eed)" : "var(--puc)", opacity: 0.9,
            }}>{d.curso === "EED" ? "EED" : "PUC"}</span>
            {d.dependencias_pendentes.length > 0 && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted-2)" }} title={`precisa de: ${d.dependencias_pendentes.join(", ")}`}>
                <Lock size={12} /> depende de outra
              </span>
            )}
          </div>
          {d.status === "ativa" && (
            <div className="flex items-center gap-2 mt-2.5">
              <div className="h-[5px] rounded-full w-40" style={{ background: "var(--trough)" }}>
                <div className="h-[5px] rounded-full transition-[width] duration-500" style={{ width: `${d.pct_real * 100}%`, background: cor }} />
              </div>
              <span className="text-xs" style={{ color: "var(--muted)" }}>{Math.round(d.pct_real * 100)}%</span>
            </div>
          )}
          {acervoStatus === "baixando" && (
            <div className="flex items-center gap-1.5 text-xs mt-2" style={{ color: "var(--muted)" }}>
              <span className="inline-block w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor: "var(--mentor)", borderTopColor: "transparent" }} />
              📚 baixando material de estudo...
            </div>
          )}
          {acervoStatus === "erro" && (
            <div className="text-xs mt-2" style={{ color: "var(--muted)" }}>não consegui baixar o material</div>
          )}
          {d.status !== "ativa" && <div className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>{Math.round(d.pct_real * 100)}% concluído</div>}
          {d.sinais?.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs mt-2 px-2 py-1 rounded-md w-fit"
              style={{ background: "rgba(245,158,11,.12)", color: "var(--alerta-texto)" }}>
              <TriangleAlert size={12} /> {s.texto}
            </div>
          ))}
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end flex-wrap gap-2 sm:gap-1.5 shrink-0 w-full sm:w-auto">
          {d.status === "ativa" && !timerAtivo && (
            <button onClick={() => onIniciar(d.id)}
              className="btn-acao text-xs rounded-lg px-3.5 h-8">
              ▶ estudar agora
            </button>
          )}
          {d.status === "ativa" && (
            <button onClick={() => onStatus(d.id, "pausada")} className="btn-acao btn-acao--neutro text-xs rounded-lg px-3.5 h-8">pausar</button>
          )}
          {d.status === "pausada" && (
            <button onClick={() => onStatus(d.id, "ativa")} className="btn-acao text-xs rounded-lg px-3.5 h-8">retomar estudo</button>
          )}
          {d.status === "disponivel" && (
            <button onClick={() => onStatus(d.id, "ativa")} className="btn-acao text-xs rounded-lg px-3.5 h-8">ativar disciplina</button>
          )}
          {podeArquivar && (
            <button onClick={() => onStatus(d.id, "disponivel")} className="btn-acao btn-acao--neutro text-xs rounded-lg px-3.5 h-8">arquivar</button>
          )}
          {onConcluirJa && ["ativa", "pausada", "disponivel"].includes(d.status) && (
            <button onClick={() => onConcluirJa(d.id)} className="btn-acao btn-acao--neutro text-xs rounded-lg px-3.5 h-8 sm:ml-3">já concluí antes</button>
          )}

          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2.5 sm:gap-1.5 sm:mt-3">
            <button onClick={() => onOpenCheckpoints(d.id)}
              className="btn-fantasma flex items-center gap-1.5 text-xs rounded-md border px-2.5 h-7"
              style={{ borderColor: "var(--border)", color: "var(--text-card)" }}>
              <ListChecks size={13} /> ver checkpoints
            </button>
            {onMentor && (
              <button onClick={() => onMentor(d.id)} className="link-mentor flex items-center gap-1.5 text-xs" style={{ color: "var(--mentor)" }}>
                <MessageCircle size={13} /> perguntar ao mentor
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
