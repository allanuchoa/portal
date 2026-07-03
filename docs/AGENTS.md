# Diretrizes para Agentes de IA - Allan Workbench

Este documento define as regras estritas e padrões de desenvolvimento que todo **Agente de IA** (como você) deve seguir ao atuar em qualquer repositório ou ferramenta pertencente ao ecossistema **Allan Workbench**.

**Um agente deve conseguir desenvolver uma ferramenta inteira sem precisar abrir nenhum outro repositório do ecossistema.**

**NUNCA faça referência direta de caminhos de arquivos, sempre faça referência relativa**

---

## 1. Princípio do Isolamento de Contexto (Context Isolation)

Para manter o desenvolvimento eficiente, rápido e de baixo custo de tokens, respeite o isolamento das ferramentas:
*   **Limitação de Escopo**: Se você foi contratado para atuar em uma ferramenta específica (ex: `2. nacionalizacao`), você **não deve** ler, vasculhar ou editar arquivos de outras pastas de ferramentas (ex: `3. precificacao`, `0. login portal`).
*   **Arquivos Globais Legíveis**: Você tem permissão para ler os arquivos da pasta `docs/` do Workbench:
    *   `docs/ARCHITECTURE.md` (Arquitetura e SSO)
    *   `docs/PRODUCT_VISION.md` (Visão de Produto e Personas)
    *   `docs/PRODUCT_ROADMAP.md` (Sequenciamento de Entregas)
    *   `docs/DESIGN.md` (Design Tokens e Sistema Visual)
    *   `docs/AGENTS.md` (Este documento)

---

## 2. Restrições Estritas de Stack Tecnológica

Qualquer desvio destas regras resultará em rejeição do código:
*   **Sem Frameworks de Componentes**: Não use React, Vue, Angular, Svelte, Next.js ou similares. Toda a interface e lógica de negócios devem ser escritas em **HTML5 puro, CSS3 Vanilla e JavaScript nativo (ES6+)**.
*   **Sem Bundlers ou Transpiladores**: Não introduza Webpack, Vite, Rollup, Babel ou TypeScript, a menos que haja uma instrução explícita no `PRD.md` da ferramenta específica. O código deve ser executável diretamente abrindo o `index.html` em um navegador através de um servidor HTTP local simples (ex: `Live Server`, `python -m http.server` ou `npx serve`).
*   **Sem TailwindCSS ou Frameworks de Estilo**: É terminantemente proibido injetar classes utilitárias do TailwindCSS, Bootstrap, Bulma ou Materialize. Todo estilo deve estar contido em arquivos `.css` utilizando seletores CSS nativos e variáveis customizadas do sistema.
*   **Integração com Supabase**: Use o SDK oficial do Supabase via CDN em formato ES Module ou script clássico:
    ```html
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    ```

---

## 3. Conformidade com o Sistema Visual (DESIGN.md)

O visual do Allan Workbench deve ser premium, sofisticado e consistente. Siga rigidamente os tokens de [DESIGN.md](./DESIGN.md):
*   **Fundo Canvas**: O fundo da aplicação é sempre escuro (`#101010`). Nunca crie fundos brancos ou claros.
*   **Tipografia**: Use a fonte `Inter` para textos normais e `SF Mono` (ou equivalentes do sistema) para códigos, números e tabelas.
*   **Botões e Inputs**: Use cantos levemente arredondados (`rounded.sm` 6px) e bordas finas (`hairline` 1px `#3d3a39`). O botão principal (`button-primary`) deve possuir fundo verde elétrico (`#00d992`) e texto escuro (`#101010`).
*   **Sem Sombras Pesadas**: O design é "flat" e focado em linhas precisas. Use bordas sólidas de 1px como divisores e contornos de cards, evitando efeitos de sombreamento 3D complexos.

---

## 4. Protocolo de SSO Nativo (Supabase)

Ao criar ou editar o arquivo principal de uma ferramenta:
1.  **Sem Leitura de Hash URL**: Não faça parsing de tokens de acesso na URL. A autenticação compartilhada é garantida pelo navegador.
2.  **Validação Automática**: Chame `supabase.auth.getSession()` ao carregar a aplicação. Se não houver retorno de sessão ativa, redirecione imediatamente para a URL do Portal Central configurada em `config.js`.
3.  **Inclusão do App Bridge**: Certifique-se de carregar e chamar o componente de cabeçalho dinâmico (`workbench-bridge.js`) para injetar a barra de navegação comum e gerenciar o botão de logout.
4.  **Segurança das Credenciais**: Nunca insira chaves privadas (ex: `service_role_key`) em arquivos JS front-end. Utilize apenas a chave anônima pública (`anon_key`).

---

## 5. Padrão Relacional e Segurança de Dados

Ao interagir com o banco de dados Supabase PostgreSQL:
*   **Prefixação Obrigatória**: Novas tabelas criadas para a sua ferramenta devem conter o slug curto correspondente no nome.
    *   Exemplo: tabela para armazenar itens da ferramenta Nacionalização: `nac_items`.
*   **Row Level Security (RLS)**: É obrigatório que toda tabela possua RLS ativa. A política de segurança deve validar o acesso do usuário consultando o Registry relacional:
    ```sql
    ALTER TABLE public.sua_tabela ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "nome_da_politica" ON public.sua_tabela FOR ALL USING (
      auth.uid() IS NOT NULL AND 
      EXISTS (
        SELECT 1 FROM public.user_applications ua
        JOIN public.applications app ON app.id = ua.application_id
        WHERE ua.user_id = auth.uid() AND app.slug = 'slug_da_ferramenta' AND app.is_active = true
      )
    );
    ```

---

