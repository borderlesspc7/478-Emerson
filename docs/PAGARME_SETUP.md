# Configuração Pagar.me — Guia da Zen

Backend em **Firebase Cloud Functions** (`functions/`). Hosting Firebase reencaminha `/api/pagarme/*` e `/api/stays/*`.

## 1. Chaves Pagar.me

1. [dash.pagar.me](https://dash.pagar.me) → **Configurações** → **Chaves de API**
2. `PAGARME_SECRET_KEY` → `functions/.env` (local) e Firebase Console → Functions → variáveis (prod)
3. `VITE_PAGARME_PUBLIC_KEY` → `.env` na raiz (build Vite)

## 2. Domínio autorizado (cartão)

Dashboard Pagar.me → **Domínios**: `http://localhost:5173` e o domínio Firebase Hosting.

## 3. Webhook (PIX em produção)

URL: `https://SEU-DOMINIO.web.app/api/pagarme/webhook` (ou domínio customizado)

Variáveis opcionais: `PAGARME_WEBHOOK_USER`, `PAGARME_WEBHOOK_PASSWORD`

## 4. Variáveis

| Variável | Onde |
|----------|------|
| `PAGARME_SECRET_KEY` | `functions/.env` + Firebase Console |
| `VITE_PAGARME_PUBLIC_KEY` | `.env` raiz (rebuild após alterar) |
| `STAYS_BASE_URL`, `STAYS_LOGIN`, `STAYS_PASSWORD` | `functions/.env` + Firebase Console |
| `GOOGLE_APPLICATION_CREDENTIALS` | `functions/.env` (só dev local, se necessário) |

## 5. Desenvolvimento local

1. Copie `functions/.env.example` → `functions/.env` e preencha (incl. `PAGARME_SECRET_KEY`, `STAYS_*`).
2. Instale dependências:
   ```bash
   npm install
   cd functions && npm install && npm run build && cd ..
   ```
3. **Opção A — dois terminais:**
   ```bash
   npm run dev:api    # emulador Functions :5001
   npm run dev        # Vite :5173
   ```
4. **Opção B — um comando:**
   ```bash
   npm run dev:full
   ```
5. O Vite reencaminha `/api/pagarme/*` → emulador (`southamerica-east1/pagarmeApi`).

## 6. Deploy

```bash
npm run build
firebase deploy --only functions,hosting
```

Configure as variáveis de ambiente das Functions no Firebase Console antes do primeiro deploy de pagamentos.

## 7. Testes sandbox

- **Cartão:** `4000000000000010`, validade futura, CVV `123` — [simulador](https://docs.pagar.me/docs/simulador-de-cart%C3%A3o-de-cr%C3%A9dito)
- **PIX:** gera QR na app; confirma no sandbox Pagar.me ou via webhook

## 8. Fluxo

1. Hóspede → **Pagar** no serviço
2. Cloud Function `pagarmeApi` cria ordem na API v5
3. Pagamento confirmado → `serviceRequests` com `status: pending`
4. Admin vê em **Pedidos de serviços**

```bash
npm run firebase:deploy:firestore-rules
```
