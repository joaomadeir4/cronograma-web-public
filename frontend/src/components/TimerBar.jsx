import { Pause, Play, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api.js";

function pad(n) {
  return String(n).padStart(2, "0");
}

function Bloco({ valor, label, destaque }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center relative overflow-hidden"
        style={{ background: "var(--trough)", border: "1px solid var(--border)" }}>
        <span className="text-2xl sm:text-3xl font-mono font-bold tabular-nums" style={{ color: destaque ? "var(--marca)" : "var(--text)" }}>
          {pad(valor)}
        </span>
        <div className="absolute left-0 right-0 top-1/2 h-px" style={{ background: "var(--border)" }} />
      </div>
      <span className="label-secao mt-1.5">{label}</span>
    </div>
  );
}

function RelogioTimer({ segundos, pausado }) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Bloco valor={h} label="horas" destaque={!pausado} />
      <Bloco valor={m} label="min" destaque={!pausado} />
      <Bloco valor={s} label="seg" destaque={!pausado} />
    </div>
  );
}

function segundosDecorridos(a) {
  const acumulado = (a.acumulado || 0) * 60;
  if (a.pausado_em) return acumulado;
  const desde = (Date.now() - new Date(a.inicio).getTime()) / 1000;
  return acumulado + Math.max(desde, 0);
}

export default function TimerBar({ timer, onChange }) {
  const [obs, setObs] = useState("");
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!timer?.ativa) return;
    setSegundos(segundosDecorridos(timer.ativa));
    if (timer.ativa.pausado_em) return;
    const id = setInterval(() => setSegundos(segundosDecorridos(timer.ativa)), 1000);
    return () => clearInterval(id);
  }, [timer]);

  if (!timer?.ativa) return null;
  const a = timer.ativa;

  const acao = async (fn) => {
    setErro(null);
    try {
      await fn();
      onChange();
    } catch {
      setErro("Não consegui completar essa ação no timer. Tenta de novo.");
    }
  };

  return (
    <div className="card p-5 mb-4" style={!a.pausado_em ? { background: "radial-gradient(120% 160% at 0% 0%, rgba(20,184,166,.16), var(--card) 60%)" } : {}}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: a.pausado_em ? "var(--muted)" : "var(--marca)" }}>
            {a.pausado_em ? "pausado" : "estudando agora"}
          </div>
          <div className="text-lg font-semibold" style={{ color: "var(--text)" }}>{timer.disciplina_nome}</div>
        </div>
        <div className="flex items-center gap-3">
          <RelogioTimer segundos={segundos} pausado={!!a.pausado_em} />
          {a.pausado_em ? (
            <button onClick={() => acao(api.timerRetomar)} aria-label="Retomar sessão" className="w-11 h-11 rounded-full flex items-center justify-center text-white" style={{ background: "var(--acao-grad)" }}>
              <Play size={18} fill="currentColor" />
            </button>
          ) : (
            <button onClick={() => acao(api.timerPausar)} aria-label="Pausar sessão" className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ border: "1px solid var(--border)", color: "var(--text-card)" }}>
              <Pause size={18} fill="currentColor" />
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-4 flex-wrap" style={{ borderTop: "1px solid var(--border)" }}>
        <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="O que você fez nessa sessão?"
          className="flex-1 min-w-[200px] rounded-lg px-3 py-2 text-sm"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-card)" }} />
        <button onClick={() => acao(() => api.timerEncerrar(obs).then(() => setObs("")))}
          className="flex items-center gap-1.5 font-semibold rounded-lg px-4 text-sm text-white" style={{ background: "var(--sucesso)" }}>
          <Square size={13} fill="currentColor" /> finalizar
        </button>
        <button onClick={() => acao(api.timerCancelar)} className="text-xs" style={{ color: "var(--muted)" }}>descartar</button>
      </div>
      {erro && <p className="text-xs mt-2" style={{ color: "var(--erro)" }}>{erro}</p>}
    </div>
  );
}
