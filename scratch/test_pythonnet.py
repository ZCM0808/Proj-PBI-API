import sys
import clr

# Add the bin directory to sys.path so pythonnet can find the DLL
bin_path = r"C:\Program Files\WindowsApps\Microsoft.MicrosoftPowerBIDesktop_2.156.951.0_x64__8wekyb3d8bbwe\bin"
sys.path.append(bin_path)

try:
    clr.AddReference("Microsoft.PowerBI.AdomdClient")
    from Microsoft.AnalysisServices.AdomdClient import AdomdConnection, AdomdCommand
    
    conn_str = "Data Source=localhost:59496;"
    conn = AdomdConnection(conn_str)
    conn.Open()
    
    print("Connected successfully via ADOMD.NET!")
    print("Database:", conn.Database)
    print("SessionID:", conn.SessionID)
    
    cmd = conn.CreateCommand()
    cmd.CommandText = "SELECT [Name] FROM $SYSTEM.TMSCHEMA_MODELS"
    reader = cmd.ExecuteReader()
    
    print("\nModels:")
    while reader.Read():
        print(reader.GetString(0))
        
    reader.Close()
    conn.Close()
except Exception as e:
    print("Error:", e)
