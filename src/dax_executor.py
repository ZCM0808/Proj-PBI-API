import subprocess
import json
import os
import asyncio
import re
import zipfile

# Locate the ADOMD DLL path once at import time
_adomd_dll_path = None

def _find_adomd_dll():
    global _adomd_dll_path
    if _adomd_dll_path:
        return _adomd_dll_path
    candidates = [
        r"C:\Program Files\DAX Studio\bin\Microsoft.AnalysisServices.AdomdClient.dll",
        r"C:\Program Files\Microsoft Analysis Services\AS OLEDB\140\Microsoft.AnalysisServices.AdomdClient.dll",
        r"C:\Program Files\Microsoft Analysis Services\AS OLEDB\130\Microsoft.AnalysisServices.AdomdClient.dll",
    ]
    for path in candidates:
        if os.path.exists(path):
            _adomd_dll_path = path
            return _adomd_dll_path
    return None


def _get_recent_pbix_name():
    """Read PBI Desktop Settings.xml FileHistory to get the most recently opened file name."""
    settings_paths = [
        os.path.join(os.environ.get("USERPROFILE", ""), "Microsoft", "Power BI Desktop Store App", "User.zip"),
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "Power BI Desktop", "User.zip"),
    ]
    for zp in settings_paths:
        if not os.path.exists(zp):
            continue
        try:
            with zipfile.ZipFile(zp, "r") as z:
                settings_file = next((name for name in z.namelist() if name.endswith("Settings.xml")), None)
                if not settings_file:
                    continue
                content = z.read(settings_file).decode("utf-8", errors="ignore")
                # Extract FileHistory JSON from the XML
                match = re.search(r'Type="FileHistory"\s+Value="s(.*?)"', content, re.DOTALL)
                if not match:
                    continue
                raw = match.group(1).replace("&quot;", '"').replace("&amp;", "&")
                history = json.loads(raw)
                if history and len(history) > 0:
                    # Sort by lastAccessedDate descending
                    history.sort(key=lambda x: x.get("lastAccessedDate", ""), reverse=True)
                    fp = history[0].get("filePath", "")
                    if fp:
                        return os.path.basename(fp)
        except Exception:
            continue
    return None



def get_dynamic_port():
    cmd = ["powershell", "-Command",
           "(Get-NetTCPConnection -OwningProcess (Get-Process msmdsrv -ErrorAction SilentlyContinue).Id -State Listen -ErrorAction SilentlyContinue).LocalPort"]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    ports = list(dict.fromkeys([p.strip() for p in res.stdout.splitlines() if p.strip()]))
    if not ports:
        raise Exception("No active msmdsrv (Power BI Desktop) process found.")
    return ports[0]


def _get_recent_pbix_names() -> list:
    """Read PBI Desktop Settings.xml FileHistory — return all recent file names (newest first)."""
    settings_paths = [
        os.path.join(os.environ.get("USERPROFILE", ""), "Microsoft", "Power BI Desktop Store App", "User.zip"),
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "Power BI Desktop", "User.zip"),
    ]
    for zp in settings_paths:
        if not os.path.exists(zp):
            continue
        try:
            with zipfile.ZipFile(zp, "r") as z:
                settings_file = next((n for n in z.namelist() if n.endswith("Settings.xml")), None)
                if not settings_file:
                    continue
                content = z.read(settings_file).decode("utf-8", errors="ignore")
                match = re.search(r'Type="FileHistory"\s+Value="s(.*?)"', content, re.DOTALL)
                if not match:
                    continue
                raw = match.group(1).replace("&quot;", '"').replace("&amp;", "&")
                history = json.loads(raw)
                if history:
                    history.sort(key=lambda x: x.get("lastAccessedDate", ""), reverse=True)
                    return [os.path.basename(h.get("filePath", "")) for h in history if h.get("filePath")]
        except Exception:
            continue
    return []


