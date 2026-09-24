import difflib
import json
import os
import re
import unicodedata
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

from core import Estado

load_dotenv()

BASE = Path(__file__).parent / "dados"
SYNC_META = BASE / "canvas_sync.json"
THROTTLE_HORAS = 6
TIMEOUT_S = 15


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


def _casa_item(nome_checkpoint, itens):
    alvo = _normaliza(nome_checkpoint)
    por_norm = {_normaliza(i["title"]): i for i in itens}
    if alvo in por_norm:
        return por_norm[alvo]
    candidatos = difflib.get_close_matches(alvo, por_norm.keys(), n=1, cutoff=0.9)
    if candidatos:
        return por_norm[candidatos[0]]
    return None


def _item_completo(item, modulo_completo):
    cr = item.get("completion_requirement")
    if cr and "completed" in cr:
        return bool(cr["completed"])
    return modulo_completo


UNIDADE_NUMERADA = re.compile(r'^Unidade\s*\d+\s*[-–]\s*\d+(\.\d+)*\.?\b', re.IGNORECASE)
ATIVIDADE_PALAVRA = re.compile(r'\batividade\b', re.IGNORECASE)


def _itens_relevantes(modulos):
    pool = []
    for mod in modulos:
        nome = (mod.get("name") or "").strip()
        low = nome.lower()
        itens = mod.get("items", [])
        mod_completo = mod.get("state") == "completed"

        if low.startswith("prova"):
            for it in itens:
                pool.append({"title": it["title"], "completed": _item_completo(it, mod_completo)})
            continue

        if low.startswith("apresenta") or low.startswith("pesquisa") or not low.startswith("unidade"):
            continue

        content = [it for it in itens if UNIDADE_NUMERADA.match((it.get("title") or "").strip())]

        for it in itens:
            if ATIVIDADE_PALAVRA.search(it.get("title") or "") and it not in content:
                content.append(it)

        for it in content:
            pool.append({"title": it["title"], "completed": _item_completo(it, mod_completo)})

    return pool


def sincronizar_canvas(e: Estado, forcar: bool = False) -> dict:
    resumo = {"marcados": 0, "disciplinas_ok": 0, "nao_casados": [], "erros": []}

    if not forcar and not precisa_sync():
        resumo["pulado"] = "throttle: sync recente, use forcar=True para ignorar"
        return resumo

    base_url = os.environ.get("CANVAS_BASE_URL", "").rstrip("/")
    token = os.environ.get("CANVAS_TOKEN", "")
    if not base_url or not token:
        resumo["erros"].append("CANVAS_BASE_URL ou CANVAS_TOKEN não configurados no .env")
        return resumo

    headers = {"Authorization": f"Bearer {token}"}
    houve_erro_auth = False

    for d in e.disc:
        canvas_id = d.get("canvas_id")
        if not canvas_id:
            continue
        try:
            resp = requests.get(
                f"{base_url}/api/v1/courses/{canvas_id}/modules",
                headers=headers,
                params={"per_page": 50, "include[]": "items"},
                timeout=TIMEOUT_S,
            )
        except requests.RequestException as ex:
            resumo["erros"].append(f"{d['id']}: falha de rede ({ex})")
            continue

        if resp.status_code == 401:
            houve_erro_auth = True
            resumo["erros"].append(
                f"{d['id']}: token do Canvas expirado ou inválido — gere um novo em "
                "Conta → Configurações no Canvas e atualize o .env"
            )
            continue
        if resp.status_code != 200:
            resumo["erros"].append(f"{d['id']}: HTTP {resp.status_code} ao buscar módulos")
            continue

        try:
            modulos = resp.json()
        except ValueError:
            resumo["erros"].append(f"{d['id']}: resposta inválida (não-JSON)")
            continue

        pool = _itens_relevantes(modulos)

        for cp in d.get("checkpoints", []):
            item = _casa_item(cp, pool)
            if not item:
                resumo["nao_casados"].append(f"{d['id']}: '{cp}' sem item correspondente no Canvas")
                continue
            if not item["completed"]:
                continue
            k = e.chave(d, cp)
            ja_feito = bool(e.prog["checkpoints"].get(k, {}).get("feito"))
            if not ja_feito:
                e.set_cp(k, "feito", "1")
                resumo["marcados"] += 1

        resumo["disciplinas_ok"] += 1

    meta = _ler_meta()
    if resumo["disciplinas_ok"] > 0 and not resumo["erros"]:
        meta["ultimo_sync_ok"] = datetime.now().isoformat(timespec="seconds")
        meta["ultimo_erro"] = None
    elif resumo["erros"]:
        meta["ultimo_erro"] = resumo["erros"][-1]
    _salvar_meta(meta)

    return resumo
