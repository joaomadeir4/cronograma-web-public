const OPCOES = [
  { id: "todos", label: "Todos" },
  { id: "EED", label: "EED", cor: "var(--eed)" },
  { id: "PUC", label: "PUC", cor: "var(--puc)" },
];

export function filtrarPorCurso(disc, filtro) {
  if (filtro === "todos") return disc;
  if (filtro === "EED") return disc.filter((d) => d.curso === "EED");
  return disc.filter((d) => d.curso !== "EED");
}

export default function FiltroCurso({ valor, onChange }) {
  return (
    <div className="flex gap-2 mb-4">
      {OPCOES.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className="px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
          style={valor === o.id
            ? { background: `${o.cor || "var(--marca)"}22`, color: "var(--text)" }
            : { color: "var(--muted)" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
