@echo off
chcp 65001 >nul
title Power BI XMLA 交互刷新工具 (Python)
python -m pip install --quiet msal requests
python "%~dp0PowerBI_XMLA_Interactive_Refresh.py"
pause