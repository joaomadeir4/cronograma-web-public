import json
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd

BASE = Path(__file__).parent / "dados"
PLANO = BASE / "plano.json"
PROG = BASE / "progresso.json"
ATIV = BASE / "atividades.json"


def ler(p, padrao):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else padrao


def salvar(p, obj):
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def fmt_min(m):
    h, r = divmod(int(m), 60)
    return f"{h}h{r:02d}" if h and r else f"{h}h" if h else f"{r}min"


def br(iso):
    return date.fromisoformat(iso).strftime("%d/%m/%Y") if iso else ""


def fmt_horas(h):
    sinal = "-" if h < 0 else ""
    h = abs(h)
    if h < 1:
        return f"{sinal}{round(h * 60)}min"
    return f"{sinal}{h:.0f}h" if h == round(h) else f"{sinal}{h:.1f}h"


def rotulo(d):
    return f"{'EED' if d['curso'] == 'EED' else 'PUC'} · {d['nome']}"


def ordem_disc(d):
    return (0 if d["curso"] == "EED" else 1, d.get("inicio") or "9999", d["nome"])


def split(v):
    return [x.strip() for x in (v or "").split(";") if x.strip()]




class Estado:
    def __init__(self):
        self.plano = ler(PLANO, {"meta_horas": 9, "disciplinas": []})
        self.prog = ler(PROG, {})
        for k, v in {"checkpoints": {}, "duvidas": [], "sessoes": [], "sessao_ativa": None}.items():
            self.prog.setdefault(k, v)
        for q in self.prog["duvidas"]:
            if "mensagens" not in q:
                q["mensagens"] = [{"autor": "mentor", "texto": q["resposta"], "em": q.get("resolvida_em")}] if q.get("resposta") else []
        self.hoje = date.today()
        self.meta = self.plano.get("meta_horas", 9)
        self.disc = self.plano["disciplinas"]
        self.por_id = {d["id"]: d for d in self.disc}
        ativas = [d for d in self.disc if d.get("ativa") and not d.get("fila")]
        self.ativas_todas = sorted(ativas, key=ordem_disc)
        self.agendadas = sorted([d for d in ativas if self.pct_real(d) < 1], key=ordem_disc)
        self.status_ativa = sorted([d for d in ativas if d.get("status") == "ativa"], key=ordem_disc)
        self.concluidas = sorted([d for d in ativas if self.pct_real(d) >= 1], key=ordem_disc)
        self.disponiveis = sorted([d for d in self.disc if not d.get("ativa") and not d.get("fila")],
                                   key=lambda d: d["nome"])
        self.fila = sorted([d for d in self.disc if d.get("fila")], key=lambda d: d["nome"])
        self.disc_ordenadas = sorted(self.disc, key=ordem_disc)

    def salvar_prog(self):
        salvar(PROG, self.prog)

    def salvar_plano(self):
        salvar(PLANO, self.plano)

    def chave(self, d, cp):
        return f"{d['id']}::{cp}"

    def cp_ok(self, k):
        r = self.prog["checkpoints"].get(k, {})
        return bool(r.get("feito")) and r.get("explica") == "sim"

    def pct_real(self, d):
        n = len(d["checkpoints"])
        return sum(self.cp_ok(self.chave(d, c)) for c in d["checkpoints"]) / n if n else 0.0

    def faltando_base(self, d):
        return [self.por_id[i]["nome"] for i in d.get("depende_de", [])
                if i in self.por_id and self.pct_real(self.por_id[i]) < 1]

    def dias_ativa(self, d):
        if not d.get("inicio"):
            return 0
        return max((self.hoje - date.fromisoformat(d["inicio"])).days, 0)

    def previsao(self, d):
        n = len(d["checkpoints"])
        feitos = sum(self.cp_ok(self.chave(d, c)) for c in d["checkpoints"])
        if not n or feitos >= n:
            return None
        dias = self.dias_ativa(d)
        if dias < 3 or feitos == 0:
            return None
        ritmo = feitos / dias
        dias_restantes = (n - feitos) / ritmo
        return self.hoje + timedelta(days=round(dias_restantes))

    def sess_df(self):
        s = pd.DataFrame(self.prog["sessoes"], columns=["data", "disciplina", "minutos", "obs"])
        s["data"] = pd.to_datetime(s["data"])
        return s

    def cards(self):
        s = self.sess_df()
        seg = self.hoje - timedelta(days=self.hoje.weekday())
        horas = s.loc[s["data"].dt.date >= seg, "minutos"].sum() / 60
        abertas = sum(not q["resolvida"] for q in self.prog["duvidas"])
        if self.status_ativa:
            geral = "🟢 estudando" if horas > 0 else "🟡 sem sessão esta semana"
        elif self.agendadas:
            geral = "⏸️ tudo pausado"
        elif self.concluidas:
            geral = "✅ ativas concluídas, sete a próxima"
        else:
            geral = "⏳ nada ativo, sete uma disciplina"
        inicios = [d["inicio"] for d in self.disc if d.get("inicio")]
        if not inicios:
            semana, sub = "—", "nenhuma disciplina ativada ainda"
        else:
            comeco = date.fromisoformat(min(inicios))
            semana, sub = (self.hoje - comeco).days // 7 + 1, f"desde {br(comeco.isoformat())}"
        ativas_sub = ", ".join(d["nome"] for d in self.status_ativa) or "—"
        if self.concluidas:
            ativas_sub += f" · ✅ {len(self.concluidas)} concluída{'s' if len(self.concluidas) > 1 else ''} arquivada{'s' if len(self.concluidas) > 1 else ''}"
        return [
            {"titulo": "Semana", "valor": semana, "sub": sub},
            {"titulo": "Ativas", "valor": len(self.status_ativa), "sub": ativas_sub},
            {"titulo": "Horas na semana", "valor": f"{fmt_horas(horas)} / {fmt_horas(self.meta)}",
             "sub": f"{'+' if horas - self.meta >= 0 else ''}{fmt_horas(horas - self.meta)} vs meta"},
            {"titulo": "Dúvidas abertas", "valor": abertas, "sub": ""},
            {"titulo": "Status geral", "valor": geral, "sub": ""},
        ]

    def alertas(self):
        out = []
        for d in self.concluidas:
            out.append(f"✅ {d['nome']} concluída — arquivada em Plano › Finalizadas")
        for d in self.agendadas:
            falta = self.faltando_base(d)
            if falta:
                out.append(f"🔒 {d['nome']} ativa sem base concluída: {', '.join(falta)} — sua decisão, só um aviso")
        for d in self.disc_ordenadas:
            if d.get("prazo_puc") and self.pct_real(d) < 1:
                dias = (date.fromisoformat(d["prazo_puc"]) - self.hoje).days
                if dias < 0:
                    out.append(f"🔴 Prazo PUC vencido há {-dias} dias: {d['nome']}")
                elif dias < 14:
                    out.append(f"🟡 Prazo PUC em {dias} dias: {d['nome']}")
        if len(self.agendadas) > 1:
            h = self.meta / len(self.agendadas)
            out.append(f"📊 {len(self.agendadas)} disciplinas ativas ao mesmo tempo — ~{h:.1f}h/semana cada "
                       f"para bater a meta de {self.meta}h (ou reforce a meta nesta janela)")
        return out

    def dados_burnup(self):
        feitos = sorted(date.fromisoformat(r["data"]) for k, r in self.prog["checkpoints"].items()
                         if r.get("data") and self.cp_ok(k) and k.split("::")[0] in self.por_id)
        if not feitos:
            return []
        eixo = pd.date_range(feitos[0], self.hoje)
        return [{"data": d.date().isoformat(), "total": sum(x <= d.date() for x in feitos)} for d in eixo]

    def dados_horas(self):
        s = self.sess_df()
        if s.empty:
            return []
        sem = s.set_index("data").resample("W-SUN")["minutos"].sum() / 60
        return [{"semana": d.date().isoformat(), "horas": round(v, 1)} for d, v in sem.items()]

    def dados_heatmap(self):
        s = self.sess_df()
        if s.empty:
            return []
        ini = min(s["data"].min().date(), self.hoje - timedelta(days=7 * 20))
        ini -= timedelta(days=ini.weekday())
        dias = pd.DataFrame({"data": pd.date_range(ini, max(self.hoje, s["data"].max().date()))})
        dias["min"] = dias["data"].map(s.groupby("data")["minutos"].sum()).fillna(0)
        return [{"data": r["data"].date().isoformat(), "minutos": int(r["min"])} for _, r in dias.iterrows()]

    def dados_duvidas(self):
        if not self.prog["duvidas"]:
            return []
        dq = pd.DataFrame(self.prog["duvidas"])
        criadas = pd.to_datetime(dq["criada"])
        resolv = pd.to_datetime(dq.get("resolvida_em"))
        eixo = pd.date_range(criadas.min(), pd.Timestamp(self.hoje))
        out = []
        for t in eixo:
            resolvidas = int((resolv <= t).sum())
            abertas = int((criadas <= t).sum()) - resolvidas
            out.append({"data": t.date().isoformat(), "abertas": abertas, "resolvidas": resolvidas})
        return out

    def minutos_ativos(self):
        a = self.prog["sessao_ativa"]
        if not a:
            return 0
        corrida = 0 if a.get("pausado_em") else (datetime.now() - datetime.fromisoformat(a["inicio"])).total_seconds() / 60
        return int(a.get("acumulado", 0) + corrida)

    def ctx_duvidas(self, so_abertas=True):
        lista = [q for q in reversed(self.prog["duvidas"]) if not (so_abertas and q["resolvida"])]
        for q in lista:
            q["disc_nome"] = self.por_id.get(q["disciplina"], {}).get("nome", q["disciplina"])
            q["criada_br"] = br(q["criada"])
        return {"duvidas": lista, "so_abertas": so_abertas}

    def ctx_sessoes(self):
        linhas = [{**s, "i": i, "disc_nome": rotulo(self.por_id[s["disciplina"]]) if s["disciplina"] in self.por_id else s["disciplina"],
                   "data_br": br(s["data"]), "tempo": fmt_min(s["minutos"])} for i, s in enumerate(self.prog["sessoes"])]
        return {"sessoes": sorted(linhas, key=lambda x: x["data"], reverse=True)}

    def set_cp(self, k, campo, valor):
        r = self.prog["checkpoints"].setdefault(k, {"feito": False, "explica": None, "data": None, "marcado_em": None})
        if campo == "feito":
            r["feito"] = valor == "1"
            r["marcado_em"] = self.hoje.isoformat() if r["feito"] else None
            if not r["feito"]:
                r["explica"] = None
        else:
            r["explica"] = valor if valor in ("sim", "não") else None
        r["data"] = self.hoje.isoformat() if r["feito"] and r["explica"] == "sim" else None
        self.salvar_prog()
        did = k.split("::")[0]
        d = self.por_id.get(did)
        if d and d.get("status") in ("ativa", "pausada") and self.pct_real(d) >= 1:
            self.set_status(did, "concluida")

    def _atividades(self):
        return ler(ATIV, {"gerados": []})

    def _salvar_atividades(self, dados):
        salvar(ATIV, dados)

    def criar_atividade(self, disciplina_id, checkpoint, tipo, conteudo):
        dados = self._atividades()
        prox = max([int(g["id"].split("_")[1]) for g in dados["gerados"]], default=0) + 1
        item = {"id": f"a_{prox:04d}", "disciplina_id": disciplina_id,
                "checkpoint": checkpoint, "tipo": tipo,
                "criado_em": datetime.now().isoformat(timespec="seconds"), **conteudo}
        if tipo == "questao":
            item["tentativas"] = []
        dados["gerados"].append(item)
        self._salvar_atividades(dados)
        return item

    def apagar_atividade(self, item_id):
        dados = self._atividades()
        dados["gerados"] = [g for g in dados["gerados"] if g["id"] != item_id]
        self._salvar_atividades(dados)

    def apagar_atividades(self, ids):
        ids = set(ids)
        dados = self._atividades()
        dados["gerados"] = [g for g in dados["gerados"] if g["id"] not in ids]
        self._salvar_atividades(dados)

    def nova_tentativa(self, item_id, texto, cobriu_esperado):
        dados = self._atividades()
        item = None
        for g in dados["gerados"]:
            if g["id"] == item_id:
                g.setdefault("tentativas", []).append({
                    "texto": texto, "timestamp": datetime.now().isoformat(timespec="seconds"),
                    "cobriu_esperado": cobriu_esperado})
                item = g
        self._salvar_atividades(dados)
        return item

    def listar_atividades(self, disciplina_id=None, tipo=None, status=None):
        dados = self._atividades()
        out = []
        for g in dados["gerados"]:
            d = self.por_id.get(g["disciplina_id"], {})
            item = {**g, "disciplina_nome": d.get("nome", g["disciplina_id"]), "curso": d.get("curso", "")}
            if g["tipo"] == "questao":
                tent = g.get("tentativas", [])
                item["status"] = "pendente" if not tent else ("ok" if tent[-1]["cobriu_esperado"] else "revisar")
            out.append(item)
        if disciplina_id:
            out = [x for x in out if x["disciplina_id"] == disciplina_id]
        if tipo:
            out = [x for x in out if x["tipo"] == tipo]
        if status:
            out = [x for x in out if x.get("status") == status]
        return sorted(out, key=lambda x: x["criado_em"], reverse=True)

    def concluir_ja(self, did):
        d = self.por_id.get(did)
        if not d:
            return
        for c in d["checkpoints"]:
            k = self.chave(d, c)
            self.prog["checkpoints"][k] = {"feito": True, "explica": "sim", "data": None, "marcado_em": None}
        self.salvar_prog()
        self.set_status(did, "concluida")

    def add_sessao(self, disciplina, dia, minutos, obs):
        s = {"data": dia, "disciplina": disciplina, "minutos": int(minutos), "obs": obs.strip()}
        self.prog["sessoes"].append(s)
        self.salvar_prog()
        return s

    def iniciar(self, disciplina):
        self.prog["sessao_ativa"] = {"disciplina": disciplina, "inicio": datetime.now().isoformat(timespec="seconds"),
                                     "acumulado": 0, "pausado_em": None}
        self.salvar_prog()

    def pausar(self):
        a = self.prog["sessao_ativa"]
        if not a or a.get("pausado_em"):
            return
        a["acumulado"] = a.get("acumulado", 0) + (datetime.now() - datetime.fromisoformat(a["inicio"])).total_seconds() / 60
        a["pausado_em"] = datetime.now().isoformat(timespec="seconds")
        self.salvar_prog()

    def retomar(self):
        a = self.prog["sessao_ativa"]
        if not a or not a.get("pausado_em"):
            return
        a["inicio"] = datetime.now().isoformat(timespec="seconds")
        a["pausado_em"] = None
        self.salvar_prog()

    def encerrar(self, obs):
        a = self.prog["sessao_ativa"]
        if not a:
            return None
        dia = date.fromisoformat(a["inicio"][:10])
        minutos = self.minutos_ativos()
        self.prog["sessao_ativa"] = None
        return self.add_sessao(a["disciplina"], dia.isoformat(), max(1, minutos), obs)

    def cancelar(self):
        self.prog["sessao_ativa"] = None
        self.salvar_prog()

    def apagar_sessao(self, i):
        if 0 <= i < len(self.prog["sessoes"]):
            self.prog["sessoes"].pop(i)
            self.salvar_prog()

    def add_duvida(self, disciplina, topico, texto):
        agora = datetime.now().isoformat(timespec="seconds")
        self.prog["duvidas"].append({"id": max([q["id"] for q in self.prog["duvidas"]], default=0) + 1,
                                     "disciplina": disciplina, "topico": topico.strip(), "texto": texto.strip(),
                                     "criada": self.hoje.isoformat(), "criada_em": agora, "status": "aberta",
                                     "resolvida": False, "resolvida_em": None, "resposta": ""})
        self.salvar_prog()

    def resolver(self, qid, resposta):
        for q in self.prog["duvidas"]:
            if q["id"] == qid:
                q["resposta"] = resposta
                q.setdefault("mensagens", [])
                if resposta:
                    q["mensagens"].append({"autor": "mentor", "texto": resposta, "em": datetime.now().isoformat(timespec="seconds")})
                if not q["resolvida"]:
                    q["resolvida"], q["resolvida_em"], q["status"] = True, self.hoje.isoformat(), "resolvida"
        self.salvar_prog()

    def apagar_duvidas(self, ids):
        ids = set(ids)
        self.prog["duvidas"] = [q for q in self.prog["duvidas"] if q["id"] not in ids]
        self.salvar_prog()

    def continuar_duvida(self, qid, pergunta):
        for q in self.prog["duvidas"]:
            if q["id"] == qid:
                q.setdefault("mensagens", [])
                q["mensagens"].append({"autor": "eu", "texto": pergunta, "em": datetime.now().isoformat(timespec="seconds")})
                self.salvar_prog()
                return q
        return None

    def set_status(self, did, novo):
        d = self.por_id.get(did)
        if not d or novo not in ("fila", "disponivel", "ativa", "pausada", "concluida"):
            return
        d["status"] = novo
        d["ativa"] = novo in ("ativa", "pausada", "concluida")
        d["fila"] = novo == "fila"
        if novo == "ativa" and not d.get("inicio"):
            d["inicio"] = self.hoje.isoformat()
        self.salvar_plano()

    def sinais(self, d):
        out = []
        limite_sessao = self.prog.get("preferencias", {}).get("dias_disciplina_sem_sessao", 10)
        if d.get("status") == "ativa" and d.get("inicio"):
            ultima = max((s["data"] for s in self.prog["sessoes"] if s["disciplina"] == d["id"]), default=None)
            referencia = ultima or d["inicio"]
            dias = (self.hoje - date.fromisoformat(referencia)).days
            if dias >= limite_sessao:
                out.append({"tipo": "parada", "texto": f"sem sessão há {dias} dias"})
        for c in d["checkpoints"]:
            r = self.prog["checkpoints"].get(self.chave(d, c), {})
            if r.get("feito") and r.get("explica") == "não" and r.get("marcado_em"):
                dias = (self.hoje - date.fromisoformat(r["marcado_em"])).days
                if dias >= 7:
                    out.append({"tipo": "nao_consolidado", "texto": f'"{c}" feito sem explicar há {dias}d'})
        return out

    def contexto_mentor(self, disc_id=None):
        duvidas_paradas = []
        limite_duvida = self.prog.get("preferencias", {}).get("dias_duvida_sem_resposta", 7)
        for q in self.prog["duvidas"]:
            if q.get("status", "aberta") != "aberta":
                continue
            criada = q.get("criada_em", q.get("criada"))
            dias = (datetime.now() - datetime.fromisoformat(criada)).days if criada else 0
            if dias >= limite_duvida:
                duvidas_paradas.append({"id": q["id"], "disciplina": q["disciplina"], "texto": q["texto"], "dias": dias})
        ativas_info = []
        for d in self.disc:
            if d.get("status") != "ativa":
                continue
            p = self.previsao(d)
            ativas_info.append({
                "id": d["id"], "nome": d["nome"], "pct": round(self.pct_real(d), 2),
                "dependencias_pendentes": self.faltando_base(d), "sinais": self.sinais(d),
                "previsto": p.isoformat() if p else None,
            })
        dispersao = None
        if len(ativas_info) > 1 and not any(a["sinais"] or a["pct"] > 0 for a in ativas_info):
            dispersao = f"{len(ativas_info)} disciplinas ativas, nenhuma com progresso ainda essa semana"
        ctx = {"hoje": self.hoje.isoformat(), "meta_horas_semanais": self.prog.get("preferencias", {}).get("meta_horas_semanais", self.meta),
               "ativas": ativas_info, "duvidas_paradas": duvidas_paradas, "dispersao": dispersao}
        if disc_id and disc_id in self.por_id:
            ctx["foco"] = self.por_id[disc_id]
        return ctx

    def set_plano(self, did, campo, valor):
        d = self.por_id.get(did)
        if not d:
            return
        if campo in ("inicio", "fim", "prazo_puc"):
            d[campo] = valor or None
        elif campo in ("fila", "ativa"):
            d[campo] = valor == "1"
            if campo == "ativa" and d["ativa"] and not d.get("inicio"):
                d["inicio"] = self.hoje.isoformat()
        elif campo in ("depende_de", "checkpoints"):
            d[campo] = split(valor)
        elif campo in ("nome", "curso"):
            d[campo] = valor.strip()
        self.salvar_plano()

    def add_disc(self, did, curso, nome):
        did = did.strip()
        if did and did not in self.por_id:
            self.disc.append({"id": did, "curso": curso.strip() or "Pós PUC Minas", "nome": nome.strip() or did,
                              "ativa": False, "inicio": None, "fim": None, "prazo_puc": None, "fila": True,
                              "depende_de": [], "checkpoints": []})
            self.salvar_plano()

    def apagar_disc(self, did):
        self.plano["disciplinas"] = [d for d in self.disc if d["id"] != did]
        self.salvar_plano()
