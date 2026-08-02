import subprocess
import json
import os
import sys

def get_adomd_dll_path():
    # Common paths for PBI Desktop MS Store and Installer versions
    search_paths = [
        r"C:\Program Files\WindowsApps\Microsoft.MicrosoftPowerBIDesktop_*\bin\Microsoft.PowerBI.AdomdClient.dll",
        r"C:\Program Files\Microsoft Power BI Desktop\bin\Microsoft.PowerBI.AdomdClient.dll"
    ]
    import glob
    for p in search_paths:
        matches = glob.glob(p)
        if matches:
            return matches[0]
    return None

def scan_local_instances():
    try:
        cmd = 'Get-CimInstance Win32_Process -Filter "Name = \'msmdsrv.exe\'" | Select-Object ProcessId, CommandLine | ConvertTo-Json'
        res = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True)
        if not res.stdout.strip():
            return []
        
        data = json.loads(res.stdout)
        if isinstance(data, dict):
            data = [data]
            
        instances = []
        for proc in data:
            cmdline = proc.get("CommandLine", "")
            if "-s" in cmdline:
                parts = cmdline.split('-s')
                if len(parts) > 1:
                    path_part = parts[1].strip()
                    if path_part.startswith('"'):
                        path = path_part.split('"')[1]
                    else:
                        path = path_part.split(' ')[0]
                    
                    port_file = os.path.join(path, "msmdsrv.port.txt")
                    if os.path.exists(port_file):
                        # try utf-16-le then utf-8
                        try:
                            with open(port_file, 'r', encoding='utf-16-le') as f:
                                port = f.read().strip()
                                port = "".join(filter(str.isdigit, port))
                        except:
                            with open(port_file, 'r', encoding='utf-8') as f:
                                port = f.read().strip()
                                port = "".join(filter(str.isdigit, port))
                        
                        db_name = os.path.basename(os.path.dirname(path))
                        if db_name == "AnalysisServicesWorkspaces":
                            db_name = os.path.basename(path)
                        instances.append({
                            "port": port,
                            "database": db_name,
                            "path": path
                        })
        return instances
    except Exception as e:
        return []

def run_dax_query(port: str, query: str):
    dll_path = get_adomd_dll_path()
    if not dll_path:
        return {"error": "AdomdClient DLL not found on this machine. Is Power BI Desktop installed?"}
    
    bin_dir = os.path.dirname(dll_path)
    if bin_dir not in sys.path:
        sys.path.append(bin_dir)
        
    try:
        import clr
        try:
            clr.AddReference("Microsoft.PowerBI.AdomdClient")
        except:
            pass # might be already loaded
        from Microsoft.AnalysisServices.AdomdClient import AdomdConnection, AdomdCommand
        
        conn_str = f"Data Source=localhost:{port};"
        conn = AdomdConnection(conn_str)
        conn.Open()
        
        cmd = conn.CreateCommand()
        cmd.CommandText = query
        reader = cmd.ExecuteReader()
        
        columns = []
        for i in range(reader.FieldCount):
            columns.append(reader.GetName(i))
            
        rows = []
        while reader.Read():
            row = {}
            for i in range(reader.FieldCount):
                val = reader.GetValue(i)
                # handle DBNull or .NET types
                if val is None or str(type(val)) == "<class 'System.DBNull'>":
                    row[columns[i]] = None
                else:
                    row[columns[i]] = str(val)
            rows.append(row)
            
        reader.Close()
        conn.Close()
        
        return {"columns": columns, "rows": rows}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    print(scan_local_instances())
