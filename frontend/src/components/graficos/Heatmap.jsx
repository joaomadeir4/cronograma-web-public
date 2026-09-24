const DOW = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function corPara(min, max) {
  if (max === 0 || min === 0) return "var(--trough)";
  const t = Math.min(min / max, 1);
  const alpha = 0.15 + t * 0.85;
  return `color-mix(in oklab, var(--marca) ${Math.round(alpha * 100)}%, var(--trough))`;
}

export default function Heatmap({ dados }) {
  if (!dados?.length) {
    return <p className="text-sm p-4" style={{ color: "var(--muted)" }}>Nenhum dia estudado ainda.</p>;
  }
  const max = Math.max(...dados.map((d) => d.minutos), 1);
  const semanas = [];
  for (let i = 0; i < dados.length; i += 7) semanas.push(dados.slice(i, i + 7));

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]" style={{ minWidth: semanas.length * 14 }}>
        {semanas.map((semana, si) => (
          <div key={si} className="flex flex-col gap-[3px]">
            {semana.map((d) => (
              <div key={d.data} title={`${d.data.split("-").reverse().join("/")}: ${d.minutos} min`}
                className="w-[12px] h-[12px] rounded-[2px]" style={{ background: corPara(d.minutos, max) }} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-2 text-[10px]" style={{ color: "var(--muted)" }}>
        {DOW.map((d) => <span key={d}>{d}</span>)}
      </div>
    </div>
  );
}
