import json
import time
from deep_translator import GoogleTranslator

def main():
    with open('summaries.json', 'r', encoding='utf-8') as f:
        summaries = json.load(f)

    translator = GoogleTranslator(source='en', target='zh-CN')
    translations = {}

    print(f"Translating {len(summaries)} summaries...")
    
    # Process in batches to avoid rate limits, though deep_translator handles individual calls well
    for i, text in enumerate(summaries):
        if not text:
            continue
        try:
            # Quick translation
            zh = translator.translate(text)
            translations[text] = zh
            if i % 20 == 0:
                print(f"Translated {i}/{len(summaries)}")
            time.sleep(0.1) # brief pause to be nice to Google
        except Exception as e:
            print(f"Error translating: {text} - {e}")
            translations[text] = text

    js_content = f"window.API_TRANSLATIONS = {json.dumps(translations, ensure_ascii=False, indent=2)};"
    with open('static/translations.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print("Saved translations to static/translations.js")

if __name__ == '__main__':
    main()
