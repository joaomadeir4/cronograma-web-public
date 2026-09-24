# Cronograma de estudos

Aplicacao web local para organizar sessoes de estudo, acompanhar checkpoints e revisar conteudos com apoio de um mentor de IA.

## Stack

- Backend: Python e FastAPI
- Frontend: React e Vite
- Estado local: arquivos JSON criados durante o uso

## Executar localmente

Backend, em um terminal:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn api:app --reload
```

Frontend, em outro terminal:

```powershell
cd frontend
npm install
npm run dev
```

Abra o endereço exibido pelo Vite no terminal (por padrão, `http://localhost:5173`; se a porta estiver ocupada, ele pode usar outra).

O mentor usa um CLI de IA instalado e autenticado localmente. Integrações externas opcionais podem exigir variáveis de ambiente configuradas localmente.

## Privacidade

Esta versao publica nao inclui plano de estudos, progresso, atividades, materiais de curso, credenciais ou contexto pessoal. A pasta `dados/` comeca vazia; os arquivos JSON de uso local sao ignorados pelo Git. Nunca publique seu `.env`.
