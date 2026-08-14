with open('PROJECT_MEMORY.md', 'a', encoding='utf-8') as f:
    f.write('''
- ❌ **失败细节 3：极度波动的动态网络阻断 (JA3 Fingerprinting/SNI Reset)**。原本能穿透的 `schannel` 几天后突然被防火墙特征识别并定向阻断，再次报出误导性的 `Authentication failed` 甚至 `Connection was reset`，而 GitHub PAT 实测 100% 存活。
  - ✅ **成功修复 (终极防御回退脚本 push.ps1)**：为了应对 GFW 这种动态特征封杀，我们在项目根目录编写了专属的 `push.ps1` 脚本。它会自动执行：
    1. 策略 1: `$env:http_proxy=""; git -c http.sslbackend=openssl push`
    2. 策略 2: `$env:http_proxy=""; git -c http.sslbackend=schannel push`
    3. 策略 3: `git push` (使用系统默认代理)
    以后所有推送强行执行 `.\push.ps1 "your commit message"`，通过自动化武器库在 OpenSSL 和 SChannel 之间来回切换 TLS 握手特征，彻底降维打击所有的网络封锁。
''')
