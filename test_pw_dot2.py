import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

test_name = '溢出防御 .Overflow Defense.: 动作按钮组绝对不能跑到右侧面板之外'

cmd = f'npx playwright test -g "{test_name}"'
print(cmd)

res = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8')
print('Exit:', res.returncode)
print('STDOUT len:', len(res.stdout))
if "Error: No tests found" in res.stdout:
    print('Failed: No tests found')
else:
    print('Success: tests found')
