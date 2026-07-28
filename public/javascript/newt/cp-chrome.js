// fills in the redesigned workspace chrome: the file name in the top bar, the
// node/relation counts, and the sidebar callout.
//
// this reads FROM newt (the active cytoscape instance + the file tree) and
// writes only to CausalPath's own elements. nothing here changes newt state,
// so it can be dropped without affecting the editor at all.

var $ = require('jquery');
var appUtilities = require('./app-utilities');

var POLL_MS = 600;

var currentFile = '';
var lastLabel = null;
var lastMeta = null;

function el(id) {
    return document.getElementById(id);
}

function activeCy() {
    try {
        return appUtilities.getActiveCy();
    } catch (e) {
        return null;
    }
}

// compound parents are grouping containers newt adds for sif topology grouping,
// not genes -> count the leaves so the number matches what the user sees
function counts(cy) {
    if (!cy) return {nodes: 0, edges: 0};
    var nodes = 0;
    cy.nodes().forEach(function (n) {
        if (!n.isParent()) nodes++;
    });
    return {nodes: nodes, edges: cy.edges().length};
}

function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
}

function paint() {
    var fileEl = el('cp-topbar-file');
    var metaEl = el('cp-topbar-meta');
    var callout = el('cp-file-callout');
    if (!fileEl || !metaEl) return;

    var c = counts(activeCy());
    var label = currentFile || 'No graph loaded';
    var meta = plural(c.nodes, 'node') + ' · ' + plural(c.edges, 'relation');

    if (label !== lastLabel) {
        fileEl.textContent = label;
        fileEl.title = label;
        lastLabel = label;

        if (callout) {
            var nameEl = el('cp-file-name');
            if (currentFile && nameEl) {
                nameEl.textContent = currentFile;
                callout.hidden = false;
            } else {
                callout.hidden = true;
            }
        }
    }

    if (meta !== lastMeta) {
        metaEl.textContent = meta;
        var calloutMeta = el('cp-file-meta');
        if (calloutMeta) calloutMeta.textContent = meta;
        lastMeta = meta;
    }
}

function setFile(name) {
    currentFile = name || '';
    paint();
}

// wrap the tree bridges app-menu exposes so opening a graph any way it can be
// opened updates the header. wrapping keeps the original behaviour intact.
function wrapBridge(fnName) {
    var original = window[fnName];
    if (typeof original !== 'function') return;
    window[fnName] = function (node) {
        var name = (node && (node.text || (node.data && node.data.name))) || '';
        if (name) setFile(name);
        return original.apply(this, arguments);
    };
}

module.exports = function () {
    // double-click on a tree row is the main way a graph gets opened
    $(document).on('dblclick', '#folder-tree-container .jstree-anchor', function () {
        var name = ($(this).text() || '').trim();
        if (/\.(sif|nwt|json|xml|sbgn)$/i.test(name)) setFile(name);
    });

    // the context-menu items go through these instead
    wrapBridge('newtOpenFile');
    wrapBridge('newtLoadSubgraphCanvas');

    // clearing the canvas from the sidebar drops the current file
    $(document).on('click', '#back_button_label', function () {
        setFile('');
    });

    // counts change on load, layout, delete, undo, subgraph reload — too many
    // entry points to hook individually, so sample the graph instead. the DOM
    // is only touched when a value actually changed.
    setInterval(function () {
        if (document.body.classList.contains('cp-view-graph')) paint();
    }, POLL_MS);

    paint();
};
