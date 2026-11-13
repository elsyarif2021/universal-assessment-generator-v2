const types = ['PG reguler', 'PG TKA', 'Esai reguler', 'Esai TKA'];
const alphabet = 'ABCDE';
const isPG = type => type < 2;
const clean = value => typeof value === 'string' ? value.replace(/\r/g, '').replace(/\\n/g, '\n').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/^```[^\n]*|^```$|^#{1,6}\s+/gm, '').trim() : '';
const option = value => clean(value).replace(/^[A-Ea-e][.)]\s+/, '');
const normalized = value => clean(value).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim();
function plan(config) {
  return config.counts.flatMap((count, type) => Array.from({length: count}, () => type)).map((type, index) => ({type, no:index + 1}));
}
const batchLimit = 3;
function nextBatch(config, start) {
  const entries = plan(config);
  const first = entries[start];
  return first ? entries.slice(start,start+batchLimit).filter(entry=>entry.type===first.type) : [];
}
function validateConfig(c) {
  if (!c || ['level','curriculum','grade','semester','subject','material','language'].some(key => !clean(c[key]))) return 'Lengkapi jenjang, kurikulum, kelas, semester, mapel, materi, dan bahasa.';
  if (c.material.length > 18000 || ['level','curriculum','grade','semester','subject','language','school'].some(key => String(c[key] ?? '').length > 150)) return 'Isian terlalu panjang. Materi maksimal 18.000 karakter.';
  if (!Array.isArray(c.counts) || c.counts.length !== 4 || c.counts.some(n => !Number.isInteger(n) || n < 0) || c.counts.reduce((a,b)=>a+b,0) < 1 || c.counts.reduce((a,b)=>a+b,0) > 100) return 'Jumlah soal harus antara 1 dan 100, dengan bilangan bulat untuk setiap jenis.';
  if (![3,4,5].includes(c.options)) return 'Pilih A–C, A–D, atau A–E.';
  return '';
}
function validateDraft(draft) {
  return !!(clean(draft?.cp) && Array.isArray(draft.atp) && draft.atp.length && draft.atp.every(clean) && Array.isArray(draft.tp) && draft.tp.length && draft.tp.length <= 16 && draft.tp.every(clean));
}
function validateVisual(visual) {
  if (!visual || visual.kind === 'none') return true;
  if (visual.kind === 'image') return !!clean(visual.prompt) && clean(visual.prompt).length <= 2000 && !!clean(visual.caption);
  if (visual.kind === 'circle') return Number.isFinite(visual.angle) && visual.angle > 0 && visual.angle <= 360 && typeof visual.radius === 'number' && Number.isFinite(visual.radius) && visual.radius > 0 && !!clean(visual.caption);
  return ['bar','line'].includes(visual.kind) && Array.isArray(visual.values) && visual.values.length >= 2 && visual.values.length <= 10 && visual.values.every(v => Number.isFinite(v) && Math.abs(v) <= 1e9) && Array.isArray(visual.labels) && visual.labels.length === visual.values.length && visual.labels.every(l => clean(l) && l.length <= 20) && !!clean(visual.caption);
}
function itemErrors(item, expected, config, draft, requireVisual = false) {
  if (!item || item.no !== expected.no || item.type !== expected.type) return ['Nomor atau jenis soal tidak cocok.'];
  const errors = [];
  if (['stem','indicator','explanation','analysis','concept'].some(key => !clean(item[key]))) errors.push('Batang soal, indikator, pembahasan, analisis, dan pokok materi wajib terisi.');
  if (!Number.isInteger(item.tp) || item.tp < 1 || item.tp > draft.tp.length) errors.push('Rujukan TP tidak sah.');
  if (!/^C[1-6]$/.test(item.level) || ([1,3].includes(item.type) && !/^C[4-6]$/.test(item.level))) errors.push('Level kognitif tidak sesuai jenis soal.');
  if (!['Mudah','Sedang','Sukar'].includes(item.difficulty)) errors.push('Tingkat kesukaran perlu diisi.');
  if (!validateVisual(item.visual)) errors.push('Spesifikasi gambar atau grafis tidak sah.');
  if (requireVisual && item.visual && item.visual.kind !== 'none' && !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(item.visualData || '')) errors.push('Gambar atau grafis belum tersedia.');
  if (isPG(item.type)) {
    const options = Array.isArray(item.options) ? item.options.map(option) : [];
    if (options.length !== config.options || options.some(value => !value) || new Set(options.map(normalized)).size !== options.length) errors.push('Jumlah opsi tidak sesuai atau opsi berulang.');
    if (!Array.isArray(item.keys) || new Set(item.keys).size !== item.keys.length || item.keys.some(key => typeof key !== 'string' || key.length !== 1 || !alphabet.slice(0,config.options).includes(key)) || (item.type === 0 ? item.keys.length !== 1 : item.keys.length < 2 || item.keys.length >= config.options)) errors.push(item.type === 0 ? 'PG reguler memerlukan tepat satu kunci yang sah.' : 'PG TKA memerlukan minimal dua kunci berbeda dan satu pengecoh.');
  } else if (!clean(item.answer) || !Array.isArray(item.rubric) || !item.rubric.length || item.rubric.some(row => !clean(row?.criterion) || !Number.isInteger(row?.points) || row.points < 1 || row.points > 10) || item.rubric.reduce((sum,row) => sum + (row?.points ?? 0),0) > 20) {
    errors.push('Esai memerlukan jawaban acuan dan rubrik dengan skor maksimal 20.');
  }
  return errors;
}
const rawScore = item => isPG(item.type) ? 1 : item.rubric.reduce((total, row) => total + row.points, 0);
function audit(items, config, draft) {
  const seen = new Set();
  return plan(config).flatMap((expected,index) => {
    const item = items[index];
    const errors = itemErrors(item,expected,config,draft,true);
    const stem = normalized(item?.stem);
    if (stem && seen.has(stem)) errors.push('Batang soal berulang.');
    if (stem) seen.add(stem);
    return errors.map(error => 'No. ' + expected.no + ' — ' + error);
  });
}
