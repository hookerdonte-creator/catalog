/**
 * UI Script: RoleTrainingValidation
 * Global: true   (must be global so it also loads in Service Portal/Catalog Builder)
 * Client callable: false
 *
 * Shared helper used by the catalog client scripts below so the
 * MRVS-parsing / GlideAjax / form-update logic lives in one place instead of
 * being duplicated across every client script.
 */
var RoleTrainingValidation = (function() {

    var ROLE_ROW_VARIABLE = 'business_role';          // variable inside the MRVS row
    var REQUIRED_TRAININGS_VARIABLE = 'required_trainings'; // main form, read-only multi-line text
    var TRAININGS_COMPLETE_VARIABLE = 'trainings_complete'; // main form, hidden flag: 'true' | 'false' | 'pending'

    function parseRoles(mrvsValue) {
        var roles = [];
        if (!mrvsValue) {
            return roles;
        }
        try {
            var rows = JSON.parse(mrvsValue);
            rows.forEach(function(row) {
                var role = row[ROLE_ROW_VARIABLE];
                if (role && roles.indexOf(role) === -1) {
                    roles.push(role);
                }
            });
        } catch (e) {
            // malformed/empty MRVS value - treat as no roles selected
        }
        return roles;
    }

    function formatRequiredByRole(requiredByRole) {
        var lines = [];
        Object.keys(requiredByRole).forEach(function(role) {
            lines.push(role + ':');
            requiredByRole[role].forEach(function(training) {
                lines.push('  - ' + training);
            });
        });
        return lines.join('\n');
    }

    /**
     * @param g_form            the catalog item's GlideForm
     * @param mrvsValue         current JSON string value of the business role MRVS variable
     * @param requestedForSysId sys_id of the "Requested For" user, or blank/undefined to use the logged in user
     * @param callback          optional function(allTrainingsComplete)
     */
    function run(g_form, mrvsValue, requestedForSysId, callback) {
        var roles = parseRoles(mrvsValue);

        if (roles.length === 0) {
            g_form.setValue(REQUIRED_TRAININGS_VARIABLE, '');
            g_form.setValue(TRAININGS_COMPLETE_VARIABLE, 'true');
            g_form.hideFieldMsg(REQUIRED_TRAININGS_VARIABLE, true);
            if (callback) {
                callback(true);
            }
            return;
        }

        // Mark as pending until the async call resolves so onSubmit can
        // block submission if the user clicks Submit before this returns.
        g_form.setValue(TRAININGS_COMPLETE_VARIABLE, 'pending');

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

            g_form.setValue(REQUIRED_TRAININGS_VARIABLE, formatRequiredByRole(result.requiredByRole || {}));

            if (result.complete) {
                g_form.setValue(TRAININGS_COMPLETE_VARIABLE, 'true');
                g_form.hideFieldMsg(REQUIRED_TRAININGS_VARIABLE, true);
            } else {
                g_form.setValue(TRAININGS_COMPLETE_VARIABLE, 'false');
                g_form.showFieldMsg(
                    REQUIRED_TRAININGS_VARIABLE,
                    'The following required trainings are not yet complete: ' + result.missing.join(', '),
                    'error'
                );
            }

            if (callback) {
                callback(!!result.complete);
            }
        });
    }

    return {
        run: run,
        REQUIRED_TRAININGS_VARIABLE: REQUIRED_TRAININGS_VARIABLE,
        TRAININGS_COMPLETE_VARIABLE: TRAININGS_COMPLETE_VARIABLE
    };
})();
