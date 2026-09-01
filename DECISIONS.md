# DECISIONS.md
> Log de decisões técnicas do projeto steam-trophies. Este arquivo é **append-only**: novas entradas são adicionadas ao final, entradas antigas nunca são reescritas ou removidas.
>
> Nota: este arquivo foi reconstruído em 13/08/2026 após perda do arquivo original. As entradas anteriores a essa data foram recuperadas a partir de histórico de aprendizados registrados em outras fontes; datas exatas de decisões individuais anteriores a 13/08 podem não estar precisas.

---
## Decisões anteriores (reconstruídas)

1. **`next-auth` deve ficar fixado na v4, nunca deixar o npm resolver para v5.**
   Motivo: `next-auth-steam` depende da API interna da v4 e é incompatível com a v5.

2. **Instalações de pacote no projeto exigem a flag `--legacy-peer-deps`.**
   Motivo: o Next.js 16 é mais novo que o range de peer dependency declarado por algumas bibliotecas de terceiros (ex: `next-auth-steam`), causando conflito de resolução do npm.

3. **`tsconfig.json` precisa do path alias `@/*` apontando para `./src/*`.**
   Motivo: o projeto usa `src/` directory; sem essa configuração, imports usando `@/` não são resolvidos pelo TypeScript.

4. **Cuidado redobrado ao editar `.env.local`: caracteres/comandos residuais colados junto de uma variável quebram a autenticação silenciosamente.**
   Motivo: valores de variável de ambiente corrompidos (ex: chave de API concatenada com outro texto) não geram erro óbvio — a falha aparece só na chamada à API externa, dificultando o diagnóstico.

5. **Cuidado com pastas `app/` duplicadas fora de `src/`.**
   Motivo: se o Next.js encontrar uma pasta `app` na raiz do projeto além da que fica dentro de `src/`, ele pode priorizar a da raiz, fazendo alterações em `src/app` parecerem não ter efeito nenhum no navegador.

6. **Regra de segurança em vigor para todo o código do projeto:**
   - API key da Steam só no backend, via variável de ambiente — nunca no frontend nem versionada no Git
   - Validar a resposta do Steam OpenID diretamente com a Steam antes de confiar em qualquer SteamID
   - HTTPS obrigatório em produção
   - Cookies/tokens de sessão com flags `HttpOnly` + `Secure`
   - Rate limiting na rota de sync
   - Validação de formato de entrada (ex: formato de SteamID) antes de repassar a APIs externas

---
## 13/08/2026 — Sessão de implementação: auth + biblioteca + conquistas

**Contexto:** primeira sessão de codificação de verdade do projeto, partindo de uma máquina recém-formatada (sem Node, Git ou Docker instalados).

**Decisões e correções:**

1. **Steam Web API key nunca deve ser colada junto de outros comandos no `.env.local`.**
   Motivo: um bug real ocorreu quando a chave da Steam ficou concatenada, no mesmo valor de variável, com um trecho do comando usado para gerar o `NEXTAUTH_SECRET` (cópia/cola acidental). Isso quebrou silenciosamente a autenticação com a Steam API (erro `Forbidden` / `Access denied`).

2. **`next-auth` deve ficar fixado na v4, nunca deixar o npm resolver para v5 — confirmado na prática.**
   Motivo: mesmo instalando `next-auth-steam` com `--legacy-peer-deps`, o npm pode puxar a v5 (beta) se a versão não for explicitada, causando erro genérico `[OAuthCallbackError]`. Sempre instalar com `npm install next-auth@4 next-auth-steam --legacy-peer-deps` e confirmar com `npm list next-auth`.

3. **`tsconfig.json` — bug real encontrado: alias apontando para a raiz em vez de `./src/*`.**
   Corrigido para:
   ```json
   "paths": {
     "@/*": ["./src/*"]
   }
   ```

4. **Configuração de auth extraída para `src/lib/auth.ts`, compartilhada entre rotas.**
   Motivo: tanto a rota de login quanto qualquer rota que precise da sessão do usuário precisam da mesma configuração de `NextAuthOptions`. Centralizar evita duplicação e bugs de sessão divergente.

5. **Rota de conquistas cruza `GetPlayerAchievements` com `GetGlobalAchievementPercentagesForApp` e ordena por raridade (menor % primeiro).**
   Motivo: essa é a proposta de valor central do produto.

