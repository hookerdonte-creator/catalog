/**
 * Catalog Client Script: "Business Role Training - onSubmit"
 * Type: onSubmit
 * Applies on: Catalog Item
 * UI Type: All
 *
 * Blocks submission unless every training required for the selected
 * business role(s) has been completed by the Requested For user (or the
 * logged in user when Requested For is blank). Relies on the
 * "trainings_complete" hidden variable kept up to date by the onLoad/onChange
 * scripts that call RoleTrainingValidation.run().
 */
function onSubmit() {
    var status = g_form.getValue('trainings_complete');

    if (status === 'pending') {
        g_form.addErrorMessage('Still validating required trainings for the selected business role(s). Please wait a moment and click Submit again.');
        return false;
    }

    if (status === 'false') {
        g_form.addErrorMessage('This request cannot be submitted until all required trainings for the selected business role(s) are complete.');
        return false;
    }

    return true;
}
