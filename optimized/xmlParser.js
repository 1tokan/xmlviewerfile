// XML Parser Module - Mon Jul 14 00:21:54 UTC 2025
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
--
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
--
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