6. **Pasta `app/` duplicada fora de `src/` causou a página antiga ser servida mesmo após editar `src/app/page.tsx`.**
   Resolvido apagando a pasta `app` da raiz. **Consequência descoberta depois (ver entrada de 26/08):** essa pasta duplicada continha o `globals.css` original gerado pelo `create-next-app` (com o import do Tailwind), que foi perdido junto ao apagar a pasta.

**Estado ao final da sessão:** login + biblioteca de jogos + conquistas por jogo (com raridade) funcionando de ponta a ponta, testado com a conta real do autor.

---
## 20/08/2026 — Sessão de implementação: Supabase + geração de guias por IA

**Contexto:** integração de persistência (Supabase) e da funcionalidade central do produto — geração automática de guias para conquistas raras.

**Decisões e correções:**

1. **Row Level Security (RLS) do Supabase bloqueia todo acesso por padrão até políticas explícitas serem criadas.**
   Motivo: a tabela `achievement_guides` foi criada com RLS habilitado (boa prática), mas sem nenhuma política, o que bloqueava até a própria API do projeto de inserir dados (`new row violates row-level security policy`). Resolvido criando políticas públicas de leitura e escrita:
   ```sql
   create policy "Permitir leitura pública de guias"
   on achievement_guides for select to anon using (true);

   create policy "Permitir escrita pública de guias"
   on achievement_guides for insert to anon with check (true);
   ```
   **Pendência registrada:** essas políticas são adequadas para o estágio atual (dados públicos, sem informação sensível de usuário nesta tabela), mas devem ser revisadas quando o projeto crescer — idealmente restringindo escrita a uma chave de service role usada só no backend, para impedir que qualquer cliente escreva diretamente na tabela via API pública do Supabase.

2. **Gemini API com a ferramenta nativa `google_search` (grounding) mostrou-se não-confiável no tier gratuito — decisão de arquitetura importante.**
   Motivo: testes reais retornaram erro `429 RESOURCE_EXHAUSTED` de forma consistente e imediata, independente do modelo testado (`gemini-3.7-flash`, depois `gemini-2.5-flash` — que também retornou `404` por estar descontinuado para novas contas, depois `gemini-3.6-flash`). Esse comportamento bate com relatos públicos de outros desenvolvedores sobre a combinação "conta gratuita + grounding" ser especialmente restrita/instável no momento. **Não é um bug do nosso código.**

3. **Arquitetura de geração de guia dividida em duas etapas: Tavily (busca) → Gemini (síntese), evitando depender do grounding nativo do Gemini.**
   Motivo: contorna a limitação acima mantendo pesquisa real na web. Tavily oferece tier gratuito permanente de 1.000 créditos/mês sem cartão de crédito; uma busca básica custa 1 crédito. O Gemini é usado **sem** a tool `google_search`, recebendo o conteúdo já buscado pelo Tavily como contexto no prompt, e apenas sintetizando/traduzindo. Isso, na prática, deu resultados mais confiáveis que o grounding nativo do Gemini teria dado.

4. **Cache de guias verificado no Supabase antes de qualquer chamada às APIs externas (Tavily e Gemini).**
   Motivo: evita gastar cota gratuita gerando o mesmo guia duas vezes. A rota `POST /api/guides/generate` sempre consulta `achievement_guides` por `appid` + `apiname` antes de acionar Tavily/Gemini.

5. **Frontend busca todos os guias já salvos de um jogo ao carregar a página (`GET /api/guides?appid=X`), em vez de descobrir isso só ao clicar em "Gerar dica".**
   Motivo: sem isso, o botão "Gerar dica" aparecia para conquistas que já tinham guia salvo no banco — o clique não gastava cota (o cache no backend já protegia isso), mas dava a falsa impressão de que ia gerar algo novo, prejudicando a experiência.

**Estado ao final da sessão:** geração automática de guias funcionando de ponta a ponta (Tavily busca → Gemini sintetiza → salva no Supabase → reaproveitado em acessos futuros), testado com sucesso em múltiplas conquistas do AC Black Flag Resynced.

---
## 26/08/2026 — Sessão de redesign visual (tema escuro + raridade)

**Contexto:** primeira passada de design na interface, até então só com estilos inline básicos.

**Decisões e correções:**

