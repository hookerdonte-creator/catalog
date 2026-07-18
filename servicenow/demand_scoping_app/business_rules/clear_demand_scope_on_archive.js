/**
 * Business Rule: "Clear Demand Scope On Archive"
 * Table: x_scope_project_scope
 * When: before
 * Insert: false / Update: true
 * Filter condition: state changes to "archived"
 * Order: 100
 *
 * Keeps dm_demand in sync when a scope record is archived directly (list
 * edit, import, admin cleanup) rather than through the "Rescope" flow in
 * the widget - which already overwrites the demand's fields with the new
 * scope via DemandScopeOrchestrator._syncDemand and never goes through
 * this path. Only clears the demand if it is still pointing at *this*
 * scope record, so archiving a stale/superseded scope can't clobber a
 * newer one.
 */
(function executeRule(current, previous /*null when async*/) {

    var demandGr = new GlideRecord('dm_demand');
    if (!demandGr.get(current.getValue('demand'))) {
        return;
    }

    if (demandGr.getValue('u_project_scope') != current.getUniqueValue()) {
        return;
    }

    demandGr.setValue('u_project_scope', '');
    demandGr.setValue('u_t_shirt_size', '');
    demandGr.setValue('u_scoped', false);
    demandGr.update();

})(current, previous);
