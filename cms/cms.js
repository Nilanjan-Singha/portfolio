
var TPL='',KEY='portfolio-cms-v1',D0=null,D=null,cur=0,tm,DL=null,$=function(i){return document.getElementById(i)};
var CMS_BASE=location.pathname.endsWith('/cms/cms.html')?'./':'./cms/';
function clone(x){return JSON.parse(JSON.stringify(x))}
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
var READY=Promise.all([
 fetch(CMS_BASE+'d0.json').then(function(r){if(!r.ok)throw new Error('Could not load default content');return r.json()}),
 fetch(CMS_BASE+'preview-template.html').then(function(r){if(!r.ok)throw new Error('Could not load preview template');return r.text()})
]).then(function(parts){
 D0=parts[0];TPL=parts[1].split('<\\/script').join('</script');
 try{D=JSON.parse(localStorage.getItem(KEY))}catch(e){}
 if(!D||!D.profile||!D.posts)D=clone(D0);
 D.photos=(D.photos||[]).filter(function(p){return 'src' in p});
 if(!D.skills)D.skills={core:['Frontend','Backend','AI & ML','Product design'],languages:['js','ts','py','java','go','rust'],frontend:['react','nextjs','tailwind','nodejs','nestjs','spring'],ai:['pytorch','mongodb','postgres','redis','rabbitmq','prisma'],tools:['git','github','vscode','postman','linux','vercel']};
}).catch(function(){stat('Couldn’t load CMS files');
});

var SC=[
{l:'Profile',d:'Cover, avatar, name and the bio shown at the top of the site.',o:function(){return D.profile},f:[
 {k:'cover',l:'Cover image',t:'img',w:1800},{k:'avatar',l:'Avatar',t:'img',w:400},
 {k:'name',l:'Name',half:1},{k:'role',l:'Role',half:1},{k:'initial',l:'Avatar letter (used when there is no image)',half:1},
 {k:'bio',l:'Bio',t:'area',r:4},
 {k:'stats',l:'Stats',t:'list',inline:1,a:'Add stat',n:{n:'',l:''},f:[{k:'n',l:'Number'},{k:'l',l:'Label'}]}]},
{l:'About me',d:'Paragraphs and quick facts.',o:function(){return D.about},f:[
 {k:'paras',l:'Paragraphs',t:'strings',area:1,r:3,a:'Add paragraph'},
 {k:'facts',l:'Facts',t:'list',inline:1,a:'Add fact',n:{k:'',v:''},f:[{k:'k',l:'Label'},{k:'v',l:'Value'}]}]},
{l:'Work & resume',d:'Contact email, roles and education.',c:function(){return D.work.jobs.length},o:function(){return D.work},f:[
 {k:'email',l:'Contact email',half:1},
 {k:'jobs',l:'Roles and education',t:'list',sum:'role',a:'Add role',n:{yr:'',role:'New role',co:'',desc:''},f:[{k:'yr',l:'Years',half:1},{k:'role',l:'Title',half:1},{k:'co',l:'Company or school'},{k:'desc',l:'Description',t:'area',r:3}]}]},
{l:'Skills & tools',d:'Core skills and grouped technology icons.',c:function(){var s=D.skills||{};return (s.core||[]).length+(s.languages||[]).length+(s.frontend||[]).length+(s.ai||[]).length+(s.tools||[]).length},o:function(){D.skills=D.skills||{core:[],languages:[],frontend:[],ai:[],tools:[]};return D.skills},f:[
 {k:'core',l:'Core skills',t:'strings',a:'Add skill'},
 {k:'languages',l:'Languages (icon names)',t:'strings',a:'Add language'},
 {k:'frontend',l:'Frontend & backend (icon names)',t:'strings',a:'Add technology'},
 {k:'ai',l:'AI & data (icon names)',t:'strings',a:'Add technology'},
 {k:'tools',l:'Tools & platforms (icon names)',t:'strings',a:'Add tool'}]},
{l:'Lists',d:'Shelves for reading, watching and gaming. Each item becomes a book spine. Add a cover image, or leave it empty for an automatic soft color.',c:function(){return D.lists.length},o:function(){return D},f:[
 {k:'lists',l:'Shelves',t:'list',sum:'name',a:'Add shelf',n:{name:'New shelf',items:[]},f:[{k:'name',l:'Shelf name'},
  {k:'items',l:'Items (ranked in order)',t:'list',inline:1,a:'Add item',n:{t:'',s:'',img:''},f:[{k:'t',l:'Title'},{k:'s',l:'Author or studio'},{k:'img',l:'Cover image',t:'img',w:420,wide:1}]}]}]},
{l:'Writing',d:'Blog posts. Separate paragraphs with a blank line and start a line with ## for a heading. The first paragraph becomes the lead.',c:function(){return D.posts.length},o:function(){return D},f:[
 {k:'posts',l:'Posts',t:'list',sum:'t',top:1,a:'New post',n:function(){return {t:'Untitled post',d:new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}),tags:'',x:'',body:''}},f:[{k:'t',l:'Title'},{k:'d',l:'Date',half:1},{k:'tags',l:'Tags (comma separated)',half:1},{k:'x',l:'Excerpt',t:'area',r:2},{k:'body',l:'Article',t:'area',r:12}]}]},
{l:'Projects',d:'Project cards. Add an image, or leave it empty for an automatic soft color.',c:function(){return D.projects.length},o:function(){return D},f:[
 {k:'projects',l:'Projects',t:'list',sum:'t',a:'Add project',n:{t:'New project',x:'',img:''},f:[{k:'t',l:'Name'},{k:'x',l:'Description',t:'area',r:2},{k:'img',l:'Project image',t:'img',w:1000}]}]},
{l:'Photography',d:'Your gallery. Upload photos or paste image links. With no photos, the site shows an empty-gallery message.',c:function(){return D.photos.length},o:function(){return D},f:[
 {k:'photos',l:'Photos',t:'list',inline:1,a:'Add photo',n:{src:'',alt:''},f:[{k:'src',l:'Photo',t:'img',w:1200,wide:1},{k:'alt',l:'Description'}]}]}
];

