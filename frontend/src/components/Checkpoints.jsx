import { HelpCircle, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api.js";
import AtividadeItem from "./AtividadeItem.jsx";
import ErroCard from "./ErroCard.jsx";
import Modal from "./Modal.jsx";
import { SkeletonLinha } from "./Skeleton.jsx";

function Gerado({ discId, checkpointTexto }) {
  const [estado, setEstado] = useState("idle");
  const [ultimoTipo, setUltimoTipo] = useState(null);
  const [item, setItem] = useState(null);

  const gerar = async (t) => {
    setUltimoTipo(t);
    setEstado("carregando");
    setItem(null);
    try {
      const r = t === "questao" ? await api.gerarQuestao(discId, checkpointTexto) : await api.gerarFlashcard(discId, checkpointTexto);
      if (t === "flashcard" && r.aplicavel === false) {
        setEstado("nao_aplicavel");
        return;
      }
      setItem(r);
      setEstado("idle");
    } catch {
      setEstado("erro");
    }
  };

  return (
    <div className="mt-2 ml-7">
      <div className="flex gap-3">
        <button onClick={() => gerar("questao")} className="flex items-center gap-1 text-xs" style={{ color: "var(--mentor)" }}>
          <HelpCircle size={12} /> gerar questão
        </button>
        <button onClick={() => gerar("flashcard")} className="flex items-center gap-1 text-xs" style={{ color: "var(--mentor)" }}>
          <Layers size={12} /> gerar flashcard
        </button>
        {item && <span className="text-xs" style={{ color: "var(--muted)" }}>também salvo em Mentoria › Atividades</span>}
      </div>
      {estado === "carregando" && (
        <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
          <span className="inline-block w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor: "var(--mentor)", borderTopColor: "transparent" }} />
          gerando com IA, pode levar alguns segundos...
        </p>
      )}
      {estado === "erro" && (
        <div className="mt-2 flex items-center gap-2">
          <p className="text-xs" style={{ color: "var(--erro)" }}>não consegui gerar agora.</p>
          <button onClick={() => gerar(ultimoTipo)} className="text-xs font-semibold" style={{ color: "var(--mentor)" }}>tentar de novo</button>
        </div>
      )}
      {estado === "nao_aplicavel" && <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>esse checkpoint não rende um flashcard bom (não é premissa nem "quando usar X vs Y").</p>}
      {item && <div className="mt-2"><AtividadeItem item={item} onMudou={() => {}} /></div>}
    </div>
  );
}

export default function Checkpoints({ discId, onClose }) {
  const [cps, setCps] = useState(null);
  const [erro, setErro] = useState(null);
  const [texto, setTexto] = useState("");
  const [erroAcao, setErroAcao] = useState(null);

  const carregar = () => {
    setErro(null);
    setCps(null);
    return api.checkpointsDisc(discId)
      .then((r) => {
        if (!Array.isArray(r)) {
          setErro("Não consegui carregar os checkpoints dessa disciplina.");
          return;
        }
        setCps(r);
      })
      .catch(() => setErro("Não consegui carregar os checkpoints dessa disciplina."));
  };
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discId]);

  const marcar = async (k, feito) => {
    setErroAcao(null);
    try {
      await api.setCp(k, "feito", feito ? "1" : "0");
      carregar();
    } catch {
      setErroAcao("Não consegui salvar esse checkpoint. Tenta de novo.");
    }
  };
  const explicar = async (k, valor) => {
    setErroAcao(null);
    try {
      await api.setCp(k, "explica", valor);
      carregar();
    } catch {
      setErroAcao("Não consegui salvar. Tenta de novo.");
    }
  };
  const registrarDuvida = async () => {
    if (!texto.trim()) return;
    setErroAcao(null);
    try {
      await api.novaDuvida({ disciplina: discId, texto });
      setTexto("");
    } catch {
      setErroAcao("Não consegui registrar a dúvida. Tenta de novo.");
    }
  };

  return (
    <Modal title="Checkpoints" onClose={onClose} wide>
      {erroAcao && <div className="mb-3"><ErroCard mensagem={erroAcao} /></div>}
      {!cps && !erro && (
        <div className="space-y-3 py-2">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonLinha key={i} w="100%" h={20} />)}
        </div>
      )}
      {erro && <ErroCard mensagem={erro} onRetry={carregar} />}
      {cps && cps.length === 0 && <p className="text-sm py-4" style={{ color: "var(--muted)" }}>Essa disciplina ainda não tem checkpoints cadastrados.</p>}
      <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
        {cps?.map((cp) => (
          <li key={cp.k} className="py-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={cp.feito} onChange={(e) => marcar(cp.k, e.target.checked)}
                className="accent-[var(--acao)] w-4 h-4" />
              <span className="flex-1 text-sm" style={{ color: "var(--text-card)" }}>{cp.texto}</span>
              {cp.data && <span className="text-xs" style={{ color: "var(--muted)" }}>✓ {cp.data}</span>}
            </label>
            {cp.feito && (
              <div className="flex items-center gap-2 text-xs mt-2 ml-7">
                <span style={{ color: "var(--muted)" }}>consigo explicar sem olhar?</span>
                {["não", "sim"].map((op) => (
                  <button key={op} onClick={() => explicar(cp.k, op)}
                    className="px-2 py-1 rounded"
                    style={cp.explica === op
                      ? { background: "var(--acao)", color: "#fff", fontWeight: 600 }
                      : { border: "1px solid var(--border)", color: "var(--muted)" }}>
                    {op}
                  </button>
                ))}
              </div>
            )}
            {cp.explica === "sim" && <Gerado discId={discId} checkpointTexto={cp.texto} />}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Anotar uma dúvida rápida..."
          className="flex-1 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-card)" }} />
        <button onClick={registrarDuvida} className="text-sm rounded-lg px-3" style={{ border: "1px solid var(--border)", color: "var(--text-card)" }}>registrar</button>
      </div>
    </Modal>
  );
}
