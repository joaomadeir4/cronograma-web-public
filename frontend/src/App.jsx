import { Clock, ListChecks, MessageCircleQuestion, Moon, PlayCircle, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Mentoria from "./pages/Mentoria.jsx";
import Progresso from "./pages/Progresso.jsx";
import Historico from "./pages/Historico.jsx";

function useTema() {
  const [tema, setTema] = useState(() => {
    try {
      return localStorage.getItem("tema") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    try {
      localStorage.setItem("tema", tema);
    } catch {}
  }, [tema]);

  return [tema, setTema];
}

function ThemeToggle({ tema, onToggle }) {
  return (
    <button onClick={onToggle} className="theme-toggle" aria-label={tema === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={tema === "dark" ? "Tema claro" : "Tema escuro"}>
      {tema === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

const LINKS = [
  { to: "/", label: "Agora", end: true, Icon: PlayCircle, cor: "#2DD4BF" },
  { to: "/mentoria", label: "Mentoria", Icon: MessageCircleQuestion, cor: "#F472B6" },
  { to: "/progresso", label: "Progresso", Icon: ListChecks, cor: "#C084FC" },
  { to: "/historico", label: "Histórico", Icon: Clock, cor: "#38BDF8" },
];

function NavItem({ to, label, end, Icon, cor }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm transition-all duration-150 ${isActive ? "font-semibold" : "hover:bg-white/[0.04]"}`
      }
      style={({ isActive }) =>
        isActive
          ? { background: `linear-gradient(135deg, ${cor}26, ${cor}0d)`, color: "var(--text)", boxShadow: `0 1px 0 0 rgba(255,255,255,.04) inset, 0 4px 14px -6px ${cor}55` }
          : { color: "var(--muted)" }
      }>
      <span className="chip-icone w-8 h-8 shrink-0" style={{ background: `linear-gradient(135deg, ${cor}40, ${cor}1a)`, color: cor }}>
        <Icon size={16} />
      </span>
      {label}
    </NavLink>
  );
}

export default function App() {
  const [tema, setTema] = useTema();
  return (
    <div className="min-h-screen max-w-[1400px] mx-auto md:flex">
      <aside className="hidden md:flex flex-col gap-1 w-56 shrink-0 p-4 sticky top-0 h-screen" style={{ borderRight: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between gap-2 mb-6 px-2">
          <div className="flex items-center gap-2.5">
            <span className="chip-icone w-9 h-9 text-lg" style={{ background: "linear-gradient(135deg, #2DD4BF, #818CF8)" }}>📚</span>
            <span className="text-lg" style={{ color: "var(--text)", fontWeight: 650 }}>Cronograma</span>
          </div>
          <ThemeToggle tema={tema} onToggle={() => setTema(tema === "dark" ? "light" : "dark")} />
        </div>
        {LINKS.map((l) => (
          <NavItem key={l.to} {...l} />
        ))}
      </aside>

      <main className="flex-1 min-w-0 p-4 md:p-6 pb-24 md:pb-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mentoria" element={<Mentoria />} />
          <Route path="/progresso" element={<Progresso />} />
          <Route path="/historico" element={<Historico />} />
        </Routes>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around items-center p-2 z-10" style={{ background: "var(--card)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)" }}>
        {LINKS.map((l) => (
          <NavItem key={l.to} {...l} />
        ))}
        <ThemeToggle tema={tema} onToggle={() => setTema(tema === "dark" ? "light" : "dark")} />
      </nav>
    </div>
  );
}
