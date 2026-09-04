const assert = require('assert');
const fs = require('fs');

console.log('--- TEST ANGLE 3: Full Lifecycle DOM, Highlighting, Dual-View & Export Tests ---');

// Mock JSDOM / Browser Environment
class MockElement {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.style = {};
        this.className = '';
        this.children = [];
        this.innerHTML = '';
        this.innerText = '';
        this.dataset = {};
    }
    appendChild(child) {
        this.children.push(child);
        return child;
    }
    remove() {
        if (this.parentNode) {
            const idx = this.parentNode.children.indexOf(this);
            if (idx >= 0) this.parentNode.children.splice(idx, 1);
        }
    }
    querySelector(sel) {
        return new MockElement('div');
    }
    querySelectorAll(sel) {
        return [];
    }
    setAttribute(k, v) { this[k] = v; }
    getAttribute(k) { return this[k]; }
}

const mockBody = new MockElement('body');
const mockElements = new Map();

global.document = {
    body: mockBody,
    createElement: (tag) => {
        const el = new MockElement(tag);
        return el;
    },
    getElementById: (id) => {
        if (!mockElements.has(id)) {
            mockElements.set(id, new MockElement('div'));
        }
        return mockElements.get(id);
    }
};

global.window = {
    vis: {
        DataSet: class {
            constructor(items) { this._items = new Map(items.map(i => [i.id, i])); }
            update(updated) {
                updated.forEach(u => {
                    const existing = this._items.get(u.id) || {};
                    this._items.set(u.id, Object.assign(existing, u));
                });
            }
            get(id) { return this._items.get(id); }
            map(fn) { return Array.from(this._items.values()).map(fn); }
        },
        Network: class {
            constructor(container, data, options) {
                this.container = container;
                this.data = data;
                this.options = options;
                this.events = {};
                this.canvas = {
                    frame: {
                        canvas: {
                            width: 1200,
                            height: 800,
                            getContext: () => ({
                                fillStyle: '',
                                fillRect: () => {},
                                drawImage: () => {},
                                fillText: () => {}
                            }),
                            toBlob: (cb) => cb(new Blob([], { type: 'image/png' }))
                        }
                    }
                };
            }
            on(evt, fn) { this.events[evt] = fn; }
            once(evt, fn) { this.events[evt] = fn; }
            storePositions() {}
            fit() {}
            redraw() {}
            getScale() { return 1.0; }
            moveTo(opts) {}
            setOptions(opts) { this.options = Object.assign(this.options, opts); }
        }
    },
    XLSX: {
        utils: {
            book_new: () => ({ SheetNames: [], Sheets: {} }),
            json_to_sheet: (data) => ({ data }),
            book_append_sheet: (wb, ws, name) => {
                wb.SheetNames.push(name);
                wb.Sheets[name] = ws;
            }
        },
        writeFile: (wb, filename) => {
            console.log('   [MOCK XLSX] Successfully generated workbook:', filename, 'Sheets:', wb.SheetNames);
            wb.exportedFilename = filename;
            return true;
        }
    },
    showNotification: (msg, type) => {
        console.log(`   [NOTIFICATION ${type.toUpperCase()}]: ${msg}`);
    }
};

global.Blob = class { constructor(parts, opts) { this.parts = parts; this.type = opts?.type; } };
global.URL = {
    createObjectURL: () => 'blob:mock-url',
    revokeObjectURL: () => {}
};

// Load code
const lineageCode = fs.readFileSync('static/lineage_graph.js', 'utf8');
eval(lineageCode);

