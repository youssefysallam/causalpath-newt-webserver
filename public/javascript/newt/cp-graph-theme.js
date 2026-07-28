// LAYER 2 of the theme: node/edge visuals.
//
// the canvas is a <canvas>, so css can't reach it — the cytoscape stylesheet is
// the supported extension point and the only correct tool here. cy.style()
// .selector().style() APPENDS contexts to the sheet sbgnviz already built, so
// nothing newt defines is removed; later contexts just win where they overlap.
//
// SEMANTICS ARE NOT TOUCHED. up-regulated / down-regulated node fills and
// activation / inhibition line colors, styles and arrow shapes all come from
// the .format file that ships with an analysis (see sif-style-factory.js) and
// are read off element data by newt's own rules. this file only restyles
// typography and press states.
//
// what is deliberately NOT here: selected node/edge colors. cytoscape-view-
// utilities re-registers newt's own node:selected / edge:selected contexts
// after every load (they land after ours in the sheet), so selection colour is
// newt's to own — it comes from selectStyles in app-cy.js and the inspector's
// Highlight Style control. overriding it would mean editing newt.

var appUtilities = require('./app-utilities');

var ACCENT = '#d4573a';

// no quotes and no ui-* keywords: cytoscape validates font-family against
// /^([\w- "]+(?:\s*,\s*[\w- "]+)*)$/ and silently drops anything else, falling
// back to its own default stack.
var MONO = 'IBM Plex Mono, Menlo, monospace';

// sbgnviz stamps this on every node it creates (getDefaultFontProperties in
// element-utilities-factory.js). a node still carrying it has never had a font
// chosen for it, so it's ours to restyle; anything else was set by the map or
// by the user through the inspector and must be left alone.
var SBGN_DEFAULT_FONT = 'Helvetica';

var themed = typeof WeakSet === 'function' ? new WeakSet() : null;

function apply(cy) {
    if (!cy || typeof cy.style !== 'function') return;
    if (themed) {
        if (themed.has(cy)) return;
        themed.add(cy);
    }

    cy.style()
        // gene labels in the mono face. only the untouched sbgnviz default is
        // swapped, so the inspector's font-family picker and the Font
        // Properties dialog keep working exactly as before.
        .selector('node[class]')
        .style({
            'font-family': function (ele) {
                var f = ele.data('font-family');
                return !f || f === SBGN_DEFAULT_FONT ? MONO : f;
            },
        })

        // press-and-hold feedback in the accent
        .selector('node:active')
        .style({
            'overlay-color': ACCENT,
            'overlay-opacity': 0.16,
        })
        .selector('edge:active')
        .style({
            'overlay-color': ACCENT,
            'overlay-opacity': 0.16,
        })

        // drag-select marquee. note: no active-bg-* here — app-cy.js sets
        // 'active-bg-opacity': 0 on purpose and re-enabling it would change
        // newt's behaviour, not just its look.
        .selector('core')
        .style({
            'selection-box-color': ACCENT,
            'selection-box-border-color': ACCENT,
            'selection-box-opacity': 0.12,
        })
        .update();
}

module.exports = function () {
    // every cy instance in this app comes out of createNewNetwork, so wrapping
    // it themes the startup network and any map opened later, without newt
    // needing to know the theme exists
    var original = appUtilities.createNewNetwork;
    if (typeof original !== 'function' || original.__cpThemed) return;

    var wrapped = function () {
        var inst = original.apply(this, arguments);
        try {
            apply(inst && inst.getCy && inst.getCy());
        } catch (e) {
            // a broken theme must never stop a network from opening
            console.warn('causalpath graph theme skipped:', e);
        }
        return inst;
    };
    wrapped.__cpThemed = true;
    appUtilities.createNewNetwork = wrapped;
};

module.exports.apply = apply;
