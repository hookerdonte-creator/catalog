/**
 * Fix Script: "Seed Default Scope Configuration"
 *
 * Run once after installing the app (System Definition > Fix Scripts, or
 * paste into Scripts - Background) to populate a working example of every
 * configuration table: criteria, t-shirt size thresholds, phase templates
 * and resource templates. Everything created here is meant to be reviewed
 * and edited afterwards through the Scoping Criteria / T-Shirt Size
 * Threshold / Project Phase Template / Resource Plan Template modules -
 * it's a working starting point, not a fixed ruleset. Safe to re-run:
 * every insert is guarded by a lookup on its natural key.
 */
(function seed() {

    function getOrCreate(table, query, fields) {
        var gr = new GlideRecord(table);
        for (var key in query) {
            gr.addQuery(key, query[key]);
        }
        gr.query();
        if (gr.next()) {
            return gr.getUniqueValue();
        }
        gr.initialize();
        for (var f in fields) {
            gr.setValue(f, fields[f]);
        }
        return gr.insert();
    }

    // ---- 1. Scoping Criteria ----
    var criteria = [
        {
            name: 'Number of Systems Integrated',
            description: 'How many external/internal systems does this effort need to integrate with?',
            category: 'integration',
            question_type: 'single_choice',
            weight: 1,
            max_points: 0,
            order: 100,
            options: [
                { label: 'None', points: 0, order: 100 },
                { label: '1-2 systems', points: 5, order: 200 },
                { label: '3-5 systems', points: 10, order: 300 },
                { label: '6+ systems', points: 15, order: 400 }
            ]
        },
        {
            name: 'Data Migration Required',
            description: 'Does this effort require migrating data from a legacy system or source?',
            category: 'data',
            question_type: 'boolean',
            weight: 1,
            max_points: 8,
            order: 200,
            options: []
        },
        {
            name: 'Users Affected',
            description: 'How many end users will be impacted by this change?',
            category: 'user_impact',
            question_type: 'single_choice',
            weight: 1,
            max_points: 0,
            order: 300,
            options: [
                { label: 'Fewer than 50', points: 2, order: 100 },
                { label: '50 - 500', points: 6, order: 200 },
                { label: '500 - 5,000', points: 10, order: 300 },
                { label: 'More than 5,000', points: 15, order: 400 }
            ]
        },
        {
            name: 'Technical Complexity',
            description: 'Rate the technical complexity from 1 (trivial) to 5 (highly complex / new technology).',
            category: 'technical_risk',
            question_type: 'scale',
            weight: 2,
            max_points: 5,
            order: 400,
            options: []
        },
        {
            name: 'Regulatory / Compliance Requirements',
            description: 'Does this effort have regulatory, legal, or compliance requirements (SOX, GDPR, HIPAA, etc)?',
            category: 'other',
            question_type: 'boolean',
            weight: 1,
            max_points: 10,
            order: 500,
            options: []
        }
    ];

    criteria.forEach(function(c) {
        var criteriaSysId = getOrCreate('x_scope_criteria_definition', { name: c.name }, {
            name: c.name,
            description: c.description,
            category: c.category,
            question_type: c.question_type,
            weight: c.weight,
            max_points: c.max_points,
            active: true,
            order: c.order
        });
        c.options.forEach(function(o) {
            getOrCreate('x_scope_criteria_option', { criteria: criteriaSysId, label: o.label }, {
                criteria: criteriaSysId,
                label: o.label,
                points: o.points,
                order: o.order
            });
        });
    });

    // ---- 2. T-Shirt Size Thresholds ----
    // Max observable score with the criteria above is 15+8+15+10+10 = 58.
    var thresholds = [
        { size: 'xs', min_score: 0,  max_score: 8,  weeks: 2,  color: '#5cb85c', order: 100 },
        { size: 's',  min_score: 9,  max_score: 18, weeks: 4,  color: '#5bc0de', order: 200 },
        { size: 'm',  min_score: 19, max_score: 30, weeks: 8,  color: '#f0ad4e', order: 300 },
        { size: 'l',  min_score: 31, max_score: 45, weeks: 16, color: '#e07b39', order: 400 },
        { size: 'xl', min_score: 46, max_score: '', weeks: 26, color: '#d9534f', order: 500 }
    ];
    var thresholdSysIds = {};
    thresholds.forEach(function(t) {
        thresholdSysIds[t.size] = getOrCreate('x_scope_size_threshold', { size: t.size }, {
            size: t.size,
            min_score: t.min_score,
            max_score: t.max_score,
            default_duration_weeks: t.weeks,
            color: t.color,
            order: t.order
        });
    });

    // ---- 3. Phase Templates (per size) ----
    var phasesBySize = {
        xs: [
            { phase_name: 'Plan',   sequence: 100, duration_percent: 20, color: '#5bc0de' },
            { phase_name: 'Build',  sequence: 200, duration_percent: 50, color: '#0275d8' },
            { phase_name: 'Test',   sequence: 300, duration_percent: 20, color: '#f0ad4e' },
            { phase_name: 'Deploy', sequence: 400, duration_percent: 10, color: '#5cb85c' }
        ],
        s: [
            { phase_name: 'Initiate', sequence: 100, duration_percent: 10, color: '#777777' },
            { phase_name: 'Plan',     sequence: 200, duration_percent: 20, color: '#5bc0de' },
            { phase_name: 'Build',    sequence: 300, duration_percent: 40, color: '#0275d8' },
            { phase_name: 'Test',     sequence: 400, duration_percent: 20, color: '#f0ad4e' },
            { phase_name: 'Deploy',   sequence: 500, duration_percent: 10, color: '#5cb85c' }
        ],
        m: [
            { phase_name: 'Initiate', sequence: 100, duration_percent: 10, color: '#777777' },
            { phase_name: 'Plan',     sequence: 200, duration_percent: 20, color: '#5bc0de' },
            { phase_name: 'Build',    sequence: 300, duration_percent: 40, color: '#0275d8' },
            { phase_name: 'Test',     sequence: 400, duration_percent: 20, color: '#f0ad4e' },
            { phase_name: 'Deploy',   sequence: 500, duration_percent: 10, color: '#5cb85c' }
        ],
        l: [
            { phase_name: 'Initiate', sequence: 100, duration_percent: 10, color: '#777777' },
            { phase_name: 'Plan',     sequence: 200, duration_percent: 15, color: '#5bc0de' },
            { phase_name: 'Design',   sequence: 300, duration_percent: 15, color: '#9b59b6' },
            { phase_name: 'Build',    sequence: 400, duration_percent: 35, color: '#0275d8' },
            { phase_name: 'Test',     sequence: 500, duration_percent: 15, color: '#f0ad4e' },
            { phase_name: 'Deploy',   sequence: 600, duration_percent: 10, color: '#5cb85c' }
        ],
        xl: [
            { phase_name: 'Initiate', sequence: 100, duration_percent: 10, color: '#777777' },
            { phase_name: 'Plan',     sequence: 200, duration_percent: 15, color: '#5bc0de' },
            { phase_name: 'Design',   sequence: 300, duration_percent: 15, color: '#9b59b6' },
            { phase_name: 'Build',    sequence: 400, duration_percent: 35, color: '#0275d8' },
            { phase_name: 'Test',     sequence: 500, duration_percent: 15, color: '#f0ad4e' },
            { phase_name: 'Deploy',   sequence: 600, duration_percent: 10, color: '#5cb85c' }
        ]
    };

    // ---- 4. Resource Role Templates (per size) ----
    var rolesBySize = {
        xs: [
            { phase_name: 'Plan',   role: 'Project Manager', allocation_percent: 25,  fte_count: 1 },
            { phase_name: 'Build',  role: 'Developer',       allocation_percent: 100, fte_count: 1 },
            { phase_name: 'Test',   role: 'Developer',       allocation_percent: 50,  fte_count: 1 },
            { phase_name: 'Deploy', role: 'Project Manager', allocation_percent: 25,  fte_count: 1 }
        ],
        s: [
            { phase_name: 'Initiate', role: 'Project Manager',  allocation_percent: 25,  fte_count: 1 },
            { phase_name: 'Plan',     role: 'Project Manager',  allocation_percent: 50,  fte_count: 1 },
            { phase_name: 'Plan',     role: 'Business Analyst', allocation_percent: 75,  fte_count: 1 },
            { phase_name: 'Build',    role: 'Developer',        allocation_percent: 100, fte_count: 2 },
            { phase_name: 'Test',     role: 'QA Engineer',      allocation_percent: 100, fte_count: 1 },
            { phase_name: 'Deploy',   role: 'Project Manager',  allocation_percent: 25,  fte_count: 1 }
        ],
        m: [
            { phase_name: 'Initiate', role: 'Project Manager',  allocation_percent: 25,  fte_count: 1 },
            { phase_name: 'Plan',     role: 'Project Manager',  allocation_percent: 50,  fte_count: 1 },
            { phase_name: 'Plan',     role: 'Business Analyst', allocation_percent: 100, fte_count: 1 },
            { phase_name: 'Build',    role: 'Developer',        allocation_percent: 100, fte_count: 3 },
            { phase_name: 'Test',     role: 'QA Engineer',      allocation_percent: 100, fte_count: 2 },
            { phase_name: 'Deploy',   role: 'Project Manager',  allocation_percent: 50,  fte_count: 1 }
        ],
        l: [
            { phase_name: 'Initiate', role: 'Project Manager',    allocation_percent: 25,  fte_count: 1 },
            { phase_name: 'Plan',     role: 'Project Manager',    allocation_percent: 50,  fte_count: 1 },
            { phase_name: 'Plan',     role: 'Business Analyst',   allocation_percent: 100, fte_count: 2 },
            { phase_name: 'Design',   role: 'Solution Architect', allocation_percent: 100, fte_count: 1 },
            { phase_name: 'Build',    role: 'Developer',          allocation_percent: 100, fte_count: 5 },
            { phase_name: 'Test',     role: 'QA Engineer',        allocation_percent: 100, fte_count: 3 },
            { phase_name: 'Deploy',   role: 'Project Manager',    allocation_percent: 50,  fte_count: 1 }
        ],
        xl: [
            { phase_name: 'Initiate', role: 'Project Manager',    allocation_percent: 50,  fte_count: 1 },
            { phase_name: 'Plan',     role: 'Project Manager',    allocation_percent: 100, fte_count: 1 },
            { phase_name: 'Plan',     role: 'Business Analyst',   allocation_percent: 100, fte_count: 3 },
            { phase_name: 'Design',   role: 'Solution Architect', allocation_percent: 100, fte_count: 2 },
            { phase_name: 'Build',    role: 'Developer',          allocation_percent: 100, fte_count: 8 },
            { phase_name: 'Test',     role: 'QA Engineer',        allocation_percent: 100, fte_count: 4 },
            { phase_name: 'Deploy',   role: 'Project Manager',    allocation_percent: 100, fte_count: 2 }
        ]
    };

    Object.keys(phasesBySize).forEach(function(sizeKey) {
        var sizeSysId = thresholdSysIds[sizeKey];
        phasesBySize[sizeKey].forEach(function(p) {
            getOrCreate('x_scope_phase_template', { size: sizeSysId, phase_name: p.phase_name }, {
                size: sizeSysId,
                phase_name: p.phase_name,
                sequence: p.sequence,
                duration_percent: p.duration_percent,
                color: p.color
            });
        });
    });

    Object.keys(rolesBySize).forEach(function(sizeKey) {
        var sizeSysId = thresholdSysIds[sizeKey];
        rolesBySize[sizeKey].forEach(function(r) {
            getOrCreate('x_scope_resource_role_template', { size: sizeSysId, phase_name: r.phase_name, role: r.role }, {
                size: sizeSysId,
                phase_name: r.phase_name,
                role: r.role,
                allocation_percent: r.allocation_percent,
                fte_count: r.fte_count
            });
        });
    });

    gs.info('Demand Scoping: seeded default criteria, thresholds, phase templates and resource templates.');

})();
