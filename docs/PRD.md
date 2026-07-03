# Product Requirements Document (PRD) - Portal de Entrada (Launcher)

Este documento define os requisitos funcionais, não funcionais, fluxos de usuário e especificações de interface para o **Portal de Entrada** (Launcher) do Allan Workbench.

---

## 1. Contexto e Objetivos

O Portal de Entrada é a porta de acesso e o distribuidor de sessões para todo o ecossistema Allan Workbench. Ele não possui regras de negócio de engenharia ou finanças, concentrando-se puramente em:
1.  Autenticar usuários via Supabase Auth.
2.  Funcionar como um **Launcher** (painel de lançamento) genérico, renderizando dinamicamente as ferramentas para as quais o usuário logado possui acesso concedido.
3.  Desacoplamento total de ferramentas específicas: o portal não armazena strings, links, ícones ou categorias fixas no código cliente; tudo é consumido dinamicamente da tabela `applications` (Registry) do Supabase.

---

## 2. Requisitos Funcionais

### RF01: Autenticação de Usuários
*   **Descrição**: O sistema deve permitir que usuários façam login utilizando email e senha cadastrados no Supabase Auth.
*   **Fluxo**:
    1.  O usuário insere email e senha na tela de login.
    2.  O sistema chama o método `supabase.auth.signInWithPassword()`.
    3.  Caso a autenticação seja bem-sucedida, a sessão é mantida pelo Supabase no navegador e o usuário é redirecionado para a Home (Launcher).
    4.  Caso ocorra falha, exibe uma mensagem de erro estilizada abaixo dos campos.

### RF02: Painel de Lançamento Dinâmico (Registry-Driven Launcher)
*   **Descrição**: A tela inicial do Portal (Home) deve montar dinamicamente o catálogo de aplicações que o usuário logado possui permissão para acessar.
*   **Mecanismo**:
    1.  Ao carregar a Home, o Portal obtém o ID do usuário logado via `supabase.auth.getSession()`.
    2.  O Portal realiza uma consulta relacional nas tabelas `applications` e `user_applications` para filtrar apenas as ferramentas associadas àquele ID e que estão ativas (`is_active = true`).
    3.  O Portal monta o grid de cards na tela dinamicamente utilizando o nome, URL de destino, ícone, categoria e status retornados pela consulta.
*   **Ausência de Hardcode**: Nenhuma ferramenta é declarada de forma estática no arquivo `index.html`. O launcher funciona apenas como um renderizador de registros.

### RF03: Redirecionamento e Interações do Launcher
*   **Descrição**: Ao clicar no card de uma aplicação autorizada, o Portal direciona o usuário para a URL correspondente, respeitando o status do projeto.
*   **Mecanismo**:
    1.  **Card Inteiro Clicável**: Toda a área do card da ferramenta é clicável para acesso direto (sem botões secundários adicionais).
    2.  **Tratamento de Status (Badges)**:
        *   **active / beta**: O Portal executa o redirecionamento convencional (`window.location.href = app.url`). Sessão compartilhada nativamente pelo navegador.
        *   **coming_soon (Em breve)**: O clique redireciona para um fluxo de bloqueio. O card tem opacidade reduzida, cursor desabilitado e dispara uma notificação (Toast) flutuante elegante na tela informando que a ferramenta está em desenvolvimento.
    3.  **Remoção de Risco**: Não são passados tokens, credenciais ou hashes na barra de endereço URL.

### RF04: Busca Rápida e Filtros de Categoria (Spotlight-style)
*   **Descrição**: O painel deve fornecer filtros de categorias e uma caixa de pesquisa com atalhos de teclado.
*   **Mecanismo**:
    1.  **Filtros por Pílulas**: Botões de filtro exibidos dinamicamente baseados nas categorias das ferramentas presentes na lista do usuário. Clicar em uma pílula filtra o grid instantaneamente.
    2.  **Atalho '/' para Focar Busca**: Pressionar a tecla `/` foca automaticamente no campo de busca de ferramentas, limpando o grid de seleções do navegador.
    3.  **Filtragem em Tempo Real**: Digitar na caixa de pesquisa filtra instantaneamente os cards na tela por nome ou categoria.
    4.  **Enter para Lançamento Rápido**: Pressionar `Enter` na caixa de pesquisa abre imediatamente a primeira ferramenta visível correspondente no grid (estilo Spotlight/Raycast).
    5.  **Atalho 'Esc' para Cancelar**: Pressionar `Esc` limpa o texto digitado e retira o foco da caixa de pesquisa.

