1.URL with token
jdbc:databricks://adb-1971751593392949.9.azuredatabricks.net:443/default;transportMode=http;ssl=1;httpPath=/sql/1.0/warehouses/d2f11f5ccdc76c8d;AuthMech=3;UID=token;PWD=dapif093********************1fa6-2

2.URL with OAuth
jdbc:databricks://adb-1971751593392949.9.azuredatabricks.net:443/default;transportMode=http;ssl=1;httpPath=/sql/1.0/warehouses/d2f11f5ccdc76c8d;AuthMech=11;Auth_Flow=2;OAuth2RedirectUrlPort=8021;EnableTokenCache=0

or

jdbc:databricks://adb-1971751593392949.9.azuredatabricks.net:443/default;transportMode=http;ssl=1;httpPath=/sql/1.0/warehouses/d2f11f5ccdc76c8d;AuthMech=11;Auth_Flow=2;OAuth2RedirectUrlPort=8021;EnableTokenCache=1;TokenCachePassPhrase=<本地缓存密码>