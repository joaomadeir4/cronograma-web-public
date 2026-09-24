from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from asn_sync import precisa_sync as asn_precisa_sync, sincronizar_asn
from canvas_acervo import sincronizar_acervo_disciplina
from canvas_sync import precisa_sync, sincronizar_canvas
from core import Estado, br, fmt_min, ordem_disc, rotulo
from mentor import MentorError, perguntar_json, perguntar_texto
from prompts import prompt_continuar_duvida, prompt_flashcard, prompt_pergunta_mentor, prompt_questao, prompt_sugestao_plano

app = FastAPI(title="Cronograma de estudos API")

ACERVO_DIR = Path(__file__).parent / "dados" / "acervo"

_acervo_status: dict[str, str] = {}


def _sincronizar_acervo_bg(did: str) -> None:
    _acervo_status[did] = "baixando"
    try:
        resumo = sincronizar_acervo_disciplina(did)
        _acervo_status[did] = "pronto" if resumo is not None else "erro"
    except Exception:
        _acervo_status[did] = "erro"
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                    allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def sync_canvas_no_startup():
    if not precisa_sync():
        return
    try:
        resumo = sincronizar_canvas(Estado(), forcar=False)
        if resumo.get("erros"):
            print(f"[canvas_sync] concluído com erros: {resumo['erros']}")
        else:
            print(f"[canvas_sync] ok: {resumo['marcados']} checkpoint(s) marcado(s)")
    except Exception as ex:
        print(f"[canvas_sync] falhou no startup, seguindo sem travar o app: {ex}")


@app.on_event("startup")
def sync_asn_no_startup():
    if not asn_precisa_sync():
        return
    try:
        resumo = sincronizar_asn(Estado(), forcar=False)
        if resumo.get("erros"):
            print(f"[asn_sync] concluído com erros: {resumo['erros']}")
        else:
            print(f"[asn_sync] ok: {resumo['marcados']} checkpoint(s) marcado(s)")
    except Exception as ex:
        print(f"[asn_sync] falhou no startup, seguindo sem travar o app: {ex}")


@app.on_event("startup")
def baixar_acervo_faltante_no_startup():
    import threading

    e = Estado()
    for d in e.disc:
        if d.get("status") != "ativa" or not d.get("canvas_id"):
            continue
        pasta = ACERVO_DIR / d["id"]
        if pasta.exists() and any(pasta.iterdir()):
            continue
        threading.Thread(target=_sincronizar_acervo_bg, args=(d["id"],), daemon=True).start()


def disc_out(e, d):
    return {"id": d["id"], "curso": d["curso"], "nome": d["nome"], "status": d.get("status", "disponivel"),
            "inicio": d.get("inicio"), "inicio_br": br(d.get("inicio")), "prazo_puc": d.get("prazo_puc"),
            "depende_de": d.get("depende_de", []),
            "fator_dificuldade": d.get("fator_dificuldade", 1.0), "checkpoints": d["checkpoints"],
            "pct_real": round(e.pct_real(d), 4), "dependencias_pendentes": e.faltando_base(d),
            "sinais": e.sinais(d), "previsto": (lambda p: p.isoformat() if p else None)(e.previsao(d)),
            "dias_ativa": e.dias_ativa(d)}


@app.get("/api/disciplinas")
def listar_disciplinas():
    e = Estado()
    return [disc_out(e, d) for d in sorted(e.disc, key=ordem_disc)]


class StatusIn(BaseModel):
    status: str


@app.post("/api/disciplinas/{did}/status")
def mudar_status(did: str, body: StatusIn, background_tasks: BackgroundTasks):
    e = Estado()
    d_antes = e.por_id.get(did)
    era_ativa = bool(d_antes and d_antes.get("ativa"))

    e.set_status(did, body.status)
    e = Estado()
    d = e.por_id.get(did)

    primeira_ativacao = d and d.get("ativa") and not era_ativa and body.status == "ativa"
    if primeira_ativacao and d.get("canvas_id") and not (ACERVO_DIR / did).exists():
        background_tasks.add_task(_sincronizar_acervo_bg, did)

    return disc_out(e, d) if d else {"erro": "não encontrado"}


@app.get("/api/acervo/status/{did}")
def acervo_status(did: str):
    if did in _acervo_status:
        return {"status": _acervo_status[did]}
    pasta = ACERVO_DIR / did
    if pasta.exists() and any(pasta.iterdir()):
        return {"status": "pronto"}
    return {"status": "ausente"}


