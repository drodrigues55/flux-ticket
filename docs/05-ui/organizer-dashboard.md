# Organizer Dashboard UI (apps/dashboard)

## Layout

A dashboard do organizador utiliza layout horizontal com:

1. **Header Superior (fixo, h-14):** Logo "Flux Tickets" à esquerda, campo de busca global centralizado, notificações (badge com indicador) e avatar do organizador à direita. Altura compacta de uma única linha.

2. **Navegação Horizontal (sticky abaixo do header):** Abas com ícones Lucide React:
   - Dashboard · Eventos · Ingressos · Check-in · Participantes · Marketing · Financeiro · Relatórios · Configurações
   - Aba ativa com `border-bottom` na cor `--accent` (`#FF3200`)
   - Sem sidebar lateral

3. **Conteúdo:** Renderizado abaixo da nav com padding `px-6 py-6`.

## Página principal (Dashboard analítica)

### Barra de filtros
- Seletor de evento ativo
- Seletor de período (Hoje / 7 dias / 30 dias / Personalizado) — pills toggle
- Filtro de status (Todos / À venda / Encerrado)
- Indicador "Ao vivo" com badge pulsante `#FF3200`

### KPIs (4 cards em grid)
- **Faturamento bruto** (R$) com variação % e ícone `DollarSign`
- **Ingressos vendidos** (qtd) com variação % e ícone `Ticket`
- **Ticket médio** (R$) com variação % e ícone `TrendingUp`
- **Taxa de conversão** (%) com variação % e ícone `Target`
- Cada card com ícone, valor grande em `Inter tabular-nums`, badge verde (↑) ou vermelho (↓)

### Gráfico de vendas
- Recharts `AreaChart` com gradiente sutil laranja (`#FF3200` 12% → transparente)
- Eixo X: datas (DayJS), Eixo Y: R$ (formato compactado `Xk`)
- Tooltip customizado no tema claro
- Responsivo com `ResponsiveContainer`

### Grid de conteúdo (2 colunas)
- **Coluna esquerda (3/5):** Tabela "Vendas recentes" com avatar iniciais, nome do comprador, lote, evento, status badge (Aprovado/Portaria/Pendente), horário e valor
- **Coluna direita (2/5):** "Ingressos por lote" com barras de progresso horizontais mostrando estoque vs vendido, percentual e preço

### Ações rápidas
- 4 botões em grid: Criar evento, Novo lote, Exportar relatório, Pausar vendas
- Estilo: fundo branco, borda `#EAEAEA`, ícone + label, hover accent

### Controles de operação (pânico)
- Slider de throttle (10–1000 checkouts simultâneos)
- Botão de pausa global com estado visual pulsante quando ativo
- Indicador de checkouts ativos e timestamp de última atualização
