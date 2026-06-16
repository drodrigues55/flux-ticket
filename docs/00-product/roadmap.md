# MVP Roadmap (Roadmap de Entregas)

## Sprint 1: Fundação & Autenticação
- Setup do Monorepo, Docker e banco de dados relacional.
- Estruturação do NestJS e Next.js.
- Cadastro e login de usuários (JWT).

## Sprint 2: Core Domain & Eventos
- Cadastro de eventos, locais (venues) e lotes de ingressos.
- Filtro e busca de eventos no portal público.

## Sprint 3: Engine de Concorrência & Reserva
- Implementação de decremento atômico de cotas no Redis (scripts Lua).
- Lógica de expiração temporária de reserva (locks de checkout).

## Sprint 4: Checkout, Pagamento & Wallet
- Integração com provedor de pagamento.
- Emissão de ingressos e geração de assinaturas HMAC.
- Integração com Apple e Google Wallet.

## Sprint 5: PWA Staff & Auditoria
- PWA offline com IndexedDB para controle de acesso.
- Painel de telemetria e relatórios para organizadores.
