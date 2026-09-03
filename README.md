# Guia da Zen

PWA React + TypeScript + Vite para hóspedes e administradores da Zen. Integra **Stays** (reservas), **Firebase** (auth, Firestore, Storage, Functions, Hosting) e **Pagar.me** (pagamentos de serviços).

**Produção:** https://emerson-1e6d2.web.app  
**Firebase:** `emerson-1e6d2`

## Pré-requisitos

- Node.js 18+ ou 20+
- Conta Firebase com acesso ao projeto
- Credenciais Stays (App Center → External API) para login de hóspede

## Setup local

```bash
cp .env.example .env
# Preencha VITE_STAYS_* para login hóspede em dev (ver comentários no .env.example)

npm install
npm run dev          # frontend (porta 5173)
npm run dev:full     # frontend + emulador Functions
```

### Login em desenvolvimento

| Perfil | Como entrar |
|--------|-------------|
| **Hóspede (demo)** | Código `demo` — dados fictícios, sem Stays |
| **Hóspede (Stays)** | Código de reserva ativo (ex. `IZ07J`) ou URL `?reserve=IU08J` |
| **Admin** | E-mail/senha Firebase Auth (ex. `user@teste.com`) |

Links úteis:

- Login com código pré-preenchido: `/login?reserve=IU08J`
- Magic link hóspede: `/entrar/:reservationCode`
- Termos / Privacidade: `/termos`, `/privacidade` (públicos, sem login)

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Vite dev server |
| `npm run dev:full` | Dev + Firebase Functions emulator |
| `npm test` | Testes Vitest |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run firebase:deploy:prod` | Deploy hosting + rules + functions (script completo) |
| `npm run firebase:deploy:hosting` | Só hosting |

## Variáveis de ambiente

Ver `.env.example` (frontend) e `functions/.env.example` (servidor).

- **Stays:** `VITE_STAYS_*` em dev; em prod o frontend usa `/api/stays` (Cloud Function) com `STAYS_*` no servidor.
- **WhatsApp suporte:** `VITE_ZEN_SUPPORT_WHATSAPP` (só dígitos com DDI).
- **Pagar.me:** `VITE_PAGARME_PUBLIC_KEY` + `PAGARME_SECRET_KEY` nas Functions.

## Estrutura principal

```
src/
  pages/          # Telas hóspede + admin
  routes/         # AppRoutes, ProtectedRoute, paths
  services/       # Stays, auth, Firestore
  contexts/       # AuthContext
  locales/        # PT / EN (i18next)
functions/        # Cloud Functions (proxy Stays, Pagar.me)
firestore.rules   # Regras Firestore
storage.rules     # Regras Storage (fotos curadoria)
```

## Deploy

```bash
npm run build
npm run firebase:deploy:prod
```

Documentação adicional: `docs/PAGARME_SETUP.md`, `docs/DEVELOPMENT.md`.

## Testes

```bash
npm test
```

Cobertura inclui validação Stays, mapeamento de reservas, parse de URL/código de reserva e regras de acesso.
