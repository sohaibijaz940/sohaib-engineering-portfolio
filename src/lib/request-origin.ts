/** Compare browser origins against a configured deployment origin, never forwarded headers. */
export function isAppOrigin(origin:string|null,requestOrigin:string,publicSiteURL?:string):boolean {
 if(!origin)return false;
 try {
  const supplied=new URL(origin),expected=new URL(publicSiteURL||requestOrigin);
  if(!['http:','https:'].includes(supplied.protocol)||!['http:','https:'].includes(expected.protocol))return false;
  return supplied.origin===origin&&supplied.origin===expected.origin;
 } catch{return false;}
}