@app.post("/api/disciplinas/{did}/concluir_ja")
def concluir_ja(did: str):
    e = Estado()
    e.concluir_ja(did)
    e = Estado()
    d = e.por_id.get(did)
    return disc_out(e, d) if d else {"erro": "não encontrado"}


class CpIn(BaseModel):
    campo: str
    valor: str = ""


@app.post("/api/checkpoints/{k:path}")
def set_cp(k: str, body: CpIn):
    e = Estado()
    e.set_cp(k, body.campo, body.valor)
    return {"ok": True}


@app.get("/api/checkpoints/{did}")
def checkpoints_disc(did: str):
    e = Estado()
    d = e.por_id.get(did)
    if not d:
        raise HTTPException(404, "disciplina não encontrada")
    cps = []
    for c in d["checkpoints"]:
        k = e.chave(d, c)
        r = e.prog["checkpoints"].get(k, {})
        cps.append({"k": k, "texto": c, "feito": bool(r.get("feito")), "explica": r.get("explica"),
                     "data": br(r.get("data"))})
    return cps


@app.get("/api/timer")
def timer():
    e = Estado()
    a = e.prog["sessao_ativa"]
    if not a:
        return {"ativa": None}
    return {"ativa": a, "disciplina_nome": rotulo(e.por_id[a["disciplina"]]) if a["disciplina"] in e.por_id else "",
            "minutos": e.minutos_ativos(), "tempo_fmt": fmt_min(e.minutos_ativos())}


class IniciarIn(BaseModel):
    disciplina: str


@app.post("/api/timer/iniciar")
def timer_iniciar(body: IniciarIn):
    e = Estado()
    e.iniciar(body.disciplina)
    return timer()


@app.post("/api/timer/pausar")
def timer_pausar():
    Estado().pausar()
    return timer()


@app.post("/api/timer/retomar")
def timer_retomar():
    Estado().retomar()
    return timer()


class EncerrarIn(BaseModel):
    obs: str = ""


@app.post("/api/timer/encerrar")
def timer_encerrar(body: EncerrarIn):
    e = Estado()
    s = e.encerrar(body.obs)
    return {"sessao": s}


@app.post("/api/timer/cancelar")
def timer_cancelar():
    Estado().cancelar()
    return {"ok": True}


@app.get("/api/sessoes")
def listar_sessoes():
    e = Estado()
    return e.ctx_sessoes()["sessoes"]


class SessaoIn(BaseModel):
    disciplina: str
    data: str
    minutos: int
    obs: str = ""


@app.post("/api/sessoes")
def nova_sessao(body: SessaoIn):
    e = Estado()
    s = e.add_sessao(body.disciplina, body.data, body.minutos, body.obs)
    return {"sessao": s}


@app.post("/api/sessoes/{i}/apagar")
def apagar_sessao(i: int):
    Estado().apagar_sessao(i)
    return {"ok": True}


@app.get("/api/duvidas")
def listar_duvidas(abertas: bool = Query(True)):
    e = Estado()
    return e.ctx_duvidas(abertas)["duvidas"]


class DuvidaIn(BaseModel):
    disciplina: str
    topico: str = ""
    texto: str


@app.post("/api/duvidas")
def nova_duvida(body: DuvidaIn):
    e = Estado()
    if body.texto.strip():
        e.add_duvida(body.disciplina, body.topico, body.texto)
    return {"ok": True}


class ApagarDuvidasIn(BaseModel):
    ids: list[int]


@app.post("/api/duvidas/apagar")
def apagar_duvidas(body: ApagarDuvidasIn):
    Estado().apagar_duvidas(body.ids)
    return {"ok": True}


class ResolverIn(BaseModel):
    resposta: str = ""


@app.post("/api/duvidas/{qid}")
def resolver_duvida(qid: int, body: ResolverIn):
    Estado().resolver(qid, body.resposta)
    return {"ok": True}


class ContinuarIn(BaseModel):
    pergunta: str


@app.post("/api/duvidas/{qid}/responder")
async def continuar_duvida(qid: int, body: ContinuarIn):
    if not body.pergunta.strip():
        raise HTTPException(400, "pergunta vazia")
    e = Estado()
    duvida = e.continuar_duvida(qid, body.pergunta)
    if not duvida:
        raise HTTPException(404, "dúvida não encontrada")
    try:
        resposta = await perguntar_texto(prompt_continuar_duvida(e, duvida, body.pergunta))
    except MentorError as err:
        raise HTTPException(502, str(err))
    e.resolver(qid, resposta)
    return {"resposta": resposta}


