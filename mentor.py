import asyncio
import json
import re

_LOCK = asyncio.Lock()
_JSON_RE = re.compile(r"\{.*\}|\[.*\]", re.DOTALL)


class MentorError(Exception):
    pass


def _extrair_json(texto):
    texto = texto.strip()
    if texto.startswith("```"):
        texto = re.sub(r"^```(json)?\s*|\s*```$", "", texto.strip(), flags=re.IGNORECASE)
    m = _JSON_RE.search(texto)
    if not m:
        raise MentorError(f"sem JSON na resposta: {texto[:200]}")
    return json.loads(m.group(0))


_LIMITE_RE = re.compile(
    r"usage limit|rate limit|credit balance|quota exceeded|resets? at|try again (later|in)",
    re.IGNORECASE,
)

_AGY_MODEL = "gemini-3.1-pro-low"
_CLAUDE_MODEL = "haiku"


def _parece_limite_de_uso(texto):
    texto = (texto or "").strip()
    if not texto:
        return True
    return bool(_LIMITE_RE.search(texto)) and len(texto) < 500


def _chamar_codex(prompt, timeout):
    import subprocess
    import tempfile
    import os

    with tempfile.NamedTemporaryFile(mode="r", suffix=".txt", delete=False, encoding="utf-8") as tmp:
        caminho = tmp.name
    try:
        r = subprocess.run(["codex.cmd", "exec", "--skip-git-repo-check",
                             "-c", "model_reasoning_effort=low", "-o", caminho, "-"],
                            input=prompt, capture_output=True, text=True,
                            encoding="utf-8", timeout=timeout)
        if r.returncode != 0:
            return None, r.stderr[:300] if r.stderr else f"Exit code {r.returncode}"
        with open(caminho, encoding="utf-8") as f:
            saida = f.read()
        if _parece_limite_de_uso(saida):
            return None, f"resposta parece limite de uso: {saida[:300]}"
        return saida, None
    finally:
        try:
            os.remove(caminho)
        except OSError:
            pass


def _chamar_claude(prompt, timeout):
    import subprocess

    r = subprocess.run(["claude", "-p", "--model", _CLAUDE_MODEL], input=prompt, capture_output=True, text=True,
                        encoding="utf-8", timeout=timeout)
    if r.returncode == 0 and not _parece_limite_de_uso(r.stdout):
        return r.stdout, None
    if r.returncode == 0:
        return None, f"resposta parece limite de uso: {r.stdout[:300]}"
    return None, r.stderr[:300] if r.stderr else f"Exit code {r.returncode}"


def _chamar_agy(prompt, timeout):
    import subprocess

    r = subprocess.run(["agy", "-p", prompt, "--model", _AGY_MODEL],
                        capture_output=True, text=True, encoding="utf-8", timeout=timeout)
    if r.returncode == 0:
        return r.stdout, None
    return None, r.stderr[:300] if r.stderr else f"Exit code {r.returncode}"


_PROVEDORES = [("Codex", _chamar_codex), ("Claude", _chamar_claude), ("Agy", _chamar_agy)]


def _chamar_sync(prompt, timeout):
    import time

    erros = {}
    prazo = time.monotonic() + timeout
    for nome, chamar in _PROVEDORES:
        restante = prazo - time.monotonic()
        if restante <= 0:
            erros[nome] = "não tentado: timeout total do fallback esgotado"
            print(f"MENTOR: {nome} pulado -> timeout total esgotado")
            continue
        print(f"MENTOR: Tentando {nome}...")
        try:
            saida, erro = chamar(prompt, restante)
        except Exception as e:
            saida, erro = None, str(e)
        if saida:
            print(f"MENTOR: {nome} respondeu com sucesso.")
            return saida
        erros[nome] = erro
        print(f"MENTOR: {nome} falhou -> {erro}")

    detalhe = " | ".join(f"{nome} falhou: {erro}" for nome, erro in erros.items())
    raise MentorError(detalhe)


async def perguntar_texto(prompt, timeout=90):
    async with _LOCK:
        saida = await asyncio.to_thread(_chamar_sync, prompt, timeout)
        return saida.strip()


async def perguntar_json(prompt, timeout=60, tentativas=2):
    async with _LOCK:
        ultimo_erro = None
        for tentativa in range(tentativas):
            p = prompt if tentativa == 0 else prompt + "\n\nATENÇÃO: sua resposta anterior não era JSON válido. Responda SOMENTE com o JSON, nada mais, sem markdown."
            try:
                saida = await asyncio.to_thread(_chamar_sync, p, timeout)
                return _extrair_json(saida)
            except (MentorError, json.JSONDecodeError) as e:
                ultimo_erro = e
        raise MentorError(f"não consegui gerar isso agora: {ultimo_erro}")
