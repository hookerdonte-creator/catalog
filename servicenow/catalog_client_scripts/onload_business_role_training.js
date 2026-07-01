/**
 * Catalog Client Script: "Business Role Training - onLoad"
 * Type: onLoad
 * Applies on: Catalog Item (the item/record producer containing the MRVS)
 * Variable: (none - onLoad scripts don't target a variable)
 * UI Type: All
 *
 * Self-contained on purpose: catalog client scripts can run with
 * "Isolate script" on, and portal/Employee Center rendering doesn't
 * reliably guarantee a separate global UI Script has loaded first, so the
 * validation logic below is duplicated in this script and in
 * onchange_business_roles_mrvs.js / onchange_requested_for.js rather than
 * shared through a UI Script.
 */
function onLoad() {
    var mrvsValue = g_form.getValue('business_roles');   // the MRVS variable on the main form
    var requestedFor = g_form.getValue('requested_for'); // blank => script include falls back to logged in user

    runBusinessRoleTrainingValidation(g_form, mrvsValue, requestedFor);
}

function parseBusinessRoles(mrvsValue) {
    var roles = [];
    if (!mrvsValue) {
        return roles;
    }
    try {
        var rows = JSON.parse(mrvsValue);
        rows.forEach(function(row) {
            var role = row.business_role;
            if (role && roles.indexOf(role) === -1) {
                roles.push(role);
            }
        });
    } catch (e) {
        // malformed/empty MRVS value - treat as no roles selected
    }
    return roles;
}

function formatRequiredTrainingsByRole(requiredByRole) {
    var lines = [];
    Object.keys(requiredByRole).forEach(function(role) {
        lines.push(role + ':');
        requiredByRole[role].forEach(function(training) {
            lines.push('  - ' + training);
        });
    });
    return lines.join('\n');
}

function runBusinessRoleTrainingValidation(g_form, mrvsValue, requestedForSysId) {
    var roles = parseBusinessRoles(mrvsValue);

    if (roles.length === 0) {
        g_form.setValue('required_trainings', '');
        g_form.setValue('trainings_complete', 'true');
        g_form.hideFieldMsg('required_trainings', true);
        return;
    }

    // Mark as pending until the async call resolves so onSubmit can
    // block submission if the user clicks Submit before this returns.
    g_form.setValue('trainings_complete', 'pending');

    var ga = new GlideAjax('RoleTrainingValidatorAjax');
    ga.addParam('sysparm_name', 'getTrainingStatus');
    ga.addParam('sysparm_business_roles', roles.join(','));
    if (requestedForSysId) {
        ga.addParam('sysparm_user_id', requestedForSysId);
    }
    ga.getXMLAnswer(function(answer) {
        var result = { requiredByRole: {}, missing: [], complete: true };
        try {
            result = JSON.parse(answer);
        } catch (e) {
            // treat parse failures as "complete" rather than permanently
            // locking the user out of submission on a client error
        }

        g_form.setValue('required_trainings', formatRequiredTrainingsByRole(result.requiredByRole || {}));

        if (result.complete) {
            g_form.setValue('trainings_complete', 'true');
            g_form.hideFieldMsg('required_trainings', true);
        } else {
            g_form.setValue('trainings_complete', 'false');
            g_form.showFieldMsg(
                'required_trainings',
                'The following required trainings are not yet complete: ' + result.missing.join(', '),
                'error'
            );
        }
    });
}
