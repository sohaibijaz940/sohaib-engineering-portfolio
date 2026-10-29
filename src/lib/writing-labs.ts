export type TeachingOffer={id:string;price:number;status:string;approved:boolean;stock:number;age:number};
export const teachingOffers:TeachingOffer[]=[
 {id:'A',price:8000,status:'Verified',approved:true,stock:4,age:1},
 {id:'B',price:8400,status:'Verified',approved:true,stock:3,age:2},
 {id:'C',price:8600,status:'Verified',approved:true,stock:5,age:1},
 {id:'D',price:9000,status:'Verified',approved:true,stock:2,age:3},
 {id:'E',price:9500,status:'Verified',approved:true,stock:1,age:2},
 {id:'F',price:4000,status:'Revoked',approved:true,stock:4,age:1},
 {id:'G',price:7200,status:'Verified',approved:true,stock:3,age:9},
 {id:'H',price:5000,status:'Verified',approved:true,stock:0,age:1}
];
export function rejection(o:TeachingOffer){return o.status!=='Verified'?'Supplier not verified':!o.approved?'Not approved':o.stock<=0?'Out of stock':o.age<0?'Future timestamp':o.age>7?'Older than seven days':'';}
export function teachingMean(offers:TeachingOffer[]){const eligible=offers.filter(o=>!rejection(o)).sort((a,b)=>a.price-b.price);const trim=eligible.length>=5?Math.floor(eligible.length*.2):0,used=trim?eligible.slice(trim,-trim):eligible;const sum=used.reduce((n,o)=>n+o.price,0),n=used.length,floor=n?Math.floor(sum/n):0,remainder=n?sum%n:0;const average=n?(remainder*2<n?floor:remainder*2>n?floor+1:floor%2===0?floor:floor+1):null;return{eligible,used,trim,average};}
export const safeBookingSteps=[
 {title:'Two screens show the same slot',a:'Ready to request',b:'Ready to request',rows:0,invoices:0,detail:'A previously rendered availability screen is not a reservation.'},
 {title:'A begins the write transaction',a:'BEGIN IMMEDIATE',b:'Waiting to write',rows:0,invoices:0,detail:'The teaching sequence serialises writers. Real contention can also produce a controlled database-busy outcome.'},
 {title:'A validates and writes',a:'Booking + invoice pending',b:'Waiting to write',rows:0,invoices:0,detail:'The availability check and both writes occur inside A’s transaction; nothing is committed yet.'},
 {title:'A commits both records',a:'Confirmed',b:'May now begin',rows:1,invoices:1,detail:'The appointment and its invoice become one committed outcome.'},
 {title:'B rechecks current availability',a:'Confirmed',b:'Conflict: unavailable',rows:1,invoices:1,detail:'B sees the scheduled reservation. The route rejects the request instead of creating another booking.'},
 {title:'The invariant holds',a:'One reservation',b:'Choose another slot',rows:1,invoices:1,detail:'The partial unique index remains a final guard. This diagram is not making real API requests.'}
];
export const unsafeBookingSteps=[
 {title:'Both screens show free',a:'Ready',b:'Ready',rows:0,invoices:0,detail:'This deliberately unsafe example is not a mode in the real application.'},
 {title:'Both read before either writes',a:'Read: free',b:'Read: free',rows:0,invoices:0,detail:'The availability reads do not protect the following writes.'},
 {title:'A writes from the old decision',a:'Accepted',b:'Still thinks free',rows:1,invoices:1,detail:'Without the modelled transaction/index protection, B can still act on a stale decision.'},
 {title:'B writes from the same old decision',a:'Accepted',b:'Also accepted',rows:2,invoices:2,detail:'Two reservations now claim the same slot. The proposed invariant is broken.'},
 {title:'A nicer interface cannot repair this',a:'Accepted',b:'Also accepted',rows:2,invoices:2,detail:'A loading spinner or disabled button in A’s browser does not control B’s browser.'},
 {title:'Move the rule to the authority',a:'Unsafe example',b:'Unsafe example',rows:2,invoices:2,detail:'Switch back to the protected sequence to follow the implemented design.'}
];
export const teachingTrips=[{id:'T1',user:'A',hotel:'H1',nights:3},{id:'T2',user:'A',hotel:'H2',nights:5},{id:'T3',user:'B',hotel:'H1',nights:2}];
export const teachingHotels=[{id:'H1',name:'Fictional Coast Stay'},{id:'H2',name:'Fictional City Stay'}];
export function teachingJoin(user:string,broken=false){return teachingTrips.filter(t=>t.user===user).flatMap(t=>{const hotel=teachingHotels.find(h=>h.id===(broken&&t.id==='T2'?'MISSING':t.hotel));return hotel?[{...t,hotelName:hotel.name}]:[];});}