1. **Bug real: `src/app/globals.css` não existia no projeto — o Tailwind nunca esteve de fato ativo, mesmo com a lib instalada.**
   Motivo: conforme registrado na entrada de 13/08, o `globals.css` original (com `@import "tailwindcss";`) foi perdido junto com a pasta `app` duplicada apagada naquela sessão. Como o projeto até então só usava `style={{}}` inline nos componentes, a ausência do Tailwind passou despercebida por várias sessões. Resolvido recriando `src/app/globals.css` com a linha `@import "tailwindcss";` no topo, e confirmando que `src/app/layout.tsx` importa esse arquivo (`import "./globals.css"`).
   **Aprendizado para o futuro:** ao usar classes Tailwind em qualquer novo componente, sempre confirmar visualmente que o estilo está aplicando (fonte, espaçamento, cor) antes de assumir que só o conteúdo/lógica pode estar errado — esse bug ficou "escondido" por várias sessões porque os testes anteriores nunca dependiam do Tailwind para funcionar.

2. **Sistema de cores por raridade de conquista introduzido como elemento central do design (`src/lib/rarity.ts`).**
   Motivo: reaproveita a linguagem visual já familiar de "raridade de item" (comum/incomum/rara/épica/lendária) de jogos, mapeada diretamente ao dado real que já tínhamos (`globalPercent`). Centralizado em um único arquivo para reuso entre a tela de conquistas e futuras telas.

**Estado ao final da sessão:** tema escuro aplicado em toda a aplicação, com cards, barra de progresso, e cores de raridade por conquista.

---
## 27/08/2026 — Sessão de melhorias: qualidade dos guias, vídeo, regeneração e capa de jogo

**Contexto:** ajustes finos na funcionalidade central (geração de guias) após feedback de uso real com conquistas de outros jogos (The Witcher 3 / Gwent), além de melhorias visuais na exibição de capas de jogo.

**Decisões e correções:**

1. **Busca de guia (Tavily) agora sempre roda em inglês, com tradução feita pelo Gemini.**
   Motivo: buscas em português retornavam poucos ou nenhum resultado relevante para conquistas de jogos sem comunidade brasileira grande. O prompt do Gemini foi ajustado para deixar explícito que deve traduzir/responder em português mesmo recebendo contexto em outro idioma.

2. **Query de busca de texto passou a incluir a descrição da conquista, não só o nome, no formato "how to {nome}: {descrição} - {jogo} achievement guide".**
   Motivo: nomes de conquista criativos/não-descritivos (ex: "Mandou ver" para "atingir 187 de força em Gwent") não geram bons resultados sozinhos. A query de vídeo permanece separada e mais simples (`"{jogo} {nome} achievement"`), pois a versão mais longa piorou os resultados de vídeo nos testes.

3. **RLS do Supabase também exige política explícita de DELETE, não só select/insert.**
   Motivo: ao implementar o botão de regenerar guia, o delete falhava silenciosamente sem policy. Resolvido com:
   ```sql
   create policy "Permitir exclusão pública de guias"
   on achievement_guides for delete to anon using (true);
   ```
   **Aprendizado:** operações de escrita no Supabase devem ser testadas verificando o efeito real no banco, não só o status HTTP — checar `res.ok` explicitamente no client evita esse tipo de falha silenciosa.

4. **Coluna `video_url` adicionada à tabela `achievement_guides`**, para anexar link de vídeo do YouTube (buscado via Tavily com `include_domains: ["youtube.com"]`) junto com o texto do guia.

5. **Botão "Regenerar dica" adicionado**, visível apenas para guias gerados por IA (não para guias curados manualmente em `guides.ts`). Chama `POST /api/guides/delete` e repete o fluxo de geração.

6. **Fallback de capa de jogo em cascata implementado no componente `GameCover`, com SteamGridDB como último recurso.**
   Motivo: nem todo jogo tem as imagens oficiais da Steam disponíveis. A cascata tenta os dois tamanhos oficiais primeiro (sem custo de API) e só consulta o SteamGridDB se ambos falharem.
   **Ajuste de UX:** imagens horizontais caindo num espaço vertical ficavam cortadas feio com `object-cover`. Resolvido com efeito de fundo desfocado (`blur-2xl`, `scale-125`) + imagem nítida centralizada com `object-contain` por cima.

