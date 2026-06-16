# Concurrency Engine (Motor de Concorrência Redis)

Para evitar overbooking em eventos de altíssima demanda, a gestão de cotas de ingressos é delegada integralmente a um motor em memória no **Redis**.

## Lógica de Decremento Atômico (Lua Scripts)
Durante o checkout, a cota de ingressos é diminuída no Redis de forma atômica através do script Lua `reserve_ticket.lua`. Isso impede condições de corrida (*race conditions*):
```lua
local stock_key = KEYS[1]
local lock_key = KEYS[2]
local quantity = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current_stock = tonumber(redis.call('get', stock_key) or "0")
if current_stock >= quantity then
    redis.call('decrby', stock_key, quantity)
    redis.call('set', lock_key, quantity, 'EX', ttl)
    return 1 -- Sucesso
else
    return 0 -- Esgotado
end
```

## Reserva Temporária (Locks)
- **TTL Padrão:** O lote é reservado no Redis por 180 segundos (3 minutos).
- **Heartbeat de Renovação:** O frontend atualiza a validade do lock a cada 50 segundos chamando `/api/tickets/renew-lock` para evitar que a sessão expire se o usuário estiver preenchendo os dados do cartão.
- **Rollback / Compensação:** Se o pagamento falhar ou o tempo expirar, a cota é devolvida instantaneamente ao estoque do Redis (`releaseTicketLock`).
