js_path = r'D:\ZCM\Proj-PBI-API\static\script.js'
with open(js_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Extract the harness block: from start_marker to end_marker
start_marker = '    // Test Harness Modal Logic'
# Find the end: it ends at the next top-level block marker
end_marker_options = [
    '\n    window.setupFLIPModal = function setupFLIPModal',
    '\n    // Settings Modal Logic',
    '\nwindow.setupFLIPModal = function setupFLIPModal'
]

start_idx = text.find(start_marker)
if start_idx == -1:
    print('ERROR: start_marker not found')
    exit(1)

end_idx = -1
end_marker_used = None
for em in end_marker_options:
    idx = text.find(em, start_idx)
    if idx != -1:
        if end_idx == -1 or idx < end_idx:
            end_idx = idx
            end_marker_used = em

if end_idx == -1:
    print('ERROR: end_marker not found')
    exit(1)

print(f'Harness block: lines {text[:start_idx].count(chr(10))+1} to {text[:end_idx].count(chr(10))+1}')

harness_block = text[start_idx:end_idx]
print(f'Harness block length: {len(harness_block)} chars')
print('Last 100 chars of block:', repr(harness_block[-100:]))

# Remove the harness block from original position
text = text[:start_idx] + text[end_idx:]

# Now find where to insert: AFTER the full setupFLIPModal definition
# setupFLIPModal ends when we see the closing '    };' of its function
# Let's find it by looking for where Settings modal logic starts
insert_marker = '\n    // Settings Modal Logic'
insert_idx = text.find(insert_marker)

if insert_idx == -1:
    print('ERROR: insert_marker not found')
    exit(1)

print(f'Insert position: line {text[:insert_idx].count(chr(10))+1}')

text = text[:insert_idx] + '\n\n' + harness_block + text[insert_idx:]

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Done!')
