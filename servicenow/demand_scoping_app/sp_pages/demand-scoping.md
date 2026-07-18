# Service Portal Page: demand-scoping

Service Portal pages (`sp_page`) and their widget layout (`sp_instance`/
`sp_container`/`sp_column`/`sp_row`) are Portal Designer records, not files -
create this by hand in **Service Portal > Pages** (or Portal Designer) and
drop the widget into the layout described below.

## Page

- **Page ID**: `demand_scoping`
- **Title**: Scope Demand
- **Short description**: Configurable demand/project scoping workspace
- **Public**: false - require login
- **Roles**: restrict to `x_scope.demand_scoper` (or the roles your
  instance uses for demand managers/PMs), matching the UI Action's role
  restriction in `ui_actions/scope_this_demand.js`

The page takes no URL suffix of its own; it's always opened as
`/sp?id=demand_scoping&sysparm_demand={dm_demand sys_id}` by the
"Scope This Demand" UI Action.

## Layout

Single row, single 12-wide column, containing one instance of the
`demand_scope_workspace` widget with default options (leave
`demand_sys_id` blank so it reads `sysparm_demand` from the URL).

```
Row
└── Column (md=12)
    └── Widget: Demand Scope Workspace (demand_scope_workspace)
```

## Testing the page

1. Open a demand record, click **Scope This Demand** (added by
   `ui_actions/scope_this_demand.js`) - it opens this page in a new tab
   with the demand's sys_id.
2. First visit: the wizard renders (from `fix_scripts/seed_default_scope_config.js`
   seed data, or your own configured criteria). Answer every question,
   pick a start date, submit.
3. Page switches to summary mode: t-shirt size badge, resource plan table,
   and the Gantt view of the generated phase timeline.
4. Reopen the same URL later (or reload) - it should load straight into
   summary mode, since the demand now has a scoped `x_scope_project_scope`
   record.
5. Click **Rescope** to re-answer the questionnaire; submitting again
   replaces the previous phase/resource lines rather than appending to them.
