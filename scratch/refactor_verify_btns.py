import re

with open('static/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

helper_fn = """
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
                alert(result.message); // Show error detail
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

if 'window.animateVerifyBtn' not in content:
    content = helper_fn + "\n" + content

# 1. Refactor verifySelectedGuid
pattern_guid = re.compile(r'const btn = event\.currentTarget;\s*const originalText = btn\.innerHTML;.*?btn\.disabled = false;\s*\}', re.DOTALL)
new_verify_guid = """const btn = event.currentTarget;
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
content = pattern_guid.sub(new_verify_guid, content)

# 2. Refactor verify-sql-btn
pattern_sql = re.compile(r'const originalText = verifySqlBtn\.textContent;\s*verifySqlBtn\.disabled = true;\s*verifySqlBtn\.textContent = .*?verifySqlBtn\.textContent = originalText;\s*\}', re.DOTALL)
new_sql_verify = """await window.animateVerifyBtn(verifySqlBtn, async () => {
                    const res = await fetch('/api/settings/verify-sql', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            pbi_sql_conn: sqlConn
                        })
                    });
                    return await res.json();
                });"""
content = pattern_sql.sub(new_sql_verify, content)

with open('static/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("done")
