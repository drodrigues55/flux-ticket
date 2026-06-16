# Segurança, JWT e Criptografia

## Controle de Acesso
- **Autenticação:** Baseada em JWT com tokens de curta duração (Access Token) e tokens de renovação (Refresh Token) persistidos com HttpOnly cookies.
- **Autorização (RBAC):** Proteção de rotas separando acessos administrativos (`ORGANIZER`), equipe de portaria (`STAFF`) e consumidores (`USER`).

## Assinatura Criptográfica de Ingressos (HMAC)
Para evitar falsificação ou duplicação de QR Codes de ingressos, cada ticket emitido possui uma assinatura criptográfica **HMAC-SHA256**.
- **Payload:** `ticketId + buyerCpf + eventId + batchId`.
- **Validação Offline:** O Staff PWA armazena a chave secreta de validação e recalcula o hash localmente no celular. Se o hash do QR Code bater com a assinatura gerada, o ingresso é considerado autêntico, mesmo sem conexão de rede.
