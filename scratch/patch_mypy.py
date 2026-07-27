import re

with open('src/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix _chat_sessions type
content = content.replace(
    "_chat_sessions = {}",
    "_chat_sessions: Dict[str, Any] = {}"
)

# Fix content_types.Part typing issue
content = content.replace(
    "content_types.Part.from_function_response(",
    "content_types.Part.from_function_response(  # type: ignore"
)

with open('src/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("main.py fixed for mypy!")
