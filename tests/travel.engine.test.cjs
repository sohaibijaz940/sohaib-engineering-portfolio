const {estimate,defaultTrip}=require('./.travel-compiled/travel-engine.js');
const assert=require('node:assert/strict');const{test}=require('node:test');
function input(id='amalfi'){return{...defaultTrip(id),departure:'2026-12-01',returnDate:'2026-12-07'}}
test('complete total equals all cost lines and round-person share',()=>{const r=estimate(input());assert.equal(r.total,r.lines.reduce((s,l)=>s+l.amount,0));assert.equal(r.nights,6);assert.equal(r.days,7);assert.equal(r.perPerson,Math.round(r.total/2))});
test('six room-nights use native rate times room count',()=>{const r=estimate(input());assert.equal(r.lines.find(l=>l.key==='stay').amount,140*6*305);assert.equal(r.lines.find(l=>l.key==='tax').amount,Math.round(140*6*305*.08))});
test('cars split fuel across passengers rather than multiply it',()=>{const a=estimate({...input('hunza'),transport:'car',efficiency:10,fuelPrice:300});const b=estimate({...input('hunza'),transport:'car',efficiency:10,fuelPrice:300,travellers:4,rooms:2});assert.equal(a.lines[0].amount,60000);assert.equal(a.lines[0].amount,b.lines[0].amount)});
test('flights and per-person allowances scale with travellers',()=>{const a=estimate(input());const b=estimate({...input(),travellers:4,rooms:2});assert.equal(b.lines[0].amount,a.lines[0].amount*2);assert.ok(Math.abs(b.total-a.total*2)<=1,"whole-rupee contingency rounding may differ by one rupee")});
test('insufficient room capacity rejected',()=>assert.throws(()=>estimate({...input(),travellers:3}),/enough rooms/));
test('three-capacity suite allows three in one room',()=>assert.equal(estimate({...input(),travellers:3,stayId:'amalfi-suite'}).rooms,1));
test('custom FX affects local costs but not PKR flight fare',()=>{const a=estimate(input()),b=estimate({...input(),fxRate:610});assert.equal(a.lines[0].amount,b.lines[0].amount);assert.equal(b.lines[1].amount,a.lines[1].amount*2)});
test('visa and insurance explicit per-person costs',()=>{const r=estimate({...input(),visa:10000,insurance:4000});assert.equal(r.lines.find(l=>l.key==='visa').amount,20000);assert.equal(r.lines.find(l=>l.key==='insurance').amount,8000)});
test('no visa/insurance invented by default',()=>{const r=estimate(input());assert.equal(r.lines.find(l=>l.key==='visa').amount,0);assert.equal(r.lines.find(l=>l.key==='insurance').amount,0)});
test('international road trip rejected',()=>assert.throws(()=>estimate({...input(),transport:'car'}),/Hunza/));
test('stay must match destination',()=>assert.throws(()=>estimate({...input(),stayId:'dubai-classic'}),/stay/));
test('UTC dates handle year boundary',()=>assert.equal(estimate({...input(),departure:'2026-12-30',returnDate:'2027-01-02'}).nights,3));
test('negative and excessive date intervals rejected',()=>{assert.throws(()=>estimate({...input(),returnDate:'2026-11-30'}));assert.throws(()=>estimate({...input(),returnDate:'2027-02-01'}))});
test('invalid values rejected, including NaN Infinity fractions and negative extras',()=>{for(const change of[{efficiency:0},{travellers:1.2},{rooms:0},{fxRate:Infinity},{fuelPrice:NaN},{extras:-1},{contingency:41},{visa:'1'},{origin:'Unknown'},{transport:'train'}])assert.throws(()=>estimate({...input(),...change}))});
test('different rates are explicit and reproducible',()=>{const a=estimate(input(),{EUR:300}),b=estimate(input(),{EUR:310});assert.equal(a.fxRate,300);assert.equal(b.fxRate,310);assert.equal(a.sample,true);assert.ok(b.total>a.total)});

test('hotel price overrides alter stay and tax but not flights',()=>{const a=estimate(input()),b=estimate(input(),undefined,{'amalfi-classic':280});assert.equal(a.lines[0].amount,b.lines[0].amount);assert.equal(b.lines[1].amount,a.lines[1].amount*2);assert.equal(b.stay.nightly,280)});
test('impossible and malformed dates have friendly errors',()=>{for(const departure of ['2026-02-30','2026-13-01','not-a-date'])assert.throws(()=>estimate({...input(),departure}),/valid travel dates/)});
