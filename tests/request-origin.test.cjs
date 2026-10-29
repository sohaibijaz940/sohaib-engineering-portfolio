const {test}=require('node:test');
const assert=require('node:assert/strict');
const {isAppOrigin}=require('./.origin-compiled/request-origin.js');
test('direct local requests use their actual origin',()=>{
 assert.equal(isAppOrigin('http://localhost:3001','http://localhost:3001'),true);
 assert.equal(isAppOrigin('http://localhost:3000','http://localhost:3001'),false);
});
test('TLS proxy requests use the configured public domain',()=>{
 assert.equal(isAppOrigin('https://sohaibijaz.dev','http://0.0.0.0:3000','https://sohaibijaz.dev/'),true);
});
test('public deployment rejects internal origins and hostile lookalikes',()=>{
 for(const o of ['http://0.0.0.0:3000','https://sohaibijaz.dev.evil.test','http://sohaibijaz.dev','https://evil.test'])
  assert.equal(isAppOrigin(o,'http://0.0.0.0:3000','https://sohaibijaz.dev'),false);
});
test('missing, null, malformed and non-origin header values are rejected',()=>{
 for(const o of [null,'null','','not a URL','https://sohaibijaz.dev/path','https://sohaibijaz.dev?x=1','https://user@sohaibijaz.dev','file://host'])
  assert.equal(isAppOrigin(o,'http://0.0.0.0:3000','https://sohaibijaz.dev'),false);
});
test('invalid deployment configuration fails closed',()=>{
 assert.equal(isAppOrigin('https://sohaibijaz.dev','http://0.0.0.0:3000','invalid'),false);
});
