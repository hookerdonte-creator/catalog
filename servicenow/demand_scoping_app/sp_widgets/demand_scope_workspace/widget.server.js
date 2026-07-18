/**
 * Service Portal Widget Server Script: "Demand Scope Workspace"
 * Widget id: demand_scope_workspace
 *
 * Two-mode widget:
 *  - mode "wizard"  - the demand hasn't been scoped (or the user asked to
 *    rescope): renders the configurable criteria questionnaire.
 *  - mode "summary" - the demand already has a "scoped" project scope:
 *    renders the t-shirt size, resource plan and high-level Gantt.
 *
 * The demand is identified by, in priority order: the widget instance
 * option `demand_sys_id`, then the `sysparm_demand` URL parameter (how the
 * "Scope This Demand" UI Action on dm_demand opens this page).
 *
 * input.action:
 *  - "submit_scope" - input.responses (array) + input.start_date ("yyyy-MM-dd")
 *    -> calls DemandScopeOrchestrator.submitScope, switches to summary mode.
 *  - "rescope"       -> switches back to wizard mode, pre-filled with the
 *    demand's existing answers.
 *  - (none)          -> initial load; shows summary if already scoped,
 *    otherwise the wizard.
 */
(function() {
    var orchestrator = new DemandScopeOrchestrator();
    var criteriaEngine = new ScopeCriteriaEngine();

    var demandSysId = options.demand_sys_id || $sp.getParameter('sysparm_demand') || '';
    data.demand_sys_id = demandSysId;

    if (!demandSysId) {
        data.error = 'No demand was specified. Open this page from the "Scope This Demand" button on a demand record.';
        return;
    }

    var demandGr = new GlideRecord('dm_demand');
    if (!demandGr.get(demandSysId)) {
        data.error = 'Demand not found.';
        return;
    }

    data.demand = {
        sys_id: demandGr.getUniqueValue(),
        number: demandGr.getValue('number'),
        short_description: demandGr.getValue('short_description')
    };

    if (input && input.action == 'submit_scope') {
        try {
            data.summary = orchestrator.submitScope(demandSysId, input.responses || [], input.start_date);
            data.mode = 'summary';
        } catch (e) {
            data.error = e.message;
            data.mode = 'wizard';
            data.criteria = criteriaEngine.getActiveCriteria();
            data.existing_responses = orchestrator.getExistingResponses(demandSysId);
        }
        return;
    }

    if (input && input.action == 'rescope') {
        data.mode = 'wizard';
        data.criteria = criteriaEngine.getActiveCriteria();
        data.existing_responses = orchestrator.getExistingResponses(demandSysId);
        return;
    }

    var existingSummary = orchestrator.getScopeSummary(demandSysId);
    if (existingSummary) {
        data.mode = 'summary';
        data.summary = existingSummary;
    } else {
        data.mode = 'wizard';
        data.criteria = criteriaEngine.getActiveCriteria();
        data.existing_responses = {};
    }
})();
