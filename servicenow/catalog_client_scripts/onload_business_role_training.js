/**
 * Catalog Client Script: "Business Role Training - onLoad"
 * Type: onLoad
 * Applies on: Catalog Item (the item/record producer containing the MRVS)
 * Variable: (none - onLoad scripts don't target a variable)
 * UI Type: All
 *
 * Computes required/completed trainings for whatever business roles are
 * pre-populated on load (e.g. when reopening a draft) so the main form
 * variables and submit gate are correct before the user touches anything.
 */
function onLoad() {
    var mrvsValue = g_form.getValue('business_roles');   // the MRVS variable on the main form
    var requestedFor = g_form.getValue('requested_for'); // blank => script include falls back to logged in user

    RoleTrainingValidation.run(g_form, mrvsValue, requestedFor);
}
