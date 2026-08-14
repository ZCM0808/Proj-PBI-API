import subprocess

test1 = '左侧的一键展开/折叠按钮可以正常控制 API 树的显示状态'
test2 = '点击 New Request 按钮后，Badge 会正确切换为 Free Mode'

pattern = f"{test1}|{test2}"
cmd = f'npx playwright test -g "{pattern}"'

res = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8')
print('Exit:', res.returncode)
print('STDOUT len:', len(res.stdout))
print('STDERR len:', len(res.stderr))