## 6. Ciclo de Vida de Criação de Ferramentas (Fluxo para IA)

Se você receber a tarefa de criar uma ferramenta inteiramente nova:
1.  **Inicialize a Estrutura**: Crie o repositório e crie a árvore de arquivos estáticos (`index.html`, `styles.css`, `app.js`, `supabase.js`, `config.js`).
2.  **Documentação**: Escreva na pasta `docs/` os arquivos `PRD.md`, `AGENTS.md` e `CHANGELOG.md`.
3.  **Script de Instalação no DB**: Crie um script SQL contendo a query de cadastro da nova ferramenta na tabela `applications` e as tabelas com RLS da própria ferramenta.
4.  **Conexão com App Bridge**: Importe `assets/js/workbench-bridge.js` para garantir que o menu superior e a validação de login rodem automaticamente.

---

## 7. Padrões de Documentação por Ferramenta

Toda ferramenta sob desenvolvimento deve conter, em sua própria pasta ou repositório, quatro documentos essenciais:
1.  `README.md`: Instruções de instalação e como rodar localmente.
2.  `PRD.md`: Requisitos de negócio, fluxos de uso e mockups.
3.  `AGENTS.md`: Mapeamento de tabelas SQL locais e regras de cálculo específicas.
4.  `CHANGELOG.md`: Histórico de modificações.

### Regra do CHANGELOG
Ao concluir qualquer alteração de código ou documentação em uma ferramenta, você **deve** registrar sua alteração no `CHANGELOG.md` local seguindo o formato:

```markdown
## [Versão] - AAAA-MM-DD
### Adicionado / Modificado / Corrigido
- [Descrição curta e clara da alteração realizada] - (Autor: Agente de IA [Nome/Modelo])
```

---

## 8. Estados da Interface e Resiliência

Toda view que depende de dados externos (Supabase, CDN) **deve** implementar os quatro estados obrigatórios. Nenhuma tela pode ficar em branco enquanto espera uma resposta de rede.

### 8.1 Estados Obrigatórios

| Estado | O que renderizar | Exemplo |
|---|---|---|
| **Loading** | Skeleton ou spinner antes da query resolver | Grid de 3 cards com placeholder animado (`opacity` pulse) |
| **Empty** | Mensagem informativa quando não há dados | "Nenhuma ferramenta disponível" — distinto do estado de erro |
| **Error** | Ícone de alerta + descrição + botão "Tentar novamente" | Card com `alert-circle` + "Não foi possível carregar" + botão de retry |
| **Success** | Conteúdo normal | Grid de cards / tabela / formulário |

**Regra**: o estado de erro e o estado vazio NUNCA devem compartilhar a mesma mensagem. O usuário precisa distinguir "não tenho dados" de "a requisição falhou".

### 8.2 HTML com Fallback Visível

O `index.html` estático **deve** ter um estado visível por padrão (antes de qualquer JS executar). Exemplo:

```html
<!-- Correto: login visível como fallback -->
<div id="view-login" class="view active">...</div>
<div id="view-launcher" class="view">...</div>
```

Se o CDN do Supabase falhar ou o JS não carregar, o usuário ainda vê algo que não seja uma tela preta vazia.

### 8.3 Event Listeners em Elementos Estáticos

Elementos que existem no HTML estático (não criados dinamicamente) **devem** ter seus event listeners registrados uma única vez, nunca por render.

```javascript
// Correto: flag de controle
var logoutBound = false;
function bindLogout(btn) {
  if (logoutBound) return;
  logoutBound = true;
  btn.addEventListener('click', handler);
}

// Errado: registrado em todo renderLauncher()
btn.addEventListener('click', handler); // acumula N listeners
```

### 8.4 onAuthStateChange Obrigatório

Toda aplicação que usa Supabase Auth **deve** escutar `onAuthStateChange` para reagir a `SIGNED_OUT` (expiração de sessão, logout em outra aba):

```javascript
supabaseClient.auth.onAuthStateChange(function (event, session) {
  if (event === 'SIGNED_OUT') {
    clearState();
    showLogin();
  }
});
```

Sem isso, uma sessão expirada deixa o usuário preso em uma view quebrada até o próximo reload manual.

### 8.5 Validação de URL Externa

Todo `window.location.href` com valor vindo do banco de dados **deve** validar o esquema antes do redirect:

```javascript
var url = app.url;
if (/^https?:\/\//.test(url)) {
  window.location.href = url;
}
```

Isso bloqueia `javascript:` e outros esquemas perigosos, mesmo que o banco esteja comprometido.

### 8.6 Navegação por Teclado (Focus Visible)

Todo elemento interativo (botão, input, link) **deve** ter indicador de foco visível:

```css
:focus-visible {
  outline: 2px solid var(--color-primary-soft);
  outline-offset: 2px;
}
```

Remove `outline: none` de inputs e botões ou compense com `border-color` no `:focus`.

### 8.7 Cor de Erro (Token Semântico)

Embora o DESIGN.md reserve a palette semântica para contextos in-product, **as ferramentas do ecossistema são in-product**. Adicione um token de erro ao `:root`:

```css
--color-danger: #f87171;
```

Use-o em `.login-error`, estados de erro, toasts de falha e validação de formulários.

### 8.8 Scripts SQL Idempotentes

Todo script SQL versionado **deve** ser re-executável sem erros:

- `CREATE TABLE IF NOT EXISTS` (nunca `CREATE TABLE` puro)
- `CREATE OR REPLACE FUNCTION` para funções
- `DROP TRIGGER IF EXISTS ... ON ...` antes de cada `CREATE TRIGGER`
- `DROP POLICY IF EXISTS "nome" ON ...` antes de cada `CREATE POLICY`
