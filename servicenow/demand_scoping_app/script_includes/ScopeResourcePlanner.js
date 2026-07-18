/**
 * Script Include: ScopeResourcePlanner
 * Type: Server-side, not client callable
 *
 * Turns a t-shirt size's resource role template
 * (x_scope_resource_role_template) into concrete resource plan lines
 * (x_scope_resource_plan_line) for one project scope, dated against the
 * phase lines already built by ScopeTimelineEngine.
 *
 * If ServiceNow's PPM Resource Management plugin is active (the
 * `resource_plan` table exists) and a role template names a
 * `resource_group`, this also creates a real resource_plan record so the
 * assignment shows up in native resource management, not just this app's
 * own tables. The exact field set on `resource_plan` varies by ServiceNow
 * version/plugin configuration - `isValidField` guards + try/catch keep a
 * schema mismatch there from blocking the rest of the scope from saving.
 * Verify the field names below (table/document_id/group/start_date/
 * end_date/percentage) against the target instance before go-live.
 */
var ScopeResourcePlanner = Class.create();
ScopeResourcePlanner.prototype = {
    initialize: function() {},

    ROLE_TEMPLATE_TABLE: 'x_scope_resource_role_template',
    RESOURCE_LINE_TABLE: 'x_scope_resource_plan_line',
    PPM_RESOURCE_PLAN_TABLE: 'resource_plan',
    DEMAND_TABLE: 'dm_demand',

    /**
     * Deletes any existing resource plan lines for this scope and rebuilds
     * them from the role template configured for sizeSysId. phaseLines is
     * the array returned by ScopeTimelineEngine.buildPhaseLines - each
     * generated line is dated to match the phase with the same phase_name.
     * Role template rows whose phase_name has no matching phase line
     * (e.g. a template referencing a phase that size doesn't use) are
     * skipped.
     */
    buildResourcePlan: function(projectScopeSysId, sizeSysId, demandSysId, phaseLines) {
        this._deleteExisting(projectScopeSysId);

        var phaseByName = {};
        for (var i = 0; i < phaseLines.length; i++) {
            phaseByName[phaseLines[i].phase_name] = phaseLines[i];
        }

        var ppmAvailable = this._isPpmResourcePlanAvailable();
        var created = [];

        var templateGr = new GlideRecord(this.ROLE_TEMPLATE_TABLE);
        templateGr.addQuery('size', sizeSysId);
        templateGr.query();
        while (templateGr.next()) {
            var phaseName = templateGr.getValue('phase_name');
            var phase = phaseByName[phaseName];
            if (!phase) {
                continue;
            }

            var resourceGroup = templateGr.getValue('resource_group');
            var resourcePlanRef = '';
            if (ppmAvailable && resourceGroup) {
                resourcePlanRef = this._createPpmResourcePlan(demandSysId, templateGr, phase);
            }

            var lineGr = new GlideRecord(this.RESOURCE_LINE_TABLE);
            lineGr.initialize();
            lineGr.setValue('project_scope', projectScopeSysId);
            lineGr.setValue('role', templateGr.getValue('role'));
            lineGr.setValue('resource_group', resourceGroup);
            lineGr.setValue('phase_name', phaseName);
            lineGr.setValue('allocation_percent', templateGr.getValue('allocation_percent'));
            lineGr.setValue('fte_count', templateGr.getValue('fte_count'));
            lineGr.setValue('start_date', phase.start_date);
            lineGr.setValue('end_date', phase.end_date);
            lineGr.setValue('resource_plan_ref', resourcePlanRef);
            var lineSysId = lineGr.insert();

            created.push({
                sys_id: lineSysId,
                role: templateGr.getValue('role'),
                phase_name: phaseName,
                allocation_percent: templateGr.getValue('allocation_percent'),
                fte_count: templateGr.getValue('fte_count'),
                start_date: phase.start_date,
                end_date: phase.end_date
            });
        }

        return created;
    },

    getResourcePlan: function(projectScopeSysId) {
        var lines = [];
        var gr = new GlideRecord(this.RESOURCE_LINE_TABLE);
        gr.addQuery('project_scope', projectScopeSysId);
        gr.orderBy('phase_name');
        gr.query();
        while (gr.next()) {
            lines.push({
                sys_id: gr.getUniqueValue(),
                role: gr.getValue('role'),
                phase_name: gr.getValue('phase_name'),
                allocation_percent: gr.getValue('allocation_percent'),
                fte_count: gr.getValue('fte_count'),
                start_date: gr.getValue('start_date'),
                end_date: gr.getValue('end_date')
            });
        }
        return lines;
    },

    _createPpmResourcePlan: function(demandSysId, templateGr, phase) {
        try {
            var planGr = new GlideRecord(this.PPM_RESOURCE_PLAN_TABLE);
            planGr.initialize();
            if (planGr.isValidField('table')) {
                planGr.setValue('table', this.DEMAND_TABLE);
            }
            if (planGr.isValidField('document_id')) {
                planGr.setValue('document_id', demandSysId);
            }
            if (planGr.isValidField('group')) {
                planGr.setValue('group', templateGr.getValue('resource_group'));
            }
            if (planGr.isValidField('start_date')) {
                planGr.setValue('start_date', phase.start_date);
            }
            if (planGr.isValidField('end_date')) {
                planGr.setValue('end_date', phase.end_date);
            }
            if (planGr.isValidField('percentage')) {
                planGr.setValue('percentage', templateGr.getValue('allocation_percent'));
            }
            return planGr.insert() || '';
        } catch (e) {
            gs.error('ScopeResourcePlanner: failed to create resource_plan record - ' + e.message);
            return '';
        }
    },

    _isPpmResourcePlanAvailable: function() {
        var gr = new GlideRecord(this.PPM_RESOURCE_PLAN_TABLE);
        return gr.isValid();
    },

    _deleteExisting: function(projectScopeSysId) {
        var gr = new GlideRecord(this.RESOURCE_LINE_TABLE);
        gr.addQuery('project_scope', projectScopeSysId);
        gr.deleteMultiple();
    },

    type: 'ScopeResourcePlanner'
};
