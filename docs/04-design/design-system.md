# Design System

Documentação de diretrizes visuais do produto baseada no arquivo `design.md`.

## Tipografia Principal
- **Fonte:** Inter
```css
font-family: "Inter", system-ui, sans-serif;
```
- **Numerais:** Usar Inter com `font-variant-numeric: tabular-nums` em todas as métricas financeiras e contadores. A classe `.font-mono` é sobrescrita no CSS global para usar Inter ao invés de monospace do browser.
- **Caixa alta:** Não utilizar `uppercase` em frases ou textos completos. Caixa alta é permitida somente em abreviações e termos técnicos (ex: KPI, SLA, CPF, VIP).

## Cores Principais (Neutral Palette)
```css
--white: #FFFFFF;

--gray-50: #FAFAFA;
--gray-100: #F5F5F5;
--gray-200: #EAEAEA;
--gray-300: #DCDCDC;
--gray-400: #B5B5B5;
--gray-500: #8A8A8A;
--gray-600: #666666;
--gray-700: #4A4A4A;
--gray-800: #2D2D2D;
--gray-900: #111111;
```

## Accent Color (Apenas para CTAs e Destaques Importantes)
```css
--accent: #FF3200;
--accent-hover: #E62D00;
--accent-active: #CC2800;
```

## Semantic Colors
```css
--success: #16A34A;
--warning: #F59E0B;
--danger: #DC2626;
--info: #2563EB;
```

## Border Radius
- `sm:` 6px
- `md:` 10px
- `lg:` 14px
- `xl:` 20px

## Componentes de Dashboard

### KPI Card
- Fundo branco, borda `--gray-200`, radius `xl` (20px)
- Ícone em container `--gray-100` (hover → `--accent/5`)
- Badge de variação: verde `emerald-50/600` para positivo, vermelho `red-50/500` para negativo
- Valor principal em `Inter tabular-nums`, peso bold, tamanho `xl`

### Barra de Filtros
- Pills de período em container `--gray-100` com item ativo em fundo branco + sombra
- Selects nativos estilizados com ícone `ChevronDown` posicionado absoluto

### Nav Tabs (Horizontal)
- Aba ativa: `border-bottom: 2px solid var(--accent)` + `color: var(--accent)`
- Aba inativa: `border-bottom: transparent` + `color: var(--gray-600)`
- Ícones Lucide React 16×16px ao lado do label

### Gráficos (Recharts)
- Área com gradiente: `--accent` 12% → transparente
- Grid com `strokeDasharray: 3 3` e cor `--gray-200`
- Tooltip customizado: fundo branco, borda `--gray-200`, sombra `lg`
