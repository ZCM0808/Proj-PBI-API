function renderCustomJsonTree(data, container) {
    container.innerHTML = '';
    container.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    container.style.fontSize = '0.85rem';
    container.style.lineHeight = '1.5';
    container.style.color = '#d4d4d4';
    container.style.padding = '10px';
    container.style.overflow = 'auto';
    container.style.background = 'transparent';

    function createValueSpan(val) {
        const span = document.createElement('span');
        if (val === null) {
            span.textContent = 'null';
            span.style.color = '#569cd6';
        } else if (typeof val === 'boolean') {
            span.textContent = val.toString();
            span.style.color = '#569cd6';
        } else if (typeof val === 'number') {
            span.textContent = val.toString();
            span.style.color = '#b5cea8';
        } else if (typeof val === 'string') {
            span.textContent = '"' + val + '"';
            span.style.color = '#ce9178';
        }
        return span;
    }

    function createNode(key, obj, path, depth, isLast) {
        const wrapper = document.createElement('div');
        wrapper.style.paddingLeft = depth === 0 ? '0' : '20px';
        wrapper.style.position = 'relative';

        const keySpan = document.createElement('span');
        if (key !== null) {
            keySpan.textContent = '"' + key + '": ';
            keySpan.style.color = '#9cdcfe';
        }

        if (obj === null || typeof obj !== 'object') {
            wrapper.appendChild(keySpan);
            wrapper.appendChild(createValueSpan(obj));
            if (!isLast) {
                const comma = document.createElement('span');
                comma.textContent = ',';
                wrapper.appendChild(comma);
            }
            return wrapper;
        }

        const isArray = Array.isArray(obj);
        const keys = Object.keys(obj);
        const isEmpty = keys.length === 0;

        const toggle = document.createElement('span');
        toggle.style.cursor = 'pointer';
        toggle.style.fontSize = '0.6rem';
        toggle.style.color = '#888';
        toggle.style.position = 'absolute';
        toggle.style.left = depth === 0 ? '-12px' : '4px';
        toggle.style.top = '4px';
        toggle.style.userSelect = 'none';

        const headContainer = document.createElement('div');
        headContainer.style.display = 'inline-flex';
        headContainer.style.alignItems = 'center';

        const bracketOpen = document.createElement('span');
        bracketOpen.textContent = isArray ? '[' : '{';
        
        const tableBtn = document.createElement('button');
        tableBtn.innerHTML = '📊 View as Table';
        tableBtn.title = 'View this node as a Table';
        tableBtn.style.cssText = 'margin-left: 8px; padding: 2px 6px; font-size: 0.65rem; background: rgba(167, 139, 250, 0.15); border: 1px solid rgba(167, 139, 250, 0.4); color: #c4b5fd; border-radius: 4px; cursor: pointer; display: none; transition: all 0.2s; white-space: nowrap;';
        tableBtn.onmouseover = () => tableBtn.style.background = 'rgba(167, 139, 250, 0.3)';
        tableBtn.onmouseout = () => tableBtn.style.background = 'rgba(167, 139, 250, 0.15)';
        
        headContainer.appendChild(keySpan);
        headContainer.appendChild(bracketOpen);
        if (!isEmpty) headContainer.appendChild(tableBtn);

        headContainer.onmouseover = (e) => {
            e.stopPropagation();
            if (!isEmpty) tableBtn.style.display = 'inline-block';
        };
        headContainer.onmouseout = () => {
            if (!isEmpty) tableBtn.style.display = 'none';
        };

        tableBtn.onclick = (e) => {
            e.stopPropagation();
            // Switch mode to table
            const toggleBtns = document.querySelectorAll('.view-mode-btn');
            toggleBtns.forEach(btn => btn.classList.remove('active'));
            const tableModeBtn = document.querySelector('.view-mode-btn[data-mode="table"]');
            if (tableModeBtn) tableModeBtn.classList.add('active');
            
            const pathContainer = document.getElementById('table-node-path-container');
            if (pathContainer) {
                pathContainer.style.display = 'flex';
                updateTableNodeSuggestions(window.currentJsonResponse);
            }
            
            const input = document.getElementById('table-node-path-input');
            if (input) input.value = path;
            
            const out = document.getElementById('response-output');
            renderJsonTable(window.currentJsonResponse, out, path);
        };

        const content = document.createElement('div');
        const bracketCloseWrapper = document.createElement('div');
        bracketCloseWrapper.style.paddingLeft = depth === 0 ? '0' : '20px';
        const bracketClose = document.createElement('span');
        bracketClose.textContent = (isArray ? ']' : '}') + (isLast ? '' : ',');
        bracketCloseWrapper.appendChild(bracketClose);

        if (isEmpty) {
            wrapper.appendChild(headContainer);
            bracketCloseWrapper.style.paddingLeft = '0';
            bracketCloseWrapper.style.display = 'inline';
            wrapper.appendChild(bracketCloseWrapper);
            return wrapper;
        }

        let isCollapsed = depth >= 2; // Auto collapse at depth 2
        let rendered = false;

        function renderChildren() {
            if (rendered) return;
            keys.forEach((k, i) => {
                const childPath = path ? path + '.' + k : k;
                content.appendChild(createNode(isArray ? null : k, obj[k], childPath, depth + 1, i === keys.length - 1));
            });
            rendered = true;
        }

        function updateState() {
            toggle.textContent = isCollapsed ? '▶' : '▼';
            content.style.display = isCollapsed ? 'none' : 'block';
            bracketCloseWrapper.style.display = isCollapsed ? 'none' : 'block';
            bracketOpen.textContent = isCollapsed 
                ? (isArray ? '[' + keys.length + ' items]' : '{...}') + (isLast ? '' : ',')
                : (isArray ? '[' : '{');
            if (!isCollapsed) renderChildren();
        }

        toggle.onclick = () => {
            isCollapsed = !isCollapsed;
            updateState();
        };

        wrapper.appendChild(toggle);
        wrapper.appendChild(headContainer);
        wrapper.appendChild(content);
        wrapper.appendChild(bracketCloseWrapper);

        updateState();

        return wrapper;
    }

    container.appendChild(createNode(null, data, '', 0, true));
}