### RF05: Encerramento de Sessão (Logout)
*   **Descrição**: O usuário deve poder encerrar a sessão ativa no Portal ou em qualquer ferramenta vinculada.
*   **Fluxo**:
    1.  O botão "Sair" chama `supabase.auth.signOut()`.
    2.  O cliente Supabase limpa o localStorage local e cookies de sessão correspondentes.
    3.  O usuário é redirecionado de volta para a tela de login do Portal.

---

## 3. Requisitos Não Funcionais

*   **RNF01: Stack Tecnológica Estática**: O Portal deve ser desenvolvido utilizando apenas HTML5, CSS Vanilla e JavaScript puro, sem builders (NPM/Vite) ou frameworks.
*   **RNF02: Layout Compacto e Responsividade**: O layout do painel deve se ajustar de forma fluida a qualquer resolução de tela:
    *   **Desktop:** Grid de 6 colunas (`6x3`) para maximizar a densidade de informação e caber de 10 a 20 ferramentas sem rolagem excessiva.
    *   **Tablet:** Grid de 4 colunas.
    *   **Mobile / Telas Pequenas:** Grid de 2 colunas.
*   **RNF03: Segurança de RLS**: A leitura das tabelas de aplicação deve ser protegida por Row Level Security no banco de dados para evitar que um usuário mal-intencionado liste ferramentas que não possui permissão para ver.

---

## 4. Esboço de Interface (Mockups Textuais)

### Tela de Login (`index.html` com estado deslogado)
Caixa de login centralizada sobre fundo escuro (`#101010`), com bordas de 1px (`#3d3a39`) e botão verde elétrico (`#00d992`).

```
+---------------------------------------------------------+
|                                                         |
|                     ALLAN WORKBENCH                     |
|                                                         |
|                +-----------------------+                |
|                |         Login         |                |
|                |                       |                |
|                |  Email                |                |
|                |  [                  ]  |                |
|                |                       |                |
|                |  Senha                |                |
|                |  [ **************** ]  |                |
|                |                       |                |
|                |  [  Entrar (Verde)  ] |                |
|                +-----------------------+                |
|                                                         |
+---------------------------------------------------------+
```

### Dashboard Launcher Dinâmico (`index.html` com estado logado)
Renderiza o grid 6x3 ultra-minimalista, a caixa de busca com atalho visual `/` e os botões de filtros por categoria.

```
+-----------------------------------------------------------------------------+
| ALLAN WORKBENCH                                   [usuario@email.com] [Sair] |
+-----------------------------------------------------------------------------+
|                                                                             |
|   [ Pesquisar ferramentas... (pressione '/' para focar) [/] ]                |
|                                                                             |
|   Filtros: ( Todas ) ( Commercial ) ( Engineering )                         |
|                                                                             |
|   +---------------+ +---------------+ +---------------+ +---------------+   |
|   |   (Icon)      | |   (Icon)      | |   (Icon)      | |   (Icon) [Beta]|   |
|   |               | |               | |               | |               |   |
|   |  Nacionaliz.  | |  Precific.    | |     Difal     | |      MMQ      |   |
|   |  [Commercial] | |  [Commercial] | | [Commercial]  | | [Engineering] |   |
|   +---------------+ +---------------+ +---------------+ +---------------+   |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

## 5. Estrutura do Banco de Dados Relacionada (Registry)

O Portal e as demais ferramentas se apoiam neste esquema normalizado para governança de acessos:

### 1. Tabela `public.profiles`
*   Informações básicas do usuário.
*   **Campos**:
    *   `id` (UUID, PK, FK para `auth.users.id`)
    *   `name` (Text, nome do usuário)
    *   `role` (Text, `'user' | 'admin'`)
    *   `updated_at` (Timestamp)

### 2. Tabela `public.applications`
*   O catálogo (Registry) contendo as ferramentas do ecossistema.
*   **Campos**:
    *   `id` (UUID, PK, gerado automaticamente)
    *   `slug` (Text, único, ex: `'pricing'`)
    *   `name` (Text, ex: `'Precificação'`)
    *   `url` (Text, URL de deploy da ferramenta)
    *   `icon` (Text, nome/classe do ícone)
    *   `category` (Text, categoria para agrupamento, ex: `'Commercial'`)
    *   `is_active` (Boolean, padrão `true`)
    *   `status` (Text, restrito a `'active' | 'beta' | 'coming_soon'`, padrão `'active'`)
    *   `created_at` (Timestamp)

### 3. Tabela `public.user_applications`
*   Tabela de junção n:n para mapeamento de permissões.
*   **Campos**:
    *   `user_id` (UUID, PK, FK para `profiles.id`, cascata na deleção)
    *   `application_id` (UUID, PK, FK para `applications.id`, cascata na deleção)
    *   `granted_at` (Timestamp, padrão `now()`)