function stat(m){var s=$('stat');if(s)s.textContent=m}
function build(){return READY.then(function(){
 var preview=clone(D);
 if(preview.profile&&preview.profile.avatar){
  preview.profile.avatar=preview.profile.avatar==='./pfp.jpg'
   ?(CMS_BASE==='./'?'../main/pfp.jpg':'./main/pfp.jpg')
   :preview.profile.avatar;
 }
 return TPL.split('__DATA__').join(JSON.stringify(preview).replace(/</g,'\\u003c'));
})}
function prev(){build().then(function(h){$('pvf').srcdoc=h;if(!$('modal').hidden)$('pvf2').srcdoc=h})}
function chg(){stat('Saving…');clearTimeout(tm);tm=setTimeout(function(){try{localStorage.setItem(KEY,JSON.stringify(D));stat('Saved')}catch(e){stat('Not saved in this browser')}nav();prev()},350)}

function ctl(arr,n,draw){var w=el('span','ctl');[['↑','Move up'],['↓','Move down'],['×','Delete']].forEach(function(c,i){var b=el('button','ib',c[0]);b.type='button';b.title=c[1];b.setAttribute('aria-label',c[1]);
 b.onclick=function(e){e.preventDefault();e.stopPropagation();
  if(i===2){if(!b.hasAttribute('data-arm')){b.setAttribute('data-arm','');b.textContent='Delete?';setTimeout(function(){b.removeAttribute('data-arm');b.textContent='×'},2500);return}arr.splice(n,1)}
  else{var m=n+(i?1:-1);if(m<0||m>=arr.length)return;arr.splice(m,0,arr.splice(n,1)[0])}
  chg();draw()};w.appendChild(b)});return w}

function fields(fs,o,inl){var w=el('div','fields'+(inl?' inl':''));fs.forEach(function(f){w.appendChild(fld(f,o))});return w}
function fld(f,o){var t=f.t||'text';
 if(t==='list')return lst(f,o[f.k]);if(t==='strings')return strs(f,o[f.k]);if(t==='img')return img(f,o);
 var w=el('label','f'+(f.half?'':' full')),i=el(t==='area'?'textarea':'input');w.appendChild(el('span','l',f.l));
 if(t==='area')i.rows=f.r||3;else i.type=t==='color'?'color':t==='num'?'number':'text';
 i.value=o[f.k]==null?'':o[f.k];i.oninput=function(){o[f.k]=t==='num'?+i.value:i.value;chg()};
 w.appendChild(i);return w}

function lst(f,arr){var box=el('div','lst'),lh=el('div','lh','<span class="l">'+f.l+'</span>'),cnt=el('span','l'),items=el('div','items'),add=el('button','add','+ '+(f.a||'Add item'));add.type='button';lh.appendChild(cnt);
 function draw(open){items.innerHTML='';arr.forEach(function(it,n){var r;
  if(f.inline){r=el('div','row');r.appendChild(fields(f.f,it,1));r.appendChild(ctl(arr,n,draw))}
  else{r=el('details','item');var s=el('summary','',''),st=el('span','st'),b=fields(f.f,it);st.textContent=it[f.sum]||'Untitled';
   s.appendChild(el('span','car','▸'));s.appendChild(st);s.appendChild(ctl(arr,n,draw));r.appendChild(s);r.appendChild(b);
   b.addEventListener('input',function(){st.textContent=it[f.sum]||'Untitled'});if(n===open)r.open=true}
  items.appendChild(r)});cnt.textContent=arr.length}
 add.onclick=function(){var x=typeof f.n==='function'?f.n():clone(f.n);if(f.top)arr.unshift(x);else arr.push(x);chg();draw(f.top?0:arr.length-1)};
 draw();box.appendChild(lh);box.appendChild(items);box.appendChild(add);return box}

