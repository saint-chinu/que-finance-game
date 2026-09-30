const fs=require('node:fs'),path=require('node:path'),{simulate,policies}=require('./balance-v39.cjs');
const retail=policies.find(p=>p.id==='retail');
const cases=[{...retail,id:'retail-promote'},{...retail,id:'retail-no-promotion',promote:false},{...retail,id:'retail-winter-overstock',holdSummer:true}];
const results=[];for(const p of cases)for(const seed of [73129,91,202609]){const r=simulate(seed,p);results.push(r);console.log(JSON.stringify({id:r.id,seed,turn:r.turn,score:r.score?.total,cash:r.cash,waste:r.monthly.reduce((n,m)=>n+m.waste,0),annual:r.annual}));}
fs.writeFileSync(path.join(__dirname,'../docs/verify-v40.json'),JSON.stringify({cases,results},null,2)+'\n');
