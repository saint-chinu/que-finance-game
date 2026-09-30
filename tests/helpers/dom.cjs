const fs=require('node:fs'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
function bootDOM(saved=[]){
 const errors=[],console=new VirtualConsole();
 console.on('jsdomError',error=>errors.push(error));
 const dom=new JSDOM(fs.readFileSync('dist/index.html','utf8'),{url:'https://game.test',runScripts:'outside-only',virtualConsole:console});
 const window=dom.window,document=window.document;
 window.structuredClone=structuredClone;window.scrollTo=()=>{};window.setTimeout=()=>0;window.clearTimeout=()=>{};
 window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 for(const [key,value]of saved)window.localStorage.setItem(key,value);
 const run=code=>vm.runInContext(code,dom.getInternalVMContext());
 for(const script of document.querySelectorAll('script[src]'))run(fs.readFileSync('dist/'+script.getAttribute('src'),'utf8'));
 function click(selector){const button=document.querySelector(selector);if(!button)throw Error('Missing UI: '+selector);button.click();if(errors.length)throw errors[0];}
 function finishEntries(){run('while(animationQueue.length)nextTransaction()');}
 return {window,document,run,click,finishEntries,errors,close:()=>window.close()};
}
module.exports={bootDOM};
