/**
 * Script Include: DemandScopeOrchestrator
 * Type: Server-side, not client callable
 *
 * Single entry point that ties the scoring, timeline and resource planning
 * engines together against a demand. This is what the Service Portal
 * widget's server script calls, but it's plain server-side script so it
 * can equally be called from a UI Action, background script or Flow
 * Designer script step.
 */
var DemandScopeOrchestrator = Class.create();
DemandScopeOrchestrator.prototype = {
    initialize: function() {
        this.criteriaEngine = new ScopeCriteriaEngine();
        this.timelineEngine = new ScopeTimelineEngine();
        this.resourcePlanner = new ScopeResourcePlanner();
    },

    PROJECT_SCOPE_TABLE: 'x_scope_project_scope',
    CRITERIA_RESPONSE_TABLE: 'x_scope_criteria_response',
    SIZE_THRESHOLD_TABLE: 'x_scope_size_threshold',
    DEMAND_TABLE: 'dm_demand',

    /**
     * Scores a demand against submitted criteria responses, resolves its
     * t-shirt size, rebuilds its phase timeline and resource plan, and
     * writes the result back onto the demand (u_t_shirt_size,
     * u_project_scope, u_scoped, u_scoped_on).
     *
     * responses: [{ criteria: sys_id, selected_option: sys_id, numeric_value: number|boolean }]
     * startDate: "yyyy-MM-dd"
     *
     * Returns the same summary shape as getScopeSummary().
     */
    submitScope: function(demandSysId, responses, startDate) {
        var demandGr = new GlideRecord(this.DEMAND_TABLE);
        if (!demandGr.get(demandSysId)) {
            throw new Error('Demand not found: ' + demandSysId);
        }
        if (!startDate) {
            throw new Error('A target start date is required to build the timeline.');
        }

        var scoring = this.criteriaEngine.computeScore(responses || []);
        var sizeGr = this.criteriaEngine.resolveTShirtSize(scoring.total_score);
        if (!sizeGr) {
            throw new Error('No t-shirt size thresholds are configured (x_scope_size_threshold is empty).');
        }

        var scopeGr = this._getOrCreateScope(demandSysId);
        var durationWeeks = parseInt(sizeGr.getValue('default_duration_weeks') || '1', 10);

        scopeGr.setValue('state', 'scoped');
        scopeGr.setValue('total_score', scoring.total_score);
        scopeGr.setValue('t_shirt_size', sizeGr.getUniqueValue());
        scopeGr.setValue('estimated_duration_weeks', durationWeeks);
        scopeGr.setValue('estimated_start_date', startDate);
        scopeGr.setValue('scoped_by', gs.getUserID());
        scopeGr.setValue('scoped_on', new GlideDateTime().getValue());
        scopeGr.update();
        var scopeSysId = scopeGr.getUniqueValue();

        this._saveCriteriaResponses(scopeSysId, scoring.lines);

        var phaseLines = this.timelineEngine.buildPhaseLines(scopeSysId, sizeGr.getUniqueValue(), startDate, durationWeeks);
        var endDate = phaseLines.length ? phaseLines[phaseLines.length - 1].end_date : startDate;
        scopeGr.setValue('estimated_end_date', endDate);
        scopeGr.update();

        var resourceLines = this.resourcePlanner.buildResourcePlan(scopeSysId, sizeGr.getUniqueValue(), demandSysId, phaseLines);

        this._syncDemand(demandGr, scopeSysId, sizeGr.getUniqueValue());

        return this._buildSummary(scopeGr, sizeGr, phaseLines, resourceLines);
    },

    /**
     * Read-only fetch for the summary/Gantt view. Returns null if the
     * demand hasn't been scoped yet (or its only scope was archived).
     */
    getScopeSummary: function(demandSysId) {
        var scopeGr = this._getLatestScopedRecord(demandSysId);
        if (!scopeGr) {
            return null;
        }

        var sizeGr = new GlideRecord(this.SIZE_THRESHOLD_TABLE);
        if (!sizeGr.get(scopeGr.getValue('t_shirt_size'))) {
            return null;
        }

        var phaseLines = this.timelineEngine.getPhaseLines(scopeGr.getUniqueValue());
        var resourceLines = this.resourcePlanner.getResourcePlan(scopeGr.getUniqueValue());

        return this._buildSummary(scopeGr, sizeGr, phaseLines, resourceLines);
    },

    /**
     * Existing answers for a demand's latest scope, keyed by criteria
     * sys_id, so the wizard can be pre-filled when rescoping.
     */
    getExistingResponses: function(demandSysId) {
        var responses = {};
        var scopeGr = this._getLatestScopedRecord(demandSysId);
        if (!scopeGr) {
            return responses;
        }

        var gr = new GlideRecord(this.CRITERIA_RESPONSE_TABLE);
        gr.addQuery('project_scope', scopeGr.getUniqueValue());
        gr.query();
        while (gr.next()) {
            responses[gr.getValue('criteria')] = {
                selected_option: gr.getValue('selected_option'),
                numeric_value: gr.getValue('numeric_value')
            };
        }
        return responses;
    },

    _getLatestScopedRecord: function(demandSysId) {
        var gr = new GlideRecord(this.PROJECT_SCOPE_TABLE);
        gr.addQuery('demand', demandSysId);
        gr.addQuery('state', 'scoped');
        gr.orderByDesc('sys_updated_on');
        gr.setLimit(1);
        gr.query();
        return gr.next() ? gr : null;
    },

    _getOrCreateScope: function(demandSysId) {
        var gr = new GlideRecord(this.PROJECT_SCOPE_TABLE);
        gr.addQuery('demand', demandSysId);
        gr.orderByDesc('sys_updated_on');
        gr.setLimit(1);
        gr.query();
        if (gr.next()) {
            return gr;
        }

        gr.initialize();
        gr.setValue('demand', demandSysId);
        gr.setValue('state', 'draft');
        gr.insert();
        return gr;
    },

    _saveCriteriaResponses: function(scopeSysId, lines) {
        var existing = new GlideRecord(this.CRITERIA_RESPONSE_TABLE);
        existing.addQuery('project_scope', scopeSysId);
        existing.deleteMultiple();

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var gr = new GlideRecord(this.CRITERIA_RESPONSE_TABLE);
            gr.initialize();
            gr.setValue('project_scope', scopeSysId);
            gr.setValue('criteria', line.criteria);
            gr.setValue('selected_option', line.selected_option);
            gr.setValue('numeric_value', line.numeric_value);
            gr.setValue('points_awarded', line.points_awarded);
            gr.insert();
        }
    },

    _syncDemand: function(demandGr, scopeSysId, sizeSysId) {
        demandGr.setValue('u_project_scope', scopeSysId);
        demandGr.setValue('u_t_shirt_size', sizeSysId);
        demandGr.setValue('u_scoped', true);
        demandGr.setValue('u_scoped_on', new GlideDateTime().getValue());
        demandGr.update();
    },

    _buildSummary: function(scopeGr, sizeGr, phaseLines, resourceLines) {
        return {
            scope_sys_id: scopeGr.getUniqueValue(),
            state: scopeGr.getValue('state'),
            total_score: scopeGr.getValue('total_score'),
            size: {
                sys_id: sizeGr.getUniqueValue(),
                label: sizeGr.getDisplayValue('size'),
                value: sizeGr.getValue('size'),
                color: sizeGr.getValue('color')
            },
            estimated_duration_weeks: scopeGr.getValue('estimated_duration_weeks'),
            estimated_start_date: scopeGr.getValue('estimated_start_date'),
            estimated_end_date: scopeGr.getValue('estimated_end_date'),
            phases: phaseLines,
            resources: resourceLines
        };
    },

    type: 'DemandScopeOrchestrator'
};
