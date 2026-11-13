# MyCP MCP Server

Servidor MCP remoto mínimo, executado em Cloudflare Workers pelo transporte HTTP stateless do SDK MCP oficial.

## Desenvolvimento e deploy

```bash
npm ci
npm run dev
npm run deploy
```

O endpoint MCP é `/mcp` (por exemplo, `http://localhost:8787/mcp` em desenvolvimento).

A ferramenta `memory_manager` aceita `action` (`add` ou `remove`), `priority` (inteiro de 1 a 20) e `mem` (texto). As memórias são persistidas em um Durable Object.
