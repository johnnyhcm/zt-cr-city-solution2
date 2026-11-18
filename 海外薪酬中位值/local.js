/* Offline interactions over the captured HRONE DOM. No original API is called. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const saved = window.PAGE_CAPTURE;
  const key = 'hrone-overseas-median-scheme2-v1';
  const labels = ['二级部门','三级部门','国家','地区','职级','职类','计薪币种','目标年收中位值','基本工资','绩效工资','月薪标准','年终奖基数','度假金','圣诞金'];
  const fields = ['secondLevelDeptId','thirdLevelDeptId','nationId','regionId','jobLevelId','jobProfessionalId','salaryCurrency','targetMedianAnnualIncome','basicSalary','performanceSalary','monthlySalaryStandard','annualBonusBase','vacationFund','christmasFund'];
  const filterIds = ['orgIdSet','locationIds','jobLevelIds','jobProfessionalIds','jobPostIdSet'];
  const filterLabels = ['部门','国家/地区','职级','职类','职族'];
  let persisted;
  try { persisted = JSON.parse(localStorage.getItem(key) || 'null'); } catch { persisted = null; }
  let rows = persisted?.rows || structuredClone(saved.rows);
  let schemes = persisted?.schemes || [];
  let visibleFilters = persisted?.visibleFilters || [true,true,true,true,true];
  let columnOrder = persisted?.columnOrder || Array.from({length:16},(_,i)=>i);
  let hiddenColumns = persisted?.hiddenColumns || [];
  let bordered = persisted?.bordered || false;
  let currentScheme = '', page = 1, pageSize = 20, applied = [], result = rows;
  const persist = () => localStorage.setItem(key, JSON.stringify({...JSON.parse(localStorage.getItem(key) || '{}'),rows,schemes,visibleFilters,columnOrder,hiddenColumns,bordered}));
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let toastTimer;
  function toast(text) {
    $('.local-toast')?.remove();
    const el = document.createElement('div'); el.className='local-toast'; el.role='status'; el.textContent=text; document.body.append(el);
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.remove(),4500);
  }
  function closeModal() { $('.local-modal-host')?.remove(); }
  function modal(title, body, onConfirm, confirmText='确定') {
    closeModal();
    const host=document.createElement('div'); host.className='local-modal-host';
    host.innerHTML=`<div class="ant-modal-root css-j7fkny"><div class="ant-modal-mask"></div><div class="ant-modal-wrap custom-modal" role="dialog" aria-label="${esc(title)}"><div class="ant-modal css-j7fkny" role="document" style="width:640px"><div class="ant-modal-content"><button class="ant-modal-close" aria-label="Close">×</button><div class="ant-modal-header"><div class="ant-modal-title">${esc(title)}</div></div><div class="ant-modal-body"><div class="local-dialog-body">${body}</div></div><div class="ant-modal-footer"><button class="ant-btn ant-btn-default" data-cancel>取消</button>${onConfirm?`<button class="ant-btn ant-btn-primary" data-confirm>${esc(confirmText)}</button>`:''}</div></div></div></div></div>`;
    $$('button.ant-btn',host).forEach(b=>b.classList.add('css-j7fkny'));
    document.body.append(host); $('.ant-modal-close',host).onclick=closeModal; $('[data-cancel]',host).onclick=closeModal;
    if(onConfirm) $('[data-confirm]',host).onclick=()=>onConfirm(host);
    return host;
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  const unique = i => [...new Set(rows.map(r=>r[i]).filter(v=>v && v!=='--'))];
  function optionsFor(i) {
    return [...new Set([...(i===4?saved.options.jobLevel:i===5?saved.options.jobProfessional:[]),...unique(i+1)])];
  }
  function input(id, value, options=[], disabled=false, placeholder='请选择') {
    return `<input class="local-input" id="${esc(id)}" list="${esc(id)}_options" value="${esc(value)}" placeholder="${esc(placeholder)}" ${disabled?'disabled':''} autocomplete="off"><datalist id="${esc(id)}_options">${options.map(v=>`<option value="${esc(v)}"></option>`).join('')}</datalist>`;
  }
  const queryForm=$('#form_item_orgIdSet').closest('form');
  const filterItems=filterIds.map(id=>$('#form_item_'+id).closest('.ant-form-item'));
  const choiceLists=[()=>[...new Set([...unique(1),...unique(2)])],()=>[...new Set([...unique(3),...unique(4)])],()=>optionsFor(4),()=>optionsFor(5),()=>saved.options.jobPost];
  filterIds.forEach((id,i)=>{
    const old=$('#form_item_'+id);const control=old.closest('.ant-select')||old.closest('.ant-cascader')||old.parentElement;
    control.outerHTML=input('form_item_'+id,'',choiceLists[i](),false,i<2?'请选择':'请输入关键字搜索');
    $('#form_item_'+id).title='支持关键字；多个值以逗号分隔';
  });
  queryForm.addEventListener('submit',e=>{e.preventDefault();query();});
  function applyFilterVisibility() {filterItems.forEach((el,i)=>el.style.display=visibleFilters[i]?'':'none');}
  applyFilterVisibility();
  const config=$('.search-config');
  const oldScheme=$('#rc_select_1').closest('.ant-select');
  oldScheme.outerHTML='<select class="local-select" id="local-scheme" aria-label="查询方案" style="width:120px"></select>';
  function renderSchemes(){ $('#local-scheme').innerHTML='<option value="">标准方案</option>'+schemes.map((s,i)=>`<option value="${i}" ${String(i)===currentScheme?'selected':''}>${esc(s.name)}</option>`).join(''); }
  renderSchemes();
  $('#local-scheme').onchange=e=>{currentScheme=e.target.value;filterIds.forEach((id,i)=>$('#form_item_'+id).value=currentScheme===''?'':schemes[Number(currentScheme)].values[i]||'');query();};
  function saveScheme(){modal('保存查询方案','<label for="scheme-name">方案名称</label><input class="local-input" id="scheme-name" maxlength="40"><p class="local-error" role="alert"></p>',host=>{
    const name=$('#scheme-name',host).value.trim();if(!name){$('.local-error',host).textContent='请输入方案名称';return;}
    const values=filterIds.map(id=>$('#form_item_'+id).value); const existing=schemes.findIndex(s=>s.name===name);
    if(existing>=0){schemes[existing]={name,values};currentScheme=String(existing);}else{schemes.push({name,values});currentScheme=String(schemes.length-1);}
    persist();renderSchemes();closeModal();toast('查询方案已保存');
  });}
  const configButtons=$$('button',config);
  configButtons[0].title='保存查询方案';configButtons[0].onclick=saveScheme;
  configButtons[1].title='配置方案字段';configButtons[1].onclick=()=>modal('配置方案字段',filterLabels.map((label,i)=>`<label><input type="checkbox" data-filter="${i}" ${visibleFilters[i]?'checked':''}>${esc(label)}</label>`).join(''),host=>{visibleFilters=$$('[data-filter]',host).map(e=>e.checked);persist();applyFilterVisibility();closeModal();},'应用');
  configButtons[2].title='删除自定义方案';configButtons[2].onclick=()=>{if(currentScheme===''){toast('标准方案不能删除');return;}modal('删除查询方案',`确定删除“${esc(schemes[Number(currentScheme)].name)}”？`,()=>{schemes.splice(Number(currentScheme),1);currentScheme='';persist();renderSchemes();closeModal();});};
  const tableBody=$('.ant-table-tbody');
  const measure=$('.ant-table-measure-row',tableBody)?.outerHTML||'';
  const rowTemplate=$('tr.ant-table-row',tableBody).cloneNode(true);
  const operationHTML=rowTemplate.lastElementChild.innerHTML;
  const table=$('.ant-table');
  $$('thead tr',table).forEach(tr=>[...tr.children].forEach((el,i)=>el.dataset.col=i));
  $$('colgroup',table).forEach(cg=>[...cg.children].forEach((el,i)=>el.dataset.col=i));
  const pagination=$('.ant-pagination');
  function query(){
    applied=filterIds.map(id=>$('#form_item_'+id).value.trim());page=1;
    if(applied[4])toast('采集记录没有职族关联字段；本地查询仅应用其余条件');
    render();
  }
  function matches(row) {
    return applied.slice(0,4).every((value,i)=>{
      const columns=[[1,2],[3,4],[5],[6]][i];
      return !value||value.split(/[,，]/).filter(Boolean).some(v=>columns.some(c=>String(row[c]).toLowerCase().includes(v.trim().toLowerCase())));
    });
  }
  function applyColumns(){
    bordered?table.classList.add('local-table-bordered'):table.classList.remove('local-table-bordered');
    $$('thead tr,tbody tr,colgroup',table).forEach(parent=>{
      const children=[...parent.children];children.forEach((el,i)=>{if(!el.dataset.col)el.dataset.col=i;});
      columnOrder.forEach(i=>{const child=children.find(el=>Number(el.dataset.col)===i);if(child){child.style.display=hiddenColumns.includes(i)?'none':'';parent.append(child);}});
      children.filter(el=>Number(el.dataset.col)>15).forEach(el=>parent.append(el));
    });
  }
  function render(){
    result=rows.filter(matches);const pages=Math.max(1,Math.ceil(result.length/pageSize));page=Math.min(page,pages);
    tableBody.innerHTML=measure;
    result.slice((page-1)*pageSize,page*pageSize).forEach((row,offset)=>{
      const tr=rowTemplate.cloneNode(true);tr.removeAttribute('data-row-key');tr.dataset.index=rows.indexOf(row);
      [...tr.children].forEach((td,i)=>{td.dataset.col=i;if(i===15){td.innerHTML=operationHTML;return;}td.textContent=i===0?(page-1)*pageSize+offset+1:row[i];if(i===1&&row[i]!=='--'){td.innerHTML=`<button class="css-j7fkny ant-btn ant-btn-link ellipsis" type="button" data-department>${esc(row[i])}</button>`;}});
      const buttons=$$('button',tr.lastElementChild);['edit','copy','delete'].forEach((name,i)=>{buttons[i].dataset.action=name;buttons[i].ariaLabel=name;buttons[i].title={edit:'编辑',copy:'复制',delete:'删除'}[name];});
      tableBody.append(tr);
    });
    if(!result.length)tableBody.innerHTML=`<tr><td colspan="16"><div class="local-empty">暂无数据</div></td></tr>`;
    pagination.innerHTML=`<li class="ant-pagination-total-text">共${result.length}条数据</li><li><button class="local-pager-btn" aria-label="left" ${page===1?'disabled':''} data-page="${page-1}">‹</button></li>${Array.from({length:pages},(_,i)=>`<li class="ant-pagination-item ${page===i+1?'ant-pagination-item-active':''}"><button class="local-pager-btn" data-page="${i+1}">${i+1}</button></li>`).join('')}<li><button class="local-pager-btn" aria-label="right" ${page===pages?'disabled':''} data-page="${page+1}">›</button></li><li class="ant-pagination-options"><select class="local-pagination-select" aria-label="每页条数">${[10,20,50,100].map(n=>`<option ${n===pageSize?'selected':''} value="${n}">${n} 条/页</option>`).join('')}</select><div class="ant-pagination-options-quick-jumper">跳至<input aria-label="跳页" type="number" min="1" max="${pages}">页</div></li>`;
    applyColumns();
  }
  pagination.onclick=e=>{const b=e.target.closest('[data-page]');if(b&&!b.disabled){page=Number(b.dataset.page);render();}};
  pagination.onchange=e=>{if(e.target.matches('select')){pageSize=Number(e.target.value);page=1;render();}};
  pagination.onkeydown=e=>{if(e.key==='Enter'&&e.target.matches('input')){page=Math.max(1,Math.min(Math.ceil(result.length/pageSize)||1,Number(e.target.value)||1));render();}};
  tableBody.onclick=e=>{
    const tr=e.target.closest('tr[data-index]');if(!tr)return;const idx=Number(tr.dataset.index);const action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='delete')modal('删除海外薪酬中位值','确定删除这条本地记录？',()=>{rows.splice(idx,1);persist();closeModal();render();toast('记录已删除');});
    else if(action)edit(action,idx);
    else if(e.target.closest('[data-department]'))modal('部门信息',`${esc(rows[idx][1])}<br>三级部门：${esc(rows[idx][2])}`,null);
  };
  function edit(mode,idx){
    closeModal();const host=document.createElement('div');host.className='local-modal-host';host.innerHTML=saved.templates.create;document.body.append(host);
    const title={create:'新建',edit:'编辑',copy:'复制'}[mode]+'海外薪酬中位值';$('.ant-modal-title',host).textContent=title;$('.ant-modal-wrap',host).setAttribute('aria-label',title);
    $('.ant-modal',host).style.transformOrigin='center';
    const row=mode==='create'?['',...Array(14).fill(''),'']:structuredClone(rows[idx]);
    fields.forEach((field,i)=>{
      const id='form_item_'+field;const old=$('#'+id,host);const value=mode==='create'?(i>=7?'0':''):(row[i+1]==='--'?'':row[i+1]);
      const control=old.closest('.ant-select')||old.closest('.ant-input-number');
      if(i<7)control.outerHTML=input(id,value,optionsFor(i),mode==='edit'&&i<6);
      else control.outerHTML=`<input class="local-input" type="number" id="${id}" min="0" step="any" value="${esc(value)}">`;
    });
    const form=$('form',host);form.onsubmit=e=>{e.preventDefault();submit();};
    const err=document.createElement('p');err.className='local-error';err.role='alert';form.append(err);
    $('.ant-modal-close',host).onclick=closeModal;const footer=$$('.ant-modal-footer button',host);footer[0].onclick=closeModal;footer[1].onclick=submit;
    function submit(){
      const values=fields.map(f=>$('#form_item_'+f,host).value.trim());
      const problems=values.flatMap((v,i)=>{if(mode==='edit'&&i<6)return [];if(!v&&![1,3].includes(i))return [labels[i]+'不能为空'];if(i>=7&&(!Number.isFinite(Number(v))||Number(v)<0))return [labels[i]+'必须是非负数字'];return [];});
      if(problems.length){err.textContent=problems.join('；');return;}
      const next=['',...values.map((v,i)=>v===''&&i<7?'--':v),''];
      if(mode==='edit')rows[idx]=next;else rows.push(next);
      persist();closeModal();render();toast(mode==='edit'?'修改已保存':'记录已保存');
    }
  }
  function exportExcel(template=false){
    const workbook=XLSX.utils.book_new();const data=[labels,...(template?[]:result.map(r=>r.slice(1,15)))];
    const sheet=XLSX.utils.aoa_to_sheet(data);sheet['!cols']=labels.map((_,i)=>({wch:i<2?24:20}));
    XLSX.utils.book_append_sheet(workbook,sheet,template?'导入模板':'海外薪酬中位值');XLSX.writeFile(workbook,template?'海外薪酬中位值-导入模板.xlsx':'海外薪酬中位值.xlsx');
  }
  function importExcel(){
    let imported=null;
    const host=modal('导入',`<div class="local-upload" tabindex="0" role="button" aria-label="选择导入文件">⇧<p>点击或拖动文件上传</p><p>支持的文件格式：.xlsx、.xls</p><input type="file" accept=".xlsx,.xls" hidden></div><p>请根据模板上传文件：<button class="ant-btn ant-btn-link" data-template>下载模板.xlsx</button></p><p data-import-status></p><p class="local-error" role="alert"></p>`,()=>{
      if(!imported){$('.local-error',host).textContent='请先选择有效的 Excel 文件';return;}rows.push(...imported);persist();closeModal();render();toast(`已导入 ${imported.length} 条记录`);
    },'上传');
    const upload=$('.local-upload',host),file=$('input[type=file]',host);
    $('[data-template]',host).onclick=()=>exportExcel(true);
    upload.onclick=()=>file.click();upload.onkeydown=e=>{if(e.key==='Enter')file.click();};file.onclick=e=>e.stopPropagation();
    file.onchange=()=>read(file.files[0]);upload.ondragover=e=>{e.preventDefault();upload.classList.add('dragging');};upload.ondragleave=()=>upload.classList.remove('dragging');upload.ondrop=e=>{e.preventDefault();upload.classList.remove('dragging');read(e.dataTransfer.files[0]);};
    async function read(f){
      imported=null;$('.local-error',host).textContent='';if(!f)return;
      try{
        const book=XLSX.read(await f.arrayBuffer(),{type:'array'});const matrix=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,defval:''});
        const header=matrix.shift().map(v=>String(v).trim());const indexes=labels.map(l=>header.indexOf(l));
        if(indexes.some(i=>i<0))throw new Error('缺少模板字段，请使用本页下载的模板');
        const errors=[];const data=matrix.filter(r=>r.some(v=>String(v).trim())).map((r,n)=>{const values=indexes.map(i=>String(r[i]??'').trim());values.forEach((v,i)=>{if((!v&&![1,3].includes(i))||(i>=7&&(!Number.isFinite(Number(v))||Number(v)<0)))errors.push(`第 ${n+2} 行：${labels[i]}无效`);});return ['',...values.map((v,i)=>!v&&i<7?'--':v),''];});
        if(errors.length)throw new Error(errors.slice(0,8).join('\n'));if(!data.length)throw new Error('文件没有可导入的数据');
        imported=data;$('[data-import-status]',host).textContent=`${f.name}：已读取 ${data.length} 条，点击“上传”保存到本地。`;
      }catch(error){$('.local-error',host).textContent=error.message;}
    }
  }
  function columnSettings(){
    let order=[...columnOrder];
    let draftHidden=[...hiddenColumns];
    const host=modal('表格设置','<label><input type="checkbox" data-border '+(bordered?'checked':'')+'>边框</label><div data-columns></div>',()=>{columnOrder=order;hiddenColumns=$$('[data-column]',host).filter(e=>!e.checked).map(e=>Number(e.dataset.column));bordered=$('[data-border]',host).checked;persist();closeModal();render();},'应用');
    function draw(){
      const checked=$$('[data-column]',host);if(checked.length)draftHidden=checked.filter(e=>!e.checked).map(e=>Number(e.dataset.column));
      $('[data-columns]',host).innerHTML=order.filter(i=>i<15).map(i=>`<div class="local-columns-row"><label><input type="checkbox" data-column="${i}" ${draftHidden.includes(i)?'':'checked'}>${esc(i===0?'序号列':labels[i-1])}</label><button data-up="${i}" title="上移">↑</button><button data-down="${i}" title="下移">↓</button></div>`).join('');
      $$('[data-up],[data-down]',host).forEach(b=>b.onclick=()=>{const i=Number(b.dataset.up??b.dataset.down),at=order.indexOf(i),to=at+(b.hasAttribute('data-up')?-1:1);if(to>=0&&to<15){[order[at],order[to]]=[order[to],order[at]];draw();}});
    }draw();
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button||button.closest('.local-modal-host')||button.closest('.ant-pagination')||button.closest('.ant-table-tbody')||button.closest('.search-config'))return;
    const text=button.textContent.trim();
    if(text==='新增')edit('create');else if(text.includes('导入'))importExcel();else if(text.includes('导出'))exportExcel();
    else if(text==='查询')query();else if(text==='重置'){filterIds.forEach(id=>$('#form_item_'+id).value='');currentScheme='';renderSchemes();query();}
    else if(text.includes('高级筛选')){const advanced=text.includes('显示');button.lastElementChild.textContent=(advanced?'隐藏':'显示')+'高级筛选';const group=$('.item-group-down,.item-group-up',queryForm);group.classList.toggle('item-group-up',advanced);group.classList.toggle('item-group-down',!advanced);applyFilterVisibility();}
    else if(!button.dataset.action)toast('此入口属于其他系统模块，本次保存范围为海外薪酬中位值页面');
  });
  const settings=$$('[aria-label="setting"]').find(el=>!el.closest('.search-config'));
  if(settings){settings.style.cursor='pointer';settings.title='表格设置';settings.onclick=columnSettings;}
  $$('a').forEach(a=>{a.removeAttribute('href');a.addEventListener('click',e=>e.preventDefault());});
  const status=document.createElement('span');status.className='local-status';status.textContent='本地数据';status.title='点击恢复采集时的 34 条数据';
  status.onclick=()=>modal('恢复采集数据','将覆盖本地增删改，恢复为最初采集的 34 条记录。',()=>{rows=structuredClone(saved.rows);applied=[];filterIds.forEach(id=>$('#form_item_'+id).value='');page=1;persist();closeModal();render();toast('已恢复采集数据');});
  config.append(status);render();
  window.addEventListener('storage', event => {
    if(event.key !== key || !event.newValue) return;
    const latest = JSON.parse(event.newValue);
    if(Array.isArray(latest.rows)){ rows=latest.rows; render(); }
  });
})();
