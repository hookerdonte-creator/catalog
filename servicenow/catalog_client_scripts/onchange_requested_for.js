/**
 * Catalog Client Script: "Business Role Training - onChange (Requested For)"
 * Type: onChange
 * Applies on: Catalog Item
 * Variable: requested_for
 * UI Type: All
 * Isolate script: false (needs the global RoleTrainingValidation UI Script)
 *
 * Re-validates completed trainings against the newly selected "Requested
 * For" user. If the field is cleared, RoleTrainingValidation.run() falls
 * back to the logged in user (handled server-side in
 * RoleTrainingValidatorAjax.getTrainingStatus).
 */
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading) {
        return;
    }

    var mrvsValue = g_form.getValue('business_roles');
    RoleTrainingValidation.run(g_form, mrvsValue, newValue);
}
