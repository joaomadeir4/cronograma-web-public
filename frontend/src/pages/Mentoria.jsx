import { CheckCircle2, HelpCircle, ListChecks, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { api } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import AtividadeItem from "../components/AtividadeItem.jsx";
import ErroCard from "../components/ErroCard.jsx";
import RespostaMentor from "../components/RespostaMentor.jsx";
import { SkeletonLista } from "../components/Skeleton.jsx";

export default function Mentoria() {
  const [tab, setTab] = useState("duvidas");
  const [soAbertas, setSoAbertas] = useState(true);
  const [resposta, setResposta] = useState({});
  const [replica, setReplica] = useState({});
  const [enviandoReplica, setEnviandoReplica] = useState({});
  const [acaoErro, setAcaoErro] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [selecionandoDuvidas, setSelecionandoDuvidas] = useState(false);
  const [duvidasSelecionadas, setDuvidasSelecionadas] = useState([]);
  const [selecionandoAtividades, setSelecionandoAtividades] = useState(false);
  const [atividadesSelecionadas, setAtividadesSelecionadas] = useState([]);
  const [apagando, setApagando] = useState(false);

  const carregarDuvidas = useCallback(() => api.duvidas(soAbertas), [soAbertas]);
  const carregarAtividades = useCallback(() => api.atividades({ tipo: filtroTipo, status: filtroStatus }), [filtroTipo, filtroStatus]);

  const { data: duvidas, erro: erroDuvidas, carregando: carregandoDuvidas, recarregar: recarregarDuvidas } = useApi(carregarDuvidas);
  const { data: atividades, erro: erroAtividades, carregando: carregandoAtividades, recarregar: recarregarAtividades } = useApi(carregarAtividades);

  const resolver = async (qid) => {
    setAcaoErro(null);
    try {
      await api.resolverDuvida(qid, resposta[qid] || "");
      recarregarDuvidas();
    } catch {
      setAcaoErro("Não consegui resolver essa dúvida. Tenta de novo.");
    }
  };

  const enviarReplica = async (qid) => {
    const pergunta = (replica[qid] || "").trim();
    if (!pergunta) return;
    setAcaoErro(null);
    setEnviandoReplica({ ...enviandoReplica, [qid]: true });
    try {
      await api.continuarDuvida(qid, pergunta);
      setReplica({ ...replica, [qid]: "" });
      recarregarDuvidas();
    } catch {
      setAcaoErro("Não consegui enviar a réplica. Tenta de novo.");
    } finally {
      setEnviandoReplica({ ...enviandoReplica, [qid]: false });
    }
  };

  const toggleDuvidaSelecionada = (id) => {
    setDuvidasSelecionadas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAtividadeSelecionada = (id) => {
    setAtividadesSelecionadas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const sairModoSelecaoDuvidas = () => {
    setSelecionandoDuvidas(false);
    setDuvidasSelecionadas([]);
  };

  const sairModoSelecaoAtividades = () => {
    setSelecionandoAtividades(false);
    setAtividadesSelecionadas([]);
  };

  const apagarDuvidasSelecionadas = async () => {
    if (duvidasSelecionadas.length === 0) return;
    if (!window.confirm(`Apagar ${duvidasSelecionadas.length} dúvida(s) selecionada(s)? Essa ação não pode ser desfeita.`)) return;
    setAcaoErro(null);
    setApagando(true);
    try {
      await api.apagarDuvidas(duvidasSelecionadas);
      sairModoSelecaoDuvidas();
      recarregarDuvidas();
    } catch {
      setAcaoErro("Não consegui apagar as dúvidas selecionadas. Tenta de novo.");
    } finally {
      setApagando(false);
    }
  };

  const apagarAtividadesSelecionadas = async () => {
    if (atividadesSelecionadas.length === 0) return;
    if (!window.confirm(`Apagar ${atividadesSelecionadas.length} item(ns) selecionado(s)? Essa ação não pode ser desfeita.`)) return;
    setAcaoErro(null);
    setApagando(true);
    try {
      await api.apagarAtividades(atividadesSelecionadas);
      sairModoSelecaoAtividades();
      recarregarAtividades();
    } catch {
      setAcaoErro("Não consegui apagar as atividades selecionadas. Tenta de novo.");
    } finally {
      setApagando(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-[28px] font-semibold" style={{ color: "var(--text)" }}>Mentoria</h1>
      <p className="text-[13px] mb-5" style={{ color: "var(--muted)" }}>Dúvidas em aberto e o que você já praticou com o mentor.</p>

      <div className="flex gap-2 mb-5">
        {[{ id: "duvidas", label: "Dúvidas", Icon: HelpCircle, cor: "var(--alerta)" },
          { id: "atividades", label: "Atividades", Icon: Sparkles, cor: "var(--mentor)" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            style={tab === t.id ? { background: `${t.cor}22`, color: "var(--text)" } : { color: "var(--muted)" }}>
            <t.Icon size={15} color={tab === t.id ? t.cor : "var(--muted)"} /> {t.label}
          </button>
        ))}
      </div>

      {acaoErro && <div className="mb-4"><ErroCard mensagem={acaoErro} /></div>}

      {tab === "duvidas" && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <label className="text-xs flex items-center gap-2" style={{ color: "var(--muted)" }}>
              <input type="checkbox" checked={soAbertas} onChange={(e) => setSoAbertas(e.target.checked)} className="accent-[var(--acao)]" />
              só abertas
            </label>
            <div className="flex items-center gap-2">
              {selecionandoDuvidas && duvidasSelecionadas.length > 0 && (
                <button onClick={apagarDuvidasSelecionadas} disabled={apagando}
                  className="btn-fantasma flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  style={{ border: "1px solid var(--erro)", color: "var(--erro)" }}>
                  <Trash2 size={13} /> apagar selecionadas ({duvidasSelecionadas.length})
                </button>
              )}
              <button onClick={() => (selecionandoDuvidas ? sairModoSelecaoDuvidas() : setSelecionandoDuvidas(true))}
                className="btn-fantasma flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
                style={{ border: "1px solid var(--border)", color: selecionandoDuvidas ? "var(--text-card)" : "var(--muted)" }}>
                <ListChecks size={13} /> {selecionandoDuvidas ? "cancelar" : "selecionar"}
              </button>
            </div>
          </div>
          {carregandoDuvidas && !duvidas && <SkeletonLista n={3} />}
          {erroDuvidas && <ErroCard mensagem="Não consegui carregar as dúvidas." onRetry={recarregarDuvidas} />}
          {duvidas && (
            <div className="space-y-2">
              {duvidas.map((q) => (
                <div key={q.id} className="card p-3 text-sm flex gap-2">
                  {selecionandoDuvidas && (
                    <input type="checkbox" checked={duvidasSelecionadas.includes(q.id)} onChange={() => toggleDuvidaSelecionada(q.id)}
                      className="mt-1 shrink-0 accent-[var(--erro)]" aria-label="selecionar dúvida" />
                  )}
                  <div className="flex-1 min-w-0">
                  <div className="font-semibold" style={{ color: "var(--text-card)" }}>{q.disc_nome} <span className="text-xs font-normal" style={{ color: "var(--muted)" }}>· {q.criada_br}</span></div>
                  <div className="mt-1" style={{ color: "var(--text-card)" }}>{q.texto}</div>
                  {q.resolvida ? (
                    <div className="mt-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--sucesso)" }}>
                        <CheckCircle2 size={13} /> resolvida
                      </div>
                      {(() => {
                        const mensagens = q.mensagens?.length ? q.mensagens : (q.resposta ? [{ autor: "mentor", texto: q.resposta }] : []);
                        return mensagens.length > 0 && (
                          <div className="mt-1 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "16rem" }}>
                            {mensagens.map((m, i) => {
                              const souEu = m.autor === "eu";
                              return (
                                <div key={i} className="flex" style={{ justifyContent: souEu ? "flex-end" : "flex-start" }}>
                                  <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed"
                                    style={souEu
                                      ? { background: "var(--bolha-eu-bg)", color: "var(--bolha-eu-texto)" }
                                      : { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-card)" }}>
                                    <div className="text-[10px] font-semibold mb-0.5 uppercase tracking-wide"
                                      style={{ color: souEu ? "var(--bolha-eu-label)" : "var(--mentor)" }}>
                                      {souEu ? "você" : "mentor"}
                                    </div>
                                    <RespostaMentor texto={m.texto} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      <div className="flex gap-2 mt-2">
                        <input value={replica[q.id] || ""} onChange={(e) => setReplica({ ...replica, [q.id]: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter" && !enviandoReplica[q.id]) enviarReplica(q.id); }}
                          placeholder="continuar o debate..." aria-label={`Continuar debate sobre dúvida de ${q.disc_nome}`}
                          disabled={enviandoReplica[q.id]}
                          className="flex-1 min-w-0 rounded-lg px-2 py-1 text-xs"
                          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-card)" }} />
                        <button onClick={() => enviarReplica(q.id)} disabled={enviandoReplica[q.id]}
                          className="text-xs rounded-lg px-3 shrink-0" style={{ border: "1px solid var(--border)", color: "var(--text-card)" }}>
                          {enviandoReplica[q.id] ? "enviando..." : "enviar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <input value={resposta[q.id] || ""} onChange={(e) => setResposta({ ...resposta, [q.id]: e.target.value })}
                        placeholder="responder..." aria-label={`Responder dúvida de ${q.disc_nome}`}
                        className="flex-1 min-w-0 rounded-lg px-2 py-1 text-xs"
                        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-card)" }} />
                      <button onClick={() => resolver(q.id)} className="text-xs rounded-lg px-3 shrink-0" style={{ border: "1px solid var(--border)", color: "var(--text-card)" }}>resolver</button>
                    </div>
                  )}
                  </div>
                </div>
              ))}
              {duvidas.length === 0 && (
                <div className="card p-6 text-center">
                  <p className="text-sm" style={{ color: "var(--muted)" }}>{soAbertas ? "Nenhuma dúvida em aberto — tudo resolvido." : "Nenhuma dúvida registrada."}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "atividades" && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              {[{ v: "", l: "todas" }, { v: "questao", l: "questões" }, { v: "flashcard", l: "flashcards" }].map((o) => (
                <button key={o.v} onClick={() => setFiltroTipo(o.v)} className="text-xs px-2 py-1 rounded"
                  style={filtroTipo === o.v ? { background: "var(--mentor)", color: "#fff" } : { border: "1px solid var(--border)", color: "var(--muted)" }}>{o.l}</button>
              ))}
              <span className="mx-1" style={{ color: "var(--border)" }}>|</span>
              {[{ v: "", l: "qualquer status" }, { v: "pendente", l: "pendente" }, { v: "ok", l: "ok" }, { v: "revisar", l: "revisar" }].map((o) => (
                <button key={o.v} onClick={() => setFiltroStatus(o.v)} className="text-xs px-2 py-1 rounded"
                  style={filtroStatus === o.v ? { background: "var(--mentor)", color: "#fff" } : { border: "1px solid var(--border)", color: "var(--muted)" }}>{o.l}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {selecionandoAtividades && atividadesSelecionadas.length > 0 && (
                <button onClick={apagarAtividadesSelecionadas} disabled={apagando}
                  className="btn-fantasma flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  style={{ border: "1px solid var(--erro)", color: "var(--erro)" }}>
                  <Trash2 size={13} /> apagar selecionados ({atividadesSelecionadas.length})
                </button>
              )}
              <button onClick={() => (selecionandoAtividades ? sairModoSelecaoAtividades() : setSelecionandoAtividades(true))}
                className="btn-fantasma flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
                style={{ border: "1px solid var(--border)", color: selecionandoAtividades ? "var(--text-card)" : "var(--muted)" }}>
                <ListChecks size={13} /> {selecionandoAtividades ? "cancelar" : "selecionar"}
              </button>
            </div>
          </div>
          {carregandoAtividades && !atividades && <SkeletonLista n={3} />}
          {erroAtividades && <ErroCard mensagem="Não consegui carregar as atividades." onRetry={recarregarAtividades} />}
          {atividades && (
            <div className="space-y-3">
              {atividades.map((a) => (
                <AtividadeItem key={a.id} item={a} onMudou={recarregarAtividades} mostrarDisciplina
                  selecionavel={selecionandoAtividades} selecionado={atividadesSelecionadas.includes(a.id)}
                  onToggleSelecao={toggleAtividadeSelecionada} />
              ))}
              {atividades.length === 0 && (
                <div className="card p-6 text-center">
                  <p className="text-sm" style={{ color: "var(--muted)" }}>Nenhuma atividade gerada ainda. Gere questões/flashcards a partir de um checkpoint já entendido.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
