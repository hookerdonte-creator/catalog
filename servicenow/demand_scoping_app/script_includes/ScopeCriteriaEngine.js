/**
 * Script Include: ScopeCriteriaEngine
 * Type: Server-side, not client callable
 *
 * Reads the configurable scoping criteria (x_scope_criteria_definition /
 * x_scope_criteria_option), scores a set of submitted answers against them,
 * and resolves the total score to a t-shirt size band
 * (x_scope_size_threshold). This is the only place scoring logic lives -
 * everything here is driven by configuration data, not hardcoded rules.
 */
var ScopeCriteriaEngine = Class.create();
ScopeCriteriaEngine.prototype = {
    initialize: function() {},

    CRITERIA_TABLE: 'x_scope_criteria_definition',
    OPTION_TABLE: 'x_scope_criteria_option',
    THRESHOLD_TABLE: 'x_scope_size_threshold',

    /**
     * Returns active scoping criteria, ordered, each with its answer
     * options populated (only meaningful for question_type = single_choice).
     */
    getActiveCriteria: function() {
        var criteria = [];
        var gr = new GlideRecord(this.CRITERIA_TABLE);
        gr.addQuery('active', true);
        gr.orderBy('order');
        gr.query();
        while (gr.next()) {
            var entry = {
                sys_id: gr.getUniqueValue(),
                name: gr.getValue('name'),
                description: gr.getValue('description'),
                category: gr.getValue('category'),
                question_type: gr.getValue('question_type'),
                weight: parseFloat(gr.getValue('weight') || '1'),
                max_points: parseInt(gr.getValue('max_points') || '0', 10),
                help_text: gr.getValue('help_text'),
                options: []
            };
            if (entry.question_type == 'single_choice') {
                entry.options = this._getOptions(entry.sys_id);
            }
            criteria.push(entry);
        }
        return criteria;
    },

    _getOptions: function(criteriaSysId) {
        var options = [];
        var gr = new GlideRecord(this.OPTION_TABLE);
        gr.addQuery('criteria', criteriaSysId);
        gr.orderBy('order');
        gr.query();
        while (gr.next()) {
            options.push({
                sys_id: gr.getUniqueValue(),
                label: gr.getValue('label'),
                points: parseInt(gr.getValue('points') || '0', 10)
            });
        }
        return options;
    },

    /**
     * responses: [{ criteria: sys_id, selected_option: sys_id, numeric_value: number|boolean }]
     * Returns { total_score: Number, lines: [{criteria, selected_option, numeric_value, points_awarded}] }
     */
    computeScore: function(responses) {
        var totalScore = 0;
        var lines = [];

        for (var i = 0; i < (responses || []).length; i++) {
            var response = responses[i];
            var criteriaGr = new GlideRecord(this.CRITERIA_TABLE);
            if (!response.criteria || !criteriaGr.get(response.criteria)) {
                continue;
            }

            var weight = parseFloat(criteriaGr.getValue('weight') || '1');
            var questionType = criteriaGr.getValue('question_type');
            var rawPoints = 0;

            if (questionType == 'single_choice' && response.selected_option) {
                var optionGr = new GlideRecord(this.OPTION_TABLE);
                if (optionGr.get(response.selected_option)) {
                    rawPoints = parseInt(optionGr.getValue('points') || '0', 10);
                }
            } else if (questionType == 'boolean') {
                var truthy = response.numeric_value === true || response.numeric_value === 1 ||
                    response.numeric_value === '1' || response.numeric_value === 'true';
                rawPoints = truthy ? parseInt(criteriaGr.getValue('max_points') || '1', 10) : 0;
            } else {
                // scale / numeric
                rawPoints = parseFloat(response.numeric_value || 0) || 0;
                var maxPoints = parseFloat(criteriaGr.getValue('max_points') || '0');
                if (maxPoints && rawPoints > maxPoints) {
                    rawPoints = maxPoints;
                }
            }

            var pointsAwarded = rawPoints * weight;
            totalScore += pointsAwarded;

            lines.push({
                criteria: response.criteria,
                selected_option: response.selected_option || '',
                numeric_value: (response.numeric_value === undefined || response.numeric_value === null) ? '' : response.numeric_value,
                points_awarded: pointsAwarded
            });
        }

        return { total_score: totalScore, lines: lines };
    },

    /**
     * Finds the size threshold band totalScore falls into (min_score <=
     * score <= max_score, with a blank max_score treated as open-ended).
     * If the score exceeds every configured band, falls back to the
     * highest-`order` band rather than returning nothing.
     */
    resolveTShirtSize: function(totalScore) {
        var gr = new GlideRecord(this.THRESHOLD_TABLE);
        gr.orderBy('order');
        gr.query();

        var matchedSysId = null;
        var lastSysId = null;

        while (gr.next()) {
            lastSysId = gr.getUniqueValue();
            var min = parseFloat(gr.getValue('min_score') || '0');
            var maxRaw = gr.getValue('max_score');
            var max = (maxRaw === '' || maxRaw === null || maxRaw === undefined) ? null : parseFloat(maxRaw);

            if (totalScore >= min && (max === null || totalScore <= max)) {
                matchedSysId = lastSysId;
                break;
            }
        }

        var resultSysId = matchedSysId || lastSysId;
        if (!resultSysId) {
            return null;
        }

        var result = new GlideRecord(this.THRESHOLD_TABLE);
        result.get(resultSysId);
        return result;
    },

    type: 'ScopeCriteriaEngine'
};
