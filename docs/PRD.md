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
    3.  O Portal monta o grid de cards na tela dinamicamente utilizando o nome, URL de destino, ícone e categoria retornados pela consulta.
*   **Ausência de Hardcode**: Nenhuma ferramenta (ex: "Precificação", "BESS", "PV") é declarada de forma estática no arquivo `index.html` ou `home.js`. O launcher funciona apenas como um renderizador de registros.

### RF03: Redirecionamento Autenticado Nativamente
*   **Descrição**: Ao clicar no card de uma aplicação autorizada, o Portal simplesmente redireciona o usuário para a URL cadastrada no registro daquela aplicação.
*   **Mecanismo**:
    1.  O Portal executa o redirecionamento convencional (`window.location.href = app.url`).
    2.  O compartilhamento de sessão é garantido nativamente no navegador pelo cliente Supabase (usando `localStorage` compartilhado no mesmo domínio ou cookies de domínio curinga para subdomínios).
    3.  **Remoção de Risco**: Não são passados tokens, credenciais ou hashes na barra de endereço URL.

### RF04: Encerramento de Sessão (Logout)
*   **Descrição**: O usuário deve poder encerrar a sessão ativa no Portal ou em qualquer ferramenta vinculada.
*   **Fluxo**:
    1.  O botão "Sair" chama `supabase.auth.signOut()`.
    2.  O cliente Supabase limpa o localStorage local e cookies de sessão correspondentes.
    3.  O usuário é redirecionado de volta para a tela de login do Portal.

---

## 3. Requisitos Não Funcionais

*   **RNF01: Stack Tecnológica Estática**: O Portal deve ser desenvolvido utilizando apenas HTML5, CSS Vanilla e JavaScript puro, sem builders (NPM/Vite) ou frameworks.
*   **RNF02: Responsividade**: O layout do painel de lançamento dinâmico deve se ajustar a layouts mobile, tablets e desktops (grid flexível baseado em CSS Grid ou Flexbox).
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
Renderiza dinamicamente as ferramentas associadas ao usuário no banco.

```
+---------------------------------------------------------+
| ALLAN WORKBENCH                       [usuario@email.com] [Sair] |
+---------------------------------------------------------+
|                                                         |
|  Ferramentas Disponíveis:                               |
|                                                         |
|  [Categoria: Commercial]                                |
|  +------------------+  +------------------+             |
|  | Icon  Nome       |  | Icon  Nome       |             |
|  | [Acessar (URL)]  |  | [Acessar (URL)]  |             |
|  +------------------+  +------------------+             |
|                                                         |
|  [Categoria: Engineering]                               |
|  +------------------+                                   |
|  | Icon  Nome       |                                   |
|  | [Acessar (URL)]  |                                   |
|  +------------------+                                   |
|                                                         |
+---------------------------------------------------------+
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
    *   `created_at` (Timestamp)

### 3. Tabela `public.user_applications`
*   Tabela de junção n:n para mapeamento de permissões.
*   **Campos**:
    *   `user_id` (UUID, PK, FK para `profiles.id`, cascata na deleção)
    *   `application_id` (UUID, PK, FK para `applications.id`, cascata na deleção)
    *   `granted_at` (Timestamp, padrão `now()`)
