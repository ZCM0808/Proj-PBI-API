import urllib.request

url = 'https://learn.microsoft.com/en-us/rest/api/power-bi/available-features/get-available-features'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as r:
        print(f"[{r.status}] {url}")
        final = r.geturl()
        if final != url:
            print(f"Redirected to: {final}")
except urllib.error.HTTPError as e:
    print(f"[{e.code}] {url}")
