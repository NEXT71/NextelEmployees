# Converting a page to the new design

The CSR pages are done and are the reference implementation. Read these before writing anything:
- `Frontend/src/pages/employees/Dashboard.jsx`, `SalesDashboard.jsx`, `SalarySlips.jsx`
- `Frontend/src/components/common/MessageCenter.jsx` (dialog + form example)
- `.superdesign/design-system.md` (tokens, type, layout, copy rules)

## Goal
Restyle the page to the design system. **Keep all behaviour identical**: data fetching, API calls, handlers, state, socket subscriptions, permissions, validation, routing. Change markup, classNames, copy and layout only. If a handler is wired to a button, it must still be wired after.

## Shared building blocks (use these, don't hand-roll)
- `components/layout/AppShell.jsx`: sidebar shell. Props `nav=[{key,label,icon,onClick,active,badge}]`, `user={name,detail}`, `onSignOut`, children.
- `components/admin/AdminShell.jsx`: AppShell preconfigured for admin/HR (sidebar, sign out, Messages dialog). Dashboard sections are `?tab=employees|fines|bonuses|salaries|sales` (`ADMIN_TABS` export).
- `components/ui/Button.jsx`: `variant` primary|secondary|danger|ghost, `size` md|sm|icon, `icon={LucideIcon}`.
- `components/ui/Badge.jsx`: `tone` present|late|absent|shift|neutral; `statusTone(status)` helper.
- `components/ui/Panel.jsx`: default `Panel` (white bordered surface), named `Section` (title + actions + children).
- `components/ui/DataTable.jsx`: `columns=[{key,header,align,render}]`, `rows`, `loading`, `error`, `onRetry`, `empty`, `rowKey`.
- `components/ui/StatGroup.jsx`: one panel holding several figures `items=[{label,value,hint,tone}]`. Use instead of rows of separate stat cards.
- `components/ui/Tabs.jsx`: `Tabs` (underline, page views) and `Segmented` (compact filter switch).
- `components/ui/Field.jsx`: `Field` (label + hint), `Input`, `Select`, `Textarea`.
- `components/ui/Dialog.jsx`: modal with title, description, body, `footer`. Escape and backdrop click close it.
- `components/ui/Alert.jsx`: `tone` error|success|warning, optional `onDismiss`.
- `components/employees/MonthLedger.jsx` exports `formatPKR(amount)` → "PKR 12,500". Use it for all money (no "RS", no "Rs").

## Tokens (Tailwind classes)
`ink` `ink-soft` `muted` `line` `paper` `surface` `shift` `shift-soft` `present(-soft)` `late(-soft)` `absent(-soft)`, `font-condensed`, `shadow-float`. Opacity modifiers work (`bg-ink/40`).

## Hard rules
1. **Never use these class families** — `index.css` has `!important` overrides that repaint them: `text-white`, `text-{slate,gray,blue,cyan,indigo,purple,violet,pink,teal,green,emerald,yellow,amber,orange,red}-*`, `bg-{slate,gray,blue,cyan,indigo,purple,violet,pink,teal,green,emerald,yellow,amber,orange,red,black,white}*`, `border-{white,slate,gray,blue,cyan,indigo,purple,teal}*`, `bg-gradient-*`, `text-transparent`, `backdrop-blur*`. White text = `text-surface`. When you finish a file, it must contain **zero** of these. Check with:
   `grep -nE "(text-white|text-(slate|gray|blue|cyan|indigo|purple|violet|pink|teal|green|emerald|yellow|amber|orange|red)-|bg-(slate|gray|blue|cyan|indigo|purple|violet|pink|teal|green|emerald|yellow|amber|orange|red|black|white)|border-(white|slate|gray|blue|cyan|indigo|purple|teal)|bg-gradient|text-transparent|backdrop-blur)" <file>`
2. No gradients, glass, blur, glow, blobs, pulsing dots, hover lifts, shadows on panels, gradient text.
3. Sentence case. No ALL-CAPS / `uppercase tracking-wider` table headers. No emoji in UI.
4. Status colour only means status: present/approved = present, pending/late/warning = late, absent/rejected/destructive = absent, selected/live = shift. Everything else is ink/muted.
5. Page title: `<h1 className="text-[28px] leading-tight font-semibold text-ink">`, actions to its right. Sections separated by `space-y-8`, titled with `Section`.
6. Tables: use `DataTable`, or match its markup exactly (12px muted sentence-case headers, `divide-line` rows, `tabular-nums`, money right-aligned).
7. Modals: use `Dialog`. Forms: `Field` + `Input/Select/Textarea`. Primary action = `Button` primary, cancel = secondary.
8. Copy: plain verbs ("Save changes", "Add fine", "Approve sale"), errors say what happened and what to do, empty states invite the next action. Keep backend-facing values (status strings, enum values) unchanged — only change what's displayed.
9. Responsive to 360px. Wide tables scroll inside their panel. Grid children that hold tables need `min-w-0` (`Section` already has it).
10. Don't touch `utils/`, `contexts/`, `components/ui/`, `components/layout/`, `AdminShell.jsx`, `index.css`, `tailwind.config.js`, or files outside your assignment. If you think one of those needs a change, say so in your report instead.

## Done means
- File(s) contain zero forbidden classes (rule 1 grep returns nothing).
- `npx eslint --ext .js,.jsx <your files>` (run from `Frontend/`) reports 0 errors and no new warnings.
- Every handler/API call that existed before still exists and is still reachable from the UI.
- Report: files changed, anything you removed or couldn't convert, any behaviour you were unsure about, any pre-existing bugs you noticed (don't fix bugs outside the restyle unless trivial and clearly safe — report them).
