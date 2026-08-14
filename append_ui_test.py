with open('tests/e2e.spec.js', 'r', encoding='utf-8') as f:
    content = f.read()

test_code = """
  test('UI Consistency - Button Standardization Check', async ({ page }) => {
    // 拦截页面错误
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    
    // 打开主页
    await page.goto('http://127.0.0.1:8000');
    await page.waitForLoadState('networkidle');
    
    // 注入脚本分析按钮
    const uiErrors = await page.evaluate(() => {
      const errs = [];
      const buttons = document.querySelectorAll('button');
      buttons.forEach(btn => {
        const text = btn.textContent.trim().toLowerCase();
        const classes = Array.from(btn.classList);
        const inlineStyle = btn.getAttribute('style') || '';
        const id = btn.id || 'unknown-id';
        
        // Rule 1: No hardcoded padding/colors on primary/cancel classes
        if (classes.includes('btn-cancel') || classes.includes('btn-action-primary') || classes.includes('btn-submit')) {
           if (inlineStyle.includes('padding') || inlineStyle.includes('background') || inlineStyle.includes('font-size')) {
               errs.push(`Button '${id}' ('${text}') uses system classes but overrides standard styling via inline 'style' attribute: ${inlineStyle}`);
           }
        }
        
        // Rule 2: Semantic matching for Cancel/Close
        if (text.includes('关闭') || text.includes('取消') || text === 'close' || text === 'cancel' || text === '全选/取消') {
           if (!classes.includes('btn-cancel') && !classes.includes('close-modal')) {
               errs.push(`Button '${id}' ('${text}') should use 'btn-cancel' class for UI consistency.`);
           }
        }
        
        // Rule 3: Semantic matching for Save/Execute
        if (text.includes('保存配置') || text.includes('运行测试')) {
           if (!classes.includes('btn-action-primary') && !classes.includes('btn-submit')) {
               errs.push(`Button '${id}' ('${text}') should use 'btn-action-primary' or 'btn-submit' class for UI consistency.`);
           }
        }
      });
      return errs;
    });
    
    expect(uiErrors.length, 'Found UI Consistency Violations:\\n' + uiErrors.join('\\n')).toBe(0);
  });
"""

# Append the test right before the final `});`
lines = content.split('\\n')
for i in range(len(lines)-1, -1, -1):
    if lines[i].strip() == '});':
        lines.insert(i, test_code)
        break

with open('tests/e2e.spec.js', 'w', encoding='utf-8') as f:
    f.write('\\n'.join(lines))
print('Appended UI Consistency test to e2e.spec.js')
