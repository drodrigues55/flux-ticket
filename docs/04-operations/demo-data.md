# Demo Data

Configuration of baseline mock demo data for testing RC1.

## Demo Organization
- **Name**: Flux Demo Ltda.
- **CNPJ**: 12.345.678/0001-90

## Demo Users and Roles
- **Owner**: `owner@flux.com`
- **Finance**: `finance@flux.com`
- **Event Manager**: `manager@flux.com`

## Demo Event States
- **Draft Event**: "Encontro Tecnológico de Software" (has incomplete publishing checklist fields).
- **Published Event**: "Concerto Anual ao Vivo" (fully published, online sales active).
- **Sold Out Event**: "Grand Prix VIP" (capacity exceeded).

## Demo Ticket Types & Batches
- **General Admission**: Price 100.0, available.
- **VIP Early Bird**: Price 250.0, sold out.

## Seed and Reset Instructions
To reset the local developer database with these demo records, run:
```bash
npx prisma db seed
```

> [!WARNING]
> - Never use real personal emails or phone numbers in seeds.
> - Never store real passwords or tokens in defaults.
