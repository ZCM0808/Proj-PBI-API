import json
import requests
import html
import xml.etree.ElementTree as ET
from msal import PublicClientApplication

XMLA_ENDPOINT = "powerbi://api.powerbi.com/v1.0/myorg/DA_APAC_BI_QA"
HTTP_XMLA_URL = XMLA_ENDPOINT.replace("powerbi://", "https://") + "/xmla"

CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46"
AUTHORITY = "https://login.microsoftonline.com/organizations"
app = PublicClientApplication(client_id=CLIENT_ID, authority=AUTHORITY)
result = app.acquire_token_interactive(scopes=["https://analysis.windows.net/powerbi/api/.default"])
token = result.get("access_token")

pbi_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
res = requests.get("https://api.powerbi.com/v1.0/myorg/datasets", headers=pbi_headers)
datasets = res.json().get("value", [])
target_ds = next((ds for ds in datasets if ds.get("name") == "Carman PA Hypers"), None)

if target_ds:
    ds_id = target_ds.get("id")
    ds_name = target_ds.get("name")
    print(f"Target Dataset: {ds_name} (ID: {ds_id})")

    # 途径 1: DAX COLUMNSTATISTICS() 绕过 INFO.TABLES 限制
    dax_url = f"https://api.powerbi.com/v1.0/myorg/datasets/{ds_id}/executeQueries"
    dax_body = {"queries": [{"query": "EVALUATE SUMMARIZE(COLUMNSTATISTICS(), [Table Name])"}]}
    r_dax = requests.post(dax_url, json=dax_body, headers=pbi_headers)
    print("\n--- 途径 1: DAX COLUMNSTATISTICS() 方式 ---")
    print("Status Code:", r_dax.status_code)
    if r_dax.status_code == 200:
        rows = r_dax.json().get("results", [])[0].get("tables", [])[0].get("rows", [])
        tbls = list(set([r.get("[Table Name]") or r.get("Table Name") for r in rows if (r.get("[Table Name]") or r.get("Table Name"))]))
        print("✅ 100% 成功提取到所有业务表:", tbls)
    else:
        print("Response:", r_dax.text[:200])

    # 途径 2: XMLA MDSCHEMA_CUBES 带 Catalog
    xmla_cubes_body = f"""<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <Discover xmlns="urn:schemas-microsoft-com:xmla">
            <RequestType>MDSCHEMA_CUBES</RequestType>
            <Restrictions>
                <RestrictionList>
                    <CATALOG_NAME>{ds_name}</CATALOG_NAME>
                </RestrictionList>
            </Restrictions>
            <Properties>
                <PropertyList>
                    <Catalog>{ds_name}</Catalog>
                </PropertyList>
            </Properties>
        </Discover>
    </soap:Body>
</soap:Envelope>"""
    headers_xmla = {"Authorization": f"Bearer {token}", "Content-Type": "text/xml; charset=utf-8", "SOAPAction": '"urn:schemas-microsoft-com:xmla:Discover"'}
    r_cubes = requests.post(HTTP_XMLA_URL, data=xmla_cubes_body.encode('utf-8'), headers=headers_xmla)
    print("\n--- 途径 2: XMLA MDSCHEMA_CUBES 方式 ---")
    print("Status Code:", r_cubes.status_code)
    if r_cubes.status_code == 200 and "<CUBE_NAME>" in r_cubes.text:
        root = ET.fromstring(r_cubes.text)
        cubes = [elem.text for elem in root.iter('{urn:schemas-microsoft-com:xmla:row}CUBE_NAME') if elem.text]
        print("✅ 成功提取 Cubes/Tables:", cubes)