# floorplan - Arquitetura e Diretrizes

## 1. Visão Geral

Plugin para OCS Inventory que adiciona uma camada de visualização espacial interativa (plantas baixas/floor plans) utilizando estruturas de dados JSON e renderização em HTML5 Canvas.

## 2. Identidade Visual (Integração Nativa OCS)

O plugin **NÃO** deve parecer uma aplicação externa de terceiros. Ele deve se comportar e parecer um módulo nativo do OCS Inventory.

A interface gráfica (modais, painéis e o canvas) deve utilizar as mesmas paletas de cores, fontes e classes CSS (Bootstrap) nativas do OCS. O Canvas deve herdar o tema do usuário (suportando perfeitamente o modo Claro padrão, e adaptando-se caso o OCS possua um modo Escuro ativado), garantindo uma adoção fluida e sem atrito visual.

## 3. Metodologia de Desenvolvimento (Desacoplamento Tático / Método F1)

Adotaremos uma separação rigorosa durante o desenvolvimento:

*   **Pista 1 (Frontend):** Desenvolvimento isolado utilizando Vite. A API do OCS será "mockada" através de arquivos estáticos JSON na pasta `public/` e um wrapper de fetch que intercepta as chamadas locais, permitindo iteração de UI em milissegundos sem depender do backend. O Vite atuará apenas como bundler para gerar o asset final.
*   **Pista 2 (Backend):** Desenvolvimento guiado por testes (TDD). Toda a lógica PHP e SQL deve ser validada por testes unitários via PHPUnit, utilizando banco de dados SQLite em memória para simular o MariaDB e as tabelas nativas do OCS antes de escrever a lógica real.

## 4. Estrutura de Diretórios do Plugin (Padrão OCS)

O pacote final gerado deve possuir a seguinte árvore:

```
/
├── setup.php                   # Registro do plugin, versão e injeção no menu
├── install.sql                 # Criação das tabelas (plugin_maps, plugin_map_assets, plugin_map_revisions)
├── uninstall.sql               # Limpeza
├── /require/MapEngine.php      # Lógica de negócio e queries PDO
├── /ajax/                      # Endpoints da API interna (get_map.php, batch_update_assets.php, etc)
└── /assets/
    ├── /css/floorplan.css      # Estilização que herda e complementa o CSS do OCS
    └── /js/map-bundle.js       # Build compilado do Vite (Konva.js)
```

## 5. Regras de Ouro do Frontend (Konva.js)

1.  **Isolamento de Camadas:** Usar camadas separadas para objetos estáticos (paredes/portas com `listening: false` para performance), ativos (PCs, impressoras) e overlays (tooltips).
2.  **Desempenho (60 FPS):** Atualizações visuais ocorrem na memória local do navegador instantaneamente.
3.  **Snap to Grid e Salvamento Explícito (Batch Save):** Todo drag-and-drop de ativos deve alinhar a uma grade invisível (ex: 20px). Para garantir a integridade do inventário e evitar acidentes corporativos, a interface NÃO terá autosave. O mapa deve possuir um "Modo de Edição" (que ativa o draggable). As movimentações ocorrerão apenas no Canvas local. Para efetivar as mudanças, o usuário deverá clicar em um botão "Salvar", que disparará uma única requisição fetch enviando o payload em lote (batch) para a API.
4.  **Agrupamento:** Elementos aninhados (ex: PC em cima de uma mesa) usam herança de `Konva.Group` para manter posições relativas.

## 6. Auditoria e Versionamento (Time Travel)

Para garantir a rastreabilidade (compliance) das operações de TI, o sistema deve manter um histórico imutável das alterações nas plantas baixas.

*   **Tabela `plugin_map_revisions`:** O `install.sql` deve criar esta tabela contendo `id` (PK), `map_id` (FK), `user_id` (VARCHAR, usuário logado no OCS), `created_at` (DATETIME) e `map_snapshot` (JSON).
*   **Gatilho de Snapshot:** Toda vez que o endpoint de salvamento em lote for chamado e efetivar as mudanças na tabela de ativos, ele deve obrigatoriamente pegar o estado final daquele mapa e inserir uma nova linha na tabela de revisões.
