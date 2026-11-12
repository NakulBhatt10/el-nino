<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- NEXUS data layer lives in `src/lib/nexus/` as plain TS (no React): seeded generators, the baseline risk scorer, alerts and analytics; pages only render it. Why: one source of truth that tests and future model backends can share.
- Real model backends plug in through `src/lib/nexus/model-adapter.ts` (`RiskModelAdapter`); keep UI code calling adapters/scorers rather than inline maths. Why: STGNN/Transformer can replace the baseline without UI changes.
- Leaflet is only imported dynamically inside `WardMap`'s effect, and the 3D scene is lazy-loaded on an `ssr: false` route. Why: both touch browser globals and must not run during SSR.
- Map/3D/PDF colours come from `src/lib/nexus/palette.ts` (mirrors the `--risk-*` CSS tokens) because canvas/WebGL cannot read CSS variables.
- tsconfig keeps `strict` but disables `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature` and `exactOptionalPropertyTypes`. Why: index-heavy ward/time-series code otherwise needs non-null assertions everywhere.
- Client preferences (thresholds, alert statuses, completed actions) persist in localStorage via `src/lib/nexus/store.ts`; no backend is connected.
