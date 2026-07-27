import sys

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

helper = """
window.animateVerifyBtn = async function(btn, promiseFunc, successCallback) {
    const originalText = btn.innerHTML;
    const originalWidth = btn.style.width;
    btn.disabled = true;
    btn.innerHTML = '⏳';
    btn.style.transition = 'all 0.3s ease';
    btn.style.width = 'auto';

    const resetBtn = () => {
        btn.innerHTML = originalText;
        btn.style.width = originalWidth;
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.disabled = false;
    };

    try {
        const result = await promiseFunc();
        if (result.success) {
            btn.innerHTML = '✅ Success';
            btn.style.background = 'var(--status-success-bg, rgba(16, 185, 129, 0.2))';
            btn.style.color = 'var(--success, #10b981)';
            btn.style.borderColor = 'var(--success, #10b981)';
            
            btn.style.transform = 'scale(1.1)';
            setTimeout(() => btn.style.transform = 'scale(1)', 200);
            setTimeout(resetBtn, 2500);
            
            if (successCallback) successCallback(result);
        } else {
            btn.innerHTML = '❌ Failed';
            btn.style.background = 'var(--status-error-bg, rgba(239, 68, 68, 0.2))';
            btn.style.color = 'var(--error, #ef4444)';
            btn.style.borderColor = 'var(--error, #ef4444)';
            
            btn.style.transform = 'translateX(-4px)';
            setTimeout(() => btn.style.transform = 'translateX(4px)', 100);
            setTimeout(() => btn.style.transform = 'translateX(-4px)', 200);
            setTimeout(() => btn.style.transform = 'translateX(4px)', 300);
            setTimeout(() => btn.style.transform = 'translateX(0)', 400);

            setTimeout(() => {
                resetBtn();
                alert(result.message);
            }, 2500);
        }
    } catch (err) {
        btn.innerHTML = '❌ Error';
        btn.style.background = 'var(--status-error-bg, rgba(239, 68, 68, 0.2))';
        btn.style.color = 'var(--error, #ef4444)';
        btn.style.borderColor = 'var(--error, #ef4444)';
        setTimeout(() => {
            resetBtn();
            alert('网络错误: ' + err);
        }, 2500);
    }
};
"""

if 'window.animateVerifyBtn =' not in content:
    content = helper + "\n" + content

# Refactor verifySelectedGuid
old_guid = """    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳';
    btn.disabled = true;

    try {
        const res = await fetch('/api/test/guid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pbi_client_id: clientId,
                pbi_client_secret: clientSecret,
                pbi_tenant_id: tenantId,
                type: type,
                guid: guid
            })
        });
        const result = await res.json();
        
        if (result.success) {
            alert(`✅ 验证成功 (Valid)\\n名称: ${result.name}`);
        } else {
            alert(`❌ 验证失败 (Failed):\\n${result.message}`);
        }
    } catch (e) {
        alert('网络错误: ' + e);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }"""

new_guid = """    const btn = event.currentTarget;
    await window.animateVerifyBtn(btn, async () => {
        const res = await fetch('/api/test/guid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pbi_client_id: clientId,
                pbi_client_secret: clientSecret,
                pbi_tenant_id: tenantId,
                type: type,
                guid: guid
            })
        });
        return await res.json();
    }, (result) => {
        alert(`✅ 验证成功 (Valid)\\n名称: ${result.name}`);
    });"""

content = content.replace(old_guid, new_guid)

# Refactor verify-sql-btn
old_sql = """                const originalText = verifySqlBtn.textContent;
                verifySqlBtn.disabled = true;
                verifySqlBtn.textContent = '⏳ 验证中...';

                try {
                    const res = await fetch('/api/settings/verify-sql', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            pbi_sql_conn: sqlConn
                        })
                    });
                    const result = await res.json();
                    if (result.success) {
                        alert(result.message);
                    } else {
                        alert(result.message);
                    }
                } catch (err) {
                    alert('网络错误: ' + err);
                } finally {
                    verifySqlBtn.disabled = false;
                    verifySqlBtn.textContent = originalText;
                }"""

new_sql = """                await window.animateVerifyBtn(verifySqlBtn, async () => {
                    const res = await fetch('/api/settings/verify-sql', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            pbi_sql_conn: sqlConn
                        })
                    });
                    return await res.json();
                });"""

content = content.replace(old_sql, new_sql)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced safely")
