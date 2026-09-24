import { Brain, CalendarDays, CheckCircle2, Clock, HelpCircle, TrendingUp } from "lucide-react";
import { useCallback } from "react";
import { api } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import Burnup from "../components/graficos/Burnup.jsx";
import DuvidasLinha from "../components/graficos/DuvidasLinha.jsx";
import Heatmap from "../components/graficos/Heatmap.jsx";
import HorasSemana from "../components/graficos/HorasSemana.jsx";
import ErroCard from "../components/ErroCard.jsx";
import { SkeletonLista, SkeletonPainel } from "../components/Skeleton.jsx";

const ICONE = { "Semana": CalendarDays, "Ativas": TrendingUp, "Horas na semana": Clock, "Dúvidas abertas": HelpCircle, "Status geral": CheckCircle2, "Atividades": Brain };
const COR = { "Semana": "var(--puc)", "Ativas": "var(--marca)", "Horas na semana": "var(--mentor)", "Dúvidas abertas": "var(--alerta)", "Status geral": "var(--sucesso)", "Atividades": "var(--mentor)" };

export default function Progresso() {
  const carregarPainel = useCallback(() => api.painel(), []);
  const carregarDisc = useCallback(() => api.disciplinas(), []);
  const carregarGraficos = useCallback(() => api.graficos(), []);
  const carregarAtividades = useCallback(() => api.atividades(), []);
  const { data: painel, erro: erroPainel, recarregar: recarregarPainel } = useApi(carregarPainel);
  const { data: disc, erro: erroDisc, recarregar: recarregarDisc } = useApi(carregarDisc);
  const { data: graficos, erro: erroGraficos, recarregar: recarregarGraficos } = useApi(carregarGraficos);
  const { data: atividades } = useApi(carregarAtividades);

  const recarregar = () => {
    recarregarPainel();
    recarregarDisc();
    recarregarGraficos();
  };

  if (erroPainel || erroDisc || erroGraficos) {
    return (
      <div>
        <h1 className="text-[28px] font-semibold mb-4" style={{ color: "var(--text)" }}>Progresso</h1>
        <ErroCard mensagem="Não consegui carregar o progresso." onRetry={recarregar} />
      </div>
    );
  }

  if (!painel || !disc || !graficos) {
    return (
      <div>
        <h1 className="text-[28px] font-semibold mb-4" style={{ color: "var(--text)" }}>Progresso</h1>
        <SkeletonPainel n={5} />
        <SkeletonLista n={2} />
      </div>
    );
  }

  const ativas = disc.filter((d) => d.status === "ativa");
  const cardsExtra = [...painel.cards, { titulo: "Atividades", valor: atividades?.length ?? "—", sub: atividades ? `${atividades.filter((a) => a.status === "ok").length} ok` : "" }];

  return (
    <div>
      <h1 className="text-[28px] font-semibold" style={{ color: "var(--text)" }}>Progresso</h1>
      <p className="text-[13px] mb-6" style={{ color: "var(--muted)" }}>Um raio-x da semana: ritmo, meta e o que está pedindo atenção.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {cardsExtra.map((c) => {
          const Icone = ICONE[c.titulo] || TrendingUp;
          const cor = COR[c.titulo] || "var(--marca)";
          return (
            <div key={c.titulo} className="card p-4">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${cor}22`, color: cor }}>
                <Icone size={16} />
              </span>
              <div className="label-secao">{c.titulo}</div>
              <div className="text-xl font-semibold mt-1" style={{ color: "var(--text)" }}>{c.valor}</div>
              {c.sub && <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{c.sub}</div>}
            </div>
          );
        })}
      </div>

      {painel.alertas.length > 0 && (
        <div className="space-y-2 mb-8">
          {painel.alertas.map((a, i) => (
            <div key={i} className="card p-3 text-sm" style={{ color: "var(--text-card)" }}>
              {a}
            </div>
          ))}
        </div>
      )}

      <h2 className="text-[15px] font-semibold mb-3" style={{ color: "var(--text)" }}>Ritmo por disciplina ativa</h2>
      <div className="grid md:grid-cols-2 gap-3 mb-8">
        {ativas.map((d) => (
          <div key={d.id} className="card p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold" style={{ color: "var(--text-card)" }}>{d.nome}</span>
              <span style={{ color: "var(--muted)" }}>{Math.round(d.pct_real * 100)}% · {d.dias_ativa}d ativa</span>
            </div>
            <div className="h-2 rounded" style={{ background: "var(--trough)" }}>
              <div className="h-2 rounded" style={{ width: `${d.pct_real * 100}%`, background: "var(--acao-grad)" }} />
            </div>
            <div className="text-xs mt-2" style={{ color: "var(--muted)" }}>
              {d.previsto ? `previsto pra ${new Date(d.previsto).toLocaleDateString("pt-BR")} no ritmo atual` : "ainda sem dados de ritmo suficientes"}
              {d.fator_dificuldade !== 1 && ` · dificuldade ${d.fator_dificuldade}x`}
            </div>
          </div>
        ))}
        {ativas.length === 0 && (
          <div className="card p-6 text-center md:col-span-2">
            <p className="text-sm" style={{ color: "var(--muted)" }}>Nenhuma disciplina ativa no momento. Ative uma em Agora.</p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-card)" }}>Burn-up de checkpoints</h3>
          <Burnup dados={graficos.burnup} />
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-card)" }}>Horas por semana</h3>
          <HorasSemana dados={graficos.horas} meta={graficos.meta_horas} />
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-card)" }}>Dias estudados</h3>
          <Heatmap dados={graficos.heatmap} />
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-card)" }}>Dúvidas no tempo</h3>
          <DuvidasLinha dados={graficos.duvidas} />
        </div>
      </div>
    </div>
  );
}
