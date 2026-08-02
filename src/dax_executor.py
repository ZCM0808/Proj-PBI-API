import subprocess
import json
import os
import asyncio

def get_dynamic_port():
    cmd = ["powershell", "-Command", "(Get-NetTCPConnection -OwningProcess (Get-Process msmdsrv -ErrorAction SilentlyContinue).Id -State Listen -ErrorAction SilentlyContinue).LocalPort"]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    ports = list(dict.fromkeys([p.strip() for p in res.stdout.splitlines() if p.strip()]))
    if not ports:
        raise Exception("No active msmdsrv (Power BI Desktop) process found.")
    return ports[0]

def get_all_instances():
    cmd = ["powershell", "-Command", "(Get-NetTCPConnection -OwningProcess (Get-Process msmdsrv -ErrorAction SilentlyContinue).Id -State Listen -ErrorAction SilentlyContinue).LocalPort"]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    ports = list(dict.fromkeys([p.strip() for p in res.stdout.splitlines() if p.strip()]))
    return [{"name": f"PBI Desktop (Port {p})", "port": p} for p in ports]

async def execute_dax_via_ps(port, query):
    ps_script = f"""
    [System.Reflection.Assembly]::LoadWithPartialName("Microsoft.AnalysisServices.AdomdClient") | Out-Null
    $connStr = "Data Source=localhost:{port};Application Name=PBI-API"
    $conn = New-Object Microsoft.AnalysisServices.AdomdClient.AdomdConnection($connStr)
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @'
{query}
'@
    $adapter = New-Object Microsoft.AnalysisServices.AdomdClient.AdomdDataAdapter($cmd)
    $dt = New-Object System.Data.DataTable
    $adapter.Fill($dt) | Out-Null
    
    $result = @()
    foreach ($row in $dt.Rows) {{
        $obj = @{{}}
        foreach ($col in $dt.Columns) {{
            $obj[$col.ColumnName] = $row[$col.ColumnName]
        }}
        $result += $obj
    }}
    $conn.Close()
    $result | ConvertTo-Json -Compress -Depth 10
    """
    script_path = os.path.join(os.environ.get("TEMP", "C:/Windows/Temp"), "run_dax.ps1")
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(ps_script)
        
    res = await asyncio.create_subprocess_exec(
        "powershell", "-ExecutionPolicy", "Bypass", "-File", script_path,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await res.communicate()
    
    if res.returncode != 0:
        raise Exception(f"DAX Error: {stderr.decode('utf-8', errors='ignore')}")
        
    output = stdout.decode("utf-8", errors="ignore").strip()
    if not output:
        return []
    try:
        return json.loads(output)
    except Exception:
        return output
