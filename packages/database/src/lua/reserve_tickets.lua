-- Redis Lua Script: Reserve Tickets Atomically
-- Keys:
-- KEYS[1] = available_tickets_key (e.g., "event:{eventId}:available_tickets")
-- KEYS[2] = reservation_lock_key (e.g., "reservation:{reservationId}")
--
-- Arguments:
-- ARGV[1] = requested_amount (number of tickets to reserve)
-- ARGV[2] = ttl_seconds (reservation time-to-live in seconds)

local available_tickets_key = KEYS[1]
local reservation_lock_key = KEYS[2]
local requested_amount = tonumber(ARGV[1])
local ttl_seconds = tonumber(ARGV[2])

-- Get current available tickets
local current_available = tonumber(redis.call("GET", available_tickets_key) or "0")

-- Check if we have enough tickets
if current_available >= requested_amount then
    -- Decrement available tickets
    redis.call("DECRBY", available_tickets_key, requested_amount)
    
    -- Create the reservation lock with TTL
    -- Value could be the amount reserved, so we know how much to revert if it expires
    redis.call("SET", reservation_lock_key, requested_amount, "EX", ttl_seconds)
    
    -- Return 1 (success)
    return 1
else
    -- Return 0 (failure, insufficient tickets)
    return 0
end
