from html.parser import HTMLParser

class MyHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
        
    def handle_starttag(self, tag, attrs):
        if tag not in ['meta', 'link', 'br', 'hr', 'img', 'input', 'rect', 'path', 'circle', 'line', 'polyline']:
            self.stack.append((tag, self.getpos()))
            
    def handle_endtag(self, tag):
        if tag not in ['meta', 'link', 'br', 'hr', 'img', 'input', 'rect', 'path', 'circle', 'line', 'polyline']:
            if not self.stack:
                self.errors.append(f"Extra end tag </{tag}> at line {self.getpos()[0]}")
            else:
                last_tag, pos = self.stack.pop()
                if last_tag != tag:
                    self.errors.append(f"Mismatched end tag </{tag}> at line {self.getpos()[0]}, expected </{last_tag}> from line {pos[0]}")

parser = MyHTMLParser()
with open('static/index.html', 'r', encoding='utf-8') as f:
    parser.feed(f.read())

print("Unclosed tags:", parser.stack)
for err in parser.errors:
    print(err)
