-- reserve_ticket.lua
-- KEYS[1] = available_tickets_key (e.g., "event:{eventId}:available_tickets")
-- KEYS[2] = reservation_lock_key (e.g., "reservation:{userId}:{ticketId}")
--
-- ARGV[1] = requested_amount (default: 1)
-- ARGV[2] = ttl_seconds (default: 180)

local available_tickets_key = KEYS[1]
local reservation_lock_key = KEYS[2]
local requested_amount = tonumber(ARGV[1]) or 1
local ttl_seconds = tonumber(ARGV[2]) or 180

-- Obter estoque disponível
local current_available = tonumber(redis.call("GET", available_tickets_key) or "0")

if current_available >= requested_amount then
    -- Decrementar estoque
    redis.call("DECRBY", available_tickets_key, requested_amount)
    
    -- Criar lock temporário
    redis.call("SET", reservation_lock_key, requested_amount, "EX", ttl_seconds)
    
    return 1 -- Sucesso
else
    return 0 -- Falha por insuficiência de estoque
end
