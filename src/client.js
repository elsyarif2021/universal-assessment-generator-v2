const $ = id => document.getElementById(id);
const storage = new Promise(resolve => {
  if (!window.indexedDB) return resolve(null);
  const request = indexedDB.open('universal-assessment',1);
  request.onupgradeneeded = () => request.result.createObjectStore('drafts');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => resolve(null);
});
let state = {config:null,draft:null,accepted:false,items:[],pending:[],approved:false};
let packageAudit = null;
let busy = false, workingView = 'setup', credentials = null, connected = false, mode = 'missing', files = [];
const subjects = {
  elementary:['Bahasa Indonesia','Matematika','IPAS','Pendidikan Pancasila','Bahasa Inggris','PAI dan Budi Pekerti','PJOK','Seni Budaya','Bahasa Arab','Al-Qur’an Hadis','Akidah Akhlak','Fikih','SKI'],
  middle:['Bahasa Indonesia','Matematika','IPA','IPS','Pendidikan Pancasila','Bahasa Inggris','PAI dan Budi Pekerti','Informatika','PJOK','Seni Budaya','Bahasa Sunda','Bahasa Arab','Al-Qur’an Hadis','Akidah Akhlak','Fikih','SKI'],
  upper:['Bahasa Indonesia','Matematika','Bahasa Inggris','Pendidikan Pancasila','PAI dan Budi Pekerti','Sejarah','Geografi','Ekonomi','Sosiologi','Fisika','Kimia','Biologi','Informatika','Bahasa Arab','Bahasa Sunda','Seni Budaya','PJOK','Dasar-Dasar Program Keahlian','Projek IPAS','Konsentrasi Keahlian','Projek Kreatif dan Kewirausahaan']
};
const topics = {
  'Matematika':['Bilangan dan operasi hitung','Pecahan dan persentase','Aljabar dan fungsi','Geometri dan pengukuran','Analisis data dan peluang','Busur dan juring lingkaran'],
  'Bahasa Indonesia':['Teks narasi','Teks eksposisi','Teks deskripsi','Membaca dan menyimpulkan'],
  'IPA':['Makhluk hidup','Zat dan perubahannya','Energi dan perubahannya','Bumi dan tata surya'],
  'IPS':['Interaksi sosial','Kegiatan ekonomi','Keragaman budaya','Peta dan ruang'],
  'IPAS':['Makhluk hidup dan lingkungan','Perubahan wujud benda','Energi','Lingkungan sekitar'],
  'Sosiologi':['Perubahan sosial','Globalisasi','Permasalahan sosial','Penelitian sosial'],
  'Bahasa Sunda':['Carita pondok','Kecap panganteur','Pagawean jeung kaayaan','Aksara Sunda'],
  'Bahasa Inggris':['Descriptive text','Narrative text','Daily activities','Reading comprehension'],
  'Biologi':['Ekosistem','Keanekaragaman hayati','Sistem organ','Genetika'],
  'Fisika':['Gerak dan gaya','Energi','Gelombang','Kelistrikan'],
  'Kimia':['Struktur atom','Ikatan kimia','Larutan','Reaksi kimia'],
  'Informatika':['Berpikir komputasional','Data dan visualisasi','Algoritma','Literasi digital']
};
const group = level => ['SD','MI','SD/MI'].includes(level) ? 'elementary' : ['SMP','MTs','SMP/MTs'].includes(level) ? 'middle' : 'upper';
const languages = {'Bahasa Indonesia':'id','Bahasa Inggris':'en','Bahasa Arab':'ar','Bahasa Sunda':'su'};
const el = (tag,text='',className='') => {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
};
function textField(parent, id, label, {list,required=true,type='text',value='',min=0,max=100}={}) {
  const field=el('label',label);
  const input=el('input');
  Object.assign(input,{id,name:id,type,required,value,autocomplete:'off'});
  if (type === 'number') Object.assign(input,{min,max,step:1});
  if (list) {
    input.setAttribute('list',id+'-list');
    const choices=el('datalist');
    choices.id=id+'-list';
    field.append(choices);
    fillList(choices,list);
  }
  field.append(input); parent.append(field);
  return input;
}
function fillList(node, values) {
  node.replaceChildren(...values.map(value=>Object.assign(el('option'),{value})));
}
function selectField(parent,id,label,values,initial) {
  const field=el('label',label);
  const select=el('select');
  Object.assign(select,{id,name:id});
  for (const [value,text] of values) select.append(Object.assign(el('option',text),{value}));
  select.value=initial; field.append(select); parent.append(field);
}
function updateBank() {
  const level=$('level').value;
  const band=group(level);
  const grades=band==='elementary'?['1','2','3','4','5','6']:band==='middle'?['7','8','9']:['X','XI','XI IPA','XI IPS','XI Bahasa','XII','XII IPA','XII IPS','XII Bahasa'];
  fillList($('grade-list'),grades);
  fillList($('subject-list'),subjects[band]);
  const choices=topics[$('subject').value] || [];
  $('material-bank').replaceChildren(...choices.map(topic=>{
    const button=el('button',topic);
    button.type='button';
    button.addEventListener('click',()=>{
      const material=$('material');
      if (!material.value.split('\n').includes(topic)) material.value=[material.value.trim(),topic].filter(Boolean).join('\n');
      material.focus();
    });
    return button;
  }));
}
function fillForm() {
  const identity=$('identity-fields');
  textField(identity,'level','Jenjang',{list:['SD','MI','SMP','MTs','SMA','MA','SMK']});
  textField(identity,'curriculum','Kurikulum',{list:['Kurikulum Merdeka','Kurikulum 2013']});
  textField(identity,'grade','Kelas / peminatan',{list:[]});
  textField(identity,'semester','Semester',{list:['Ganjil','Genap']});
  textField(identity,'school','Nama sekolah (opsional)',{required:false});
  textField(identity,'duration','Durasi dalam menit (opsional)',{required:false,type:'number',min:1,max:600});
  textField($('content-fields'),'subject','Mata pelajaran',{list:[]});
  textField($('content-fields'),'language','Bahasa soal',{list:Object.keys(languages),value:'Bahasa Indonesia'});
  types.forEach((name,index)=>textField($('counts'),'count'+index,name,{type:'number',value:'0'}));
  selectField($('option-fields'),'options','Rentang opsi PG',[[3,'A–C'],[4,'A–D'],[5,'A–E']],'5');
  selectField($('option-fields'),'font','Font dokumen',[['Arial','Arial'],['Times New Roman','Times New Roman']],'Arial');
  for (const key of ['subject','level']) $(key).addEventListener('input',updateBank);
  $('counts').addEventListener('input',updateTotal);
  updateBank(); updateTotal();
}
function readConfig() {
  const config=Object.fromEntries([...new FormData($('config-form'))].map(([key,value])=>[key,clean(value)]));
  config.counts=types.map((_,index)=>Number(config['count'+index]));
  for(let index=0;index<types.length;index++) delete config['count'+index];
  config.options=Number(config.options);
  config.languageCode=languages[config.language]||'';
  return config;
}
function updateTotal() {
  $('total').textContent=readConfig().counts.reduce((sum,n)=>sum+n,0)+' soal';
}
async function persist() {
  const db=await storage;
  if (!db) return;
  await new Promise(resolve=>{
    const transaction=db.transaction('drafts','readwrite');
    transaction.objectStore('drafts').put(state,'current');
    transaction.oncomplete=resolve;
    transaction.onerror=resolve;
    transaction.onabort=resolve;
  });
}
function show(view) {
  if (workingView===view && !$(view).hidden) return;
  workingView=view;
  document.querySelectorAll('.view').forEach(node=>node.hidden=node.id!==view);
  document.querySelectorAll('aside [data-view]').forEach(node=>node.dataset.view===view ? node.setAttribute('aria-current','step') : node.removeAttribute('aria-current'));
  window.scrollTo(0,0);
}
function message(text='',error=false) {
  const notice=$('notice');
  notice.textContent=text; notice.hidden=!text; notice.dataset.error=error;
}
function lock(locked) {
  busy=locked;
  document.querySelectorAll('form:not(#chat-form) button[type=submit]').forEach(button=>button.disabled=locked);
  $('generate').disabled=locked || !state.accepted;
  $('bulk-review').disabled=locked;
  $('approve').disabled=locked || !$('approve-check').checked;
}
async function api(path,body,auth=credentials) {
  const headers={};
  if (auth) Object.assign(headers,{'X-CF-Account':auth.account,'X-CF-Token':auth.token});
  if (body) headers['Content-Type']='application/json';
  const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined});
  let result;
  try {result=await response.json();} catch {
    if (path==='chat') throw new Error('Server AI Chat mengembalikan respons yang tidak dapat dibaca (HTTP '+response.status+'). Pastikan URL yang dibuka adalah URL Worker dan deployment terbaru sudah aktif.');
    throw new Error('Respons server tidak dapat dibaca. Muat ulang halaman jika sesi Sites telah berakhir.');
  }
  if (!response.ok) throw new Error((result.error || 'Permintaan gagal.')+(path==='chat'?' (HTTP '+response.status+')':''));
  return result;
}
function displayConnection() {
  $('connection').textContent=connected ? 'Cloudflare teruji' : ['server','binding'].includes(mode)?'Cloudflare dikonfigurasi':'Cloudflare belum terhubung';
  $('connection').dataset.ok=connected;
  $('ai-status').textContent=connected ? 'Uji model teks dan model gambar berhasil.' : ['server','binding'].includes(mode) ? 'Konfigurasi server tersedia. Jalankan uji untuk memeriksa akses model.' : 'Masukkan Account ID dan API Token Cloudflare untuk mengaktifkan generasi.';
  for (const key of ['account','token']) $(key).disabled=['server','binding'].includes(mode);
}
const chatHistory = [];
function addChatMessage(role,text) {
  const row=el('article','','chat-turn');
  row.dataset.role=role;
  const content=el('p',text);
  content.dir='auto';
  row.append(el('strong',role==='user'?'Anda':'AI Materi'),content);
  if (role==='assistant') {
    const use=el('button','Tambahkan ke materi asesmen','secondary');
    use.type='button';
    use.addEventListener('click',()=>{
      const material=$('material');
      const combined=[material.value.trim(),text].filter(Boolean).join('\n\n');
      show('setup');
      if (combined.length>material.maxLength) {
        message('Materi melebihi 18.000 karakter. Ringkas isi yang ada atau minta AI membuat jawaban lebih singkat.',true);
      } else {
        material.value=combined;
        message('Jawaban AI ditambahkan ke materi asesmen.');
      }
      material.focus();
    });
    row.append(use);
  }
  const log=$('chat-messages');
  log.append(row);
  log.scrollTop=log.scrollHeight;
}
function setupChat() {
  const input=$('chat-input'), status=$('chat-status'), send=$('chat-send'), clear=$('chat-clear');
  for (const button of $('chat-suggestions').querySelectorAll('button')) button.addEventListener('click',()=>{
    input.value=button.textContent;
    input.focus();
  });
  clear.addEventListener('click',()=>{
    chatHistory.length=0;
    $('chat-messages').replaceChildren();
    $('chat-suggestions').hidden=false;
    clear.disabled=true;
    status.textContent='';
    input.value='';
    input.focus();
  });
  $('chat-form').addEventListener('submit',async event=>{
    event.preventDefault();
    const question=clean(input.value);
    if (send.disabled || !question) return;
    send.disabled=true;
    clear.disabled=true;
    input.readOnly=true;
    status.textContent='AI sedang menyusun materi…';
    const context=Object.fromEntries(['level','grade','curriculum','subject','language'].map(key=>[key,$(key).value]));
    try {
      const {answer}=await api('chat',{question,context,history:chatHistory.slice(-8)});
      if (!clean(answer)) throw new Error('Jawaban AI kosong. Coba kirim ulang.');
      chatHistory.push({role:'user',text:question},{role:'assistant',text:answer});
      $('chat-suggestions').hidden=true;
      addChatMessage('user',question);
      addChatMessage('assistant',answer);
      input.value='';
      status.textContent='';
    } catch(error) {status.textContent=error.message;}
    finally {
      send.disabled=false;
      clear.disabled=chatHistory.length===0;
      input.readOnly=false;
      if (workingView==='chat') input.focus();
    }
  });
}
function setDraft() {
  $('draft-empty').hidden=!!state.draft;
  $('draft-form').hidden=!state.draft;
  for (const key of ['cp','atp','tp']) $(key).value=Array.isArray(state.draft?.[key]) ? state.draft[key].join('\n') : state.draft?.[key] || '';
}
function textLine(label,value) {
  const p=el('p');
  p.append(el('strong',label+' '),document.createTextNode(String(value ?? '')));
  return p;
}
function draw(visual) {
  const canvas=el('canvas');
  canvas.width=780; canvas.height=425;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='white'; ctx.fillRect(0,0,780,425);
  ctx.fillStyle='#171717'; ctx.strokeStyle='#171717'; ctx.lineWidth=2; ctx.font='18px Arial';
  if (visual.kind==='circle') {
    const x=355,y=210,r=138, angle=visual.angle*Math.PI/180;
    ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,r,0,-angle,true);ctx.closePath();
    ctx.fillStyle='#dedede';ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#111';
    ctx.fillText(visual.angle+'°',x+70*Math.cos(-angle/2),y+70*Math.sin(-angle/2)-8);
    ctx.fillText('r = '+visual.radius,x+46,y+26);
    ctx.fillText('O',x-20,y+18);
  } else {
    const {labels,values}=visual, left=88,right=748,top=36,bottom=323;
    const low=Math.min(0,...values), high=Math.max(0,...values);
    const y=value=>bottom-(value-low)/(high-low||1)*(bottom-top);
    const x=index=>left+(index+.5)*(right-left)/values.length;
    const yZero=y(0);
    ctx.textAlign='right';
    const scale=Array.from(new Set([low,high,0,...Array.from({length:4},(_,i)=>Number((low+(high-low)*(i+1)/5).toPrecision(6)))])).sort((a,b)=>a-b);
    for (const tick of scale) {
      ctx.strokeStyle='#d5d5d5';ctx.beginPath();ctx.moveTo(left,y(tick));ctx.lineTo(right,y(tick));ctx.stroke();
      ctx.fillText(String(tick),left-8,y(tick)+6,74);
    }
    ctx.strokeStyle='#171717';ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,bottom);ctx.moveTo(left,yZero);ctx.lineTo(right,yZero);ctx.stroke();
    const barWidth=Math.min(52,(right-left)/values.length*.64);
    if (visual.kind==='line') {
      ctx.beginPath(); values.forEach((v,i)=>i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)));ctx.stroke();
    }
    values.forEach((value,i)=>{
      const xx=x(i), yy=y(value);
      if (visual.kind==='bar') {
        ctx.fillStyle='#a2a2a2';ctx.fillRect(xx-barWidth/2,Math.min(yy,yZero),barWidth,Math.abs(yy-yZero));
        ctx.strokeRect(xx-barWidth/2,Math.min(yy,yZero),barWidth,Math.abs(yy-yZero));
      } else {
        ctx.fillStyle='#171717';ctx.beginPath();ctx.arc(xx,yy,5,0,Math.PI*2);ctx.fill();
      }
      ctx.fillStyle='#171717';ctx.textAlign='center';ctx.fillText(String(value),xx,yy+(value<0?22:-10),barWidth+8);
      ctx.save();ctx.translate(xx,bottom+16);ctx.rotate(-Math.PI/6);ctx.textAlign='right';ctx.fillText(labels[i],0,0,100);ctx.restore();
    });
  }
  return canvas.toDataURL('image/png');
}
function displayPackageAudit() {
  const complete = !!state.config && state.accepted && state.items.length===plan(state.config).length && !state.pending.length;
  $('package-audit').hidden=!complete;
  $('bulk-review').disabled=busy || !complete;
  $('package-review-label').textContent=state.approved ? 'Paket disetujui' : packageAudit ? (packageAudit.errors.length ? 'Perlu perbaikan' : 'Audit teknis lulus') : '';
  $('approval').hidden=!packageAudit || packageAudit.errors.length>0;
  $('approve-check').checked=state.approved;
  $('approve').disabled=busy || !state.approved;
  const result=$('audit-result');
  result.replaceChildren();
  if (!packageAudit) return;
  const {errors,total,counts,points,mappedObjectives}=packageAudit;
  result.append(el('p',errors.length ? errors.length+' temuan perlu diperbaiki.' : 'Audit teknis lulus untuk '+total+' soal.','audit-summary'));
  result.append(el('p',types.map((type,index)=>type+': '+counts[index]+' / '+state.config.counts[index]).join(' · '),'help'));
  if (errors.length) {
    const list=el('ul');
    for (const error of errors) {
      const entry=el('li',error);
      const number=error.match(/^No\. (\d+) —/)?.[1];
      if (number && state.items.some(item=>String(item.no)===number)) {
        const link=el('a','Buka soal '+number);
        link.href='#question-'+number;
        link.addEventListener('click',()=>{
          const question=$('question-'+number);
          if (question) question.open=true;
        });
        entry.append(' ',link);
      }
      list.append(entry);
    }
    result.append(list);
  } else {
    result.append(el('p','Skor maksimum: '+points+' poin. Tujuan terpetakan: '+mappedObjectives+' dari '+state.draft.tp.length+'.','help'),
      el('p','Audit memeriksa penomoran, duplikasi, format opsi dan kunci, rujukan tujuan, rubrik, serta kelengkapan visual. Ketepatan isi dan bahasa diperiksa oleh guru.','help'));
  }
}
function invalidatePackageAudit() {
  packageAudit=null;
  state.approved=false;
  files=[];
}
$('bulk-review').addEventListener('click',()=>{
  if (busy || !state.accepted || state.pending.length || state.items.length!==plan(state.config).length) return;
  packageAudit=auditPackage(state.items,state.config,state.draft);
  displayPackageAudit();
});
function displayReview() {
  const total=state.config ? plan(state.config).length : 0;
  const remaining=state.pending.length ? state.pending : state.config ? nextBatch(state.config,state.items.length) : [];
  const range=remaining.length ? remaining[0].no+(remaining.length>1 ? '–'+remaining.at(-1).no : '') : '';
  $('progress-label').textContent=state.items.length+' dari '+total+' soal valid';
  $('progress').max=total || 1; $('progress').value=state.items.length;
  $('batch-label').textContent=!state.accepted ? 'Setujui draf CP, ATP, dan TP terlebih dahulu.' : state.items.length===total ? 'Seluruh soal tersedia untuk ditelaah.' : 'Batch berikutnya: nomor '+range+'.';
  $('generate').hidden=total>0 && state.items.length===total;
  $('generate').disabled=busy || !state.accepted;
  $('generate').textContent=state.items.length || state.pending.length ? 'Lanjutkan generasi' : 'Buat soal';
  displayPackageAudit();
  $('items').replaceChildren(...state.items.map(renderItem));
}
function renderItem(item) {
  const panel=el('details','','card item');
  panel.id='question-'+item.no;
  const title=el('summary','No. '+item.no+' · '+types[item.type]);
  const stem=el('p',item.stem);
  stem.dir='auto';
  panel.append(title,stem);
  if (item.visualData) {
    const figure=el('figure'), img=el('img');
    img.src=item.visualData; img.alt=item.visual.caption; img.loading='lazy';
    figure.append(img,el('figcaption',item.visual.caption)); panel.append(figure);
  }
  if (isPG(item.type)) {
    const list=el('ol');list.type='A';
    list.append(...item.options.map(value=>el('li',option(value)))); panel.append(list);
  }
  panel.append(textLine('Kunci atau jawaban acuan',isPG(item.type)?item.keys.join(', '):item.answer),
    textLine('Tujuan pembelajaran','TP '+item.tp+' · '+state.draft.tp[item.tp-1]),
    textLine('Indikator',item.indicator),
    textLine('Level dan kesukaran',item.level+' · '+item.difficulty),
    textLine('Pembahasan',item.explanation),
    textLine('Rubrik',isPG(item.type)?'1 poin untuk pilihan tepat, 0 poin untuk respons lain.':item.rubric.map(row=>row.criterion+' ('+row.points+' poin)').join('\n')),
    textLine('Analisis kualitatif',item.analysis),textLine('Pokok rangkuman',item.concept));
  const edit=el('button','Sunting butir','secondary');edit.type='button';
  edit.addEventListener('click',()=>editItem(item,panel));
  panel.append(edit);
  return panel;
}
function editItem(item,panel) {
  const form=el('form');
  const field=(name,value)=>{
    const label=el('label',name), input=el('textarea');
    input.value=value;input.rows=3;label.append(input);form.append(label);return input;
  };
  const fields={stem:field('Batang soal',item.stem),indicator:field('Indikator',item.indicator),tp:field('Nomor TP',String(item.tp)),level:field('Level kognitif',item.level),difficulty:field('Tingkat kesukaran',item.difficulty),explanation:field('Pembahasan',item.explanation),analysis:field('Analisis kualitatif',item.analysis),concept:field('Pokok rangkuman',item.concept)};
  if (isPG(item.type)) {
    fields.options=field('Opsi, satu per baris tanpa huruf',item.options.map(option).join('\n'));
    fields.keys=field('Kunci, pisahkan dengan koma',item.keys.join(', '));
  } else {
    fields.answer=field('Jawaban acuan',item.answer);
    fields.rubric=field('Rubrik, satu kriteria | poin per baris',item.rubric.map(row=>row.criterion+' | '+row.points).join('\n'));
  }
  if (item.visual?.kind && item.visual.kind!=='none') fields.caption=field('Keterangan gambar',item.visual.caption);
  const status=el('p','','help'), save=el('button','Simpan perubahan','primary'), cancel=el('button','Batal','secondary'), actions=el('div','','actions');
  cancel.type='button';cancel.addEventListener('click',()=>panel.replaceWith(renderItem(item)));
  actions.append(save,cancel);form.append(status,actions);
  const title=el('summary','Sunting soal no. '+item.no);panel.replaceChildren(title,form);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const values=Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,clean(input.value)]));
    const revised={...item,...values,tp:Number(values.tp),level:values.level.toUpperCase()};
    if (isPG(item.type)) {
      revised.options=values.options.split('\n').map(option);
      revised.keys=values.keys.toUpperCase().split(/[\s,]+/).filter(Boolean);
    } else revised.rubric=values.rubric.split('\n').map(line=>{
      const [criterion,points]=line.split('|');
      return {criterion:clean(criterion),points:Number(points)};
    });
    if (fields.caption) revised.visual={...item.visual,caption:values.caption};
    delete revised.caption;
    const errors=itemErrors(revised,item,state.config,state.draft,true);
    if (state.items.some(other=>other.no!==item.no && normalized(other.stem)===normalized(revised.stem))) errors.push('Batang soal berulang.');
    if (errors.length) {status.textContent=errors.join(' ');return;}
    state.items[item.no-1]=revised;
    invalidatePackageAudit();
    displayReview();displayFiles();await persist();
  });
}
function download(filename,bytes,type) {
  const url=URL.createObjectURL(new Blob([bytes],{type}));
  const link=el('a');link.href=url;link.download=filename;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function displayFiles() {
  $('doc-count').textContent=files.length+'/7 dokumen siap';
  $('export-note').textContent=files.length ? 'Setiap dokumen menggunakan A4, tabel berbatas, dan nomor halaman.' : 'Dokumen tersedia setelah seluruh butir ditelaah dan disetujui.';
  $('download-all').disabled=files.length!==7;
  $('doc-list').replaceChildren(...documentNames.map((name,i)=>{
    const row=el('div','','doc-row'), button=el('button','Unduh DOCX','secondary');
    button.type='button';button.disabled=!files[i];
    button.addEventListener('click',()=>download(...files[i],'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
    row.append(el('span',name),button);return row;
  }));
}
fillForm();
setupChat();
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
  if (!busy) message();
  show(button.dataset.view);
}));
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();show('setup');});
$('ai-form')?.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy) return;
  const auth={account:$('account').value.trim(),token:$('token').value.trim()};
  if (!['server','binding'].includes(mode) && (!/^[a-f0-9]{32}$/i.test(auth.account) || !/^[A-Za-z0-9_-]{20,256}$/.test(auth.token))) return message('Isi Account ID dan API Token yang valid.',true);
  lock(true);message('Menguji model teks dan ilustrasi Cloudflare…');
  try {
    const result=await api('test',{},['server','binding'].includes(mode)?null:auth);
    credentials=['server','binding'].includes(mode)?null:auth;
    connected=result.text && result.image;
    $('token').value='';
    message('Model teks dan ilustrasi Cloudflare berhasil diuji.');
  } catch(error) {connected=false;credentials=null;message(error.message,true);}
  finally {displayConnection();lock(false);}
});
$('config-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const config=readConfig(), invalid=validateConfig(config);
  if (invalid) return message(invalid,true);
  if (state.draft && JSON.stringify(state.config)===JSON.stringify(config)) {message();show('draft');return;}
  if (state.items.length && !window.confirm('Perubahan konfigurasi akan mengganti hasil asesmen di perangkat ini setelah draf baru berhasil dibuat. Lanjutkan?')) return;
  lock(true);message('Menyusun draf CP, ATP, dan TP…');
  try {
    const draft=await api('draft',{config});
    state={config,draft,accepted:false,items:[],pending:[],approved:false};invalidatePackageAudit();
    setDraft();displayReview();displayFiles();await persist();message();show('draft');
  } catch(error) {message(error.message,true);}
  finally {lock(false);}
});
$('draft-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const draft={cp:clean($('cp').value),atp:$('atp').value.split('\n').map(clean).filter(Boolean),tp:$('tp').value.split('\n').map(clean).filter(Boolean)};
  if (!validateDraft(draft)) return message('Lengkapi CP, ATP, dan maksimal 16 tujuan pembelajaran.',true);
  const changed=JSON.stringify(state.draft)!==JSON.stringify(draft);
  if (changed && state.items.length && !window.confirm('Perubahan tujuan akan memulai kembali penyusunan soal. Lanjutkan?')) return;
  lock(true);
  if (changed) {state.items=[];state.pending=[];invalidatePackageAudit();}
  state.draft=draft;state.accepted=true;await persist();
  lock(false);displayReview();displayFiles();message();show('review');
  await generateQuestions();
});
$('generate').addEventListener('click',generateQuestions);
async function generateQuestions() {
  if (busy || !state.accepted || state.items.length>=plan(state.config).length) return;
  lock(true);
  try {
    const total=plan(state.config).length;
    while (state.items.length<total) {
      const start=state.items.length;
      if (!state.pending.length) {
        const batch=nextBatch(state.config,start);
        message('Menyiapkan soal '+batch[0].no+(batch.length>1?'–'+batch.at(-1).no:'')+'…');
        const {items}=await api('batch',{config:state.config,draft:state.draft,start,prior:state.items.map(item=>item.stem)});
        if (!Array.isArray(items) || !items.length || items.length>batch.length || items.some((item,index)=>itemErrors(item,batch[index],state.config,state.draft).length)) throw new Error('Server belum mengembalikan soal valid mulai nomor '+(start+1)+'. Klik Lanjutkan generasi.');
        state.pending=items;await persist();
      }
      while (state.pending.length) {
        const item=state.pending[0], visual=item.visual;
        if (visual?.kind && visual.kind!=='none' && !item.visualData) {
          message('Menyiapkan visual untuk soal '+item.no+'…');
          item.visualData=visual.kind==='image'?(await api('image',{prompt:visual.prompt})).image:draw(visual);
        }
        state.items.push(item);state.pending.shift();await persist();displayReview();
      }
    }
    message('Seluruh soal tersedia. Klik Telaah Massal untuk mengaudit paket.');
  } catch(error) {message(error.message,true);}
  finally {lock(false);displayReview();}
}
$('approve-check').addEventListener('change',()=>{$('approve').disabled=busy || !$('approve-check').checked;});
$('approve').addEventListener('click',async()=>{
  if (busy || !$('approve-check').checked || !packageAudit || packageAudit.errors.length) return;
  try {
    lock(true);
    files=buildDocuments(state.config,state.draft,state.items);
    state.approved=true;await persist();displayPackageAudit();displayFiles();message();show('exports');
  } catch(error){message(error.message,true);}
  finally {lock(false);}
});
$('download-all').addEventListener('click',()=>download('Universal_Assessment_Generator_Pro.zip',zip(files),'application/zip'));
async function restore() {
  const db=await storage;
  if (db) {
    const saved=await new Promise(resolve=>{
      const request=db.transaction('drafts').objectStore('drafts').get('current');
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);
    });
    if (saved?.config && saved?.draft) {
      state=saved;
      for (const [key,value] of Object.entries(saved.config)) if ($(key)) $(key).value=value;
      saved.config.counts.forEach((count,i)=>$('count'+i).value=count);
      updateBank();updateTotal();
      if (state.approved) {
        try {files=buildDocuments(state.config,state.draft,state.items);packageAudit=auditPackage(state.items,state.config,state.draft);}
        catch {state.approved=false;}
      }
    }
  }
  setDraft();displayReview();displayFiles();
}
restore();
if ($('connection')) api('status').then(result=>{mode=result.mode;displayConnection();}).catch(()=>displayConnection());
