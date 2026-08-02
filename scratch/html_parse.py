import html.parser

class DivParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
        self.line_offset = 0

    def handle_starttag(self, tag, attrs):
        if tag == 'div':
            self.stack.append((self.getpos()[0], attrs))

    def handle_endtag(self, tag):
        if tag == 'div':
            if self.stack:
                self.stack.pop()
            else:
                self.errors.append((self.getpos()[0], "Extra closing div"))

with open('static/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('id="workflow-modal-content"')
end = text.find('id="settings-modal"')
segment = '<div ' + text[start:end]

p = DivParser()
p.feed(segment)
for err in p.errors:
    print("Error:", err)
for unclosed in p.stack:
    print("Unclosed:", unclosed)
