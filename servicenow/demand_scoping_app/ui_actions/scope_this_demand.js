/**
 * UI Action: "Scope This Demand"
 * Table: dm_demand
 * Form button: true / List banner button: false
 * Client: true
 * Onclick: scopeThisDemand()
 * Condition: current.isValidRecord() && !current.isNewRecord()
 * Order: 100
 * Roles: x_scope.demand_scoper (or whatever role is assigned to
 *   demand managers/PMs in this instance)
 *
 * Opens the Service Portal scoping page for the current demand in a new
 * tab. Adjust the portal path below (/sp is the default Service Portal;
 * change to /<portal-suffix> or Employee Center's path if this instance
 * uses a different portal).
 */
function scopeThisDemand() {
    var portalPath = '/sp?id=demand_scoping&sysparm_demand=' + g_form.getUniqueValue();
    window.open(portalPath, '_blank');
}
