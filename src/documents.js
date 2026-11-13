const documentNames = [
  '01 Dasaran Asesmen','02 Kisi-Kisi Soal','03 Naskah Soal','04 Kunci Jawaban',
  '05 Pembahasan Soal','06 Rubrik Penilaian','07 Analisis Kualitatif dan Rangkuman'
];
const xml = value => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const tag = (name,inside = '',attrs = '') => '<w:'+name+attrs+'>'+inside+'</w:'+name+'>';
const empty = (name,attrs = '') => '<w:'+name+attrs+'/>';
const val = value => ' w:val="'+xml(value)+'"';
const hasArabic = value => /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(value);
function paragraph(value, {bold=false,center=false,style='',boxed=false} = {}) {
  const text = clean(String(value ?? ''));
  const rtl = hasArabic(text);
  const edge = ' w:val="single" w:sz="4" w:space="4" w:color="777777"';
  const borders = boxed ? tag('pBdr',['top','left','bottom','right','between'].map(side=>empty(side,edge)).join('')) : '';
  const props = (style ? empty('pStyle',val(style)) : '') + borders + (center ? empty('jc',val('center')) : '') + (rtl ? empty('bidi') : '');
  const runProps = (bold ? empty('b') + empty('bCs') : '') + (rtl ? empty('rtl') : '');
  return tag('p',tag('pPr',props)+tag('r',(runProps ? tag('rPr',runProps) : '') + text.split('\n').map(line=>tag('t',xml(line),' xml:space="preserve"')).join(empty('br'))));
}
function table(headers, rows, widths) {
  const edge = ' w:val="single" w:sz="5" w:color="555555"';
  const width = widths.reduce((a,b)=>a+b,0);
  const props = empty('tblW',' w:w="'+width+'" w:type="dxa"') + tag('tblBorders',['top','left','bottom','right','insideH','insideV'].map(side=>empty(side,edge)).join('')) + empty('tblLayout',' w:type="fixed"') + tag('tblCellMar',['top','left','bottom','right'].map(side=>empty(side,' w:w="110" w:type="dxa"')).join(''));
  const row = (cells,head=false) => tag('tr',tag('trPr',empty('cantSplit')+(head ? empty('tblHeader') : '')) + cells.map((cell,i)=>tag('tc',tag('tcPr',empty('tcW',' w:w="'+widths[i]+'" w:type="dxa"')+(head?empty('shd',' w:fill="F2F2F2"'):''))+ (typeof cell === 'object' ? cell.markup : paragraph(cell,{bold:head})))).join(''));
  return tag('tbl',tag('tblPr',props)+tag('tblGrid',widths.map(w=>empty('gridCol',' w:w="'+w+'"')).join(''))+row(headers,true)+rows.map(cells=>row(cells)).join(''));
}
const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const ns = 'http://schemas.openxmlformats.org/';
const office = ns+'officeDocument/2006/relationships/';
const wNs = ns+'wordprocessingml/2006/main';
const rels = links => xmlHeader + '<Relationships xmlns="'+ns+'package/2006/relationships">'+links.map(([id,type,target])=>'<Relationship Id="'+id+'" Type="'+office+type+'" Target="'+target+'"/>').join('')+'</Relationships>';
function illustration(id, caption) {
  const height = 1543050;
  const width = 2834640;
  return '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline xmlns:wp="'+ns+'drawingml/2006/wordprocessingDrawing"><wp:extent cx="'+width+'" cy="'+height+'"/><wp:docPr id="'+id+'" name="Ilustrasi '+id+'" descr="'+xml(caption)+'"/><a:graphic xmlns:a="'+ns+'drawingml/2006/main"><a:graphicData uri="'+ns+'drawingml/2006/picture"><pic:pic xmlns:pic="'+ns+'drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="'+id+'" name="Visual '+id+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="img'+id+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+width+'" cy="'+height+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
}
const encoder = new TextEncoder();
const crcTable = Uint32Array.from({length:256},(_,index)=>{
  let crc=index;
  for(let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  return crc>>>0;
});
function zip(entries) {
  const files=[],directory=[];
  let offset=0, directorySize=0;
  for(const [filename,contents] of entries) {
    const name=encoder.encode(filename), bytes=typeof contents==='string'?encoder.encode(contents):contents;
    let crc=0xffffffff;
    for(const byte of bytes) crc=(crc>>>8)^crcTable[(crc^byte)&255];
    crc=(crc^0xffffffff)>>>0;
    const local=new Uint8Array(30), lv=new DataView(local.buffer);
    lv.setUint32(0,0x04034b50,true); lv.setUint16(4,20,true); lv.setUint16(6,2048,true); lv.setUint16(12,33,true);
    lv.setUint32(14,crc,true); lv.setUint32(18,bytes.length,true); lv.setUint32(22,bytes.length,true); lv.setUint16(26,name.length,true);
    const central=new Uint8Array(46), cv=new DataView(central.buffer);
    cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true); cv.setUint16(8,2048,true); cv.setUint16(14,33,true);
    cv.setUint32(16,crc,true); cv.setUint32(20,bytes.length,true); cv.setUint32(24,bytes.length,true); cv.setUint16(28,name.length,true); cv.setUint32(42,offset,true);
    files.push(local,name,bytes); directory.push(central,name);
    offset+=local.length+name.length+bytes.length; directorySize+=central.length+name.length;
  }
  const end=new Uint8Array(22), ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true); ev.setUint16(8,entries.length,true); ev.setUint16(10,entries.length,true); ev.setUint32(12,directorySize,true); ev.setUint32(16,offset,true);
  const result=new Uint8Array(offset+directorySize+end.length);
  let cursor=0;
  for(const chunk of [...files,...directory,end]) {result.set(chunk,cursor);cursor+=chunk.length;}
  return result;
}
function makeDoc(title,body,images=[],font='Arial') {
  const drawingRels=images.map(({id,filename})=>['img'+id,'image','media/'+filename]);
  const section=tag('sectPr','<w:footerReference w:type="default" r:id="footer"/>'+empty('pgSz',' w:w="11906" w:h="16838"')+empty('pgMar',' w:top="1200" w:right="1200" w:bottom="1200" w:left="1200" w:header="600" w:footer="600" w:gutter="0"'));
  const styles=xmlHeader+'<w:styles xmlns:w="'+wNs+'">'+tag('docDefaults',tag('rPrDefault',tag('rPr',empty('rFonts',' w:ascii="'+font+'" w:hAnsi="'+font+'" w:cs="'+font+'"')+empty('color',val('000000'))+empty('sz',val('22'))+empty('szCs',val('22'))))+tag('pPrDefault',tag('pPr',empty('spacing',' w:after="105" w:line="265" w:lineRule="auto"'))))+tag('style',empty('name',val('Title'))+tag('pPr',empty('keepNext')+empty('spacing',' w:after="240"'))+tag('rPr',empty('b')+empty('sz',val('32'))),' w:type="paragraph" w:styleId="Title"')+'</w:styles>';
  const footer=xmlHeader+'<w:ftr xmlns:w="'+wNs+'">'+tag('p',tag('pPr',empty('jc',val('center')))+tag('fldSimple',tag('r',tag('t','1')),' w:instr="PAGE"'))+'</w:ftr>';
  const contentTypes=xmlHeader+'<Types xmlns="'+ns+'package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>';
  return zip([
    ['[Content_Types].xml',contentTypes],['_rels/.rels',rels([['document','officeDocument','word/document.xml']])],
    ['word/document.xml',xmlHeader+'<w:document xmlns:w="'+wNs+'" xmlns:r="'+office.slice(0,-1)+'">'+tag('body',paragraph(title,{style:'Title'})+body+section)+'</w:document>'],
    ['word/styles.xml',styles],['word/footer1.xml',footer],
    ['word/_rels/document.xml.rels',rels([['styles','styles','styles.xml'],['footer','footer','footer1.xml'],...drawingRels])],
    ...images.map(({filename,bytes})=>['word/media/'+filename,bytes])
  ]);
}
function buildDocuments(config,draft,items) {
  const errors=audit(items,config,draft);
  if(errors.length) throw new Error(errors[0]);
  const media=[];
  const total=items.reduce((sum,item)=>sum+rawScore(item),0);
  const identity = [config.school,config.level+' · Kelas '+config.grade+' · '+config.subject,config.curriculum+' · Semester '+config.semester,config.duration ? 'Durasi '+config.duration+' menit' : ''].filter(Boolean).map(value=>paragraph(value)).join('');
  const draftNote = paragraph('Draf asesmen — telah ditelaah dalam aplikasi. Penetapan penggunaan mengikuti keputusan guru.');
  const heading = text => paragraph(text,{bold:true});
  const answer = item => isPG(item.type) ? item.keys.map(key=>key+'. '+option(item.options[alphabet.indexOf(key)])).join('\n') : item.answer;
  const byItem=(headers,widths,row)=>table(headers,items.map(row),widths);
  const scoreNote=paragraph('Skor maksimum: '+total+' poin. Nilai akhir = skor perolehan ÷ '+total+' × 100. PG reguler dan PG TKA bernilai 1 poin jika himpunan jawaban tepat.');
  const bodies=[
    heading('Cakupan materi')+paragraph(config.material)+heading('Capaian Pembelajaran')+paragraph('Inferensi AI yang telah ditelaah guru. Rujuk dokumen kurikulum sekolah untuk penetapan resmi.')+paragraph(draft.cp)+heading('Alur Tujuan Pembelajaran')+draft.atp.map((value,i)=>paragraph((i+1)+'. '+value)).join('')+heading('Tujuan Pembelajaran')+draft.tp.map((value,i)=>paragraph('TP '+(i+1)+'. '+value)).join('')+heading('Komposisi soal')+table(['Jenis','Jumlah'],types.map((type,i)=>[type,config.counts[i]]),[7100,2400])+scoreNote,
    byItem(['No.','Tujuan Pembelajaran','Indikator','Bentuk','Level','Kesukaran'],[600,2750,2870,1330,800,1150],item=>[item.no,'TP '+item.tp+' · '+draft.tp[item.tp-1],item.indicator,types[item.type],item.level,item.difficulty]),
    paragraph('Nama ________________________    Kelas ____________')+paragraph(({id:'Baca setiap soal dengan cermat. Ikuti petunjuk pada setiap soal.',en:'Read each question carefully and follow its instructions.',ar:'اقرأ كل سؤال بعناية واتبع تعليماته.',su:'Baca unggal soal kalawan taliti. Turutan pituduh dina unggal soal.'})[config.languageCode] || '')+byItem(['No.','Naskah Soal'],[720,8780],item=>{
      let graphic='';
      if (item.visualData) {
        const [prefix,data]=item.visualData.split(',');
        const filename='visual-'+item.no+(prefix.includes('png')?'.png':'.jpeg');
        media.push({id:item.no,filename,bytes:Uint8Array.from(atob(data),char=>char.charCodeAt(0))});
        graphic=illustration(item.no,item.visual.caption)+paragraph(item.visual.caption,{center:true});
      }
      return [item.no,{markup:paragraph(item.stem)+graphic+(isPG(item.type)?item.options.map((value,index)=>paragraph(alphabet[index]+'. '+option(value),{boxed:true})).join(''):'')}];
    }),
    byItem(['No.','Kunci atau Jawaban Acuan','Skor Maks.'],[650,7380,1470],item=>[item.no,answer(item),rawScore(item)]),
    byItem(['No.','Pembahasan'],[700,8800],item=>[item.no,item.explanation]),
    scoreNote+byItem(['No.','Kriteria Penskoran','Skor Maks.'],[650,7380,1470],item=>[item.no,isPG(item.type) ? '1 poin jika pilihan tepat: '+item.keys.join(', ')+'. 0 poin untuk respons lain.' : item.rubric.map(row=>row.criterion+' ('+row.points+' poin)').join('\n'),rawScore(item)]),
    paragraph('Analisis kualitatif pra-ujicoba.')+byItem(['No.','Analisis Kualitatif'],[700,8800],item=>[item.no,item.analysis])+heading('Rangkuman Materi')+draft.tp.map((tp,index)=>{
      const relevant=items.filter(item=>item.tp===index+1);
      return relevant.length ? heading('TP '+(index+1)+' · '+tp)+[...new Map(relevant.map(item=>[normalized(item.concept),item.concept])).values()].map(value=>paragraph(value)).join('') : '';
    }).join('')
  ];
  return documentNames.map((name,index)=>[name+'.docx',makeDoc(name.slice(3),identity+(index===2?'':draftNote)+bodies[index],index===2?media:[],config.font==='Times New Roman'?'Times New Roman':'Arial')]);
}
