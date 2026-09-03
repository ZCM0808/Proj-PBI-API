/**
 * Power BI 报表与语义模型全景数据血缘 DAG 拓扑看板 (Lineage DAG Explorer)
 * 具备功能：
 *   1. M 语言表达式深度语义解析：精准提取 Table.NestedJoin, Table.Join, Table.Combine, 引用与外部物理数据源
 *   2. 双模式视图切换：DAG 拓扑关系图 (Canvas / Vis-Network) 与 结构化血缘明细表格 (Grid Table)
 *   3. 交互式血缘追踪高亮：点击任一节点，递归高亮其完整上游溯源链与下游影响链，弱化无关节点
 *   4. 字段级血缘关联穿透：在连线与浮窗中高清晰呈现关联键与字段对
 *   5. 双向导出能力：一键导出高清拓扑图 (PNG) 以及导出结构化血缘关系表为 Excel (.xlsx)
 */

window.LineageExplorer = (function() {
    let currentNetwork = null;
    let currentNodesDataset = null;
    let currentEdgesDataset = null;
    let currentParsedData = null;
    let activeHighlightNodeId = null;
    let currentViewMode = 'dag'; // 'dag' | 'table'

    // =========================================================================
    // 1. M 语言与模型关系血缘抽取核心算法 (M Lineage Parser)
    // =========================================================================
    function parseLineage(inspectData) {
        if (!inspectData || !Array.isArray(inspectData.tables)) {
            return { nodes: [], edges: [], tableList: [] };
        }

        const tables = inspectData.tables;
        const datasources = inspectData.datasources || [];
        const relationships = inspectData.relationships || [];
        const datasetName = inspectData.dataset_name || 'Semantic Model';

        const nodesMap = new Map();
        const edges = [];
        const edgeDedupe = new Set();

        const addEdge = (fromId, toId, type, label, joinKeys, detail) => {
            const edgeKey = `${fromId}-->${toId}:${type}:${joinKeys || ''}`;
            if (edgeDedupe.has(edgeKey)) return;
            edgeDedupe.add(edgeKey);

            edges.push({
                id: `e_${edges.length + 1}`,
                from: fromId,
                to: toId,
                type: type, // 'extract' | 'merge' | 'append' | 'reference' | 'relationship'
                label: label || '',
                joinKeys: joinKeys || '-',
                detail: detail || '',
                arrows: { to: { enabled: true, scaleFactor: 0.9 } },
                font: { size: 10, align: 'middle', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.85)', strokeWidth: 0 },
                color: { color: '#64748b', highlight: '#fbbf24', hover: '#38bdf8', opacity: 0.85 },
                width: 1.8,
                smooth: { type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.25 }
            });
        };

        // 1. 注册物理数据源节点 (Physical Datasource Nodes)
        datasources.forEach((ds, idx) => {
            const dsType = ds.datasourceType || 'Database';
            const server = ds.server || (ds.url ? (function(){ try { return new URL(ds.url).hostname; } catch(e){ return ds.url; } })() : 'External Server');
            const db = ds.database || '';
            const dsId = `ds_${idx + 1}_${server}_${db}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            const dsName = db ? `${dsType}\n[${server}/${db}]` : `${dsType}\n[${server}]`;

            nodesMap.set(dsId, {
                id: dsId,
                label: `🗄️ ${dsName}`,
                nodeType: 'datasource',
                group: 'datasource',
                shape: 'box',
                margin: 10,
                color: { background: '#78350f', border: '#f59e0b', highlight: { background: '#92400e', border: '#fbbf24' } },
                font: { color: '#fef3c7', size: 11, face: 'system-ui, -apple-system, sans-serif' },
                shadow: { enabled: true, color: 'rgba(245, 158, 11, 0.25)', size: 8 },
                raw: ds
            });
        });

        // 2. 注册所有表节点 (Table Nodes)
        tables.forEach((t) => {
            const tId = `tbl_${t.tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
            const mode = (t.mode || 'Import').toLowerCase();
            let bgColor = '#065f46';
            let borderColor = '#10b981';
            let badgeIcon = '🟢';

            if (mode.includes('directquery')) {
                bgColor = '#1e3a8a';
                borderColor = '#3b82f6';
                badgeIcon = '⚡';
            } else if (mode.includes('composite') || mode.includes('dual')) {
                bgColor = '#4c1d95';
                borderColor = '#8b5cf6';
                badgeIcon = '🟣';
            } else if (mode.includes('live')) {
                bgColor = '#164e63';
                borderColor = '#06b6d4';
                badgeIcon = '🌐';
            }

            nodesMap.set(tId, {
                id: tId,
                label: `${badgeIcon} ${t.tableName}\n(${t.columnsCount || 0} 列)`,
                nodeType: 'table',
                group: 'table',
                tableName: t.tableName,
                shape: 'box',
                margin: 10,
                color: { background: bgColor, border: borderColor, highlight: { background: '#312e81', border: '#6366f1' } },
                font: { color: '#ffffff', size: 12, face: 'system-ui, -apple-system, sans-serif' },
                shadow: { enabled: true, color: 'rgba(0, 0, 0, 0.3)', size: 6 },
                raw: t
            });
        });

        // 辅助：从表名获取节点 ID
        const getTableNodeId = (name) => {
            if (!name) return null;
            const cleanName = name.replace(/^#"|"$/g, '').trim().toLowerCase();
            const matched = tables.find(t => t.tableName.toLowerCase() === cleanName);
            return matched ? `tbl_${matched.tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}` : null;
        };

        // 3. 深度解析每个表的 M 表达式 (Power Query M Parser)
        tables.forEach((t) => {
            const curId = `tbl_${t.tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
            const m = t.mExpression || '';

            // A. 数据源连接抽取关系 (Extract Lineage)
            if (t.server || t.database) {
                let matchedDsId = null;
                for (const [dsId, dsNode] of nodesMap.entries()) {
                    if (dsNode.nodeType === 'datasource') {
                        const raw = dsNode.raw;
                        if ((t.server && raw.server && raw.server.toLowerCase() === t.server.toLowerCase()) ||
                            (t.database && raw.database && raw.database.toLowerCase() === t.database.toLowerCase())) {
                            matchedDsId = dsId;
                            break;
                        }
                    }
                }
                if (!matchedDsId) {
                    const sName = t.server || 'Server';
                    const dName = t.database || '';
                    matchedDsId = `ds_auto_${sName}_${dName}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                    if (!nodesMap.has(matchedDsId)) {
                        nodesMap.set(matchedDsId, {
                            id: matchedDsId,
                            label: `🗄️ ${t.sourceType || 'Database'}\n[${sName}${dName ? '/' + dName : ''}]`,
                            nodeType: 'datasource',
                            group: 'datasource',
                            shape: 'box',
                            margin: 10,
                            color: { background: '#78350f', border: '#f59e0b' },
                            font: { color: '#fef3c7', size: 11 },
                            raw: { server: sName, database: dName, datasourceType: t.sourceType }
                        });
                    }
                }
                addEdge(matchedDsId, curId, 'extract', '抽取 (Extract)', '-', t.nativeSql ? '原生 SQL (Native Query)' : '表对象抽取');
            }

            if (!m) return;

            // B. 解析 Table.NestedJoin (Merge / 合并血缘)
            const nestedJoinRegex = /Table\.NestedJoin\s*\(\s*(?:#"?([^",\r\n]+)"?|([A-Za-z0-9_]+))\s*,\s*(\{[^}]*\}|"[^"]*")\s*,\s*(?:#"?([^",\r\n]+)"?|([A-Za-z0-9_]+))\s*,\s*(\{[^}]*\}|"[^"]*")/gi;
            let joinMatch;
            while ((joinMatch = nestedJoinRegex.exec(m)) !== null) {
                const leftTable = joinMatch[1] || joinMatch[2];
                const leftKeys = (joinMatch[3] || '').replace(/[\{\}"]/g, '').trim();
                const rightTable = joinMatch[4] || joinMatch[5];
                const rightKeys = (joinMatch[6] || '').replace(/[\{\}"]/g, '').trim();

                const rightNodeId = getTableNodeId(rightTable);
                if (rightNodeId && rightNodeId !== curId) {
                    const keysDisplay = `[${leftKeys}] ↔ [${rightKeys}]`;
                    addEdge(rightNodeId, curId, 'merge', `合并: ${keysDisplay}`, keysDisplay, `Table.NestedJoin: ${leftTable} 合并 ${rightTable}`);
                }
                const leftNodeId = getTableNodeId(leftTable);
                if (leftNodeId && leftNodeId !== curId) {
                    addEdge(leftNodeId, curId, 'merge', '合并底表 (Base)', '-', `Table.NestedJoin 主表`);
                }
            }

            // C. 解析 Table.Join (平面关联)
            const flatJoinRegex = /Table\.Join\s*\(\s*(?:#"?([^",\r\n]+)"?|([A-Za-z0-9_]+))\s*,\s*(\{[^}]*\}|"[^"]*")\s*,\s*(?:#"?([^",\r\n]+)"?|([A-Za-z0-9_]+))\s*,\s*(\{[^}]*\}|"[^"]*")/gi;
            let flatMatch;
            while ((flatMatch = flatJoinRegex.exec(m)) !== null) {
                const leftTable = flatMatch[1] || flatMatch[2];
                const leftKeys = (flatMatch[3] || '').replace(/[\{\}"]/g, '').trim();
                const rightTable = flatMatch[4] || flatMatch[5];
                const rightKeys = (flatMatch[6] || '').replace(/[\{\}"]/g, '').trim();

                const rightNodeId = getTableNodeId(rightTable);
                if (rightNodeId && rightNodeId !== curId) {
                    const keysDisplay = `[${leftKeys}] ↔ [${rightKeys}]`;
                    addEdge(rightNodeId, curId, 'merge', `关联: ${keysDisplay}`, keysDisplay, `Table.Join: 关联字段 ${keysDisplay}`);
                }
            }

            // D. 解析 Table.Combine (Append / 追加合并血缘)
            const combineRegex = /Table\.Combine\s*\(\s*\{([^}]+)\}/gi;
            let combineMatch;
            while ((combineMatch = combineRegex.exec(m)) !== null) {
                const tablesListStr = combineMatch[1];
                const tableItems = tablesListStr.split(',').map(s => s.replace(/#"?|"|\s/g, '').trim());
                tableItems.forEach(srcTbl => {
                    const srcNodeId = getTableNodeId(srcTbl);
                    if (srcNodeId && srcNodeId !== curId) {
                        addEdge(srcNodeId, curId, 'append', '追加 (Append)', '-', `Table.Combine: 行级联合并`);
                    }
                });
            }

            // E. 解析直接表引用 (Source = #"OtherTable")
            const refRegex = /Source\s*=\s*#"?([^",\r\n\(\)]+)"?/gi;
            let refMatch;
            while ((refMatch = refRegex.exec(m)) !== null) {
                const refName = refMatch[1].trim();
                const refNodeId = getTableNodeId(refName);
                if (refNodeId && refNodeId !== curId) {
                    addEdge(refNodeId, curId, 'reference', '引用 (Reference)', '-', `Source = #"${refName}"`);
                }
            }
        });

        // 4. 解析数据模型关系 (Semantic Model Relationships - 1:多、主外键)
        relationships.forEach(rel => {
            const fromTblNode = getTableNodeId(rel.fromTable);
            const toTblNode = getTableNodeId(rel.toTable);
            if (fromTblNode && toTblNode && fromTblNode !== toTblNode) {
                const keysDisplay = `[${rel.fromTable}.${rel.fromColumn}] ↔ [${rel.toTable}.${rel.toColumn}]`;
                addEdge(fromTblNode, toTblNode, 'relationship', `模型关系: ${rel.fromColumn} ↔ ${rel.toColumn}`, keysDisplay, `语义模型物理关系 (Cardinality / Filtering)`);
            }
        });

        return {
            nodes: Array.from(nodesMap.values()),
            edges: edges,
            datasetName: datasetName,
            totalTables: tables.length,
            totalDatasources: datasources.length
        };
    }

    // =========================================================================
    // 2. DAG 图形渲染与高亮追踪引擎 (Vis-Network Controller)
    // =========================================================================
    function renderNetwork(containerEl, parsedData) {
        const visLib = window.vis || (typeof vis !== 'undefined' ? vis : null);
        if (!visLib || !visLib.Network) {
            containerEl.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); gap: 12px;">
                    <div style="font-size: 1.5rem;">⚠️</div>
                    <div>Vis.js 拓扑引擎库加载中，请稍候...</div>
                </div>
            `;
            return;
        }

        currentParsedData = parsedData;
        const nodesData = parsedData.nodes.map(n => ({ ...n }));
        const edgesData = parsedData.edges.map(e => ({ ...e }));

        currentNodesDataset = new visLib.DataSet(nodesData);
        currentEdgesDataset = new visLib.DataSet(edgesData);

        const data = {
            nodes: currentNodesDataset,
            edges: currentEdgesDataset
        };

        const options = {
            layout: {
                hierarchical: {
                    enabled: true,
                    direction: 'LR',
                    sortMethod: 'directed',
                    levelSeparation: 240,
                    nodeSpacing: 140,
                    treeSpacing: 180,
                    blockShifting: true,
                    edgeMinimization: true
                }
            },
            interaction: {
                hover: true,
                dragNodes: true,
                zoomView: true,
                dragView: true,
                navigationButtons: true,
                keyboard: true
            },
            physics: {
                enabled: false
            }
        };

        currentNetwork = new visLib.Network(containerEl, data, options);

        // 监听节点点击事件：高亮上下游血缘
        currentNetwork.on('click', function(params) {
            if (params.nodes.length > 0) {
                const clickedNodeId = params.nodes[0];
                highlightLineage(clickedNodeId);
            } else {
                resetHighlight();
            }
        });

        // 双击自适应
        currentNetwork.on('doubleClick', function() {
            currentNetwork.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
        });
    }

    // 递归高亮上游溯源与下游影响链
    function highlightLineage(targetNodeId) {
        if (!currentNodesDataset || !currentEdgesDataset || !currentParsedData) return;
        activeHighlightNodeId = targetNodeId;

        const allNodes = currentParsedData.nodes;
        const allEdges = currentParsedData.edges;

        // 1. 递归向上溯源 (Upstream Ancestors)
        const upstreamNodes = new Set([targetNodeId]);
        const upstreamEdges = new Set();
        let queue = [targetNodeId];
        while (queue.length > 0) {
            const curr = queue.shift();
            allEdges.forEach(e => {
                if (e.to === curr && !upstreamNodes.has(e.from)) {
                    upstreamNodes.add(e.from);
                    upstreamEdges.add(e.id);
                    queue.push(e.from);
                } else if (e.to === curr && upstreamNodes.has(e.from)) {
                    upstreamEdges.add(e.id);
                }
            });
        }

        // 2. 递归向下影响 (Downstream Descendants)
        const downstreamNodes = new Set([targetNodeId]);
        const downstreamEdges = new Set();
        queue = [targetNodeId];
        while (queue.length > 0) {
            const curr = queue.shift();
            allEdges.forEach(e => {
                if (e.from === curr && !downstreamNodes.has(e.to)) {
                    downstreamNodes.add(e.to);
                    downstreamEdges.add(e.id);
                    queue.push(e.to);
                } else if (e.from === curr && downstreamNodes.has(e.to)) {
                    downstreamEdges.add(e.id);
                }
            });
        }

        // 3. 更新所有节点外观状态
        const updatedNodes = allNodes.map(n => {
            const isTarget = n.id === targetNodeId;
            const isUp = upstreamNodes.has(n.id);
            const isDown = downstreamNodes.has(n.id);

            if (isTarget) {
                return {
                    id: n.id,
                    opacity: 1.0,
                    color: { background: '#4338ca', border: '#818cf8', highlight: { background: '#4f46e5', border: '#a5b4fc' } },
                    shadow: { enabled: true, color: '#818cf8', size: 16 }
                };
            } else if (isUp) {
                return {
                    id: n.id,
                    opacity: 1.0,
                    color: { background: '#78350f', border: '#f59e0b', highlight: { background: '#92400e', border: '#fbbf24' } },
                    shadow: { enabled: true, color: '#f59e0b', size: 12 }
                };
            } else if (isDown) {
                return {
                    id: n.id,
                    opacity: 1.0,
                    color: { background: '#0e7490', border: '#22d3ee', highlight: { background: '#155e75', border: '#67e8f9' } },
                    shadow: { enabled: true, color: '#22d3ee', size: 12 }
                };
            } else {
                return {
                    id: n.id,
                    opacity: 0.15,
                    color: { background: '#1e293b', border: '#334155' },
                    shadow: { enabled: false }
                };
            }
        });

        // 4. 更新所有连线外观状态
        const updatedEdges = allEdges.map(e => {
            const isUp = upstreamEdges.has(e.id);
            const isDown = downstreamEdges.has(e.id);

            if (isUp) {
                return {
                    id: e.id,
                    width: 3.5,
                    color: { color: '#f59e0b', highlight: '#fbbf24', opacity: 1.0 },
                    shadow: { enabled: true, color: '#f59e0b', size: 6 }
                };
            } else if (isDown) {
                return {
                    id: e.id,
                    width: 3.5,
                    color: { color: '#22d3ee', highlight: '#67e8f9', opacity: 1.0 },
                    shadow: { enabled: true, color: '#22d3ee', size: 6 }
                };
            } else {
                return {
                    id: e.id,
                    width: 0.8,
                    color: { color: '#334155', opacity: 0.1 },
                    shadow: { enabled: false }
                };
            }
        });

        currentNodesDataset.update(updatedNodes);
        currentEdgesDataset.update(updatedEdges);

        // 5. 更新侧边详情看板 (Side Infobar)
        updateLineageSidePanel(targetNodeId, upstreamNodes, downstreamNodes, allEdges, allNodes);
    }

    // 重置高亮状态
    function resetHighlight() {
        if (!currentNodesDataset || !currentEdgesDataset || !currentParsedData) return;
        activeHighlightNodeId = null;

        const originalNodes = currentParsedData.nodes.map(n => ({
            id: n.id,
            opacity: 1.0,
            color: n.color,
            shadow: n.shadow || { enabled: true, color: 'rgba(0,0,0,0.2)', size: 4 }
        }));

        const originalEdges = currentParsedData.edges.map(e => ({
            id: e.id,
            width: e.width || 1.8,
            color: e.color,
            shadow: { enabled: false }
        }));

        currentNodesDataset.update(originalNodes);
        currentEdgesDataset.update(originalEdges);

        const sidePanel = document.getElementById('lineage-side-infobar');
        if (sidePanel) {
            sidePanel.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); text-align: center; gap: 8px; padding: 16px;">
                    <div style="font-size: 1.8rem; opacity: 0.6;">💡</div>
                    <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">交互式血缘追踪模式已就绪</div>
                    <div style="font-size: 0.75rem; opacity: 0.8; line-height: 1.4;">
                        点击画布中的任意表或数据源节点，即可自动递归高亮其<span style="color: #f59e0b; font-weight: bold;">【上游数据溯源】</span>与<span style="color: #22d3ee; font-weight: bold;">【下游影响链】</span>。
                    </div>
                </div>
            `;
        }
    }

    // 更新侧边详情面板
    function updateLineageSidePanel(targetNodeId, upstreamNodes, downstreamNodes, allEdges, allNodes) {
        const sidePanel = document.getElementById('lineage-side-infobar');
        if (!sidePanel) return;

        const targetNode = allNodes.find(n => n.id === targetNodeId);
        if (!targetNode) return;

        const raw = targetNode.raw || {};
        const isTable = targetNode.nodeType === 'table';

        const directUpEdges = allEdges.filter(e => e.to === targetNodeId);
        const directDownEdges = allEdges.filter(e => e.from === targetNodeId);

        let upHtml = directUpEdges.length === 0 ? '<div style="font-size:0.75rem;color:var(--text-secondary);opacity:0.7;">(无上游依赖，此为根数据源/初始表)</div>' : directUpEdges.map(e => {
            const srcNode = allNodes.find(n => n.id === e.from);
            const srcName = srcNode ? (srcNode.tableName || srcNode.label.split('\n')[0]) : e.from;
            return `
                <div style="background: var(--input-bg); border: 1px solid var(--panel-border); border-left: 3px solid #f59e0b; border-radius: 4px; padding: 6px 10px; font-size: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; color: var(--text-primary);">${srcName}</span>
                        <span class="badge" style="font-size: 0.68rem; background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid #f59e0b; padding: 1px 4px;">${e.type.toUpperCase()}</span>
                    </div>
                    ${e.joinKeys && e.joinKeys !== '-' ? `<div style="font-family: monospace; font-size: 0.72rem; color: var(--accent); margin-top: 3px;">🔗 关联键: ${e.joinKeys}</div>` : ''}
                    <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">${e.detail || ''}</div>
                </div>
            `;
        }).join('');

        let downHtml = directDownEdges.length === 0 ? '<div style="font-size:0.75rem;color:var(--text-secondary);opacity:0.7;">(无下游依赖，此为终端终态表)</div>' : directDownEdges.map(e => {
            const dstNode = allNodes.find(n => n.id === e.to);
            const dstName = dstNode ? (dstNode.tableName || dstNode.label.split('\n')[0]) : e.to;
            return `
                <div style="background: var(--input-bg); border: 1px solid var(--panel-border); border-left: 3px solid #22d3ee; border-radius: 4px; padding: 6px 10px; font-size: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; color: var(--text-primary);">${dstName}</span>
                        <span class="badge" style="font-size: 0.68rem; background: rgba(34, 211, 238, 0.15); color: #22d3ee; border: 1px solid #22d3ee; padding: 1px 4px;">${e.type.toUpperCase()}</span>
                    </div>
                    ${e.joinKeys && e.joinKeys !== '-' ? `<div style="font-family: monospace; font-size: 0.72rem; color: var(--accent); margin-top: 3px;">🔗 关联键: ${e.joinKeys}</div>` : ''}
                    <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">${e.detail || ''}</div>
                </div>
            `;
        }).join('');

        sidePanel.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px; height: 100%;">
                <!-- 头部选中信息 -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--panel-border); padding-bottom: 8px;">
                    <div>
                        <div style="font-size: 0.95rem; font-weight: bold; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                            <span>${targetNode.label.split('\n')[0]}</span>
                        </div>
                        <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 2px;">
                            ${isTable ? `类型: 数据模型表 | 模式: ${raw.mode || 'Import'} | 列数: ${raw.columnsCount || 0}` : '类型: 物理底层数据源'}
                        </div>
                    </div>
                    <button type="button" class="btn-wf-sm btn-wf-secondary" onclick="window.LineageExplorer.resetHighlight()" title="清除聚焦高亮" style="padding: 2px 6px; font-size: 0.72rem;">✕ 清除</button>
                </div>

                <!-- 统计徽章 -->
                <div style="display: flex; gap: 8px; font-size: 0.75rem;">
                    <div style="flex: 1; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 4px; padding: 6px; text-align: center;">
                        <div style="color: #f59e0b; font-weight: bold; font-size: 0.95rem;">${upstreamNodes.size - 1}</div>
                        <div style="color: var(--text-secondary); font-size: 0.68rem;">上游溯源总数</div>
                    </div>
                    <div style="flex: 1; background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3); border-radius: 4px; padding: 6px; text-align: center;">
                        <div style="color: #22d3ee; font-weight: bold; font-size: 0.95rem;">${downstreamNodes.size - 1}</div>
                        <div style="color: var(--text-secondary); font-size: 0.68rem;">下游影响总数</div>
                    </div>
                </div>

                <!-- 直接上游 -->
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <div style="font-size: 0.78rem; font-weight: bold; color: #f59e0b; display: flex; align-items: center; gap: 4px;">
                        <span>🔼 直接输入源 (Direct Sources):</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px; max-height: 140px; overflow-y: auto;">
                        ${upHtml}
                    </div>
                </div>

                <!-- 直接下游 -->
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <div style="font-size: 0.78rem; font-weight: bold; color: #22d3ee; display: flex; align-items: center; gap: 4px;">
                        <span>🔽 直接输出依赖 (Direct Dependents):</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px; max-height: 140px; overflow-y: auto;">
                        ${downHtml}
                    </div>
                </div>

                ${isTable && raw.mExpression ? `
                    <div style="display: flex; flex-direction: column; gap: 4px; margin-top: auto; padding-top: 8px; border-top: 1px solid var(--panel-border);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary);">📜 M 表达式核心步骤:</span>
                            <button type="button" class="btn-wf-sm btn-wf-secondary" style="padding: 1px 6px; font-size: 0.7rem;" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(raw.mExpression)}')); if(window.showNotification) window.showNotification('📋 M 表达式已复制', 'success');">复制 M</button>
                        </div>
                        <pre style="background: var(--input-bg); border: 1px solid var(--panel-border); border-radius: 4px; padding: 6px; font-family: monospace; font-size: 0.7rem; color: #4ec9b0; max-height: 90px; overflow-y: auto; white-space: pre-wrap; margin: 0;">${raw.mExpression.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // =========================================================================
    // 3. 结构化血缘明细表格渲染 (Lineage Table View)
    // =========================================================================
    function renderLineageTable(containerEl, parsedData, searchFilter = '') {
        const edges = parsedData.edges;
        const nodes = parsedData.nodes;
        const q = (searchFilter || '').toLowerCase().trim();

        const filtered = edges.filter(e => {
            if (!q) return true;
            const srcNode = nodes.find(n => n.id === e.from);
            const dstNode = nodes.find(n => n.id === e.to);
            const srcName = srcNode ? (srcNode.tableName || srcNode.label) : e.from;
            const dstName = dstNode ? (dstNode.tableName || dstNode.label) : e.to;
            return srcName.toLowerCase().includes(q) ||
                   dstName.toLowerCase().includes(q) ||
                   e.type.toLowerCase().includes(q) ||
                   (e.joinKeys && e.joinKeys.toLowerCase().includes(q)) ||
                   (e.detail && e.detail.toLowerCase().includes(q));
        });

        if (filtered.length === 0) {
            containerEl.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); gap: 8px;">
                    <div style="font-size: 1.5rem;">🔍</div>
                    <div>未找到匹配的血缘关系记录</div>
                </div>
            `;
            return;
        }

        const rowsHtml = filtered.map((e, idx) => {
            const srcNode = nodes.find(n => n.id === e.from);
            const dstNode = nodes.find(n => n.id === e.to);
            const srcName = srcNode ? (srcNode.tableName || srcNode.label.replace('\n', ' ')) : e.from;
            const dstName = dstNode ? (dstNode.tableName || dstNode.label.replace('\n', ' ')) : e.to;

            let typeBadge = '';
            switch(e.type) {
                case 'extract':
                    typeBadge = '<span class="badge" style="border: 1px solid #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">🗄️ EXTRACT (抽取)</span>';
                    break;
                case 'merge':
                    typeBadge = '<span class="badge" style="border: 1px solid #3b82f6; color: #3b82f6; background: rgba(59,130,246,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">⚡ MERGE (合并)</span>';
                    break;
                case 'append':
                    typeBadge = '<span class="badge" style="border: 1px solid #8b5cf6; color: #8b5cf6; background: rgba(139,92,246,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">🟣 APPEND (追加)</span>';
                    break;
                case 'reference':
                    typeBadge = '<span class="badge" style="border: 1px solid #06b6d4; color: #06b6d4; background: rgba(6,182,212,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">🔗 REFERENCE (引用)</span>';
                    break;
                case 'relationship':
                    typeBadge = '<span class="badge" style="border: 1px solid #ec4899; color: #ec4899; background: rgba(236,72,153,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">🧬 MODEL REL (关系)</span>';
                    break;
                default:
                    typeBadge = `<span class="badge" style="border: 1px solid var(--accent); color: var(--accent); padding: 2px 6px; border-radius: 4px; font-size: 0.72rem;">${e.type}</span>`;
            }

            return `
                <tr style="border-bottom: 1px solid var(--panel-border); transition: background 0.15s ease;">
                    <td style="padding: 10px 12px; font-family: monospace; color: var(--text-secondary); text-align: center;">${idx + 1}</td>
                    <td style="padding: 10px 12px; font-weight: 600; color: var(--text-primary);">${srcName}</td>
                    <td style="padding: 10px 12px; text-align: center; color: var(--text-secondary); font-size: 0.8rem;">➔</td>
                    <td style="padding: 10px 12px; font-weight: 600; color: var(--text-primary);">${dstName}</td>
                    <td style="padding: 10px 12px;">${typeBadge}</td>
                    <td style="padding: 10px 12px; font-family: monospace; font-size: 0.75rem; color: var(--accent); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${e.joinKeys}">${e.joinKeys}</td>
                    <td style="padding: 10px 12px; font-size: 0.75rem; color: var(--text-secondary); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${e.detail}">${e.detail}</td>
                </tr>
            `;
        }).join('');

        containerEl.innerHTML = `
            <div style="height: 100%; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left;">
                    <thead style="position: sticky; top: 0; background: var(--panel-bg); z-index: 10; border-bottom: 2px solid var(--panel-border);">
                        <tr>
                            <th style="padding: 10px 12px; width: 45px; text-align: center;">#</th>
                            <th style="padding: 10px 12px;">源节点 (Source Node)</th>
                            <th style="padding: 10px 12px; width: 30px; text-align: center;">流向</th>
                            <th style="padding: 10px 12px;">目标节点 (Target Node)</th>
                            <th style="padding: 10px 12px; width: 140px;">血缘关联类型</th>
                            <th style="padding: 10px 12px;">关联字段/键 (Join Keys)</th>
                            <th style="padding: 10px 12px;">转换细节 / 步骤</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }

    // =========================================================================
    // 4. 双向多格式导出功能 (PNG Image & Excel Export)
    // =========================================================================
    function exportDAGImage() {
        if (!currentNetwork) {
            if (window.showNotification) window.showNotification('DAG 画布尚未就绪，无法导出图片', 'warning');
            return;
        }

        try {
            const canvas = currentNetwork.canvas.frame.canvas;
            if (!canvas) {
                if (window.showNotification) window.showNotification('未能获取 Canvas 渲染层', 'error');
                return;
            }

            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = canvas.width;
            exportCanvas.height = canvas.height;
            const ctx = exportCanvas.getContext('2d');

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            ctx.drawImage(canvas, 0, 0);

            ctx.fillStyle = '#64748b';
            ctx.font = '12px sans-serif';
            ctx.fillText(`Power BI Lineage DAG • ${currentParsedData?.datasetName || 'Dataset'} • Generated on ${new Date().toLocaleString()}`, 16, exportCanvas.height - 16);

            exportCanvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const safeName = (currentParsedData?.datasetName || 'PowerBI_Model').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
                a.download = `Lineage_DAG_${safeName}_${new Date().toISOString().slice(0, 10)}.png`;
                a.href = url;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                if (window.showNotification) window.showNotification('🎉 报表血缘 DAG 高清图导出成功！', 'success');
            }, 'image/png');
        } catch(e) {
            console.error('Export DAG image failed:', e);
            if (window.showNotification) window.showNotification(`导出图片失败: ${e.message}`, 'error');
        }
    }

    function exportLineageExcel() {
        if (!currentParsedData || !currentParsedData.edges) {
            if (window.showNotification) window.showNotification('暂无血缘数据可供导出', 'warning');
            return;
        }

        const xlsxLib = window.XLSX || (typeof XLSX !== 'undefined' ? XLSX : null);
        if (!xlsxLib) {
            if (window.showNotification) window.showNotification('XLSX 导出引擎未就绪', 'error');
            return;
        }

        try {
            const edges = currentParsedData.edges;
            const nodes = currentParsedData.nodes;

            const rows = edges.map((e, idx) => {
                const srcNode = nodes.find(n => n.id === e.from);
                const dstNode = nodes.find(n => n.id === e.to);
                const srcName = srcNode ? (srcNode.tableName || srcNode.label.replace('\n', ' ')) : e.from;
                const dstName = dstNode ? (dstNode.tableName || dstNode.label.replace('\n', ' ')) : e.to;

                return {
                    '序号': idx + 1,
                    '源节点 (Source)': srcName,
                    '源类型': srcNode?.nodeType === 'datasource' ? '物理数据源' : (srcNode?.raw?.mode || '数据模型表'),
                    '目标节点 (Target)': dstName,
                    '目标类型': dstNode?.raw?.mode || '数据模型表',
                    '血缘关系类型': e.type.toUpperCase(),
                    '关联字段/键 (Join Keys)': e.joinKeys || '-',
                    '转换细节 / M步骤': e.detail || '-'
                };
            });

            const tableSummaryRows = currentParsedData.nodes.map((n, idx) => ({
                '序号': idx + 1,
                '节点名称': n.tableName || n.label.replace('\n', ' '),
                '节点类别': n.nodeType === 'datasource' ? '物理数据源' : '语义模型表',
                '数据连接模式': n.raw?.mode || (n.nodeType === 'datasource' ? n.raw?.datasourceType : 'Import'),
                '服务器/主机': n.raw?.server || '-',
                '数据库/路径': n.raw?.database || n.raw?.url || '-',
                '字段总数': n.raw?.columnsCount || '-',
                '原生 SQL': n.raw?.nativeSql || '无',
                'M 表达式代码': n.raw?.mExpression || '无'
            }));

            const wb = xlsxLib.utils.book_new();
            const wsLineage = xlsxLib.utils.json_to_sheet(rows);
            const wsSummary = xlsxLib.utils.json_to_sheet(tableSummaryRows);

            xlsxLib.utils.book_append_sheet(wb, wsLineage, '血缘依赖关系表 (Lineage)');
            xlsxLib.utils.book_append_sheet(wb, wsSummary, '数据源与模型表清单 (Entities)');

            const safeName = (currentParsedData?.datasetName || 'PowerBI_Model').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
            const filename = `Lineage_Report_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            xlsxLib.writeFile(wb, filename);

            if (window.showNotification) window.showNotification('📊 血缘明细 Excel 文件导出成功！', 'success');
        } catch(e) {
            console.error('Export Excel failed:', e);
            if (window.showNotification) window.showNotification(`导出 Excel 失败: ${e.message}`, 'error');
        }
    }

    // =========================================================================
    // 5. 全景血缘弹窗控制器 (Modal Entry Controller)
    // =========================================================================
    function openModal(inspectData) {
        if (!inspectData) {
            inspectData = window._inspectResultCache;
        }
        if (!inspectData || !Array.isArray(inspectData.tables) || inspectData.tables.length === 0) {
            if (window.showNotification) window.showNotification('请先运行数据源穿透扫描工作流以提取元数据与 M 表达式！', 'warning');
            return;
        }

        const parsed = parseLineage(inspectData);
        currentParsedData = parsed;
        currentViewMode = 'dag';

        const existing = document.getElementById('lineage-explorer-modal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'lineage-explorer-modal';
        overlay.className = 'modal-overlay';
        overlay.style.cssText = 'display: flex; z-index: 21000; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); align-items: center; justify-content: center;';

        const safeTitle = `🔍 [${parsed.datasetName}] 报表级全景血缘拓扑 DAG 看板`;

        overlay.innerHTML = `
            <div class="modal-content glass-panel" style="width: min(96vw, 1380px); height: min(92vh, 880px); display: flex; flex-direction: column; background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: 12px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); overflow: hidden; position: relative;">
                <!-- 弹窗顶栏 -->
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--panel-border); background: var(--overlay-5); cursor: move;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <h3 style="margin: 0; font-size: 1.05rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                            <span>🕸️</span>
                            <span>${safeTitle}</span>
                        </h3>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">数据源: ${parsed.totalDatasources}</span>
                            <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">物理表: ${parsed.totalTables}</span>
                            <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: var(--accent); border: 1px solid rgba(99, 102, 241, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">血缘依赖: ${parsed.edges.length} 条</span>
                        </div>
                    </div>

                    <!-- 视图切换与操作按钮组 -->
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <!-- 双模式切换 Tab -->
                        <div style="display: flex; background: var(--input-bg); border: 1px solid var(--panel-border); border-radius: 6px; padding: 2px;">
                            <button type="button" id="lineage-tab-dag" class="btn-wf-sm active" style="padding: 4px 12px; font-size: 0.75rem; border: none; border-radius: 4px; background: var(--accent); color: white; cursor: pointer;" onclick="window.LineageExplorer.switchView('dag')">🕸️ DAG 拓扑图</button>
                            <button type="button" id="lineage-tab-table" class="btn-wf-sm" style="padding: 4px 12px; font-size: 0.75rem; border: none; border-radius: 4px; background: transparent; color: var(--text-secondary); cursor: pointer;" onclick="window.LineageExplorer.switchView('table')">📋 血缘明细表</button>
                        </div>

                        <!-- 导出操作 -->
                        <button type="button" class="btn-wf-sm btn-wf-secondary" onclick="window.LineageExplorer.exportDAGImage()" title="一键导出高清拓扑图 (PNG)" style="padding: 4px 10px; font-size: 0.75rem; display: flex; align-items: center; gap: 4px;">
                            <span>🖼️</span><span>导出图片</span>
                        </button>
                        <button type="button" class="btn-wf-sm btn-wf-secondary" onclick="window.LineageExplorer.exportLineageExcel()" title="导出结构化血缘明细表为 Excel (.xlsx)" style="padding: 4px 10px; font-size: 0.75rem; display: flex; align-items: center; gap: 4px;">
                            <span>📊</span><span>导出 Excel</span>
                        </button>

                        <button type="button" class="close-btn" onclick="document.getElementById('lineage-explorer-modal').remove()" title="Close" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                <!-- 弹窗主体区 (包含主画布与侧边看板) -->
                <div class="modal-body" style="flex: 1; min-height: 0; display: flex; position: relative; overflow: hidden; padding: 0;">
                    <!-- 1. DAG 视图容器 -->
                    <div id="lineage-dag-view" style="flex: 1; display: flex; position: relative; height: 100%; width: 100%;">
                        <!-- 主拓扑图画布 -->
                        <div id="lineage-vis-container" style="flex: 1; height: 100%; background: #0f172a; position: relative;"></div>

                        <!-- 画布悬浮浮动工具条 (Zoom & Reset) -->
                        <div style="position: absolute; bottom: 16px; left: 16px; z-index: 20; display: flex; gap: 6px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border: 1px solid var(--panel-border); border-radius: 6px; padding: 4px 8px;">
                            <button type="button" class="btn-wf-sm btn-wf-secondary" onclick="window.LineageExplorer.fitDAG()" title="自适应居中视图" style="padding: 3px 8px; font-size: 0.72rem;">🎯 居中对齐</button>
                            <button type="button" class="btn-wf-sm btn-wf-secondary" onclick="window.LineageExplorer.resetHighlight()" title="清除聚焦与高亮" style="padding: 3px 8px; font-size: 0.72rem;">🔄 重置高亮</button>
                            <button type="button" class="btn-wf-sm btn-wf-secondary" onclick="window.LineageExplorer.toggleLayoutMode()" title="切换层次排列/自由分布" style="padding: 3px 8px; font-size: 0.72rem;">📐 切换布局</button>
                        </div>

                        <!-- 拓扑图图例 (Floating Legend) -->
                        <div style="position: absolute; top: 14px; left: 16px; z-index: 20; display: flex; gap: 10px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border: 1px solid var(--panel-border); border-radius: 6px; padding: 5px 12px; font-size: 0.72rem; color: var(--text-secondary); pointer-events: none;">
                            <span style="display: flex; align-items: center; gap: 4px;"><span style="display:inline-block;width:10px;height:10px;background:#78350f;border:1px solid #f59e0b;border-radius:2px;"></span> 外部数据源</span>
                            <span style="display: flex; align-items: center; gap: 4px;"><span style="display:inline-block;width:10px;height:10px;background:#065f46;border:1px solid #10b981;border-radius:2px;"></span> 导入表 (Import)</span>
                            <span style="display: flex; align-items: center; gap: 4px;"><span style="display:inline-block;width:10px;height:10px;background:#1e3a8a;border:1px solid #3b82f6;border-radius:2px;"></span> 直连表 (DirectQuery)</span>
                            <span style="display: flex; align-items: center; gap: 4px;"><span style="display:inline-block;width:10px;height:10px;background:#4c1d95;border:1px solid #8b5cf6;border-radius:2px;"></span> 复合/追加表</span>
                            <span style="display: flex; align-items: center; gap: 4px; color: #f59e0b;">──▶ 上游溯源</span>
                            <span style="display: flex; align-items: center; gap: 4px; color: #22d3ee;">──▶ 下游影响</span>
                        </div>

                        <!-- 右侧血缘明细与字段关联看板 (Side Infobar) -->
                        <div id="lineage-side-infobar" style="width: 340px; height: 100%; border-left: 1px solid var(--panel-border); background: var(--panel-bg); padding: 14px; box-sizing: border-box; overflow-y: auto; z-index: 10;">
                        </div>
                    </div>

                    <!-- 2. 表格列表视图容器 (Table View Container) -->
                    <div id="lineage-table-view" style="flex: 1; display: none; flex-direction: column; height: 100%; width: 100%; background: var(--panel-bg); padding: 14px; box-sizing: border-box; gap: 10px;">
                        <!-- 搜索过滤栏 -->
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <input type="text" id="lineage-table-search" placeholder="🔍 快速搜索表名、关联键 (Join Key) 或关系类型..." style="width: 360px; padding: 6px 10px; font-size: 0.78rem; background: var(--input-bg); border: 1px solid var(--panel-border); border-radius: 6px; color: var(--text-primary);" oninput="window.LineageExplorer.onTableSearch(this.value)">
                            </div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">
                                共提取出 <span id="lineage-table-count" style="color: var(--accent); font-weight: bold;">${parsed.edges.length}</span> 条血缘链路
                            </div>
                        </div>

                        <!-- 表格主体容器 -->
                        <div id="lineage-table-content" style="flex: 1; min-height: 0; border: 1px solid var(--panel-border); border-radius: 6px; overflow: hidden;"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        if (window.makeDraggable) {
            const content = overlay.querySelector('.modal-content');
            const header = overlay.querySelector('.modal-header');
            window.makeDraggable(content, header);
        }

        setTimeout(() => {
            const container = document.getElementById('lineage-vis-container');
            if (container) {
                renderNetwork(container, parsed);
                resetHighlight();
            }
        }, 80);
    }

    function switchView(mode) {
        currentViewMode = mode;
        const dagView = document.getElementById('lineage-dag-view');
        const tableView = document.getElementById('lineage-table-view');
        const tabDag = document.getElementById('lineage-tab-dag');
        const tabTable = document.getElementById('lineage-tab-table');

        if (mode === 'dag') {
            if (dagView) dagView.style.display = 'flex';
            if (tableView) tableView.style.display = 'none';
            if (tabDag) {
                tabDag.style.background = 'var(--accent)';
                tabDag.style.color = '#ffffff';
            }
            if (tabTable) {
                tabTable.style.background = 'transparent';
                tabTable.style.color = 'var(--text-secondary)';
            }
            if (currentNetwork) {
                setTimeout(() => currentNetwork.redraw(), 50);
            }
        } else {
            if (dagView) dagView.style.display = 'none';
            if (tableView) tableView.style.display = 'flex';
            if (tabTable) {
                tabTable.style.background = 'var(--accent)';
                tabTable.style.color = '#ffffff';
            }
            if (tabDag) {
                tabDag.style.background = 'transparent';
                tabDag.style.color = 'var(--text-secondary)';
            }
            const tblContent = document.getElementById('lineage-table-content');
            if (tblContent && currentParsedData) {
                renderLineageTable(tblContent, currentParsedData);
            }
        }
    }

    function onTableSearch(val) {
        const tblContent = document.getElementById('lineage-table-content');
        if (tblContent && currentParsedData) {
            renderLineageTable(tblContent, currentParsedData, val);
        }
    }

    function fitDAG() {
        if (currentNetwork) {
            currentNetwork.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
        }
    }

    let isHierarchical = true;
    function toggleLayoutMode() {
        if (!currentNetwork) return;
        isHierarchical = !isHierarchical;
        currentNetwork.setOptions({
            layout: {
                hierarchical: {
                    enabled: isHierarchical,
                    direction: 'LR',
                    sortMethod: 'directed'
                }
            },
            physics: {
                enabled: !isHierarchical
            }
        });
        if (window.showNotification) {
            window.showNotification(isHierarchical ? '📐 已切换为：层级有向无环图 (DAG)' : '🌐 已切换为：力导向物理自由图', 'info');
        }
    }

    return {
        openModal,
        switchView,
        onTableSearch,
        highlightLineage,
        resetHighlight,
        fitDAG,
        toggleLayoutMode,
        exportDAGImage,
        exportLineageExcel,
        parseLineage
    };
})();
