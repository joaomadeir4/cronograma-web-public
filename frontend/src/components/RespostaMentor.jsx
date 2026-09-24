import ReactMarkdown from "react-markdown";
import katex from "katex";

const COMPONENTES_INLINE = { p: ({ children }) => <>{children}</> };

const REGEX_LATEX = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;

function renderKatex(formula, displayMode) {
  try {
    return katex.renderToString(formula.trim(), { displayMode, throwOnError: false });
  } catch {
    return null;
  }
}

function splitEmPartes(texto) {
  const partes = [];
  let ultimoIndex = 0;
  let match;
  REGEX_LATEX.lastIndex = 0;
  while ((match = REGEX_LATEX.exec(texto)) !== null) {
    if (match.index > ultimoIndex) {
      partes.push({ tipo: "texto", conteudo: texto.slice(ultimoIndex, match.index) });
    }
    const displayMode = match[1] !== undefined;
    const formula = match[1] !== undefined ? match[1] : match[2];
    const html = renderKatex(formula, displayMode);
    if (html !== null) {
      partes.push({ tipo: "katex", html, displayMode });
    } else {
      partes.push({ tipo: "texto", conteudo: match[0] });
    }
    ultimoIndex = match.index + match[0].length;
  }
  if (ultimoIndex < texto.length) {
    partes.push({ tipo: "texto", conteudo: texto.slice(ultimoIndex) });
  }
  return partes;
}

function TextoMarkdown({ conteudo }) {
  const antes = conteudo.match(/^\s+/)?.[0] || "";
  const depois = conteudo.match(/\s+$/)?.[0] || "";
  const meio = conteudo.slice(antes.length, conteudo.length - depois.length);
  return (
    <>
      {antes}
      <ReactMarkdown components={COMPONENTES_INLINE}>{meio}</ReactMarkdown>
      {depois}
    </>
  );
}

export default function RespostaMentor({ texto, className, style }) {
  const partes = splitEmPartes(texto || "");
  return (
    <div className={`prose-mentor ${className || ""}`} style={style}>
      {partes.map((parte, i) =>
        parte.tipo === "katex" ? (
          parte.displayMode ? (
            <div key={i} className="katex-display" dangerouslySetInnerHTML={{ __html: parte.html }} />
          ) : (
            <span key={i} dangerouslySetInnerHTML={{ __html: parte.html }} />
          )
        ) : (
          <TextoMarkdown key={i} conteudo={parte.conteudo} />
        )
      )}
    </div>
  );
}
