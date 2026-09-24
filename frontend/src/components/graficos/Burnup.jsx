import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function fmtData(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default function Burnup({ dados }) {
  if (!dados?.length) {
    return <p className="text-sm p-4" style={{ color: "var(--muted)" }}>Ainda sem checkpoints concluídos pra mostrar evolução.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={dados} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="burnupFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--marca)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--marca)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="data" tickFormatter={fmtData} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={30} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
        <Tooltip
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          labelFormatter={fmtData} labelStyle={{ color: "var(--text-card)" }}
          formatter={(v) => [v, "checkpoints concluídos"]} />
        <Area type="stepAfter" dataKey="total" stroke="var(--marca)" strokeWidth={2} fill="url(#burnupFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
