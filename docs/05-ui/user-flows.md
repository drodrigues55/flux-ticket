# Jornadas de Usuário (User Flows)

## Jornada de Compra
```text
Escolha do Evento → Seleção de Setores e Qtd → Reserva Temporária no Redis (3 min) 
   → Preenchimento de Comprador/Portadores → Pagamento → Confirmação e Emissão
```

## Jornada de Portaria Offline
```text
Download de hashes de acesso no PWA → Operador em campo offline → Scan do QR Code 
   → Validação do HMAC no dispositivo → Registro no IndexedDB → Conexão reestabelecida → Sincronismo
```