**Estado ao final da sessão:** pipeline de guias mais robusto e sistema de capas com fallback em 3 níveis.

---
## 01/09/2026 — Sessão de deploy: colocando o projeto no ar (Vercel)

**Contexto:** primeiro deploy em produção, com o objetivo de tornar o projeto acessível via link público para terceiros testarem, e como pré-requisito para uso como peça de portfólio.

**Decisões e correções:**

1. **`.npmrc` com `legacy-peer-deps=true` na raiz do projeto é necessário para o build funcionar no Vercel, não só localmente.**
   Motivo: o mesmo conflito de peer dependency do `next-auth-steam` com o Next.js 16 (que já exigia a flag `--legacy-peer-deps` manualmente em instalações locais) também derruba o `npm install` automático do Vercel durante o build, com o mesmo erro `ERESOLVE`. Diferente do ambiente local, não há como passar uma flag manual no comando de build padrão do Vercel — o `.npmrc` resolve isso de forma persistente, aplicando a configuração automaticamente em qualquer `npm install` rodado dentro do projeto (local ou CI/CD).
   **Armadilha real encontrada:** o arquivo foi inicialmente criado fora da raiz do projeto (dentro de uma subpasta) por engano — nesse caso o `git status` não acusa erro nenhum e o arquivo é commitado normalmente, mas o npm não o lê de fato, e o build continua falhando com o mesmo erro. Sempre confirmar que arquivos de configuração como `.npmrc` estão no mesmo nível do `package.json`.

2. **Next.js 16 exige que `params` em rotas dinâmicas seja tipado e tratado como `Promise`, não como objeto direto — isso já era seguido em rotas mais novas do projeto, mas não na rota de autenticação, que ficou desatualizada.**
   Motivo: a rota `/api/auth/[...nextauth]/route.ts` ainda usava a assinatura antiga (`ctx: { params: { nextauth: string[] } }`), que funciona sem erro em `npm run dev` local (o Next.js é mais tolerante em desenvolvimento), mas quebra na checagem de tipos rigorosa do build de produção (`next build`), com erro do tipo `RouteHandlerConfig` incompatível. Corrigido para `ctx: { params: Promise<{ nextauth: string[] }> }`, com `await ctx.params` antes de repassar ao `NextAuth`.
   **Aprendizado:** o `npm run dev` local não é suficiente para garantir que o projeto builda em produção — a checagem de tipos e a geração de páginas estáticas do `next build` são mais rígidas e podem revelar problemas invisíveis localmente. Vale rodar `npm run build` localmente antes de fazer deploy, quando possível, para pegar esse tipo de erro mais cedo.

3. **`NEXTAUTH_URL` precisa ser definida com o domínio real de produção (`https://steam-trophies.vercel.app`), nunca `localhost` nem deixada em branco.**
   Motivo: essa variável é usada durante o próprio build (para pré-renderizar páginas) e em tempo de execução (para validar o fluxo de OAuth/OpenID da Steam). Deixá-la vazia causa erro `TypeError: Invalid URL` no build (`ERR_INVALID_URL`); deixá-la como `localhost` ou com valor divergente do domínio real causa erro 500 em `/api/auth/error` ao tentar logar em produção, mesmo com o restante do site funcionando normalmente.
   **Fluxo correto documentado:** como o domínio definitivo do Vercel só é conhecido com certeza após a criação do projeto (Settings → Domains), o primeiro deploy pode ser feito com um valor provisório nessa variável; depois, atualiza-se `NEXTAUTH_URL` com o domínio real e força-se um novo deploy (Redeploy, com "Use existing Build Cache" **desmarcado**, já que uma mudança de variável de ambiente não deve reaproveitar cache de uma tentativa anterior).

4. **Variáveis de ambiente do Vercel espelham exatamente os nomes do `.env.local`**, configuradas via importação direta do arquivo (`Import .env`) na tela de criação do projeto, exceto pela `NEXTAUTH_URL` que precisa ser ajustada manualmente para o domínio de produção.

**Estado ao final da sessão:** projeto publicado com sucesso em `https://steam-trophies.vercel.app`, com deploy automático configurado a cada push na branch `main`. Fluxo completo testado em produção: login Steam, biblioteca, conquistas, geração de guia por IA com vídeo — tudo funcionando fora do ambiente local pela primeira vez.
