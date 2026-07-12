document.addEventListener('DOMContentLoaded', () => {
    const methodSelect = document.getElementById('http-method');
    const endpointInput = document.getElementById('api-endpoint');
    const bodyInput = document.getElementById('request-body');
    const sendBtn = document.getElementById('send-btn');
    const responseOutput = document.getElementById('response-output');
    const responseStatus = document.getElementById('response-status');
    const quickLinks = document.querySelectorAll('#quick-links li');
    
    // 快捷方式点击
    quickLinks.forEach(link => {
        link.addEventListener('click', () => {
            const endpoint = link.getAttribute('data-endpoint');
            const method = link.getAttribute('data-method');
            const body = link.getAttribute('data-body');
            
            endpointInput.value = endpoint;
            methodSelect.value = method;
            
            if (body) {
                try {
                    // 格式化展示 JSON
                    bodyInput.value = JSON.stringify(JSON.parse(body), null, 2);
                } catch(e) {
                    bodyInput.value = body;
                }
            } else {
                bodyInput.value = '';
            }
            
            // 简单高亮效果
            quickLinks.forEach(l => l.style.background = '');
            link.style.background = 'rgba(255,255,255,0.05)';
        });
    });

    // 发送请求
    sendBtn.addEventListener('click', async () => {
        const method = methodSelect.value;
        const endpoint = endpointInput.value.trim();
        let bodyStr = bodyInput.value.trim();
        let body = null;
        
        if (!endpoint) {
            alert('请填写 API 路径');
            return;
        }

        if (bodyStr) {
            try {
                body = JSON.parse(bodyStr);
            } catch (e) {
                alert('请求体不是合法的 JSON 格式:\n' + e.message);
                return;
            }
        }

        // 更新 UI 状态
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="loader"></span> <span>Sending...</span>';
        responseStatus.textContent = 'Sending request...';
        responseStatus.className = 'response-status';
        responseOutput.textContent = '...';

        try {
            const res = await fetch('/api/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    method,
                    endpoint,
                    body
                })
            });

            const data = await res.json();
            
            if (data.success) {
                responseStatus.textContent = `Success`;
                responseStatus.className = 'response-status status-success';
                // 简单的语法高亮可以使用第三方库，这里为了零依赖，我们只做缩进和简单上色
                responseOutput.textContent = JSON.stringify(data.data, null, 2);
                responseOutput.style.color = '#a78bfa';
            } else {
                responseStatus.textContent = `Error`;
                responseStatus.className = 'response-status status-error';
                responseOutput.textContent = JSON.stringify(data.error || data, null, 2);
                responseOutput.style.color = '#ef4444';
            }

        } catch (err) {
            responseStatus.textContent = `Network Error`;
            responseStatus.className = 'response-status status-error';
            responseOutput.textContent = err.message;
            responseOutput.style.color = '#ef4444';
        } finally {
            // 恢复 UI 状态
            sendBtn.disabled = false;
            sendBtn.innerHTML = `
                <span>Send Request</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            `;
        }
    });
});
