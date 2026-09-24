import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import ErroCard from "../components/ErroCard.jsx";
import { SkeletonLista } from "../components/Skeleton.jsx";

const hoje = () => new Date().toISOString().slice(0, 10);

function LancarSessao({ disciplinas, onSalvou }) {
  const [disciplina, setDisciplina] = useState("");
  const [data, setData] = useState(hoje());
  const [minutos, setMinutos] = useState("");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!disciplina && disciplinas?.length) setDisciplina(disciplinas[0].id);
  }, [disciplinas, disciplina]);

  const salvar = async (e) => {
    e.preventDefault();
    if (!disciplina || !data || !Number(minutos)) return;
    setErro(null);
    setSucesso(false);
    setSalvando(true);
    try {
      await api.novaSessao({ disciplina, data, minutos: Number(minutos), obs });
      setMinutos("");
      setObs("");
      setSucesso(true);
      onSalvou();
    } catch {
      setErro("Não consegui salvar a sessão. Tenta de novo.");
    } finally {
      setSalvando(false);
    }
  };

  const campoEstilo = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-card)" };

  return (
    <div className="card p-4 mb-6">
      <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-card)" }}>Lançar sessão manualmente</h2>
      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Pra quando você esqueceu de rodar o timer ao vivo e quer registrar depois.</p>
      <form onSubmit={salvar} className="grid gap-2 sm:grid-cols-2">
        <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm" style={campoEstilo}>
          {(disciplinas || []).map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm" style={campoEstilo} />
        <input type="number" min="1" value={minutos} onChange={(e) => setMinutos(e.target.value)}
          placeholder="minutos" className="rounded-lg px-3 py-2 text-sm" style={campoEstilo} />
        <input value={obs} onChange={(e) => setObs(e.target.value)}
          placeholder="observação (opcional)" className="rounded-lg px-3 py-2 text-sm" style={campoEstilo} />
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={salvando || !disciplina || !data || !Number(minutos)}
            className="btn-acao text-sm rounded-lg px-4 h-9 disabled:opacity-50">
            {salvando ? "salvando..." : "salvar sessão"}
          </button>
          {sucesso && (
            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--sucesso)" }}>
              <CheckCircle2 size={13} /> sessão registrada
            </span>
          )}
        </div>
      </form>
      {erro && <div className="mt-3"><ErroCard mensagem={erro} /></div>}
    </div>
  );
}

export default function Historico() {
  const [acaoErro, setAcaoErro] = useState(null);

  const carregarSessoes = useCallback(() => api.sessoes(), []);
  const { data: sessoes, erro: erroSessoes, carregando: carregandoSessoes, recarregar: recarregarSessoes } = useApi(carregarSessoes);

  const carregarDisc = useCallback(() => api.disciplinas(), []);
  const { data: disc } = useApi(carregarDisc);

  const apagarSessao = async (i) => {
    setAcaoErro(null);
    try {
      await api.apagarSessao(i);
      recarregarSessoes();
    } catch {
      setAcaoErro("Não consegui apagar essa sessão. Tenta de novo.");
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-[28px] font-semibold" style={{ color: "var(--text)" }}>Histórico</h1>
      <p className="text-[13px] mb-5" style={{ color: "var(--muted)" }}>Suas sessões de estudo registradas.</p>

      <LancarSessao disciplinas={disc} onSalvou={recarregarSessoes} />

      {acaoErro && <div className="mb-4"><ErroCard mensagem={acaoErro} /></div>}

      {carregandoSessoes && !sessoes && <SkeletonLista n={3} />}
      {erroSessoes && <ErroCard mensagem="Não consegui carregar as sessões." onRetry={recarregarSessoes} />}
      {sessoes && (
        <div className="space-y-2">
          {sessoes.map((s) => (
            <div key={s.i} className="card p-3 flex justify-between items-center text-sm gap-3 flex-wrap">
              <div className="min-w-0">
                <span className="font-semibold" style={{ color: "var(--text-card)" }}>{s.disc_nome}</span>
                <span style={{ color: "var(--muted)" }}> · {s.data_br} · {s.tempo}</span>
                {s.obs && <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{s.obs}</div>}
              </div>
              <button onClick={() => apagarSessao(s.i)} className="text-xs shrink-0" style={{ color: "var(--muted)" }}>apagar</button>
            </div>
          ))}
          {sessoes.length === 0 && (
            <div className="card p-6 text-center">
              <p className="text-sm" style={{ color: "var(--muted)" }}>Nenhuma sessão registrada ainda. Comece um timer em Agora.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
