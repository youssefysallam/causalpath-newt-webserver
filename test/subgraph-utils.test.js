const test = require('node:test');
const assert = require('node:assert');
const {
    splitPastedGenes,
    parseSifGenes,
    expandWithNeighbors,
    filterSif,
    rgbToHex,
    parseFormatStyles,
} = require('../public/javascript/newt/subgraph-utils');

const SIF = [
    'TP53\tcontrols-state-change-of\tMDM2',
    'MDM2\tcontrols-state-change-of\tMDM4',
    'AKT1\tcontrols-state-change-of\tTP53',
    'CHEK2\tcontrols-state-change-of\tTP53',
    'LONELY',
].join('\n');

test('splitPastedGenes splits on commas/whitespace/newlines and drops empties', () => {
    assert.deepStrictEqual(
        splitPastedGenes('TP53, MDM2\nFOO  BAR\n\n , '),
        ['TP53', 'MDM2', 'FOO', 'BAR']
    );
    assert.deepStrictEqual(splitPastedGenes(''), []);
    assert.deepStrictEqual(splitPastedGenes(null), []);
});

test('parseSifGenes returns sorted uniq genes incl. standalone nodes', () => {
    const { genes } = parseSifGenes(SIF);
    assert.deepStrictEqual(genes, ['AKT1', 'CHEK2', 'LONELY', 'MDM2', 'MDM4', 'TP53']);
});

test('parseSifGenes builds undirected adjacency', () => {
    const { adjacency } = parseSifGenes(SIF);
    assert.deepStrictEqual([...adjacency.get('TP53')].sort(), ['AKT1', 'CHEK2', 'MDM2']);
    assert.deepStrictEqual([...adjacency.get('MDM4')], ['MDM2']);
    assert.deepStrictEqual([...adjacency.get('LONELY')], []);
});

test('expandWithNeighbors adds selected + 1-hop neighbors, skips unknown', () => {
    const { adjacency } = parseSifGenes(SIF);
    assert.deepStrictEqual([...expandWithNeighbors(adjacency, ['MDM2'])].sort(),
        ['MDM2', 'MDM4', 'TP53']);
    assert.deepStrictEqual([...expandWithNeighbors(adjacency, ['FOO'])], []);
});

test('filterSif keeps only lines with both endpoints in the node set', () => {
    const { adjacency } = parseSifGenes(SIF);
    const nodeSet = expandWithNeighbors(adjacency, ['TP53']); // TP53,MDM2,AKT1,CHEK2
    const out = filterSif(SIF, nodeSet).split('\n').sort();
    assert.deepStrictEqual(out, [
        'AKT1\tcontrols-state-change-of\tTP53',
        'CHEK2\tcontrols-state-change-of\tTP53',
        'TP53\tcontrols-state-change-of\tMDM2',
    ].sort());
});

test('filterSif keeps a standalone node line when that node is in the set', () => {
    const nodeSet = new Set(['LONELY']);
    assert.strictEqual(filterSif('LONELY', nodeSet), 'LONELY');
    assert.strictEqual(filterSif('LONELY', new Set(['TP53'])), '');
});

test('rgbToHex converts "R G B" to #rrggbb, pads, and rejects bad input', () => {
    assert.strictEqual(rgbToHex('255 255 255'), '#ffffff');
    assert.strictEqual(rgbToHex('40 80 255'), '#2850ff');
    assert.strictEqual(rgbToHex('0 0 0'), '#000000');
    assert.strictEqual(rgbToHex('1 2'), null);
});

test('parseFormatStyles maps color/border directives and skips rppasite/tooltip', () => {
    const format = [
        'node\tall-nodes\tcolor\t255 255 255',
        'node\tall-nodes\tbordercolor\t50 50 50',
        'node\tALOX5AP\tcolor\t40 80 255',
        'node\tRBBP4\tbordercolor\t180 0 20',
        'node\tRBBP4\tborderwidth\t3',
        'node\tSF3B1\trppasite\tSF3B1_T211_P|p|255 82 42|50 50 50|14.8', // skipped
        'node\tCIP2A\ttooltip\tsome text',                                // skipped
        'edge\tall-edges\tcolor\t0 180 20',
    ].join('\n');
    assert.deepStrictEqual(parseFormatStyles(format), [
        {eleType: 'node', selector: 'all-nodes', styleName: 'background-color', styleValue: '#ffffff'},
        {eleType: 'node', selector: 'all-nodes', styleName: 'border-color', styleValue: '#323232'},
        {eleType: 'node', selector: 'ALOX5AP', styleName: 'background-color', styleValue: '#2850ff'},
        {eleType: 'node', selector: 'RBBP4', styleName: 'border-color', styleValue: '#b40014'},
        {eleType: 'node', selector: 'RBBP4', styleName: 'border-width', styleValue: 3},
        {eleType: 'edge', selector: 'all-edges', styleName: 'line-color', styleValue: '#00b414'},
    ]);
    assert.deepStrictEqual(parseFormatStyles(''), []);
    assert.deepStrictEqual(parseFormatStyles(null), []);
});
