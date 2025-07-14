const $=s=>document.getElementById(s);
const CFG={
  types:['PHOTO','PLAN','MEET','REGISTER','BORING','SURVEY','DRAWING','SPEC','OTHRS'],
  names:['写真','計画','打合','台帳','調査','測量','図面','仕様','その他'],
  icons:['📷','📋','📝','📊','🔍','📐','📐','📖','📁'],
  patterns:[/\.(jpe?g|png|gif)$/i,/\.(pdf|docx?|xlsx?)$/i,/\.(pdf|docx?)$/i,/\.(pdf|xlsx?|csv)$/i,/\.(pdf|xlsx?)$/i,/\.(pdf|dwg|dxf)$/i,/\.(dwg|dxf|pdf)$/i,/\.(pdf|docx?)$/i,/\.(pdf|docx?|xlsx?|dwg|dxf)$/i],
  spec:{
    PHOTO:{s:'写真情報',f:'写真ファイル名',j:'',fields:{title:'写真タイトル',date:'撮影年月日',serial:'シリアル番号',media:'メディア番号',category:'写真-大分類',division:'写真区分',representative:'代表写真',frequency:'提出頻度写真'}},
    PLAN:{s:'施工計画書情報',f:'施工計画書オリジナルファイル名',j:'施工計画書オリジナルファイル日本語名',fields:{title:'施工計画書名称',date:'作成年月日',serial:'シリアル番号'}},
    MEET:{s:'打合せ簿情報',f:'打合せ簿オリジナルファイル名',j:'打合せ簿オリジナルファイル日本語名',fields:{title:'打合せ簿名称',date:'発行日付',serial:'シリアル番号'}},
    REGISTER:{s:'台帳情報',f:'台帳オリジナルファイル名',j:'台帳オリジナルファイル日本語名',fields:{title:'台帳名',date:'作成年月日',serial:'シリアル番号'}},
    BORING:{s:'地質調査情報',f:'地質調査オリジナルファイル名',j:'地質調査オリジナルファイル日本語名',fields:{title:'調査名',date:'調査年月日',serial:'シリアル番号'}},
    SURVEY:{s:'測量情報',f:'測量オリジナルファイル名',j:'測量オリジナルファイル日本語名',fields:{title:'測量名',date:'測量年月日',serial:'シリアル番号'}},
    DRAWING:{s:'図面情報',f:'図面オリジナルファイル名',j:'図面オリジナルファイル日本語名',fields:{title:'図面名',date:'作成年月日',serial:'シリアル番号'}},
    SPEC:{s:'仕様書情報',f:'仕様書オリジナルファイル名',j:'仕様書オリジナルファイル日本語名',fields:{title:'仕様書名',date:'作成年月日',serial:'シリアル番号'}},
    OTHRS:{s:'その他資料情報',f:'オリジナルファイル名',j:'オリジナルファイル日本語名',fields:{title:'資料名',date:'',serial:'シリアル番号'}}
  }
};
class XMLViewer{
  constructor(){
    this.M=new Map();this.X=new Map();this.U=new Map();this.F=new Map();this.P=[];this.I=0;this.R=null;this.E=new Set();this.photoData=new Map();
    this.init();
  }
  init(){
    const u=$('u'),i=$('i'),events=['dragenter','dragover','dragleave','drop'];
    events.forEach((e,x)=>u.addEventListener(e,v=>{v.preventDefault();v.stopPropagation();u.classList[x<2?'add':'remove']('d')}));
    u.addEventListener('drop',e=>this.handleFiles([...e.dataTransfer.files]));
    i.addEventListener('change',e=>this.handleFiles([...e.target.files]));
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape')this.closeModal();
      if($('mo').classList.contains('sh')){
        if(e.key==='ArrowLeft')this.prevPhoto();
        if(e.key==='ArrowRight')this.nextPhoto();
      }
    });
  }
  async handleFiles(files){
    if(!files.length)return;
    try{
      this.progress(0,'収集');this.clear();
      const xmls=[];
      files.forEach(f=>{
        const p=(f.webkitRelativePath||f.name).toUpperCase();
        this.M.set(p,f);
        if(p.endsWith('.XML')){
          if(p.includes('INDEX_C.XML'))xmls.unshift({file:f,type:'INDEX',path:p});
          else if(p.includes('OTHRS.XML'))xmls.push({file:f,type:'OTHRS',path:p});
          else{
            const t=CFG.types.find(t=>p.includes(t+'/'));
            if(t)xmls.push({file:f,type:t,path:p});
          }
        }
      });
      this.progress(25,'解析');
      await Promise.all(xmls.map(({file,type})=>this.readXML(file,type)));
      this.progress(60,'分類');this.categorize();
      this.progress(85,'構築');this.buildTree();
      this.hideProgress();
      $('u').style.display='none';$('t').style.display='block';
      $('hs').textContent=`${this.F.size}分類、${this.M.size}ファイル`;
      this.updateProjectHeader();
    }catch(e){
      this.hideProgress();this.error('エラー：'+e.message);
    }
  }
  async readXML(f,t){
    try{
      if(t==='INDEX'){await this.readIndexXML(f);return;}
      if(t==='OTHRS'){await this.readOthrsXML(f);return;}
      const cfg=CFG.spec[t];
      if(!cfg)return;
      let x=await this.readText(f,'UTF-8');
      if(x.includes('�')||!/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(x)||/encoding=["'](?:shift[-_]?jis|sjis|windows-31j)/i.test(x))
        x=await this.readText(f,'Shift_JIS');
      const d=new DOMParser().parseFromString(x,'text/xml');
      if(d.querySelector('parsererror'))return;
      d.querySelectorAll(cfg.s).forEach(i=>{
        const files=i.querySelectorAll('オリジナルファイル情報');
        if(files.length>0){
          files.forEach(o=>{
            const fn=this.getTag(o,cfg.f),jn=cfg.j?this.getTag(o,cfg.j):null;
            if(fn)this.processXMLItem(i,fn,t,cfg,jn);
          });
        }else{
          const fn=this.getTag(i,cfg.f);
          if(fn)this.processXMLItem(i,fn,t,cfg);
        }
      });
    }catch(e){console.warn('XML解析エラー:',f.name,e);}
  }
  async readOthrsXML(f){
    try{
      let x=await this.readText(f,'UTF-8');
      if(x.includes('�')||!/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(x)||/encoding=["'](?:shift[-_]?jis|sjis|windows-31j)/i.test(x))
        x=await this.readText(f,'Shift_JIS');
      const d=new DOMParser().parseFromString(x,'text/xml');
      if(d.querySelector('parsererror'))return;
      d.querySelectorAll('サブフォルダ情報').forEach(folder=>{
        const folderName=this.getTag(folder,'その他サブフォルダ日本語名');
        folder.querySelectorAll('その他資料情報').forEach(item=>{
          const fileInfo=item.querySelector('オリジナルファイル情報');
          if(fileInfo){
            const filename=this.getTag(fileInfo,'オリジナルファイル名');
            const japaneseName=this.getTag(fileInfo,'オリジナルファイル日本語名');
            const title=this.getTag(item,'資料名');
            const serial=this.getTag(fileInfo,'シリアル番号');
            if(filename){
              const obj={
                filename:filename,
                type:'OTHRS',
                title:title||folderName,
                serial:serial,
                japaneseName:japaneseName,
                folder:folderName
              };
              [filename,filename.toUpperCase(),filename.toLowerCase()].forEach(f=>{
                if(!this.X.has(f))this.X.set(f,obj);
              });
            }
          }
        });
      });
    }catch(e){console.warn('OTHRS.XML解析エラー:',e);}
  }
  async readIndexXML(f){
    try{
      let x=await this.readText(f,'UTF-8');
      if(x.includes('�')||!/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(x)||/encoding=["'](?:shift[-_]?jis|sjis|windows-31j)/i.test(x))
        x=await this.readText(f,'Shift_JIS');
      const d=new DOMParser().parseFromString(x,'text/xml');
      if(d.querySelector('parsererror'))return;
      this.R={
        name:this.getTag(d,'工事件名'),
        type:this.getTag(d,'工種-工法形式'),
        content:this.getTag(d,'工事内容'),
        startDate:this.formatDate(this.getTag(d,'工期開始日')),
        endDate:this.formatDate(this.getTag(d,'工期終了日')),
        contractor:this.getTag(d,'請負業者名')
      };
    }catch(e){console.warn('INDEX_C.XML解析エラー:',e);}
  }
  formatDate(d){
    if(!d)return'';
    const m=d.match(/(\d{4})(\d{2})(\d{2})/);
    return m?`${m[1]}/${m[2]}/${m[3]}`:d;
  }
  processXMLItem(i,fn,t,cfg,jn){
    if(!fn)return;
    const o={filename:fn,type:t};
    if(jn)o.japaneseName=jn;
    Object.entries(cfg.fields).forEach(([k,tag])=>{
      const v=this.getTag(i,tag);
      if(v)o[k]=tag==='代表写真'||tag==='提出頻度写真'?v==='1':v;
    });
    [fn,fn.toUpperCase(),fn.toLowerCase()].forEach(f=>{
      if(!this.X.has(f))this.X.set(f,o);
    });
  }
  readText(f,enc='UTF-8'){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=e=>resolve(e.target.result);
      reader.onerror=reject;
      reader.readAsText(f,enc);
    });
  }
  getTag(elem,tagName){
    const found=elem?.querySelector(tagName);
    return found?found.textContent.trim():'';
  }
  categorize(){
    CFG.types.forEach((type,i)=>{
      const files=this.filterFiles(type,CFG.patterns[i]);
      if(files.length>0){
        if(type==='PHOTO')this.categorizePhotos(files);
        else if(type==='OTHRS')this.categorizeOthrs(files);
        else this.categorizeNonPhoto(type,files);
      }
    });
  }
  filterFiles(type,pattern){
    const files=[];
    for(let[path,file] of this.M){
      if((path.includes(type+'/')||path.includes(type))&&!path.endsWith('.XML')&&!path.endsWith('.DTD')&&pattern.test(path)){
        const name=path.split('/').pop();
        files.push({name,file,path,ext:name.split('.').pop().toLowerCase()});
      }
    }
    return files;
  }
  categorizePhotos(photos){
    const cats=new Map();
    photos.forEach(f=>{
      const name=f.name,info=this.X.get(name)||this.X.get(name.toUpperCase())||this.X.get(name.toLowerCase())||{category:'未分類',division:'その他',title:name,filename:name};
      const cat=info.category||'未分類',div=info.division||'その他',title=info.title||name;
      if(!cats.has(cat))cats.set(cat,new Map());
      if(!cats.get(cat).has(div))cats.get(cat).set(div,new Map());
      if(!cats.get(cat).get(div).has(title))cats.get(cat).get(div).set(title,[]);
      cats.get(cat).get(div).get(title).push({...f,info});
      this.photoData.set(`${cat}|${div}`,{category:cat,division:div,files:cats.get(cat).get(div)});
      this.photoData.set(`${cat}|${div}|${title}`,{category:cat,division:div,title,files:cats.get(cat).get(div).get(title)});
    });
    cats.forEach((divs,cat)=>this.F.set(`PHOTO_${cat}`,{key:`PHOTO_${cat}`,name:cat,folders:divs,isPhoto:true}));
  }
  categorizeOthrs(files){
    const folders=new Map();
    files.forEach(f=>{
      const info=this.X.get(f.name)||this.X.get(f.name.toUpperCase())||this.X.get(f.name.toLowerCase());
      if(info){
        f.info=info;
        const folderName=info.folder||'その他';
        if(!folders.has(folderName)){
          folders.set(folderName,[]);
        }
        folders.get(folderName).push(f);
      }
    });
    folders.forEach((files,folderName)=>{
      this.F.set(`OTHRS_${folderName}`,{
        key:`OTHRS_${folderName}`,
        name:folderName,
        files:files,
        baseType:'OTHRS'
      });
    });
  }
  categorizeNonPhoto(type,files){
    files.forEach(f=>{
      const info=this.X.get(f.name)||this.X.get(f.name.toUpperCase())||this.X.get(f.name.toLowerCase());
      if(info)f.info=info;
    });
    this.F.set(type,{key:type,name:CFG.names[CFG.types.indexOf(type)],files,baseType:type});
  }
  buildTree(){
    const groups=new Map();
    this.F.forEach((folder,key)=>{
      const baseType=key.startsWith('PHOTO_')?'PHOTO':key.startsWith('OTHRS_')?'OTHRS':folder.baseType||key;
      if(!groups.has(baseType))groups.set(baseType,{name:CFG.names[CFG.types.indexOf(baseType)]||baseType,folders:[]});
      groups.get(baseType).folders.push({key,folder});
    });
    let html='';
    groups.forEach((group,type)=>{
      html+=`<div class="fg"><div class="ft">${group.name}</div>`;
      if(type==='PHOTO'){
        group.folders.forEach(({folder})=>{
          const catName=folder.key.split('_')[1];
          html+=`<div class="f" onclick="v.showFolder('${folder.key}',this)"><div class="fi"><span class="fn">${folder.name}</span></div><span class="fc">${this.getTotalFiles(folder.folders)}</span></div>`;
          folder.folders.forEach((divisionMap,division)=>{
            const divKey=`${catName}|${division}`;
            html+=`<div class="f sub" onclick="v.toggleDivision('${divKey}',this)" style="margin-left:20px"><div class="fi"><span class="fn">${division}</span></div><span class="fc">${this.getTotalFiles(divisionMap)}</span></div>`;
            divisionMap.forEach((files,title)=>{
              const titleKey=`${divKey}|${title}`;
              html+=`<div class="f title" onclick="v.showFiles('${titleKey}',this)" style="margin-left:40px;display:none" data-division="${divKey}"><div class="fi"><span class="fn">${title}</span></div><span class="fc">${files.length}</span></div>`;
            });
          });
        });
      }else{
        group.folders.forEach(({key,folder})=>html+=`<div class="f" onclick="v.showFolder('${key}',this)"><div class="fi"><span class="fn">${folder.name}</span></div><span class="fc">${folder.files.length}</span></div>`);
      }
      html+='</div>';
    });
    $('t').innerHTML=html;
  }
  getTotalFiles(map){
    return map instanceof Map?Array.from(map.values()).reduce((acc,val)=>acc+(Array.isArray(val)?val.length:this.getTotalFiles(val)),0):map.length||0;
  }
  toggleDivision(key,elem){
    const isExpanded=this.E.has(key);
    document.querySelectorAll('.f.ac').forEach(e=>e.classList.remove('ac'));
    if(isExpanded){
      this.E.delete(key);
      document.querySelectorAll(`[data-division="${key}"]`).forEach(t=>t.style.display='none');
    }else{
      this.E.add(key);
      document.querySelectorAll(`[data-division="${key}"]`).forEach(t=>t.style.display='block');
      elem.classList.add('ac');
    }
  }
  showFiles(key,elem){
    document.querySelectorAll('.f.ac').forEach(e=>e.classList.remove('ac'));
    elem.classList.add('ac');
    const data=this.photoData.get(key);
    if(!data)return;
    const files=data.files;
    $('h2').textContent=`${data.title} (${files.length})`;
    this.P=files;
    let html='<div class="pg">';
    files.forEach((photo,i)=>{
      const url=this.getURL(photo.file);
      html+=`<div class="pi" onclick="v.openPhoto(${i})"><img class="pt" src="${url}" alt="${photo.info.title}" loading="lazy"><div class="pf"><div class="pn">${photo.info.title}</div><div class="pd">${photo.info.date||''}</div></div></div>`;
    });
    html+='</div>';
    $('g').innerHTML=html;
  }
  showFolder(key,elem){
    document.querySelectorAll('.f.ac').forEach(e=>e.classList.remove('ac'));
    elem.classList.add('ac');
    const folder=this.F.get(key);
    if(!folder)return;
    if(folder.isPhoto){
      const allFiles=[];
      folder.folders.forEach(divisionMap=>divisionMap.forEach(files=>files.forEach(file=>allFiles.push(file))));
      $('h2').textContent=`${folder.name} (${allFiles.length})`;
      this.P=allFiles;
      let html='<div class="pg">';
      allFiles.forEach((photo,i)=>{
        const url=this.getURL(photo.file);
        html+=`<div class="pi" onclick="v.openPhoto(${i})"><img class="pt" src="${url}" alt="${photo.info.title}" loading="lazy"><div class="pf"><div class="pn">${photo.info.title}</div><div class="pd">${photo.info.date||''}</div></div></div>`;
      });
      html+='</div>';
      $('g').innerHTML=html;
    }else{
      $('h2').textContent=`${folder.name} (${folder.files.length})`;
      const groups=new Map();
      folder.files.forEach(f=>{
        const info=f.info||{},title=info.title||'未分類';
        if(!groups.has(title))groups.set(title,{title,date:info.date||'',files:[]});
        groups.get(title).files.push(f);
      });
      const rows=Array.from(groups.values()).sort((a,b)=>a.title.localeCompare(b.title));
      let html='<div class="tb"><table class="tbl"><thead><tr><th>日付</th><th>タイトル</th><th>ファイル</th></tr></thead><tbody>';
      rows.forEach(row=>{
        html+=`<tr><td>${row.date}</td><td>${row.title}</td><td>`;
        row.files.forEach((f,i)=>{
          const displayName=f.info?.japaneseName||f.name;
          if(i>0)html+='<br>';
          html+=`<span class="fl" onclick="v.openFile('${f.path}')">${displayName}</span>`;
        });
        html+='</td></tr>';
      });
      html+='</tbody></table></div>';
      $('g').innerHTML=html;
    }
  }
  updateProjectHeader(){
    if(!this.R)return;
    const{name,type,content,startDate,endDate,contractor}=this.R,parts=[];
    if(name)parts.push(name);
    if(type)parts.push(type);
    if(content)parts.push(content.replace(/　/g,''));
    if(startDate||endDate)parts.push((startDate||'')+(startDate&&endDate?'～':'')+(endDate||''));
    if(contractor)parts.push(contractor);
    if(parts.length){
      let elem=$('project-info');
      if(!elem){
        elem=document.createElement('div');
        elem.id='project-info';
        $('h').appendChild(elem);
      }
      elem.innerHTML=parts.join('<br>');
    }
  }
  getURL(file){
    if(!this.U.has(file))this.U.set(file,URL.createObjectURL(file));
    return this.U.get(file);
  }
  openPhoto(index){
    if(index<0||index>=this.P.length)return;
    this.I=index;
    const photo=this.P[index],info=photo.info;
    $('mi').src=this.getURL(photo.file);
    const modal=$('mo'),content=modal.querySelector('.mc');
    content.classList.add('photo-modal');
    let html=`<div class="mt">${info.title}</div>`;
    if(info){
      html+=`<div class="ig"><div class="il">番号</div><div class="iv">${info.serial||'なし'}</div></div>
             <div class="ig"><div class="il">ファイル名</div><div class="iv">${info.filename}</div></div>
             <div class="ig"><div class="il">撮影日</div><div class="iv">${info.date||'不明'}</div></div>
             <div class="ig"><div class="il">メディア</div><div class="iv">${info.media||'なし'}</div></div>`;
      if(info.representative)html+='<span class="ba rep">★ 代表</span>';
      if(info.frequency)html+='<span class="ba freq">⚡ 頻度</span>';
    }
    let infoElem=modal.querySelector('.photo-info');
    if(!infoElem){
      infoElem=document.createElement('div');
      infoElem.className='photo-info';
      content.appendChild(infoElem);
    }
    infoElem.innerHTML=html;
    const nav=document.querySelector('.mn'),[prev,next]=nav.children;
    prev.disabled=index<=0;
    next.disabled=index>=this.P.length-1;
    modal.classList.add('sh');
  }
  prevPhoto(){if(this.I>0)this.openPhoto(this.I-1);}
  nextPhoto(){if(this.I<this.P.length-1)this.openPhoto(this.I+1);}
  openFile(path){
    try{
      const file=this.M.get(path);
      if(!file){this.error('ファイル未検出');return;}
      const url=this.getURL(file),win=window.open();
      if(win)win.location.href=url;
      else this.error('ポップアップブロック');
    }catch(e){this.error('ファイルエラー');}
  }
  closeModal(e){
    if(e?.target.closest('.mc'))return;
    const modal=$('mo');
    modal.classList.remove('sh');
    const content=modal.querySelector('.mc');
    content.classList.remove('photo-modal');
    const photoInfo=modal.querySelector('.photo-info');
    if(photoInfo)photoInfo.remove();
  }
  progress(percent,text){
    $('p').style.display='block';
    const bar=$('pb');
    bar.style.width=percent+'%';
    bar.textContent=text;
  }
  hideProgress(){$('p').style.display='none';}
  error(message){
    const div=document.createElement('div');
    div.className='al er';
    div.textContent=message;
    $('g').appendChild(div);
    setTimeout(()=>div.remove(),3000);
  }
  clear(){
    this.U.forEach(url=>URL.revokeObjectURL(url));
    this.M.clear();this.X.clear();this.F.clear();this.U.clear();
    this.P=[];this.I=0;this.R=null;this.E.clear();this.photoData=new Map();
    const projectInfo=$('project-info');
    if(projectInfo)projectInfo.remove();
  }
  reset(){
    this.clear();
    $('t').innerHTML='';$('t').style.display='none';$('u').style.display='block';
    $('g').innerHTML='<div class="em">選択でファイル表示</div>';
    $('h2').textContent='カテゴリ選択';
    $('i').value='';
    this.hideProgress();
    $('hs').textContent='準備完了';
  }
}
document.addEventListener('DOMContentLoaded',()=>window.v=new XMLViewer());