# Desenvolvimento local — Guia da Zen

## Fluxos de autenticação

### Hóspede

1. **Manual:** `/login` → aba Hóspede → código Stays ou colar URL com `?reserve=`
2. **Query param:** `/login?reserve=IU08J` pré-preenche o campo
3. **Magic link:** `/entrar/IZ07J` — login automático
4. **Demo (só dev):** código `demo` — ver `src/lib/devGuestDemo.ts`

A senha do hóspede é gerida internamente (JIT); o utilizador só vê o código da reserva.

### Admin

- `/login?mode=admin` abre directamente a aba Admin
- **Esqueceu a senha?** envia e-mail via Firebase Auth (`sendPasswordResetEmail`)
- Contas admin são e-mail/senha no Firebase Authentication

## Stays sem reserva activa

Em dev, use `demo`. Para testar integração real:

1. Obtenha um código de reserva **activo** no painel Stays
2. Configure `VITE_STAYS_LOGIN`, `VITE_STAYS_PASSWORD`, `VITE_STAYS_BASE_URL` no `.env`
3. Reinicie `npm run dev` após alterar `.env`

**Não use** códigos de imóvel do site Zen (`dn11`, etc.) — use o id curto da reserva (`IZ07J`, `IU08J`).

## Curadoria de imóveis (admin)

1. Login admin → **Imóveis** → clicar num cartão
2. Fotos vão para Firebase Storage; metadados para Firestore
3. Regras em `firestore.rules` e `storage.rules` permitem admin corporativo antes do sync do perfil

## Páginas públicas

Estas rotas **não exigem login**:

- `/termos`, `/privacidade`
- `/login`, `/entrar/:code`
- 404 para URLs desconhecidas

## Screenshots

Capturas de referência em `docs/screenshots/` (settings, legal, admin imóveis, curadoria).

## Problemas comuns

| Sintoma | Causa provável |
|---------|----------------|
| Reserva não encontrada | Código expirado ou código de imóvel em vez de reserva |
| 401 Stays | Credenciais `VITE_STAYS_*` incorrectas ou em falta |
| Fotos não guardam | Permissões Storage/Firestore — ver regras e consola |
| WhatsApp desactivado | `VITE_ZEN_SUPPORT_WHATSAPP` não definido (normal em prod até configurar) |
