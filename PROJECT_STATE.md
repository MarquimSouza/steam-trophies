# PROJECT_STATE.md
> Última atualização: 01/09/2026 — reflete o estado mais recente do projeto (HEAD). Este arquivo é sempre sobrescrito por completo, nunca editado incrementalmente.

## Visão geral do projeto

**Nome:** steam-trophies
**Repositório:** github.com/MarquimSouza/steam-trophies
**URL em produção:** https://steam-trophies.vercel.app
**O que é:** SaaS de tracker de conquistas/platina da Steam. Usuário loga com sua conta Steam, vê a biblioteca de jogos, e para cada jogo vê a lista de conquistas ordenada por raridade (% global de jogadores que desbloquearam), com guias gerados automaticamente por IA (pesquisa real na web, incluindo link de vídeo do YouTube quando disponível) para as conquistas mais difíceis.

**Objetivo duplo:** produto real + peça de portfólio (autor tem pouca experiência profissional em dev web, conhece JS e lógica de programação).

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS v4, `src/` directory)
- next-auth **v4.24.15** (fixado nessa versão — ver DECISIONS.md)
- next-auth-steam 0.4.0 (autenticação via Steam OpenID)
- Supabase (Postgres + client `@supabase/supabase-js`) — tabela `achievement_guides` em produção, com RLS habilitado e políticas públicas de leitura/escrita/exclusão
- Steam Web API (`GetOwnedGames`, `GetPlayerAchievements`, `GetGlobalAchievementPercentagesForApp`)
- **Tavily API** (busca na web, tier gratuito de 1.000 créditos/mês, sem cartão) — busca conteúdo real sobre a conquista (em inglês) e vídeos no YouTube
- **Google Gemini API** (`gemini-3.6-flash`, tier gratuito, SEM a ferramenta `google_search`) — sintetiza/traduz o conteúdo pesquisado pelo Tavily em um guia curto e em português
- **SteamGridDB API** (tier gratuito) — fallback de capa de jogo quando as imagens oficiais da Steam falham
- **Vercel** — hospedagem/deploy em produção, integrado ao GitHub (deploy automático a cada push na branch `main`)

## Ambiente de desenvolvimento

- Windows, VS Code
- Node.js instalado (LTS, v24.19.0), npm 11.17.0, Git 2.55.0
- Rotina diária: abrir a pasta do projeto no VS Code → terminal → `npm run dev` → `localhost:3000`
- Instalações de pacote exigem `--legacy-peer-deps` — em produção (Vercel), isso é resolvido automaticamente por um arquivo `.npmrc` na raiz do projeto (`legacy-peer-deps=true`), sem precisar da flag manual

## Deploy em produção (Vercel)

- Projeto conectado ao repositório GitHub `MarquimSouza/steam-trophies`, branch `main` — todo push dispara um novo deploy automaticamente
- Variáveis de ambiente configuradas diretamente no painel do Vercel (Project Settings → Environment Variables), espelhando o `.env.local`: `NEXTAUTH_URL` (fixada em `https://steam-trophies.vercel.app`, **não** pode ser `localhost` em produção), `NEXTAUTH_SECRET`, `STEAM_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `TAVILY_API_KEY`, `STEAMGRIDDB_API_KEY`
- Fluxo de deploy: push no GitHub → Vercel builda automaticamente → se passar, fica em produção na URL acima

## Estrutura de arquivos relevante

```
.npmrc                       → legacy-peer-deps=true (necessário para o build no Vercel não falhar por conflito de peer dependency do next-auth-steam)
src/
  lib/
    auth.ts                 → configuração compartilhada do NextAuth (providers, callbacks de steamId)
    supabase.ts              → client do Supabase (usa NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)
    gemini.ts                → chama a API do Gemini para sintetizar/traduzir um guia a partir do contexto de busca
    tavily.ts                → busca conteúdo real na web (texto) e vídeos no YouTube sobre a conquista
    rarity.ts                → calcula a "faixa de raridade" (Comum/Incomum/Rara/Épica/Lendária) a partir do % global
  components/
    GameCover.tsx             → componente de capa de jogo com fallback em cascata (Steam library → Steam header → SteamGridDB → nome do jogo)
  data/
    guides.ts                → guias curados manualmente (prioridade sobre os gerados por IA) — atualmente vazio, testando geração 100% automática
  app/
    globals.css               → tokens de cor do tema escuro + import do Tailwind (@import "tailwindcss";)
    page.tsx                  → tela inicial: login, biblioteca de jogos (grid/lista, busca, capas via GameCover)
    layout.tsx                → importa globals.css e envolve a app com o SessionProvider
    providers.tsx             → wrapper client-side do SessionProvider
    games/
      [appid]/
        page.tsx               → tela de detalhe: conquistas com raridade colorida, header fixo, busca, grid/lista, ordenação, geração/regeneração de guia, vídeo do YouTube
    api/
      auth/
        [...nextauth]/
          route.ts             → rota de autenticação (params assíncrono, sintaxe Next.js 16 — ver DECISIONS.md)
      steam/
        games/route.ts         → GET: biblioteca de jogos do usuário logado
        achievements/[appid]/route.ts → GET: conquistas de um jogo, cruzadas com % de raridade global
      guides/
        route.ts                → GET: guias já salvos no Supabase para um appid (texto + vídeo)
        generate/route.ts       → POST: gera um guia novo (Tavily busca em inglês → Gemini traduz/sintetiza → busca vídeo) OU retorna do cache
        delete/route.ts         → POST: apaga um guia específico (usado pelo botão "Regenerar dica")
      covers/[appid]/route.ts   → GET: fallback de capa via SteamGridDB
