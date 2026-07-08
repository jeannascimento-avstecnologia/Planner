# Centro de Ajuda

## Objetivo

Pagina `/help` com guia de uso de todas as areas do Planner. Link na sidebar (icone `?`, rodape acima de Configuracoes).

## Rotas

- `/help` — indice + secoes expansiveis por categoria.

## Componentes

- `apps/web/app/(app)/help/page.tsx`
- `apps/web/components/help/help-center.tsx`
- `apps/web/lib/help-content.ts` — copy estatico (fonte de verdade)
- `apps/web/components/shell/app-sidebar.tsx` — link Ajuda

## Categorias (v1)

1. **Inicio e projetos** — Home, Projetos, Kanban, Dashboard
2. **Planejamento** — Calendario, Meu plano, Carga (badge Gestor)
3. **Configuracoes** — Hub, Membros, Convites, Geral
4. **Administracao** — Integracoes, Auditoria, Permissoes (badge Admin)
5. **Conta** — Organizacoes, Perfil, Senha

## UI

- `PlanningPageHeader` + icone `CircleHelp`
- Grid desktop: indice ancora sticky + `<details>` por secao
- Badge informativo de papel (Admin/Gestor) — nao oculta conteudo
- CTA "Abrir pagina" quando `href` definido
- `data-testid="help-center"`, `help-section-{id}`

## Sidebar

- Rodape, **acima** de Configuracoes
- Colapsada: so icone com `title="Ajuda"`

## Nao-objetivos

- CMS ou conteudo editavel em runtime
- Queries Supabase na pagina

## Criterios de aceite

- [ ] Link "Ajuda" visivel na sidebar acima de "Configuracoes"
- [ ] `/help` renderiza 5 categorias e >= 15 secoes
- [ ] Secoes Calendario, Plano e Configuracoes presentes
- [ ] Link "Abrir pagina" do Calendario aponta para `/calendar`
- [ ] Topbar exibe titulo "Ajuda"
- [ ] E2E `help-center.spec.ts` verde

## Matriz Spec → Codigo → Teste

| Requisito | Codigo | Teste |
|-----------|--------|-------|
| Conteudo | `lib/help-content.ts` | snapshot manual |
| UI | `help-center.tsx` | `help-center.spec.ts` |
| Rota | `help/page.tsx` | E2E navegacao |
| Sidebar | `app-sidebar.tsx` | E2E ordem footer |
