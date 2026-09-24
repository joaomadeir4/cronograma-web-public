import { MessageCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { api } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import DiscCard from "../components/DiscCard.jsx";
import Checkpoints from "../components/Checkpoints.jsx";
import ErroCard from "../components/ErroCard.jsx";
import FiltroCurso, { filtrarPorCurso } from "../components/FiltroCurso.jsx";
import MentorPanel from "../components/MentorPanel.jsx";
import Secao from "../components/Secao.jsx";
import { SkeletonLista } from "../components/Skeleton.jsx";
import SugestaoMentor from "../components/SugestaoMentor.jsx";
import TimerBar from "../components/TimerBar.jsx";

export default function Home() {
  const [checkpointsId, setCheckpointsId] = useState(null);
  const [mentorId, setMentorId] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [filtro, setFiltro] = useState("todos");

  const carregarDisc = useCallback(() => api.disciplinas(), []);
  const carregarTimer = useCallback(() => api.timer(), []);
  const carregarPainel = useCallback(() => api.painel(), []);

  const { data: disc, erro: erroDisc, carregando: carregandoDisc, recarregar: recarregarDisc } = useApi(carregarDisc);
  const { data: timer, recarregar: recarregarTimer } = useApi(carregarTimer);
  const { data: painel, recarregar: recarregarPainel } = useApi(carregarPainel);

  const carregar = () => {
    recarregarDisc();
    recarregarTimer();
    recarregarPainel();
  };

  if (carregandoDisc && !disc) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-[28px] font-semibold mb-4" style={{ color: "var(--text)" }}>Agora</h1>
        <SkeletonLista n={3} />
      </div>
    );
  }

  if (erroDisc) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-[28px] font-semibold mb-4" style={{ color: "var(--text)" }}>Agora</h1>
        <ErroCard mensagem="Não consegui carregar suas disciplinas." onRetry={carregar} />
      </div>
    );
  }

  const semNenhuma = disc.length === 0;
  const filtrado = filtrarPorCurso(disc, filtro);
  const ativas = filtrado.filter((d) => d.status === "ativa");
  const pausadas = filtrado.filter((d) => d.status === "pausada");
  const disponiveis = filtrado.filter((d) => d.status === "disponivel");
  const concluidas = filtrado.filter((d) => d.status === "concluida");
  const fila = filtrado.filter((d) => d.status === "fila");
  const horas = painel?.cards?.find((c) => c.titulo === "Horas na semana");

  const iniciar = async (id) => {
    setErroAcao(null);
    try {
      await api.timerIniciar(id);
      carregar();
    } catch {
      setErroAcao("Não consegui iniciar o timer. Tenta de novo.");
    }
  };
  const mudarStatus = async (id, status) => {
    setErroAcao(null);
    try {
      await api.mudarStatus(id, status);
      carregar();
    } catch {
      setErroAcao("Não consegui atualizar essa disciplina. Tenta de novo.");
    }
  };
  const concluirJa = async (id) => {
    setErroAcao(null);
    try {
      await api.concluirJa(id);
      carregar();
    } catch {
      setErroAcao("Não consegui marcar como concluída. Tenta de novo.");
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-[28px] font-semibold" style={{ color: "var(--text)" }}>Agora</h1>
      {horas && <p className="text-[13px] mb-4" style={{ color: "var(--muted)" }}>{horas.valor}{horas.sub ? ` · ${horas.sub}` : ""}</p>}
      {!horas && <div className="mb-4" />}

      <TimerBar timer={timer} onChange={carregar} />

      {erroAcao && <div className="mb-4"><ErroCard mensagem={erroAcao} /></div>}

      {!semNenhuma && <SugestaoMentor disc={disc} onAplicar={mudarStatus} />}

      {!semNenhuma && <FiltroCurso valor={filtro} onChange={setFiltro} />}

      {semNenhuma && (
        <div className="card p-6 text-center mb-6 entrada">
          <span className="text-2xl">👋</span>
          <p className="text-sm mt-2" style={{ color: "var(--text-card)" }}>Ainda não há disciplinas cadastradas.</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--muted)" }}>Peça uma sugestão ao mentor pra começar.</p>
          <button onClick={() => setMentorId("__geral__")}
            className="btn-acao inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-4 h-9">
            <MessageCircle size={13} /> perguntar ao mentor
          </button>
        </div>
      )}

      <Secao titulo="Ativas" itens={ativas} aberto tipo="ativa">
        {ativas.map((d) => (
          <DiscCard key={d.id} d={d} timerAtivo={!!timer?.ativa} onIniciar={iniciar} onStatus={mudarStatus}
            onMentor={setMentorId} onOpenCheckpoints={setCheckpointsId} onConcluirJa={concluirJa} />
        ))}
      </Secao>
      {ativas.length === 0 && !semNenhuma && (
        <div className="card p-6 text-center mb-6 entrada">
          <span className="text-2xl">🎯</span>
          <p className="text-sm mt-2" style={{ color: "var(--text-card)" }}>Nada ativo agora</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--muted)" }}>
            {disponiveis.length > 0
              ? "Escolha uma disciplina disponível logo abaixo e clique em \"ativar\", ou peça uma sugestão ao mentor."
              : "Peça uma sugestão ao mentor pra decidir o próximo passo."}
          </p>
          {disponiveis.length === 0 && (
            <button onClick={() => setMentorId("__geral__")}
              className="btn-fantasma inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-4 h-9" style={{ border: "1px solid var(--border)", color: "var(--text-card)" }}>
              <MessageCircle size={13} /> pedir sugestão
            </button>
          )}
        </div>
      )}

      <Secao titulo="Pausadas" itens={pausadas} tipo="pausada">
        {pausadas.map((d) => (
          <DiscCard key={d.id} d={d} timerAtivo={!!timer?.ativa} onIniciar={iniciar} onStatus={mudarStatus}
            onMentor={setMentorId} onOpenCheckpoints={setCheckpointsId} onConcluirJa={concluirJa} />
        ))}
      </Secao>

      <Secao titulo="Disponíveis pra ativar" itens={disponiveis} aberto={ativas.length === 0} tipo="disponivel">
        {disponiveis.map((d) => (
          <DiscCard key={d.id} d={d} timerAtivo={!!timer?.ativa} onIniciar={iniciar} onStatus={mudarStatus}
            onMentor={setMentorId} onOpenCheckpoints={setCheckpointsId} onConcluirJa={concluirJa} />
        ))}
      </Secao>

      <Secao titulo="Finalizadas — revisitar checkpoints/anotações" itens={concluidas} tipo="concluida">
        {concluidas.map((d) => (
          <DiscCard key={d.id} d={d} timerAtivo={!!timer?.ativa} onIniciar={iniciar} onStatus={mudarStatus}
            onMentor={setMentorId} onOpenCheckpoints={setCheckpointsId} onConcluirJa={concluirJa} />
        ))}
      </Secao>

      <Secao titulo="Na fila (ainda não publicadas)" itens={fila} tipo="fila">
        {fila.map((d) => (
          <DiscCard key={d.id} d={d} timerAtivo={!!timer?.ativa} onIniciar={iniciar} onStatus={mudarStatus}
            onMentor={setMentorId} onOpenCheckpoints={setCheckpointsId} onConcluirJa={concluirJa} />
        ))}
      </Secao>

      {!semNenhuma && (
        <button onClick={() => setMentorId("__geral__")}
          className="link-mentor flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--mentor)" }}>
          <MessageCircle size={13} /> perguntar ao mentor: o que eu devia estudar agora?
        </button>
      )}

      {checkpointsId && <Checkpoints discId={checkpointsId} onClose={() => { setCheckpointsId(null); carregar(); }} />}
      {mentorId && <MentorPanel disciplinaId={mentorId === "__geral__" ? null : mentorId} onClose={() => setMentorId(null)} />}
    </div>
  );
}
