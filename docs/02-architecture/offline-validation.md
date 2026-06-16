# Offline Staff Validation (Validação Offline de Portaria)

O aplicativo **Staff PWA** é projetado para operar em condições de conectividade zero.

## Funcionamento Offline
1. **Sincronização Pré-Evento:** Antes do início das validações, os operadores realizam o download das assinaturas criptográficas dos ingressos válidos do evento para o **IndexedDB** local do navegador.
2. **Scanner e Check-In Local:** A câmera do celular escaneia o QR Code usando a biblioteca ZXing. O aplicativo descriptografa e compara a assinatura HMAC com a base do IndexedDB.
3. **Fila Offline:** Quando um check-in é efetuado com sucesso offline, ele entra em uma fila de sincronização no IndexedDB.
4. **Reconciliação:** Ao detectar sinal de internet, o PWA despacha a fila de check-ins sequencialmente para a API Core. O servidor processa os dados cronologicamente e descarta duplicatas em caso de fraude.
