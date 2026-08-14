import os
import json
import shutil
import uuid

# 1. Update Sales.tmdl
tmdl_path = r"C:\Users\ZCM\Desktop\AstraZeneca_SFE\AstraZeneca_SFE.SemanticModel\definition\tables\Sales.tmdl"
with open(tmdl_path, "r", encoding="utf-8") as f:
    content = f.read()

svg_measure = """
	measure 'SVG Sales Bar' = 
			VAR Val = [Actual Sales]
			VAR MaxVal = CALCULATE([Actual Sales], REMOVEFILTERS('Products'), REMOVEFILTERS('Reps'))
			VAR Pct = DIVIDE(Val, MaxVal, 0)
			VAR BarWidth = Pct * 100
			RETURN 
			"data:image/svg+xml;utf8," & 
			"<svg width='120' height='20' xmlns='http://www.w3.org/2000/svg'>" &
			"<rect width='100' height='20' fill='#f0f0f0' rx='4' ry='4'/>" &
			"<rect width='" & BarWidth & "' height='20' fill='#0078D4' rx='4' ry='4'/>" &
			"<text x='50' y='14' font-family='Segoe UI' font-size='10' font-weight='bold' fill='" & IF(Pct > 0.5, "white", "#333") & "' text-anchor='middle'>" & FORMAT(Val, "$#,,.0M") & "</text>" &
			"</svg>"
		dataCategory: ImageUrl
		lineageTag: 99999999-9999-4444-8888-abcdef123456
"""

if "'SVG Sales Bar'" not in content:
    # insert before the first 'column ' or at the end
    idx = content.find("\n\tcolumn ")
    if idx != -1:
        new_content = content[:idx] + "\n" + svg_measure + content[idx:]
    else:
        new_content = content + "\n" + svg_measure
    with open(tmdl_path, "w", encoding="utf-8") as f:
        f.write(new_content)

# 2. Create New Page
pages_dir = r"C:\Users\ZCM\Desktop\AstraZeneca_SFE\AstraZeneca_SFE.Report\definition\pages"
new_page_id = "svgpage_" + str(uuid.uuid4())[:8]
new_page_dir = os.path.join(pages_dir, new_page_id)
os.makedirs(new_page_dir, exist_ok=True)

page_json = {
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/1.4.0/schema.json",
  "name": new_page_id,
  "displayName": "SVG 度量值矩阵测试",
  "displayOption": "fitToPage"
}

with open(os.path.join(new_page_dir, "page.json"), "w", encoding="utf-8") as f:
    json.dump(page_json, f, ensure_ascii=False, indent=2)

# 3. Create Matrix Visual
visuals_dir = os.path.join(new_page_dir, "visuals")
os.makedirs(visuals_dir, exist_ok=True)

new_visual_id = "visual_" + str(uuid.uuid4())[:8]
new_visual_dir = os.path.join(visuals_dir, new_visual_id)
os.makedirs(new_visual_dir, exist_ok=True)

# Copy and modify the existing matrix visual
source_visual_path = r"C:\Users\ZCM\Desktop\AstraZeneca_SFE\AstraZeneca_SFE.Report\definition\pages\allnewvisualspage01\visuals\1242995a0a374889a723\visual.json"
with open(source_visual_path, "r", encoding="utf-8") as f:
    matrix_def = json.load(f)

# Change ID
matrix_def["name"] = new_visual_id
# Make it bigger
matrix_def["position"] = {
    "x": 50,
    "y": 50,
    "width": 800,
    "height": 500,
    "z": 10
}
matrix_def["visual"]["visualContainerObjects"]["title"][0]["properties"]["text"]["expr"]["Literal"]["Value"] = "'产品区域销售 SVG 进度条'"
# Replace 'Actual Sales' with 'SVG Sales Bar'
matrix_def["visual"]["query"]["queryState"]["Values"]["projections"][0]["field"]["Measure"]["Property"] = "SVG Sales Bar"
matrix_def["visual"]["query"]["queryState"]["Values"]["projections"][0]["queryRef"] = "Sales.SVG Sales Bar"
matrix_def["visual"]["query"]["queryState"]["Values"]["projections"][0]["nativeQueryRef"] = "SVG Sales Bar"

# Set Image Height in matrix grid so SVG renders properly
if "grid" not in matrix_def["visual"]["visualContainerObjects"]:
    matrix_def["visual"]["visualContainerObjects"]["grid"] = [{"properties": {}}]
matrix_def["visual"]["visualContainerObjects"]["grid"][0]["properties"]["imageHeight"] = {
    "expr": { "Literal": { "Value": "30D" } }
}

with open(os.path.join(new_visual_dir, "visual.json"), "w", encoding="utf-8") as f:
    json.dump(matrix_def, f, ensure_ascii=False, indent=2)

print("SUCCESS: Added SVG Sales Bar measure and created a new PBIR page with Matrix visual.")
