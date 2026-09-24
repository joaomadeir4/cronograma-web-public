import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "../api.js";

export default function AtividadeItem({ item, onMudou, mostrarDisciplina, selecionavel, selecionado, onToggleSelecao }) {
  const [texto, setTexto] = useState("");
  const [revelado, setRevelado] = useState(false);
  const [virado, setVirado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const ultimaTentativa = item.tentativas?.[item.tentativas.length - 1];

  const conferir = () => {
    if (!texto.trim()) return;
    setRevelado(true);
  };

  const avaliar = async (cobriu) => {
    setEnviando(true);
    try {
      await api.registrarTentativa(item.id, texto, cobriu);
      setTexto("");
      setRevelado(false);
      onMudou?.();
    } finally {
      setEnviando(false);
    }
  };

  const apagar = async () => {
    await api.apagarAtividade(item.id);
    onMudou?.();
  };

  if (item.tipo === "flashcard") {
    return (
      <div className="card p-4 relative">
        {selecionavel ? (
          <input type="checkbox" checked={!!selecionado} onChange={() => onToggleSelecao?.(item.id)}
            className="absolute top-3 right-3 accent-[var(--erro)]" aria-label="selecionar flashcard" />
        ) : (
          <button onClick={apagar} className="absolute top-3 right-3" style={{ color: "var(--muted)" }} aria-label="apagar">
            <Trash2 size={13} />
          </button>
        )}
        {mostrarDisciplina && <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>{item.disciplina_nome}</div>}
        <div className="cursor-pointer" onClick={() => setVirado(!virado)}>
          <p className="text-sm" style={{ color: "var(--text-card)" }}>{virado ? item.verso : item.frente}</p>
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>{virado ? "(verso — clique pra ver a frente)" : "(clique pra virar)"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 relative">
      {selecionavel ? (
        <input type="checkbox" checked={!!selecionado} onChange={() => onToggleSelecao?.(item.id)}
          className="absolute top-3 right-3 accent-[var(--erro)]" aria-label="selecionar atividade" />
      ) : (
        <button onClick={apagar} className="absolute top-3 right-3" style={{ color: "var(--muted)" }} aria-label="apagar">
          <Trash2 size={13} />
        </button>
      )}
      {mostrarDisciplina && <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>{item.disciplina_nome}</div>}
      <p className="text-sm pr-5" style={{ color: "var(--text-card)" }}>{item.enunciado}</p>

      {!revelado ? (
        <div className="mt-3">
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3}
            placeholder="Escreva sua resposta antes de conferir..."
            className="w-full rounded-lg p-2 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-card)" }} />
          <button onClick={conferir} disabled={!texto.trim()}
            className="btn-acao text-xs rounded-lg px-3 h-8 mt-2 disabled:opacity-40">conferir resposta</button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="p-2 rounded-lg text-xs" style={{ background: "var(--bg-raso)", color: "var(--text-card)" }}>
            <b>sua resposta:</b> {texto}
          </div>
          <div className="p-2 rounded-lg text-xs space-y-1" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            {item.dica && <p style={{ color: "var(--muted)" }}><b style={{ color: "var(--text-card)" }}>dica:</b> {item.dica}</p>}
            <p style={{ color: "var(--muted)" }}><b style={{ color: "var(--text-card)" }}>resposta esperada:</b> {item.resposta_esperada}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span style={{ color: "var(--muted)" }}>minha resposta cobriu o esperado?</span>
            <button disabled={enviando} onClick={() => avaliar(true)} className="px-2 py-1 rounded" style={{ border: "1px solid var(--border)", color: "var(--sucesso)" }}>sim</button>
            <button disabled={enviando} onClick={() => avaliar(false)} className="px-2 py-1 rounded" style={{ border: "1px solid var(--border)", color: "var(--erro)" }}>não</button>
          </div>
        </div>
      )}

      {item.tentativas?.length > 0 && (
        <div className="mt-3 pt-2 flex items-center justify-between text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}>
          <span className="flex items-center gap-1.5">
            {ultimaTentativa.cobriu_esperado ? <CheckCircle2 size={12} color="var(--sucesso)" /> : <RotateCcw size={12} color="var(--erro)" />}
            {item.tentativas.length} tentativa{item.tentativas.length > 1 ? "s" : ""} — última {ultimaTentativa.cobriu_esperado ? "cobriu" : "não cobriu"} o esperado
          </span>
        </div>
      )}
    </div>
  );
}
