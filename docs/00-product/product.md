# 01 - Definição do Produto

## Visão do Negócio
O **Flux Tickets** é uma plataforma moderna e resiliente de descoberta, venda, emissão e validação de ingressos, projetada para suportar eventos de alta concorrência com total segurança e com operação offline simplificada na portaria.

## Público-Alvo & Personas
- **Consumidores:** Buscam descobrir eventos de interesse, comprar ingressos com o menor atrito possível e gerenciar suas credenciais de acesso de forma simples.
- **Organizadores:** Necessitam de controle absoluto sobre lotes, cupons, faturamento em tempo real e relatórios operacionais.
- **Equipe de Portaria (Staff):** Operadores em campo que precisam realizar validação rápida de ingressos (check-in) em locais de alta densidade sem depender de conexão estável de internet.

## Problemas Resolvidos
- Evita overbooking em aberturas de lotes muito concorridos.
- Reduz custos de infraestrutura escalando apenas a camada de cache (Redis) em picos de demanda.
- Permite validação de ingressos offline com segurança contra clonagem de QR Codes.

## Métricas de Sucesso
- **Tempo médio de checkout:** Menos de 2 minutos.
- **Taxa de overbooking:** 0%.
- **Latência de leitura:** < 50ms para catálogo de eventos.
