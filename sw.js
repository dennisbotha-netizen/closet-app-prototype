const C='closet-v2-0',RT='closet-rt-v1';
const F=['./','index.html','style.css','extra.js','tryon.js','app.js','manifest.json','icon.svg','fonts/bodoni-normal.woff2','fonts/bodoni-italic.woff2','fonts/geist.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==RT).map(x=>caches.delete(x)))));self.clients.claim()});
// CDN modules + on-device model files: cache on first use so the avatar maker / cut-out / tagging work offline
const CDN=/^https:\/\/(cdn\.jsdelivr\.net|storage\.googleapis\.com\/mediapipe-models|huggingface\.co\/Xenova\/.*\/resolve|staticimgly\.com)/;
self.addEventListener('fetch',e=>{const u=e.request.url;if(e.request.method!=='GET')return;
 if(CDN.test(u)){e.respondWith(caches.open(RT).then(async c=>{const hit=await c.match(e.request);if(hit)return hit;const r=await fetch(e.request);if(r.ok||r.type==='opaque')c.put(e.request,r.clone());return r}));return}
 if(new URL(u).origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})))});
