/**
 * Catalog Client Script: "Business Role Training - onChange (MRVS)"
 * Type: onChange
 * Applies on: Catalog Item (the item/record producer containing the MRVS)
 * Variable: business_roles   <- the Multi Row Variable Set variable itself
 * UI Type: All
 * Isolate script: false (needs the global RoleTrainingValidation UI Script)
 *
 * The MRVS variable's value is a JSON array of row objects (one per row,
 * each containing a "business_role" property). ServiceNow fires this
 * onChange whenever a row is added, removed, or edited, with newValue set
 * to the updated JSON string - that's what we parse to recompute the
 * required/completed trainings every time the roles change.
 */
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading) {
        return;
    }

    var requestedFor = g_form.getValue('requested_for');
    RoleTrainingValidation.run(g_form, newValue, requestedFor);
}
