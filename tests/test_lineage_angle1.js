const assert = require('assert');
const fs = require('fs');

// Load lineage_graph.js
const lineageCode = fs.readFileSync('static/lineage_graph.js', 'utf8');

// Mock browser globals
global.window = {
    vis: {
        DataSet: class {
            constructor(items) { this.items = items; }
            update(updated) {}
        }
    }
};
global.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
global.document = {};

// Evaluate code
eval(lineageCode);

console.log('--- TEST ANGLE 1: Lineage Parser & Graph Logic Tests ---');

// Mock dataset with complex real-world M expressions
const mockData = {
    dataset_name: 'Enterprise_Sales_Model',
    datasources: [
        { datasourceType: 'PostgreSQL', server: 'postgres.corp.internal', database: 'bi_dw' },
        { datasourceType: 'SQL Server', server: 'sql01.database.windows.net', database: 'crm_db' }
    ],
    relationships: [
        { fromTable: 'Fact_Sales', fromColumn: 'CustomerID', toTable: 'Dim_Customer', toColumn: 'ID', isActive: true },
        { fromTable: 'Fact_Sales', fromColumn: 'ProductKey', toTable: 'Dim_Product', toColumn: 'ProdID', isActive: true }
    ],
    tables: [
        {
            tableName: 'Dim_Customer',
            mode: 'Import',
            columnsCount: 15,
            server: 'postgres.corp.internal',
            database: 'bi_dw',
            mExpression: 'let Source = PostgreSQL.Database("postgres.corp.internal", "bi_dw"), Data = Source{[Schema="public",Item="dim_customer"]}[Data] in Data'
        },
        {
            tableName: 'Dim_Product',
            mode: 'Import',
            columnsCount: 8,
            server: 'sql01.database.windows.net',
            database: 'crm_db',
            mExpression: 'let Source = Sql.Database("sql01.database.windows.net", "crm_db"), Data = Source{[Schema="dbo",Item="dim_product"]}[Data] in Data'
        },
        {
            tableName: 'Staging_Online_Orders',
            mode: 'DirectQuery',
            columnsCount: 20,
            server: 'postgres.corp.internal',
            database: 'bi_dw',
            mExpression: 'let Source = PostgreSQL.Database("postgres.corp.internal", "bi_dw"), Data = Source{[Schema="public",Item="stg_online_orders"]}[Data] in Data'
        },
        {
            tableName: 'Staging_Store_Orders',
            mode: 'DirectQuery',
            columnsCount: 20,
            server: 'postgres.corp.internal',
            database: 'bi_dw',
            mExpression: 'let Source = PostgreSQL.Database("postgres.corp.internal", "bi_dw"), Data = Source{[Schema="public",Item="stg_store_orders"]}[Data] in Data'
        },
        {
            tableName: 'Fact_Sales',
            mode: 'Composite',
            columnsCount: 25,
            mExpression: 'let Combined = Table.Combine({#"Staging_Online_Orders", #"Staging_Store_Orders"}), Merged = Table.NestedJoin(Combined, {"CustomerID"}, #"Dim_Customer", {"ID"}, "CustDetail", JoinKind.LeftOuter) in Merged'
        }
    ]
};

const parsed = window.LineageExplorer.parseLineage(mockData);
console.log('1. Nodes count:', parsed.nodes.length);
console.log('2. Edges count:', parsed.edges.length);

assert(parsed.nodes.length >= 7, 'Should contain 2 datasources + 5 tables');
assert(parsed.edges.length >= 7, 'Should extract extract, combine, nestedJoin and relationship edges');

// Verify Join Keys extraction in Table.NestedJoin
const mergeEdge = parsed.edges.find(e => e.type === 'merge' && e.joinKeys.includes('CustomerID'));
console.log('3. Merge edge verified with Join Keys:', mergeEdge ? mergeEdge.joinKeys : 'NONE');
assert(mergeEdge, 'Table.NestedJoin join keys must be extracted');
assert.strictEqual(mergeEdge.joinKeys, '[CustomerID] ↔ [ID]');

// Verify Table.Combine append edges
const appendEdges = parsed.edges.filter(e => e.type === 'append');
console.log('4. Append edges count (Table.Combine):', appendEdges.length);
assert.strictEqual(appendEdges.length, 2, 'Table.Combine must produce 2 append edges');

// Verify Model Relationships
const relEdges = parsed.edges.filter(e => e.type === 'relationship');
console.log('5. Model Relationship edges count:', relEdges.length);
assert.strictEqual(relEdges.length, 2, 'Model relationships must produce 2 edges');

// Verify Physical Datasource extraction edges
const extractEdges = parsed.edges.filter(e => e.type === 'extract');
console.log('6. Physical Datasource extract edges count:', extractEdges.length);
assert(extractEdges.length >= 4, 'Physical datasources must produce extract edges to tables');

console.log('✅ TEST ANGLE 1 PASSED: M Lineage Parser & Topological Graph Verification Complete!');
