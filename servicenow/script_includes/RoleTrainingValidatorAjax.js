/**
 * Script Include: RoleTrainingValidatorAjax
 * Type: Client callable
 * Extends: AbstractAjaxProcessor
 *
 * Looks up the trainings required for one or more Business Roles and checks
 * which of those trainings a given user has already completed.
 *
 * ASSUMPTION (verify against the real instance schema before go-live):
 * the field used to identify a specific training/curriculum is not given in
 * the requirements, so both tables are assumed to share a "u_curriculum"
 * field. Update CURRICULUM_TRAINING_FIELD / COMPLETION_TRAINING_FIELD below
 * if the actual field names differ. Likewise COMPLETION_USER_FIELD assumes a
 * reference field named "u_user" on u_nvlearn_sap_trainning_data - update if
 * the instance uses a different field (e.g. a string employee/user id).
 */
var RoleTrainingValidatorAjax = Class.create();
RoleTrainingValidatorAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    CURRICULUM_TABLE: 'u_sap_role_to_curriculum',
    CURRICULUM_ROLE_FIELD: 'u_business_role',
    CURRICULUM_TRAINING_FIELD: 'u_curriculum',

    COMPLETION_TABLE: 'u_nvlearn_sap_trainning_data',
    COMPLETION_USER_FIELD: 'u_user',
    COMPLETION_STATE_FIELD: 'state',
    COMPLETION_STATE_VALUE: 'Complete',
    COMPLETION_TRAINING_FIELD: 'u_curriculum',

    /**
     * Ajax entry point.
     * Params:
     *   sysparm_business_roles - comma separated list of selected business roles
     *   sysparm_user_id        - sys_id of the user to validate completions for.
     *                            Falls back to the logged in user when omitted/blank,
     *                            which covers the "Requested For" empty case.
     * Returns JSON:
     *   {
     *     requiredByRole: { <role>: [<training>, ...] },
     *     completed: [<training>, ...],
     *     missing: [<training>, ...],
     *     complete: <boolean>
     *   }
     */
    getTrainingStatus: function() {
        var rolesParam = this.getParameter('sysparm_business_roles') || '';
        var userSysId = this.getParameter('sysparm_user_id') || gs.getUserID();

        var businessRoles = rolesParam.split(',')
            .map(function(r) { return r.trim(); })
            .filter(function(r, i, arr) { return r && arr.indexOf(r) === i; });

        var requiredByRole = this._getRequiredTrainings(businessRoles);

        var allRequired = [];
        for (var role in requiredByRole) {
            requiredByRole[role].forEach(function(training) {
                if (allRequired.indexOf(training) === -1) {
                    allRequired.push(training);
                }
            });
        }

        var completed = this._getCompletedTrainings(userSysId);
        var missing;

        if (completed.length === 0) {
            // No completed-training records at all for this user means none
            // of the required trainings can be considered done, regardless
            // of how the training names would otherwise line up.
            missing = allRequired.slice();
        } else {
            var completedNormalized = completed.map(this._normalize);
            missing = allRequired.filter(function(training) {
                return completedNormalized.indexOf(this._normalize(training)) === -1;
            }, this);
        }

        var result = {
            requiredByRole: requiredByRole,
            completed: completed,
            missing: missing,
            complete: missing.length === 0
        };

        return JSON.stringify(result);
    },

    _getRequiredTrainings: function(businessRoles) {
        var requiredByRole = {};
        if (!businessRoles.length) {
            return requiredByRole;
        }

        var gr = new GlideRecord(this.CURRICULUM_TABLE);
        gr.addQuery(this.CURRICULUM_ROLE_FIELD, 'IN', businessRoles.join(','));
        gr.query();
        while (gr.next()) {
            var role = gr.getDisplayValue(this.CURRICULUM_ROLE_FIELD);
            var training = gr.getDisplayValue(this.CURRICULUM_TRAINING_FIELD);
            if (!role || !training) {
                continue;
            }
            if (!requiredByRole[role]) {
                requiredByRole[role] = [];
            }
            if (requiredByRole[role].indexOf(training) === -1) {
                requiredByRole[role].push(training);
            }
        }
        return requiredByRole;
    },

    _getCompletedTrainings: function(userSysId) {
        var completed = [];
        if (!userSysId) {
            return completed;
        }

        var gr = new GlideRecord(this.COMPLETION_TABLE);
        gr.addQuery(this.COMPLETION_USER_FIELD, userSysId);
        gr.addQuery(this.COMPLETION_STATE_FIELD, this.COMPLETION_STATE_VALUE);
        gr.query();
        while (gr.next()) {
            var training = gr.getDisplayValue(this.COMPLETION_TRAINING_FIELD);
            if (training && completed.indexOf(training) === -1) {
                completed.push(training);
            }
        }
        return completed;
    },

    _normalize: function(value) {
        return (value || '').trim().toLowerCase();
    },

    type: 'RoleTrainingValidatorAjax'
});
