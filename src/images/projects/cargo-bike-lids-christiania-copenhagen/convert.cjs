const fs=require('fs'),p=require('path'),sharp=require('sharp');
(async()=>{
  const dir=process.cwd();
  const src=fs.readdirSync(dir).filter(f=>/\.(jpe?g)$/i.test(f));
  if(!src.length){ console.log('No images found.'); process.exit(0); }
  for(const f of src){
    const inP=p.join(dir,f), base=f.replace(/\.(jpe?g)$/i,'');
    await sharp(inP).resize({width:1600,withoutEnlargement:true}).webp({quality:78}).toFile(p.join(dir,base+'.webp'));
    await sharp(inP).resize({width:1600,withoutEnlargement:true}).avif({quality:50,effort:4}).toFile(p.join(dir,base+'.avif'));
    console.log('OK',base);
  }
})();
