import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function fmtData(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default function HorasSemana({ dados, meta }) {
  if (!dados?.length) {
    return <p className="text-sm p-4" style={{ color: "var(--muted)" }}>Registre uma sessão pra ver horas por semana.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="semana" tickFormatter={fmtData} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
        <Tooltip
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          labelFormatter={fmtData} labelStyle={{ color: "var(--text-card)" }}
          formatter={(v) => [`${v}h`, "estudadas"]} />
        <ReferenceLine y={meta} stroke="var(--muted)" strokeDasharray="4 4" label={{ value: `meta ${meta}h`, position: "insideTopRight", fill: "var(--muted)", fontSize: 11 }} />
        <Bar dataKey="horas" fill="var(--marca)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
