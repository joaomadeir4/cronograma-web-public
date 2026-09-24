import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function fmtData(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default function DuvidasLinha({ dados }) {
  if (!dados?.length) {
    return <p className="text-sm p-4" style={{ color: "var(--muted)" }}>Nenhuma dúvida registrada ainda.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={dados} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="data" tickFormatter={fmtData} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={30} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
        <Tooltip
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          labelFormatter={fmtData} labelStyle={{ color: "var(--text-card)" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
        <Line type="stepAfter" dataKey="abertas" name="abertas" stroke="var(--alerta)" strokeWidth={2} dot={false} />
        <Line type="stepAfter" dataKey="resolvidas" name="resolvidas" stroke="var(--sucesso)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
