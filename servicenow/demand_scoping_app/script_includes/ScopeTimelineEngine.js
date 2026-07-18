/**
 * Script Include: ScopeTimelineEngine
 * Type: Server-side, not client callable
 *
 * Turns a t-shirt size's phase template (x_scope_phase_template) into a
 * concrete set of dated phase lines (x_scope_phase_line) for one project
 * scope, spread across an estimated duration starting on a given date.
 * This is what feeds the high-level Gantt view.
 *
 * Date math is done as plain UTC yyyy-MM-dd string arithmetic rather than
 * GlideDateTime, since these are date-only fields and the caller passes
 * plain "yyyy-MM-dd" strings from an HTML date input.
 */
var ScopeTimelineEngine = Class.create();
ScopeTimelineEngine.prototype = {
    initialize: function() {},

    PHASE_TEMPLATE_TABLE: 'x_scope_phase_template',
    PHASE_LINE_TABLE: 'x_scope_phase_line',

    /**
     * Deletes any existing phase lines for this scope and rebuilds them
     * from the phase template configured for sizeSysId, starting on
     * startDate ("yyyy-MM-dd") and spread across durationWeeks.
     * Returns the created lines, in sequence order.
     */
    buildPhaseLines: function(projectScopeSysId, sizeSysId, startDate, durationWeeks) {
        this._deleteExisting(projectScopeSysId);

        var templates = [];
        var templateGr = new GlideRecord(this.PHASE_TEMPLATE_TABLE);
        templateGr.addQuery('size', sizeSysId);
        templateGr.orderBy('sequence');
        templateGr.query();
        while (templateGr.next()) {
            templates.push({
                phase_name: templateGr.getValue('phase_name'),
                sequence: parseInt(templateGr.getValue('sequence') || '0', 10),
                duration_percent: parseFloat(templateGr.getValue('duration_percent') || '0'),
                color: templateGr.getValue('color')
            });
        }

        var totalDays = Math.max(parseInt(durationWeeks, 10) || 1, 1) * 7;
        var cursor = startDate;
        var lines = [];

        for (var i = 0; i < templates.length; i++) {
            var tmpl = templates[i];
            var phaseDays = Math.max(Math.round(totalDays * (tmpl.duration_percent / 100)), 1);

            var phaseStart = cursor;
            var phaseEnd = this._addDays(phaseStart, phaseDays - 1);

            var lineGr = new GlideRecord(this.PHASE_LINE_TABLE);
            lineGr.initialize();
            lineGr.setValue('project_scope', projectScopeSysId);
            lineGr.setValue('phase_name', tmpl.phase_name);
            lineGr.setValue('sequence', tmpl.sequence);
            lineGr.setValue('start_date', phaseStart);
            lineGr.setValue('end_date', phaseEnd);
            lineGr.setValue('color', tmpl.color);
            var lineSysId = lineGr.insert();

            lines.push({
                sys_id: lineSysId,
                phase_name: tmpl.phase_name,
                sequence: tmpl.sequence,
                start_date: phaseStart,
                end_date: phaseEnd,
                color: tmpl.color
            });

            cursor = this._addDays(phaseEnd, 1);
        }

        return lines;
    },

    getPhaseLines: function(projectScopeSysId) {
        var lines = [];
        var gr = new GlideRecord(this.PHASE_LINE_TABLE);
        gr.addQuery('project_scope', projectScopeSysId);
        gr.orderBy('sequence');
        gr.query();
        while (gr.next()) {
            lines.push({
                sys_id: gr.getUniqueValue(),
                phase_name: gr.getValue('phase_name'),
                sequence: gr.getValue('sequence'),
                start_date: gr.getValue('start_date'),
                end_date: gr.getValue('end_date'),
                color: gr.getValue('color')
            });
        }
        return lines;
    },

    _deleteExisting: function(projectScopeSysId) {
        var gr = new GlideRecord(this.PHASE_LINE_TABLE);
        gr.addQuery('project_scope', projectScopeSysId);
        gr.deleteMultiple();
    },

    _addDays: function(dateStr, days) {
        var parts = dateStr.split('-');
        var d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
        d.setUTCDate(d.getUTCDate() + days);
        var y = d.getUTCFullYear();
        var m = ('0' + (d.getUTCMonth() + 1)).slice(-2);
        var day = ('0' + d.getUTCDate()).slice(-2);
        return y + '-' + m + '-' + day;
    },

    type: 'ScopeTimelineEngine'
};