```

## O que já funciona (testado de ponta a ponta, em produção)

- ✅ **Deploy em produção no Vercel**, acessível via link público (`https://steam-trophies.vercel.app`), com deploy automático a cada push
- ✅ Login via Steam OpenID, sessão com `steamId` exposto via callbacks
- ✅ Busca e exibição da biblioteca completa de jogos do usuário logado, em grid (com capa) ou lista, com busca por nome
- ✅ Busca e exibição das conquistas de um jogo específico, com raridade colorida, header fixo, busca, grid/lista, desbloqueadas ao final
- ✅ Geração automática de guias por IA (Tavily busca em inglês com nome+descrição → Gemini traduz/sintetiza → vídeo do YouTube quando encontrado)
- ✅ Botão "🔄 Regenerar dica" para guias de baixa qualidade
- ✅ Cache de guias no Supabase (texto + vídeo)
- ✅ Fallback em cascata de capa de jogo (Steam → Steam alternativo → SteamGridDB → nome em texto)
- ✅ Tema visual escuro com sistema de cores por raridade
- ✅ Projeto versionado no GitHub, commits a cada marco funcional

## O que falta (próximos passos, em ordem sugerida)

1. Aba de perfil do usuário — foto, nickname, descrição, soma total de conquistas de todos os jogos (requer nova tabela `profiles` + Storage bucket no Supabase)
2. Preparação final para portfólio: README.md com prints/instruções, `.env.example`, limpeza de logs de debug remanescentes
3. Expandir curadoria/geração de guias para mais jogos além do AC Black Flag Resynced
4. Tela de "hall da platina" (jogos 100% completos)
5. Botão de sync manual por conta
6. Tratamento de perfis privados da Steam (mensagem amigável ainda não implementada)
7. Rate limiting nas rotas que chamam a Steam API e nas rotas de geração de guia
8. Monetização freemium (Stripe) — só depois de ter uso orgânico validado

## Decisões arquiteturais em vigor (resumo — detalhes completos em DECISIONS.md)

- Conquistas ficam em rota própria (`/api/steam/achievements/[appid]`), reaproveitando o padrão de auth existente
- Configuração de auth centralizada em `src/lib/auth.ts`, compartilhada entre rotas
- API keys nunca expostas ao frontend — todas as chamadas externas acontecem só nas rotas de API do backend
- Geração de guia em duas etapas (Tavily busca → Gemini sintetiza/traduz), evitando o grounding nativo do Gemini (não-confiável no tier gratuito)
- Busca de guia sempre em inglês, tradução feita pelo Gemini; busca de vídeo usa query separada e mais simples
- Cache permanente de guias no Supabase por `appid` + `apiname`; RLS exige políticas explícitas de select, insert **e delete**
- Fallback de imagem em cascata client-side evita gastar cota do SteamGridDB desnecessariamente
- `.npmrc` com `legacy-peer-deps=true` necessário tanto localmente quanto no Vercel, por causa do `next-auth-steam` ainda não declarar suporte oficial ao Next.js 16
- Rotas de API do Next.js 16 exigem `params` como `Promise` (não objeto direto) — checagem de tipos do build de produção é mais rigorosa que o `npm run dev` local e pode pegar isso onde o dev não pegaria

## Contexto de negócio (não muda com frequência, mas relevante para decisões futuras)

- Monetização planejada: freemium (grátis + assinatura premium)
- Intenção futura de expandir para app mobile — favorecer arquitetura API-first
- Prioridade atual: manter custo zero (Tavily, Gemini, SteamGridDB, Vercel — todos nos tiers gratuitos) enquanto o projeto é pessoal/portfólio
- Projeto agora acessível a terceiros via link público — testes podem se expandir além do autor e contatos próximos
