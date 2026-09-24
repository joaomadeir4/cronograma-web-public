import difflib
import json
import os
import unicodedata
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

from core import Estado

load_dotenv()

BASE = Path(__file__).parent / "dados"
SYNC_META = BASE / "asn_sync.json"
THROTTLE_HORAS = 6
NAV_TIMEOUT_MS = 30000
ASN_COURSE_ID = 34

MODULOS_POR_DISCIPLINA = {
    "eed_desc": ["Boas Vindas", "Introdução ao Universo de Ciência de Dados", "Definindo nossos termos",
                 "Medidas de Posição", "Medidas de Dispersão", "Análise Gráfica",
                 "Medidas de Assimetria", "Medidas de Associação"],
    "eed_prob": ["Probabilidade e Distribuições"],
    "eed_tlc": ["Teorema do Limite Central"],
    "eed_th": ["Teste de Hipóteses", "Introdução ao R", "Introdução a Python",
               "Testes Estatísticos", "Testes Estatísticos no Python"],
    "eed_reg": ["Regressão Linear", "Regressão Linear no Python", "Regressão Logística",
                "Regressão Logistica no Python"],
    "eed_comp": ["Fechamento", "Bônus - Modelos de Árvore de Decisão no Python",
                 "Bônus - Regressões na visão de Machine Learning no Python",
                 "Bônus - Análise de Cluster no Python"],
}


def _ler_meta():
    if SYNC_META.exists():
        return json.loads(SYNC_META.read_text(encoding="utf-8"))
    return {"ultimo_sync_ok": None, "ultimo_erro": None}


def _salvar_meta(meta):
    SYNC_META.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")


def precisa_sync(throttle_horas=THROTTLE_HORAS):
    meta = _ler_meta()
    ultimo = meta.get("ultimo_sync_ok")
    if not ultimo:
        return True
    dt = datetime.fromisoformat(ultimo)
    return (datetime.now() - dt).total_seconds() / 3600 >= throttle_horas


def _normaliza(txt):
    txt = unicodedata.normalize("NFKD", txt).encode("ascii", "ignore").decode("ascii")
    return " ".join(txt.lower().split())


def _casa_modulo(nome_modulo, modulos):
    alvo = _normaliza(nome_modulo)
    por_norm = {_normaliza(m["title"]): m for m in modulos}
    if alvo in por_norm:
        return por_norm[alvo]
    candidatos = difflib.get_close_matches(alvo, por_norm.keys(), n=1, cutoff=0.6)
    if candidatos:
        return por_norm[candidatos[0]]
    return None


def _casa_aula(nome_checkpoint, aulas):
    alvo = _normaliza(nome_checkpoint)
    por_norm = {_normaliza(a["title"]): a for a in aulas}
    if alvo in por_norm:
        return por_norm[alvo]
    candidatos = difflib.get_close_matches(alvo, por_norm.keys(), n=1, cutoff=0.75)
    if candidatos:
        return por_norm[candidatos[0]]
    return None


def _login_e_buscar_modulos(base_url, email, senha):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        try:
            ctx = b.new_context()
            page = ctx.new_page()
            page.set_default_timeout(NAV_TIMEOUT_MS)

            page.goto(base_url, timeout=NAV_TIMEOUT_MS)
            try:
                page.click("text=OK!", timeout=3000)
            except Exception:
                pass
            page.click("text=ENTRAR", timeout=8000)
            page.wait_for_load_state("networkidle")
            page.fill('input[placeholder="Digite seu e-mail"]', email)
            page.fill('input[placeholder="Digite sua senha"]', senha)
            page.click("text=ENTRAR")
            page.wait_for_url(lambda u: "/login" not in u, timeout=20000)
            page.wait_for_load_state("networkidle")

            if "/login" in page.url:
                raise RuntimeError("login falhou — continuou na página de login (credenciais inválidas?)")

            token_holder = {}

            def on_response(resp):
                try:
                    if resp.request.resource_type == "xhr" and "/me" in resp.url:
                        h = resp.request.headers
                        if h.get("x-auth-token"):
                            token_holder["token"] = h["x-auth-token"]
                except Exception:
                    pass

            page.on("response", on_response)
            page.goto(f"{base_url}/resume/courses", timeout=NAV_TIMEOUT_MS)
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)

            token = token_holder.get("token")
            if not token:
                raise RuntimeError("não consegui capturar o token de autenticação (x-auth-token) após o login")

            resp = page.request.get(
                f"{base_url}/admin/v2/course/{ASN_COURSE_ID}",
                headers={"x-auth-token": token, "accept": "application/json"},
            )
            if resp.status != 200:
                raise RuntimeError(f"HTTP {resp.status} ao buscar módulos do curso {ASN_COURSE_ID}")
            modulos = resp.json().get("modules", [])

            headers = {"x-auth-token": token, "accept": "application/json"}
            for mod in modulos:
                r = page.request.get(f"{base_url}/admin/v2/module/{mod['id']}", headers=headers)
                if r.status != 200:
                    mod["lessons"] = []
                    continue
                mod["lessons"] = r.json().get("lessons", [])
            return modulos
        finally:
            b.close()


def sincronizar_asn(e: Estado, forcar: bool = False) -> dict:
    resumo = {"marcados": 0, "disciplinas_ok": 0, "nao_casados": [], "erros": []}

    if not forcar and not precisa_sync():
        resumo["pulado"] = "throttle: sync recente, use forcar=True para ignorar"
        return resumo

    base_url = os.environ.get("ASN_BASE_URL", "").rstrip("/")
    email = os.environ.get("ASN_EMAIL", "")
    senha = os.environ.get("ASN_SENHA", "")
    if not base_url or not email or not senha:
        resumo["erros"].append("ASN_BASE_URL, ASN_EMAIL ou ASN_SENHA não configurados no .env")
        return resumo

    try:
        modulos = _login_e_buscar_modulos(base_url, email, senha)
    except Exception as ex:
        resumo["erros"].append(f"falha na sincronização com ASN.Rocks: {ex}")
        meta = _ler_meta()
        meta["ultimo_erro"] = resumo["erros"][-1]
        _salvar_meta(meta)
        return resumo

    for d in e.disc:
        if d.get("asn_id") != ASN_COURSE_ID:
            continue
        nomes_modulos = MODULOS_POR_DISCIPLINA.get(d["id"])
        if not nomes_modulos:
            continue
        aulas = []
        for nome_mod in nomes_modulos:
            mod = _casa_modulo(nome_mod, modulos)
            if not mod:
                resumo["erros"].append(f"{d['id']}: módulo '{nome_mod}' não encontrado no ASN")
                continue
            aulas.extend(mod.get("lessons", []))

        checkpoints = d.get("checkpoints", [])
        for cp in checkpoints:
            aula = _casa_aula(cp, aulas)
            if not aula:
                resumo["nao_casados"].append(f"{d['id']}: '{cp}' sem aula correspondente no ASN")
                continue
            if not aula.get("completed"):
                continue
            k = e.chave(d, cp)
            ja_feito = bool(e.prog["checkpoints"].get(k, {}).get("feito"))
            if not ja_feito:
                e.set_cp(k, "feito", "1")
                resumo["marcados"] += 1
        resumo["disciplinas_ok"] += 1

    meta = _ler_meta()
    meta["ultimo_sync_ok"] = datetime.now().isoformat(timespec="seconds")
    meta["ultimo_erro"] = None
    _salvar_meta(meta)

    return resumo
