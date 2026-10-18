const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),crypto=require('crypto');
test('CSP script hashes match the inline scripts in index.html (run: python seal.py index.html)',()=>{
 const s=fs.readFileSync(__dirname+'/index.html','utf8');
 const scripts=[...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 const csp=(s.match(/script-src ([^;]*);/)||[])[1]||'';
 assert.ok(scripts.length>0);
 assert.ok(!/unsafe-inline/.test(csp),'script-src must not allow unsafe-inline');
 scripts.forEach(x=>assert.ok(csp.includes("'sha256-"+crypto.createHash('sha256').update(x).digest('base64')+"'"),'inline script hash missing from CSP'));
});
test('no external links in index.html',()=>{
 const s=fs.readFileSync(__dirname+'/index.html','utf8');
 assert.ok(!/(src|href)=["']https?:\/\//.test(s));
});
