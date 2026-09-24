import csv
import json
from pathlib import Path

BASE = Path(__file__).parent / "dados"
ACERVO = BASE / "acervo"

MAX_CHARS = 6000


def _extrair_pdf(path):
    try:
        from pypdf import PdfReader
    except ImportError:
        return None
    try:
        reader = PdfReader(str(path))
        partes = []
        for page in reader.pages:
            t = page.extract_text() or ""
            partes.append(t)
            if sum(len(p) for p in partes) > MAX_CHARS:
                break
        return "\n".join(partes)[:MAX_CHARS]
    except Exception as ex:
        return f"[erro ao extrair PDF: {ex}]"


def _extrair_xlsx(path):
    try:
        import openpyxl
    except ImportError:
        return None
    try:
        wb = openpyxl.load_workbook(str(path), data_only=True, read_only=True)
        linhas = []
        for sheet in wb.worksheets:
            linhas.append(f"[planilha: {sheet.title}]")
            for row in sheet.iter_rows(values_only=True):
                vals = [str(v) for v in row if v is not None]
                if vals:
                    linhas.append(" | ".join(vals))
                if sum(len(l) for l in linhas) > MAX_CHARS:
                    break
            if sum(len(l) for l in linhas) > MAX_CHARS:
                break
        return "\n".join(linhas)[:MAX_CHARS]
    except Exception as ex:
        return f"[erro ao extrair XLSX: {ex}]"


def _extrair_csv(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f)
            linhas = [" | ".join(row) for row in reader]
        return "\n".join(linhas)[:MAX_CHARS]
    except Exception as ex:
        return f"[erro ao extrair CSV: {ex}]"


def _extrair_ipynb(path):
    try:
        nb = json.loads(path.read_text(encoding="utf-8"))
        partes = []
        for cell in nb.get("cells", []):
            tipo = cell.get("cell_type")
            if tipo not in ("markdown", "code"):
                continue
            src = cell.get("source", [])
            texto = "".join(src) if isinstance(src, list) else str(src)
            partes.append(f"[{tipo}]\n{texto}")
            if sum(len(p) for p in partes) > MAX_CHARS:
                break
        return "\n\n".join(partes)[:MAX_CHARS]
    except Exception as ex:
        return f"[erro ao extrair IPYNB: {ex}]"


def _extrair_txt(path):
    try:
        return path.read_text(encoding="utf-8", errors="replace")[:MAX_CHARS]
    except Exception as ex:
        return f"[erro ao extrair TXT: {ex}]"


EXTRATORES = {
    ".pdf": _extrair_pdf,
    ".xlsx": _extrair_xlsx,
    ".xls": _extrair_xlsx,
    ".csv": _extrair_csv,
    ".ipynb": _extrair_ipynb,
    ".txt": _extrair_txt,
}


def extrair_disciplina(disc_id):
    pasta = ACERVO / disc_id
    if not pasta.exists():
        return {"indexados": 0, "sem_extrator": []}

    indice = []
    sem_extrator = []
    for arquivo in sorted(pasta.iterdir()):
        if arquivo.name.startswith("_") or not arquivo.is_file():
            continue
        ext = arquivo.suffix.lower()
        extrator = EXTRATORES.get(ext)
        if not extrator:
            sem_extrator.append(arquivo.name)
            continue
        texto = extrator(arquivo)
        if texto is None:
            sem_extrator.append(arquivo.name)
            continue
        indice.append({"arquivo": arquivo.name, "texto": texto})

    (pasta / "_indice.json").write_text(
        json.dumps(indice, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return {"indexados": len(indice), "sem_extrator": sem_extrator}


def main():
    for pasta in sorted(ACERVO.iterdir()) if ACERVO.exists() else []:
        if not pasta.is_dir():
            continue
        resumo = extrair_disciplina(pasta.name)
        print(f"{pasta.name}: {resumo['indexados']} indexados, sem extrator: {resumo['sem_extrator']}")


if __name__ == "__main__":
    main()
