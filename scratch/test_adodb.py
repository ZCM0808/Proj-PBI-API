import win32com.client
import json

def test_connection():
    try:
        conn = win32com.client.Dispatch('ADODB.Connection')
        conn.ConnectionString = "Provider=MSOLAP;Data Source=localhost:59496;"
        conn.Open()
        
        rs = win32com.client.Dispatch('ADODB.Recordset')
        query = "SELECT [Name] FROM $SYSTEM.TMSCHEMA_MODELS"
        rs.Open(query, conn)
        
        if not rs.EOF:
            print("Successfully connected to local PBI!")
            while not rs.EOF:
                print("Model Name:", rs.Fields("Name").Value)
                rs.MoveNext()
        else:
            print("Connected, but no models found.")
            
        rs.Close()
        conn.Close()
    except Exception as e:
        print("Error connecting:", e)

if __name__ == "__main__":
    test_connection()