function strs(f,arr){var box=el('div','lst'),lh=el('div','lh','<span class="l">'+f.l+'</span>'),items=el('div','strs'),add=el('button','add','+ '+(f.a||'Add'));add.type='button';
 function draw(){items.innerHTML='';arr.forEach(function(v,n){var r=el('div','row'),w=el('div','fields inl'),fl=el('div','f full'),i=el(f.area?'textarea':'input');
  if(f.area)i.rows=f.r||3;else i.type='text';i.value=v;i.oninput=function(){arr[n]=i.value;chg()};
  fl.appendChild(i);w.appendChild(fl);r.appendChild(w);r.appendChild(ctl(arr,n,draw));items.appendChild(r)})}
 add.onclick=function(){arr.push('');chg();draw();var t=items.lastChild.querySelector('input,textarea');if(t)t.focus()};
 draw();box.appendChild(lh);box.appendChild(items);box.appendChild(add);return box}

function rd(file,w,cb){var fr=new FileReader();fr.onload=function(){var im=new Image();im.onload=function(){var s=Math.min(1,w/im.width),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.84))};im.src=fr.result};fr.readAsDataURL(file)}
function img(f,o){var w=el('div','f'+(f.half?'':' full')+(f.wide?' wide':''),'<span class="l">'+f.l+'</span>'),row=el('div','ir'),th=el('div','th'+(f.k==='avatar'?' rnd':'')),pick=el('button','b2','Upload'),u=el('input'),rm=el('button','ib','×'),fi=el('input');
 pick.type=rm.type='button';rm.title='Remove image';rm.setAttribute('aria-label','Remove image');fi.type='file';fi.accept='image/*';fi.hidden=true;u.type='text';u.className='iu';u.placeholder='or paste an image link';
 function bg(v){th.style.backgroundImage=v?'url("'+v.replace(/"/g,'%22')+'")':'none';rm.hidden=!v}
 function paint(){var v=o[f.k]||'';bg(v);u.value=/^data:/.test(v)?'':v}
 pick.onclick=function(){fi.click()};rm.onclick=function(){o[f.k]='';paint();chg()};
 u.oninput=function(){o[f.k]=u.value.trim();bg(o[f.k]);chg()};
 fi.onchange=function(){if(fi.files[0])rd(fi.files[0],f.w,function(x){o[f.k]=x;paint();chg()})};
 paint();[th,pick,u,rm,fi].forEach(function(x){row.appendChild(x)});w.appendChild(row);return w}

function nav(){var n=$('nav');n.innerHTML='';SC.forEach(function(s,i){var b=el('button','','<span>'+s.l+'</span><span class="n">'+(s.c?s.c():'')+'</span>');b.type='button';b.setAttribute('aria-current',i===cur);b.onclick=function(){cur=i;render()};n.appendChild(b)})}
function render(){var s=SC[cur],m=$('main');nav();m.innerHTML='<header class="mh"><div><h1>'+s.l+'</h1><p>'+s.d+'</p></div><span class="stat" id="stat"></span></header>';m.appendChild(fields(s.f,s.o()));window.scrollTo(0,0)}
function fit(){var sc=$('pvbox').clientWidth/1200;$('pvf').style.transform='scale('+sc+')';$('pvbox').style.height=Math.round(760*sc)+'px'}
function arm(b,label,fn){b.onclick=function(){if(!b.hasAttribute('data-arm')){b.setAttribute('data-arm','');b.textContent='Click again to confirm';setTimeout(function(){b.removeAttribute('data-arm');b.textContent=label},3000);return}b.removeAttribute('data-arm');b.textContent=label;fn()}}
function dl(name,data){if(!DL){stat('Downloads aren’t available in this view');return}DL.save({filename:name,data:data}).catch(function(e){if(!e||e.code!=='declined')stat('Couldn’t save the file')})}

$('dlh').onclick=function(){build().then(function(h){dl('portfolio.html',h)})};
$('dlj').onclick=function(){dl('content.json',JSON.stringify(D,null,2))};
$('imp').onclick=function(){$('impf').click()};
$('impf').onchange=function(){var f=this.files[0];if(!f)return;f.text().then(function(t){var o=JSON.parse(t);if(!o.profile||!o.posts)throw 0;D=o;chg();render()}).catch(function(){stat('That file isn’t valid site content')});this.value=''};
arm($('rst'),'Reset to defaults',function(){D=clone(D0);chg();render()});
$('open').onclick=function(){$('modal').hidden=false;build().then(function(h){$('pvf2').srcdoc=h})};
$('cls').onclick=function(){$('modal').hidden=true};
$('dsk').onclick=function(){$('pvf2').style.width='100%'};
$('mob').onclick=function(){$('pvf2').style.width='390px'};
document.addEventListener('keydown',function(e){if(e.key==='Escape')$('modal').hidden=true});
window.addEventListener('resize',fit);
try{window.claude.use('downloads').then(function(d){DL=d;if(!d){$('dlh').hidden=$('dlj').hidden=true}}).catch(function(){$('dlh').hidden=$('dlj').hidden=true})}catch(e){$('dlh').hidden=$('dlj').hidden=true}
READY.then(function(){render();fit();prev()});
