import subprocess
import re

test_name = 'Proj-PBI-API UI e2e tests › 刷新页面后，历史下拉框默认必须是隐藏的 (不能因为 CSS 冲突自动展开)'
pattern = re.sub(r'([.*+?^${}()|\[\]\\])', r'\\\1', test_name)

cmd = ['npx.cmd', 'playwright', 'test', '-g', pattern]
res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
print('Exit:', res.returncode)
print('STDOUT len:', len(res.stdout))
print('STDOUT[:100]:', res.stdout[:100])
