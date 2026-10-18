import re,hashlib,base64,sys
p=sys.argv[1]; s=open(p).read()
scripts=re.findall(r'<script>([\s\S]*?)</script>',s)
hs=" ".join("'sha256-%s'"%base64.b64encode(hashlib.sha256(x.encode()).digest()).decode() for x in scripts)
s2=re.sub(r"script-src [^;]*;","script-src 'self' "+hs+";",s,count=1)
open(p,'w').write(s2);print(len(scripts),'inline scripts sealed')
