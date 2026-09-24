const BASE = "http://127.0.0.1:8000";

async function req(path, opts) {
  const r = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!r.ok) throw new Error(`${opts?.method || "GET"} ${path} -> ${r.status}`);
  return r.status === 204 ? null : r.json();
}

export const api = {
  disciplinas: () => req("/api/disciplinas"),
  mudarStatus: (id, status) => req(`/api/disciplinas/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
  concluirJa: (id) => req(`/api/disciplinas/${id}/concluir_ja`, { method: "POST" }),
  checkpointsDisc: (id) => req(`/api/checkpoints/${id}`),
  setCp: (k, campo, valor) => req(`/api/checkpoints/${encodeURIComponent(k)}`, { method: "POST", body: JSON.stringify({ campo, valor }) }),
  atividades: (filtros = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))).toString();
    return req(`/api/atividades${qs ? `?${qs}` : ""}`);
  },
  apagarAtividade: (itemId) => req(`/api/atividades/${itemId}/apagar`, { method: "POST" }),
  apagarAtividades: (ids) => req("/api/atividades/apagar", { method: "POST", body: JSON.stringify({ ids }) }),
  registrarTentativa: (itemId, texto, cobriu_esperado) => req(`/api/atividades/${itemId}/tentativa`, { method: "POST", body: JSON.stringify({ texto, cobriu_esperado }) }),
  graficos: () => req("/api/graficos"),
  timer: () => req("/api/timer"),
  timerIniciar: (disciplina) => req("/api/timer/iniciar", { method: "POST", body: JSON.stringify({ disciplina }) }),
  timerPausar: () => req("/api/timer/pausar", { method: "POST" }),
  timerRetomar: () => req("/api/timer/retomar", { method: "POST" }),
  timerEncerrar: (obs) => req("/api/timer/encerrar", { method: "POST", body: JSON.stringify({ obs }) }),
  timerCancelar: () => req("/api/timer/cancelar", { method: "POST" }),
  sessoes: () => req("/api/sessoes"),
  novaSessao: (body) => req("/api/sessoes", { method: "POST", body: JSON.stringify(body) }),
  apagarSessao: (i) => req(`/api/sessoes/${i}/apagar`, { method: "POST" }),
  duvidas: (abertas = true) => req(`/api/duvidas?abertas=${abertas}`),
  novaDuvida: (body) => req("/api/duvidas", { method: "POST", body: JSON.stringify(body) }),
  resolverDuvida: (qid, resposta) => req(`/api/duvidas/${qid}`, { method: "POST", body: JSON.stringify({ resposta }) }),
  continuarDuvida: (qid, pergunta) => req(`/api/duvidas/${qid}/responder`, { method: "POST", body: JSON.stringify({ pergunta }) }),
  apagarDuvidas: (ids) => req("/api/duvidas/apagar", { method: "POST", body: JSON.stringify({ ids }) }),
  painel: () => req("/api/painel"),
  mentorContexto: (disciplina) => req(`/api/mentor/contexto${disciplina ? `?disciplina=${disciplina}` : ""}`),
  gerarQuestao: (disciplina_id, checkpoint) => req("/api/mentor/questao", { method: "POST", body: JSON.stringify({ disciplina_id, checkpoint }) }),
  gerarFlashcard: (disciplina_id, checkpoint) => req("/api/mentor/flashcard", { method: "POST", body: JSON.stringify({ disciplina_id, checkpoint }) }),
  sugestaoPlano: () => req("/api/mentor/sugestao_plano", { method: "POST" }),
  perguntarMentor: (pergunta, disciplina_id) => req("/api/mentor/perguntar", { method: "POST", body: JSON.stringify({ pergunta, disciplina_id }) }),
  acervoStatus: (disciplinaId) => req(`/api/acervo/status/${disciplinaId}`),
};