def get_all_instances() -> list:
    """Get all local PBI Desktop instances with model name and port.

    Strategy (per port):
      1. ADOMD MDSCHEMA_CUBES  → most accurate, reads live AS engine
      2. File history by index  → best-effort when multiple instances open;
         the i-th port maps to the i-th most-recently opened file
      3. "PBI Desktop #N"       → last resort with sequence number
    """
    cmd = ["powershell", "-Command",
           "(Get-NetTCPConnection -OwningProcess (Get-Process msmdsrv -ErrorAction SilentlyContinue).Id"
           " -State Listen -ErrorAction SilentlyContinue).LocalPort"]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        ports = list(dict.fromkeys([p.strip() for p in res.stdout.splitlines() if p.strip()]))
    except Exception:
        ports = []

    recent_names = _get_recent_pbix_names()  # ordered newest → oldest
    dll_path = _find_adomd_dll()
    load_line = (
        f'[System.Reflection.Assembly]::LoadFrom("{dll_path}") | Out-Null'
        if dll_path else
        '[System.Reflection.Assembly]::LoadWithPartialName("Microsoft.AnalysisServices.AdomdClient") | Out-Null'
    )
    instances = []

    for i, p in enumerate(ports):
        instance_label: str | None = None

        # ── Method 1: ADOMD live query ──────────────────────────────────────
        ps_query = f"""
        $ErrorActionPreference = 'Stop'
        {load_line}
        $connStr = "Data Source=localhost:{p};Application Name=PBI-API"
        $conn = New-Object Microsoft.AnalysisServices.AdomdClient.AdomdConnection($connStr)
        $conn.Open()
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT [CUBE_NAME], [CATALOG_NAME] FROM `$SYSTEM`.`MDSCHEMA_CUBES`"
        $adapter = New-Object Microsoft.AnalysisServices.AdomdClient.AdomdDataAdapter($cmd)
        $dt = New-Object System.Data.DataTable
        $adapter.Fill($dt) | Out-Null
        $conn.Close()
        if ($dt.Rows.Count -gt 0) {{
            $cube = $dt.Rows[0]["CUBE_NAME"]
            if ($cube -and $cube -ne "Model") {{ $cube }} else {{ $dt.Rows[0]["CATALOG_NAME"] }}
        }}
        """
        script_path = os.path.join(os.environ.get("TEMP", "C:/Windows/Temp"), f"get_model_name_{p}.ps1")
        try:
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(ps_query)
            proc = subprocess.run(
                ["powershell", "-ExecutionPolicy", "Bypass", "-File", script_path],
                capture_output=True, text=True, timeout=5,
            )
            out = proc.stdout.strip()
            # Accept if non-empty, not an exception string, and not a bare GUID
            if out and not out.startswith("Exception") and not re.match(r'^[0-9a-fA-F\-]{36}$', out) and out != "Model":
                instance_label = out
        except Exception:
            pass
        finally:
            try:
                os.remove(script_path)
            except Exception:
                pass

        # ── Method 2: file history by index (per-port, not global) ──────────
        if not instance_label:
            if i < len(recent_names) and recent_names[i]:
                instance_label = recent_names[i]
            elif recent_names:
                instance_label = recent_names[0]  # best guess when history shorter than ports

        # ── Method 3: last resort with sequence number ───────────────────────
        if not instance_label:
            instance_label = "PBI Desktop" if len(ports) == 1 else f"PBI Desktop #{i + 1}"

        display_name = f"{instance_label} (Port {p})"
        instances.append({"name": display_name, "port": p, "model_name": instance_label})

    return instances



def _run_ps_script_sync(script_path):
    return subprocess.run(
        ["powershell", "-ExecutionPolicy", "Bypass", "-File", script_path],
        capture_output=True,
        text=True
    )


async def execute_dax_via_ps(port, query):
    """Execute a DAX query against a local PBI Desktop instance via ADOMD."""
    dll_path = _find_adomd_dll()
    if dll_path:
        load_line = f'[System.Reflection.Assembly]::LoadFrom("{dll_path}") | Out-Null'
    else:
        load_line = '[System.Reflection.Assembly]::LoadWithPartialName("Microsoft.AnalysisServices.AdomdClient") | Out-Null'

    ps_script = f"""
    $ErrorActionPreference = 'Stop'
    {load_line}
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
    try:
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(ps_script)

        proc = await asyncio.to_thread(_run_ps_script_sync, script_path)

        stderr_text = proc.stderr.strip()
        if proc.returncode != 0:
            raise Exception(f"DAX execution failed: {stderr_text}")

        output = proc.stdout.strip()
        if not output:
            if stderr_text:
                raise Exception(f"DAX returned no data. Stderr: {stderr_text}")
            return []
        try:
            parsed = json.loads(output)
            if isinstance(parsed, dict):
                parsed = [parsed]
            return parsed
        except Exception:
            return output
    finally:
        if os.path.exists(script_path):
            try:
                os.remove(script_path)
            except Exception:
                pass

