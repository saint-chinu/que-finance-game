const fs=require('node:fs'),vm=require('node:vm');
function boot(saved=[]){
  const elements=new Map(),storage=new Map(saved);
  function node(id=''){
    const classes=new Set();
    return {id,innerHTML:'',textContent:'',value:'',checked:false,hidden:false,inert:false,open:false,style:{},dataset:{},children:[],className:'',scrollTop:0,
      classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle(x,on){if(on===undefined? !classes.has(x):on)classes.add(x);else classes.delete(x);},contains:x=>classes.has(x)},
      addEventListener(){},setAttribute(){},focus(){},insertAdjacentHTML(_position,html){this.innerHTML+=html;},after(){},before(){},append(){},showModal(){this.open=true;},close(){this.open=false;},querySelector(){return node();},querySelectorAll(){return [];},previousElementSibling:{querySelector(){return node();}},offsetParent:{}};
  }
  const get=id=>{if(!elements.has(id))elements.set(id,node(id));return elements.get(id)};
  const context={console,structuredClone,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{getElementById:get,querySelector:s=>get(s),querySelectorAll:()=>[],addEventListener(){},createElement:()=>node(),body:node(),activeElement:node()},window:{scrollTo(){}},location:{reload(){}}};
  vm.createContext(context);
  for(const file of ['expansion-engine','rescue','engine','bank','underwriting','replay','legacy','shop','bank-ui','review-ui','planning','finance-upgrade','ratios-ui','longterm-ui','progress','backup','completion-ui','payment-lessons','staff-tax-ui','expansion-ui','ranking-ui'])vm.runInContext(fs.readFileSync(`dist/js/${file}.js`,'utf8'),context,{filename:file+'.js'});
  return {get,storage,run:code=>vm.runInContext(code,context)};
}

module.exports={boot};
