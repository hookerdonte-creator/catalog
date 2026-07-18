/**
 * Service Portal Widget Client Script: "Demand Scope Workspace"
 * Widget id: demand_scope_workspace
 *
 * Drives both the questionnaire (wizard mode) and the read-only
 * summary/Gantt view (summary mode). The wizard's live score badge is a
 * client-side estimate only - c.submit() always recalculates
 * authoritatively on the server via ScopeCriteriaEngine, so a user can't
 * change the outcome by tampering with the client-side math.
 */
function() {
    var c = this;
    c.responses = {};
    c.startDate = new Date().toISOString().slice(0, 10);
    c.loading = false;

    function loadExistingResponses() {
        c.responses = {};
        angular.forEach(c.data.existing_responses, function(value, criteriaSysId) {
            c.responses[criteriaSysId] = value;
        });
    }

    if (c.data.mode == 'wizard') {
        loadExistingResponses();
    }

    c.setChoice = function(criteriaSysId, optionSysId) {
        c.responses[criteriaSysId] = { selected_option: optionSysId, numeric_value: '' };
    };

    c.isSelected = function(criteriaSysId, optionSysId) {
        return c.responses[criteriaSysId] && c.responses[criteriaSysId].selected_option == optionSysId;
    };

    c.ensureResponse = function(criteriaSysId) {
        if (!c.responses[criteriaSysId]) {
            c.responses[criteriaSysId] = { selected_option: '', numeric_value: '' };
        }
        return c.responses[criteriaSysId];
    };

    // Live client-side estimate only - server recalculates authoritatively on submit.
    c.previewScore = function() {
        var total = 0;
        angular.forEach(c.data.criteria, function(criteria) {
            var response = c.responses[criteria.sys_id];
            if (!response) {
                return;
            }
            var weight = criteria.weight || 1;
            if (criteria.question_type == 'single_choice' && response.selected_option) {
                var match = (criteria.options || []).filter(function(o) {
                    return o.sys_id == response.selected_option;
                })[0];
                if (match) {
                    total += (match.points || 0) * weight;
                }
            } else if (criteria.question_type == 'boolean') {
                if (response.numeric_value) {
                    total += (criteria.max_points || 1) * weight;
                }
            } else if (response.numeric_value !== '' && response.numeric_value !== undefined) {
                var raw = parseFloat(response.numeric_value) || 0;
                var cap = criteria.max_points || raw;
                total += Math.min(raw, cap) * weight;
            }
        });
        return total;
    };

    c.allAnswered = function() {
        if (!c.data.criteria || !c.data.criteria.length) {
            return false;
        }
        return c.data.criteria.every(function(criteria) {
            var response = c.responses[criteria.sys_id];
            if (!response) {
                return false;
            }
            if (criteria.question_type == 'single_choice') {
                return !!response.selected_option;
            }
            return response.numeric_value !== '' && response.numeric_value !== undefined && response.numeric_value !== null;
        });
    };

    c.submit = function() {
        var responses = [];
        angular.forEach(c.responses, function(value, criteriaSysId) {
            responses.push({
                criteria: criteriaSysId,
                selected_option: value.selected_option || '',
                numeric_value: value.numeric_value === undefined ? '' : value.numeric_value
            });
        });

        c.loading = true;
        c.server.get({ action: 'submit_scope', responses: responses, start_date: c.startDate }).then(function(response) {
            c.loading = false;
            c.data = response.data;
        });
    };

    c.rescope = function() {
        c.loading = true;
        c.server.get({ action: 'rescope' }).then(function(response) {
            c.loading = false;
            c.data = response.data;
            loadExistingResponses();
        });
    };

    // ---- Gantt helpers ----
    c.ganttRange = function() {
        var summary = c.data.summary;
        if (!summary || !summary.phases || !summary.phases.length) {
            return null;
        }
        return {
            start: new Date(summary.estimated_start_date),
            end: new Date(summary.estimated_end_date)
        };
    };

    c.ganttStyle = function(phase) {
        var range = c.ganttRange();
        if (!range) {
            return {};
        }
        var totalMs = range.end.getTime() - range.start.getTime() || 1;
        var phaseStart = new Date(phase.start_date);
        var phaseEnd = new Date(phase.end_date);
        var leftPct = ((phaseStart.getTime() - range.start.getTime()) / totalMs) * 100;
        var widthPct = ((phaseEnd.getTime() - phaseStart.getTime()) / totalMs) * 100;
        return {
            left: Math.max(leftPct, 0) + '%',
            width: Math.max(widthPct, 2) + '%',
            'background-color': phase.color || '#5aa3f0'
        };
    };
}