// Mock Dataset
const mockInspectData = {
    dataset_name: 'Pharma_SFE_Model',
    datasources: [
        { datasourceType: 'PostgreSQL', server: 'postgres.corp.internal', database: 'bi_dw' }
    ],
    relationships: [
        { fromTable: 'Fact_Sales', fromColumn: 'TerritoryID', toTable: 'Dim_Territory', toColumn: 'ID', isActive: true }
    ],
    tables: [
        {
            tableName: 'Dim_Territory',
            mode: 'Import',
            columnsCount: 10,
            server: 'postgres.corp.internal',
            database: 'bi_dw',
            mExpression: 'let Source = PostgreSQL.Database("postgres.corp.internal", "bi_dw") in Source'
        },
        {
            tableName: 'Fact_Sales',
            mode: 'Import',
            columnsCount: 30,
            server: 'postgres.corp.internal',
            database: 'bi_dw',
            mExpression: 'let Source = PostgreSQL.Database("postgres.corp.internal", "bi_dw"), Joined = Table.NestedJoin(Source, {"TerritoryID"}, #"Dim_Territory", {"ID"}, "T", JoinKind.Inner) in Joined'
        }
    ]
};

// 1. Test openModal
console.log('1. Testing openModal()...');
window.LineageExplorer.openModal(mockInspectData);
assert(mockBody.children.length > 0, 'Modal overlay should be appended to body');

// 2. Test recursive lineage highlight (Click Fact_Sales)
console.log('2. Testing recursive lineage highlighting...');
const parsed = window.LineageExplorer.parseLineage(mockInspectData);
assert(parsed.nodes.length >= 3, 'Nodes should have datasource + 2 tables');

// Simulate highlighting 'tbl_fact_sales'
window.LineageExplorer.highlightLineage('tbl_fact_sales');

// 3. Test Reset Highlighting
console.log('3. Testing resetHighlight()...');
window.LineageExplorer.resetHighlight();

// 4. Test View Switching to Table
console.log('4. Testing switchView("table")...');
window.LineageExplorer.switchView('table');
const tblContainer = document.getElementById('lineage-table-content');
assert(tblContainer.innerHTML.length > 0, 'Table container should be populated with lineage rows');

// 5. Test Table Search Filter
console.log('5. Testing onTableSearch()...');
window.LineageExplorer.onTableSearch('TerritoryID');
assert(tblContainer.innerHTML.includes('TerritoryID'), 'Search filter should retain matching rows');
window.LineageExplorer.onTableSearch(''); // Clear filter

// 6. Test Universal Table Sorting
console.log('6. Testing Universal Table Sorting...');
window.LineageExplorer.sortLineageTable('srcName');
assert(tblContainer.innerHTML.includes('↑'), 'Table should display ascending sort indicator');
window.LineageExplorer.sortLineageTable('srcName');
assert(tblContainer.innerHTML.includes('↓'), 'Table should display descending sort indicator');
window.LineageExplorer.resetTableSort();

// 7. Test Column Visibility Toggling
console.log('7. Testing Column Visibility Toggling...');
window.LineageExplorer.toggleColumnVisibility('joinKeys', false);
assert(!tblContainer.innerHTML.includes('data-col="joinKeys"'), 'joinKeys column should be hidden');
window.LineageExplorer.toggleColumnVisibility('joinKeys', true);
assert(tblContainer.innerHTML.includes('data-col="joinKeys"'), 'joinKeys column should be restored');

// 8. Test No-Wrap Defense on Badges
console.log('8. Testing No-Wrap Defense on Badges...');
assert(tblContainer.innerHTML.includes('white-space: nowrap'), 'Badges and cells must have white-space: nowrap to prevent wrapping');

// 9. Test Excel Export
console.log('9. Testing exportLineageExcel()...');
window.LineageExplorer.exportLineageExcel();

// 10. Test Image Export
console.log('10. Testing exportDAGImage()...');
window.LineageExplorer.exportDAGImage();

// 11. Test Zoom Controls
console.log('11. Testing zoomIn() and zoomOut()...');
window.LineageExplorer.zoomIn();
window.LineageExplorer.zoomOut();

console.log('✅ TEST ANGLE 3 PASSED: Full Lifecycle Browser DOM, Highlighting, Dual-View, Universal Table & Export Successful!');

