# Perfil — mudar senha

## Escopo

- Menu do perfil na topbar: Perfil | Mudar senha
- `/profile/password`: senha atual + nova senha + confirmação (2x)
- `signInWithPassword` valida atual → `updateUser({ password })`
- Contas Google-only: mensagem informativa

## Critérios de aceite

- Senhas não coincidem → erro
- Senha atual incorreta → erro
- Sucesso → mensagem de confirmação