@app.get("/api/painel")
def painel():
    e = Estado()
    return {"cards": e.cards(), "alertas": e.alertas()}


@app.get("/api/graficos")
def graficos():
    e = Estado()
    return {"burnup": e.dados_burnup(), "horas": e.dados_horas(), "heatmap": e.dados_heatmap(),
            "duvidas": e.dados_duvidas(), "meta_horas": e.meta}


@app.get("/api/mentor/contexto")
def mentor_contexto(disciplina: str | None = None):
    return Estado().contexto_mentor(disciplina)


class GerarIn(BaseModel):
    disciplina_id: str
    checkpoint: str


@app.post("/api/mentor/questao")
async def gerar_questao(body: GerarIn):
    e = Estado()
    d = e.por_id.get(body.disciplina_id)
    if not d or body.checkpoint not in d["checkpoints"]:
        raise HTTPException(404, "disciplina ou checkpoint não encontrado")
    try:
        resultado = await perguntar_json(prompt_questao(e, d, body.checkpoint))
    except MentorError as err:
        raise HTTPException(502, str(err))
    conteudo = {"enunciado": resultado.get("pergunta"), "resposta_esperada": resultado.get("resposta_esperada"),
                "dica": resultado.get("dica")}
    item = e.criar_atividade(body.disciplina_id, body.checkpoint, "questao", conteudo)
    return item


@app.post("/api/mentor/flashcard")
async def gerar_flashcard(body: GerarIn):
    e = Estado()
    d = e.por_id.get(body.disciplina_id)
    if not d or body.checkpoint not in d["checkpoints"]:
        raise HTTPException(404, "disciplina ou checkpoint não encontrado")
    try:
        resultado = await perguntar_json(prompt_flashcard(e, d, body.checkpoint))
    except MentorError as err:
        raise HTTPException(502, str(err))
    if resultado.get("aplicavel") is False:
        return resultado
    conteudo = {"frente": resultado.get("frente"), "verso": resultado.get("verso")}
    item = e.criar_atividade(body.disciplina_id, body.checkpoint, "flashcard", conteudo)
    return item


@app.get("/api/atividades")
def listar_atividades(disciplina: str | None = None, tipo: str | None = None, status: str | None = None):
    return Estado().listar_atividades(disciplina, tipo, status)


@app.post("/api/atividades/{item_id}/apagar")
def apagar_atividade(item_id: str):
    Estado().apagar_atividade(item_id)
    return {"ok": True}


class ApagarAtividadesIn(BaseModel):
    ids: list[str]


@app.post("/api/atividades/apagar")
def apagar_atividades(body: ApagarAtividadesIn):
    Estado().apagar_atividades(body.ids)
    return {"ok": True}


class TentativaIn(BaseModel):
    texto: str
    cobriu_esperado: bool


@app.post("/api/atividades/{item_id}/tentativa")
def nova_tentativa(item_id: str, body: TentativaIn):
    item = Estado().nova_tentativa(item_id, body.texto, body.cobriu_esperado)
    if not item:
        raise HTTPException(404, "atividade não encontrada")
    return item


class PerguntaIn(BaseModel):
    pergunta: str
    disciplina_id: str | None = None


@app.post("/api/mentor/perguntar")
async def perguntar_mentor(body: PerguntaIn):
    if not body.pergunta.strip():
        raise HTTPException(400, "pergunta vazia")
    e = Estado()
    try:
        resposta = await perguntar_texto(prompt_pergunta_mentor(e, body.pergunta, body.disciplina_id))
    except MentorError as err:
        raise HTTPException(502, str(err))
    disc_alvo = body.disciplina_id if body.disciplina_id in e.por_id else (body.disciplina_id or "geral")
    e.add_duvida(disc_alvo, "", body.pergunta)
    novo_id = max(q["id"] for q in e.prog["duvidas"])
    e.resolver(novo_id, resposta)
    return {"resposta": resposta}


@app.post("/api/sync/canvas")
def sync_canvas_manual():
    e = Estado()
    resumo = sincronizar_canvas(e, forcar=True)
    return resumo


@app.post("/api/sync/asn")
def sync_asn_manual():
    e = Estado()
    resumo = sincronizar_asn(e, forcar=True)
    return resumo


@app.post("/api/mentor/sugestao_plano")
async def gerar_sugestao_plano():
    e = Estado()
    try:
        return await perguntar_json(prompt_sugestao_plano(e), timeout=90)
    except MentorError as err:
        raise HTTPException(502, str(err))
