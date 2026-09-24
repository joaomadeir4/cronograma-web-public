import json
import re
from pathlib import Path

BASE = Path(__file__).parent / "dados"
ACERVO = BASE / "acervo"

TRECHO_CHARS = 3500

_STOPWORDS = {"unidade", "de", "da", "do", "e", "a", "o", "com", "em", "para", "no", "na"}


def _tokens(texto):
    palavras = re.findall(r"[a-zà-ú0-9]+", texto.lower())
    return {p for p in palavras if p not in _STOPWORDS and len(p) > 2}


def _carregar_indice(disciplina_id):
    path = ACERVO / disciplina_id / "_indice.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def buscar_material(disciplina_id, checkpoint=None):
    indice = _carregar_indice(disciplina_id)
    if not indice:
        return None

    escolhido = None
    if checkpoint:
        alvo_tokens = _tokens(checkpoint)
        melhor_score = 0
        for entrada in indice:
            score = len(_tokens(entrada["arquivo"]) & alvo_tokens)
            if score > melhor_score:
                melhor_score = score
                escolhido = entrada
        if melhor_score == 0:
            escolhido = None

    if escolhido is None:
        escolhido = indice[0]

    texto = (escolhido.get("texto") or "").strip()
    if not texto:
        return None

    return f"[material: {escolhido['arquivo']}]\n{texto[:TRECHO_CHARS]}"
