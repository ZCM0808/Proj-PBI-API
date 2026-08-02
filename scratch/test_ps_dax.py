import json
import os
import subprocess

def run_dax(port: int, query: str):
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
        
    res = subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-File", script_path], capture_output=True, text=True)
    if res.returncode != 0:
        raise Exception(f"DAX Error: {res.stderr}")
        
    output = res.stdout.strip()
    if not output:
        return []
    try:
        return json.loads(output)
    except Exception:
        return output

if __name__ == "__main__":
    print(run_dax(59496, "EVALUATE TOPN(2, 'Dim_Products')"))
