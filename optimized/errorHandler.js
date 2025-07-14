// Error Handler Module - Mon Jul 14 00:21:54 UTC 2025
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
--
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
      
--
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
--
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
--
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
--
      reader.onerror=reject;
      reader.readAsText(f,enc);
    });
  }

  getTag(elem,tagName){
    const found=elem?.querySelector(tagName);
    return found?found.textContent.trim():'';
  }

  categorize(){
--
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
--
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
