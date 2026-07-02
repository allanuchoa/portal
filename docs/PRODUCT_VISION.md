# Visão de Produto - Allan Workbench

O **Allan Workbench** é um ecossistema descentralizado de ferramentas de alta especialização técnica e utilitárias desenvolvidas para otimizar as atividades de **engenharia, pré-vendas e gestão de projetos no setor de energia**.

Diferente de sistemas corporativos tradicionais ou ERPs robustos, o Allan Workbench é construído sob a filosofia de micro-aplicações independentes que resolvem problemas pontuais com máxima eficiência, velocidade e facilidade de manutenção.

---

## 1. O Problema e a Oportunidade

### O Cenário Atual
*   **Monólitos Complexos e ERPs Inflexíveis**: Sistemas integrados tradicionais no setor de energia tendem a se tornar lentos, caros e extremamente difíceis de customizar para as realidades dinâmicas do mercado de engenharia e regulação tarifária.
*   **Poluição de Contexto em Desenvolvimento de Software**: No desenvolvimento moderno assistido por Inteligência Artificial, grandes bases de código (monólitos) exigem que o agente de IA processe um contexto imenso para fazer alterações simples, o que resulta em maior tempo de resposta, custos elevados de tokens e alta incidência de bugs colaterais.

### A Oportunidade do Allan Workbench
*   **Utilitários Especializados**: Em vez de uma única aplicação pesada, o Allan Workbench oferece uma coleção de ferramentas leves, onde cada uma resolve um único problema de negócio (ex: cálculo de nacionalização, regras de DIFAL, estimativa de precificação).
*   **IA-First por Design (Isolamento de Contexto)**: A decisão arquitetural de separar cada ferramenta em seu próprio repositório Git permite que agentes de IA trabalhem com o contexto mínimo absoluto. Um agente atuando na ferramenta de *Precificação* precisa compreender apenas o código dessa ferramenta específica, resultando em modificações rápidas, precisas e seguras.

---

## 2. Pilares Estratégicos do Produto

1.  **Isolamento Estrito (Independência)**: Cada ferramenta tem seu próprio ciclo de vida, repositório e deploy. Um erro crítico na ferramenta A não afeta de forma alguma o funcionamento da ferramenta B, e ambas podem evoluir em velocidades diferentes.
2.  **Stack Minimalista e Sem Bloqueios**: Utilizando HTML5 nativo, CSS Vanilla e JS puro conectado ao Supabase. Essa stack garante que qualquer engenheiro de software (ou agente de IA) possa abrir, entender e codificar sem passar por builds complexos, gerenciadores de pacotes pesados ou quebras de versão de frameworks.
3.  **Identidade Visual Premium e Coesa**: Baseando-se no padrão "Energy Dark" definido no [DESIGN.md](./DESIGN.md). O visual é focado no desenvolvedor e no engenheiro técnico: paleta em tons de preto e cinza profundos com acentos em verde esmeralda vibrante, sem ornamentos desnecessários, lembrando uma documentação refinada ou terminal de alta tecnologia.
4.  **Launcher Dinâmico Baseado em Registry**: O Portal de Entrada não possui código acoplado ou fixo sobre as ferramentas. Ele consome o catálogo de ferramentas e as regras de acesso em tempo de execução diretamente do banco de dados (Registry). Isso permite adicionar, remover ou modificar links e ferramentas do ecossistema de forma transparente e em segundos, sem tocar no código do Portal.
5.  **Autenticação Unificada Transparente (SSO)**: Uma experiência de Single Sign-On nativa suportada pelo navegador e pelo Supabase Auth. Sem tokens transitando na URL, o ecossistema mantém a segurança máxima de sessões divididas por subdomínios ou caminhos comuns de forma automática.

---

## 3. Personas Principais

### 1. Engenheiro de Pré-Vendas / Propostas
*   **Necessidades**: Precisa calcular custos de importação e nacionalização de equipamentos, aplicar regras tributárias de DIFAL e precificar projetos rapidamente para compor propostas comerciais.
*   **Como o Workbench ajuda**: Permite que ele acesse a ferramenta de Nacionalização e de Difal de forma isolada, gerando relatórios rápidos que retroalimentam seu fluxo de proposta sem ter de navegar em um sistema ERP pesado.

### 2. Engenheiro de Projetos (PV / BESS)
*   **Necessidades**: Realizar simulações técnicas rápidas de dimensionamento para sistemas Fotovoltaicos (PV) e de Armazenamento de Energia por Bateria (BESS).
*   **Como o Workbench ajuda**: Fornece utilitários de cálculo específicos que gravam seus resultados diretamente no banco de dados centralizado do Supabase para futura auditoria, rodando de maneira extremamente ágil em dispositivos móveis ou desktop.

### 3. Agente de IA (Desenvolvedor Autônomo)
*   **Necessidades**: Precisa ler, modificar e testar códigos da ferramenta em que foi designado, sem sofrer com problemas de instalação de dependências locais, conflitos de versionamento de pacotes NPM ou poluição de contexto de outras regras de negócio.
*   **Como o Workbench ajuda**: O isolamento por repositório garante que o contexto contemple apenas a lógica daquela ferramenta específica.

---

## 4. Promessa de Valor

*   **Para o Usuário**: Rapidez no uso, zero telas poluídas, foco na tarefa e design moderno que cansa menos a vista em longas jornadas de trabalho.
*   **Para o Negócio**: Facilidade de escala (novas ferramentas podem ser acopladas no ecossistema em minutos através do cadastro no Registry, sem impacto no código existente) e custo de desenvolvimento extremamente baixo, potencializado pelo uso agressivo de agentes de IA na manutenção do código.
