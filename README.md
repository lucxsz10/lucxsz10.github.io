# Orbit — Gerenciador de tarefas

MVP web de um gerenciador de tarefas com visual espacial/tech, feito em HTML, CSS e JavaScript puro.

## Como executar

O login Google exige uma origem HTTP autorizada, então não abra o `index.html` pelo caminho `file://`.

No terminal, dentro desta pasta, execute:

```powershell
python -m http.server 8080
```

Depois, abra `http://localhost:8080` no navegador.

No Google Cloud Console, em **APIs e serviços → Credenciais → seu Cliente OAuth 2.0**, adicione `http://localhost:8080` em **Origens JavaScript autorizadas**. Para publicar, adicione também a URL final do site.

## Incluído

- Login exclusivo pelo Google, com sessão persistente no navegador
- Projetos, tarefas, descrições, prioridades, prazos, etiquetas e subtarefas
- Criação, edição, exclusão e conclusão de tarefas
- Busca, filtros e ordenação manual por arrastar e soltar
- Calendário e Kanban com arrastar e soltar entre colunas
- Dashboard de produtividade, tema claro/escuro e atalhos de teclado
- Dados persistidos por conta Google no navegador (`localStorage`)

> Esta versão salva dados localmente e separa-os por usuário Google. Para sincronizar tarefas entre dispositivos, o próximo passo é conectar um banco de dados com autenticação server-side (por exemplo, Supabase ou Firebase).
