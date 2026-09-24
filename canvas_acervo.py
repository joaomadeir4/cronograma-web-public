import json
import os
import re
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

BASE = Path(__file__).parent / "dados"
ACERVO = BASE / "acervo"
TIMEOUT_S = 30

ADMIN_RE = re.compile(
    r"plano de ensino|refer[eê]ncias bibliogr[aá]ficas|apresenta[cç][aã]o da disciplina|"
    r"avalia[cç][aã]o (da |de )?disciplina|pesquisa de (avalia|satisfa)",
    re.IGNORECASE,
)

EXT_OK = {".pdf", ".xlsx", ".xls", ".csv", ".ipynb", ".pptx", ".ppt", ".docx", ".doc", ".txt"}


def _headers():
    token = os.environ.get("CANVAS_TOKEN", "")
    return {"Authorization": f"Bearer {token}"}


def _base_url():
    return os.environ.get("CANVAS_BASE_URL", "").rstrip("/")


def _sanitize(nome):
    return re.sub(r'[\\/:*?"<>|]', "_", nome).strip()


def listar_arquivos_curso(canvas_id):
    base_url = _base_url()
    headers = _headers()
    resp = requests.get(
        f"{base_url}/api/v1/courses/{canvas_id}/modules",
        headers=headers, params={"per_page": 100, "include[]": "items"}, timeout=TIMEOUT_S,
    )
    resp.raise_for_status()
    modulos = resp.json()

    arquivos = []
    for mod in modulos:
        mod_nome = mod.get("name", "")
        for item in mod.get("items", []):
            if item.get("type") != "File":
                continue
            arquivos.append({
                "modulo": mod_nome,
                "item_title": item.get("title", ""),
                "content_id": item.get("content_id"),
            })
    return arquivos


def baixar_disciplina(disc_id, canvas_id, dry_run=False):
    resumo = {"baixados": [], "pulados_admin": [], "pulados_ext": [], "erros": []}
    destino = ACERVO / disc_id

    try:
        itens = listar_arquivos_curso(canvas_id)
    except requests.RequestException as ex:
        resumo["erros"].append(f"falha ao listar módulos: {ex}")
        return resumo

    headers = _headers()
    base_url = _base_url()

    for item in itens:
        content_id = item["content_id"]
        titulo = item["item_title"]
        if not content_id:
            continue
        if ADMIN_RE.search(titulo) or ADMIN_RE.search(item["modulo"]):
            resumo["pulados_admin"].append(titulo)
            continue

        try:
            r = requests.get(f"{base_url}/api/v1/files/{content_id}", headers=headers, timeout=TIMEOUT_S)
        except requests.RequestException as ex:
            resumo["erros"].append(f"{titulo}: falha ao buscar metadado ({ex})")
            continue
        if r.status_code != 200:
            resumo["erros"].append(f"{titulo}: HTTP {r.status_code} ao buscar metadado")
            continue

        meta = r.json()
        display_name = meta.get("display_name", titulo)
        if ADMIN_RE.search(display_name):
            resumo["pulados_admin"].append(display_name)
            continue

        ext = Path(display_name).suffix.lower()
        if ext not in EXT_OK:
            resumo["pulados_ext"].append(display_name)
            continue

        nome_arquivo = _sanitize(display_name)
        destino_arquivo = destino / nome_arquivo

        if destino_arquivo.exists() and destino_arquivo.stat().st_size > 0:
            resumo["baixados"].append(f"{nome_arquivo} (já existia)")
            continue

        download_url = meta.get("url")
        if not download_url:
            resumo["erros"].append(f"{display_name}: sem url de download")
            continue

        if dry_run:
            resumo["baixados"].append(f"{nome_arquivo} (dry-run, não baixado)")
            continue

        try:
            dr = requests.get(download_url, headers=headers, timeout=TIMEOUT_S)
            if dr.status_code != 200:
                resumo["erros"].append(f"{display_name}: HTTP {dr.status_code} no download")
                continue
            destino.mkdir(parents=True, exist_ok=True)
            destino_arquivo.write_bytes(dr.content)
            resumo["baixados"].append(nome_arquivo)
        except requests.RequestException as ex:
            resumo["erros"].append(f"{display_name}: falha no download ({ex})")

    return resumo


def sincronizar_acervo_disciplina(disc_id, plano_path=None):
    plano_path = plano_path or (BASE / "plano.json")
    plano = json.loads(Path(plano_path).read_text(encoding="utf-8"))
    d = next((x for x in plano["disciplinas"] if x["id"] == disc_id), None)
    if not d or not d.get("canvas_id"):
        return None

    resumo = baixar_disciplina(d["id"], d["canvas_id"])

    from acervo_extrair import extrair_disciplina
    extracao = extrair_disciplina(disc_id)
    resumo["indexados"] = extracao["indexados"]
    resumo["sem_extrator"] = extracao["sem_extrator"]
    return resumo


def main():
    plano = json.loads((BASE / "plano.json").read_text(encoding="utf-8"))
    alvo = sys.argv[1:] if len(sys.argv) > 1 else None

    for d in plano["disciplinas"]:
        if not d["id"].startswith("p") or not d.get("canvas_id"):
            continue
        if alvo and d["id"] not in alvo:
            continue
        print(f"\n=== {d['id']} — {d['nome']} (canvas_id={d['canvas_id']}) ===")
        resumo = baixar_disciplina(d["id"], d["canvas_id"])
        print(f"  baixados: {len(resumo['baixados'])}")
        for b in resumo["baixados"]:
            print(f"    - {b}")
        print(f"  pulados (admin): {len(resumo['pulados_admin'])}")
        print(f"  pulados (extensão não suportada): {len(resumo['pulados_ext'])}")
        for p in resumo["pulados_ext"]:
            print(f"    - {p}")
        if resumo["erros"]:
            print(f"  ERROS: {len(resumo['erros'])}")
            for e in resumo["erros"]:
                print(f"    ! {e}")


if __name__ == "__main__":
    main()
