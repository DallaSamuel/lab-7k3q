const test=require('node:test'),assert=require('node:assert'),fs=require('fs');
const html=()=>fs.readFileSync(__dirname+'/index.html','utf8');
const csp=s=>(s.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)||[])[1]||'';
test('no inline scripts: every script is a file from this site (v39, replaces the seal.py hash step)',()=>{
 const s=html();assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(s),'inline <script> found');
 for(const m of s.matchAll(/<script[^>]*src="([^"]+)"/g))assert.ok(fs.existsSync(__dirname+'/'+m[1]),'missing script file '+m[1]);
});
test('CSP allows scripts and styles only from this site',()=>{
 const c=csp(html());assert.match(c,/script-src 'self';/);assert.match(c,/style-src 'self';/);assert.ok(!/unsafe-inline|unsafe-eval|sha256-/.test(c));
 assert.match(c,/object-src 'none'/);assert.match(c,/base-uri 'none'/);
});
test('no inline style attributes or event handlers in index.html',()=>{
 const s=html();assert.ok(!/\sstyle="/.test(s),'style attribute found');assert.ok(!/\son[a-z]+="/i.test(s),'inline event handler found');
});
test('no external links in the app files',()=>{
 for(const f of ['index.html','app.js','styles.css'])assert.ok(!/(src|href)=["']https?:\/\//.test(fs.readFileSync(__dirname+'/'+f,'utf8')),f);
});
test('service worker caches every app file',()=>{
 const sw=fs.readFileSync(__dirname+'/sw.js','utf8');for(const f of ['index.html','styles.css','app.js','import.js','config.js'])assert.ok(sw.includes('"./'+f+'"'),f);
});
test('privacy page has the same strict policy and no inline scripts',()=>{
 const s=fs.readFileSync(__dirname+'/privacy.html','utf8');const c=csp(s);
 assert.match(c,/script-src 'self';/);assert.match(c,/style-src 'self';/);assert.ok(!/unsafe-inline/.test(c));assert.ok(!/<script/i.test(s));assert.ok(!/\sstyle="/.test(s));
});
test('service worker leaves other sites alone and caches only good same-site answers',()=>{
 const sw=fs.readFileSync(__dirname+'/sw.js','utf8');
 assert.match(sw,/origin !== self\.location\.origin\) return/);assert.match(sw,/res\.ok && res\.type === "basic"/);assert.ok(sw.includes('"./privacy.html"'));
});
test('no claim of anonymity in what users read',()=>{
 for(const f of ['index.html','privacy.html'])assert.ok(!/anonymous/i.test(fs.readFileSync(__dirname+'/'+f,'utf8').replace(/<!--[\s\S]*?-->/g,'')),f);
});
