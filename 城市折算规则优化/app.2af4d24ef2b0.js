/* Local prototype model. Currency definitions and authorization are mock metadata. */
(function (root) {
  'use strict';
  const STORE_KEY = 'hrone-overseas-median-scheme2-v1';
  const departments = ['海外事业部', '研发中心'];
  const currencies = { CNY: 2, EUR: 2, USD: 2, GBP: 2, JPY: 0, KWD: 3 };
  const countries = [
    { id: 'FR', name: '法国', cities: ['巴黎', '尼斯', '里昂', '马赛', '里尔', '南特', '图卢兹'] },
    { id: 'DE', name: '德国', cities: ['慕尼黑', '柏林', '法兰克福', '汉堡', '莱比锡', '德累斯顿', '不来梅'] },
    { id: 'GB', name: '英国', cities: ['伦敦', '曼彻斯特', '伯明翰', '利兹', '布里斯托'] },
    { id: 'JP', name: '日本', cities: ['东京', '大阪', '京都', '福冈', '横滨'] },
    { id: 'IT', name: '意大利', cities: ['米兰', '罗马', '都灵', '博洛尼亚'] },
    { id: 'NL', name: '荷兰', cities: ['阿姆斯特丹', '鹿特丹', '海牙', '乌得勒支'] }
  ];
  const labels = ['二级部门', '三级部门', '国家', '地区', '职级', '职类', '计薪币种', '目标年收中位值', '基本工资', '绩效工资', '月薪标准', '年终奖基数', '度假金', '圣诞金'];
  const fields = ['secondLevelDeptId', 'thirdLevelDeptId', 'nationId', 'regionId', 'jobLevelId', 'jobProfessionalId', 'salaryCurrency', 'targetMedianAnnualIncome', 'basicSalary', 'performanceSalary', 'monthlySalaryStandard', 'annualBonusBase', 'vacationFund', 'christmasFund'];
  const copy = value => JSON.parse(JSON.stringify(value));
  const norm = value => value == null || value === '--' ? '' : String(value);
  const ruleKey = (department, country) => JSON.stringify([department, country]);
  const rowKey = row => JSON.stringify(row.slice(1, 7).map(norm));
  const conditionKey = row => JSON.stringify([row[2], row[5], row[6]].map(norm));
  const countryName = id => countries.find(item => item.id === id)?.name || id;
  const authorized = rule => departments.includes(rule.department);
  function read(storage) {
    const state = JSON.parse(storage.getItem(STORE_KEY) || 'null');
    if (!state || !Array.isArray(state.rows)) throw new Error('本地中位薪数据不可用，请重新打开方案列表。');
    return state;
  }
  function save(storage, state) { storage.setItem(STORE_KEY, JSON.stringify(state)); }
  function initialRules() {
    const now = '2026-11-18T01:30:00.000Z';
    return [
      { department: departments[0], country: 'FR', baseline: '巴黎', enabled: true, tiers: [
        { name: 'A档', factor: 1, cities: ['巴黎', '尼斯'] }, { name: 'B档', factor: 0.8, cities: ['里昂', '马赛'] }, { name: 'C档', factor: 0.7, cities: ['里尔', '南特'] }] },
      { department: departments[0], country: 'DE', baseline: '慕尼黑', enabled: true, tiers: [
        { name: '核心城市', factor: 1, cities: ['慕尼黑', '柏林'] }, { name: '重点城市', factor: 0.9, cities: ['法兰克福', '汉堡'] }, { name: '其他城市', factor: 0.8, cities: ['莱比锡'] }] },
      { department: departments[0], country: 'GB', baseline: '伦敦', enabled: false, tiers: [
        { name: '核心城市', factor: 1, cities: ['伦敦'] }, { name: '标准城市', factor: 0.85, cities: ['曼彻斯特', '伯明翰'] }] },
      { department: departments[0], country: 'JP', baseline: '', enabled: true, tiers: [
        { name: '一级城市', factor: 1.1, cities: ['东京'] }, { name: '二级城市', factor: 0.85, cities: ['大阪', '京都'] }] },
      { department: departments[1], country: 'FR', baseline: '巴黎', enabled: true, tiers: [
        { name: '中心城市', factor: 1, cities: ['巴黎'] }, { name: '标准城市', factor: 0.85, cities: ['里昂', '马赛'] }] },
      { department: departments[1], country: 'DE', baseline: '', enabled: true, tiers: [
        { name: '一线城市', factor: 1, cities: ['慕尼黑', '柏林'] }, { name: '二线城市', factor: 0.9, cities: ['汉堡'] }] }
    ].map(rule => ({ ...rule, id: ruleKey(rule.department, rule.country), editedAt: now, executedAt: null }));
  }
  function sampleRow(rule, region, grade, category, base, currency) {
    return ['', rule.department, category === '技术类' ? '海外研发部' : '海外销售部', countryName(rule.country), region || '--', grade, category, currency,
      ...[16, 1, 0.2, 1.2, 1, 0.1, 0.1].map(factor => multiply(base, factor, currencies[currency])), ''];
  }
  function fixtures(rules) {
    const rows = [];
    // Demonstrate both baseline modes, multiple conditions, retained rows and currency changes.
    const all = [...rules];
    for (const id of ['IT', 'NL']) {
      for (const department of departments) all.push({ department, country: id, baseline: '' });
    }
    for (const rule of all) {
      const currency = rule.country === 'JP' ? 'JPY' : rule.country === 'GB' ? 'GBP' : 'EUR';
      const scale = rule.department === departments[1] ? 1.2 : 1;
      const base = (currency === 'JPY' ? 500001 : 5000) * scale;
      rows.push(sampleRow(rule, rule.baseline, 'P1-1', '技术类', multiply(base, 0.8, currencies[currency]), currency));
      rows.push(sampleRow(rule, rule.baseline, 'P2-1', '技术类', base, currency));
      rows.push(sampleRow(rule, rule.baseline, 'P2-1', '销售类', multiply(base, 1.1, currencies[currency]), currency));
      if (rule.country === 'FR') {
        rows.push(sampleRow(rule, '里昂', 'P2-1', '技术类', 4300, 'USD'));
        rows.push(sampleRow(rule, '里昂', 'P3-1', '销售类', 6500, currency));
        rows.push(sampleRow(rule, '图卢兹', 'P2-1', '技术类', 3900, currency));
      }
    }
    return rows;
  }
  function initialize(storage, capturedRows) {
    const existing = JSON.parse(storage.getItem(STORE_KEY) || 'null');
    if (existing?.cityConversion?.version === 1) return existing;
    const state = existing || { rows: copy(capturedRows || []) };
    let rules = initialRules();
    const keys = new Set(state.rows.map(rowKey));
    for (const row of fixtures(rules)) {
      if (!keys.has(rowKey(row))) { state.rows.push(row); keys.add(rowKey(row)); }
    }
    state.cityConversion = { version: 1, rules };
    save(storage, state);
    return state;
  }
  function baselines(state, rule) {
    return state.rows.filter(row => norm(row[1]) === rule.department && norm(row[3]) === countryName(rule.country) && norm(row[4]) === norm(rule.baseline));
  }
  function cityCatalog(state, country) {
    return [...new Set([...(countries.find(item => item.id === country)?.cities || []),
      ...state.rows.filter(row => row[3] === countryName(country)).map(row => norm(row[4])).filter(Boolean)])];
  }
  function ruleErrors(rule, state, editingId) {
    const errors = {};
    if (!departments.includes(rule.department)) errors.department = '请选择有权限的二级部门';
    if (!countries.some(country => country.id === rule.country)) errors.country = '请选择国家';
    if (state.cityConversion.rules.some(item => item.id !== editingId && item.id === ruleKey(rule.department, rule.country))) errors.country = '该二级部门、国家已有方案，请编辑已有方案';
    if (editingId && editingId !== ruleKey(rule.department, rule.country)) errors.department = '编辑时不能修改二级部门或国家';
    if (!countries.some(country => country.id === rule.country)) return errors;
    const catalog = cityCatalog(state, rule.country);
    if (rule.baseline && !catalog.includes(rule.baseline)) errors.baseline = '请选择本国城市';
    if (rule.department && rule.country && !baselines(state, rule).length) errors.baseline = '薪酬中位值表中没有对应基准记录，请先维护';
    if (!rule.tiers.length) errors.tiers = '请新增档位并选择适用城市';
    const cities = new Set();
    rule.tiers.forEach((tier, i) => {
      const name = String(tier.name || '').trim();
      if (!name || rule.tiers.some((other, j) => j !== i && String(other.name || '').trim() === name)) errors['name' + i] = name ? '档位名称不能重复' : '请输入档位名称';
      if (!Number.isFinite(tier.factor) || tier.factor <= 0) errors['factor' + i] = '请输入大于0的系数';
      if (!tier.cities.length) errors['cities' + i] = '每个档位至少选择一个城市';
      for (const city of tier.cities) {
        if (!catalog.includes(city) || cities.has(city)) errors['cities' + i] = '城市须属于本国且只能归入一个档位';
        cities.add(city);
      }
    });
    return errors;
  }
  function saveRule(storage, draft, editingId) {
    const state = read(storage);
    const errors = ruleErrors(draft, state, editingId);
    if (Object.keys(errors).length) return { errors };
    const rules = state.cityConversion.rules;
    const current = rules.find(rule => rule.id === editingId);
    if (editingId && !current) throw new Error('方案不存在，请重新查询');
    const rule = { id: ruleKey(draft.department, draft.country), department: draft.department, country: draft.country,
      baseline: norm(draft.baseline), tiers: draft.tiers.map(tier => ({ name: tier.name.trim(), factor: tier.factor, cities: [...tier.cities] })),
      enabled: draft.enabled ?? current?.enabled ?? true, editedAt: new Date().toISOString(), executedAt: current?.executedAt || null };
    if (current) rules[rules.indexOf(current)] = rule; else rules.push(rule);
    save(storage, state);
    return { rule };
  }
  function toggleRule(storage, id) {
    const state = read(storage), rule = state.cityConversion.rules.find(item => item.id === id);
    if (!rule || !authorized(rule)) throw new Error('无权限操作该方案');
    rule.enabled = !rule.enabled;
    rule.editedAt = new Date().toISOString();
    save(storage, state);
  }
  // Non-negative decimal multiplication and half-up rounding using integer arithmetic.
  function decimal(value) {
    const match = String(value).match(/^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i);
    if (!match) throw new Error('基准金额或系数不是有效的非负十进制数');
    let n = BigInt(match[1] + (match[2] || ''));
    let scale = (match[2] || '').length - Number(match[3] || 0);
    if (scale < 0) { n *= 10n ** BigInt(-scale); scale = 0; }
    return { n, scale };
  }
  function multiply(value, factor, precision) {
    const a = decimal(value), b = decimal(factor), scale = a.scale + b.scale;
    let n = a.n * b.n;
    if (scale > precision) {
      const divisor = 10n ** BigInt(scale - precision);
      n = (n * 2n + divisor) / (divisor * 2n);
    } else n *= 10n ** BigInt(precision - scale);
    const text = n.toString().padStart(precision + 1, '0');
    return precision ? text.slice(0, -precision) + '.' + text.slice(-precision) : text;
  }
  function sameValue(a, b) {
    return norm(a[7]) === norm(b[7]) && a.slice(8, 15).every((value, i) => Number(value) === Number(b[i + 8]));
  }
  function preflight(state, rules) {
    const errors = [];
    for (const rule of rules) {
      const prefix = rule.department + '／' + countryName(rule.country);
      const live = state.cityConversion.rules.find(item => item.id === rule.id);
      if (!authorized(rule) || !live) errors.push(prefix + '：方案不存在或无权限');
      else if (!live.enabled) errors.push(prefix + '：方案已停用');
      else if (!baselines(state, rule).length) errors.push(prefix + '：大表中没有' + (rule.baseline || '国家标准（城市为空）') + '的基准记录');
    }
    if (errors.length) { const error = new Error('请补齐基准或返回列表调整选择'); error.details = errors; throw error; }
  }
  function preview(storage, ids) {
    const state = read(storage);
    const rules = ids.map(id => state.cityConversion.rules.find(item => item.id === id));
    if (!ids.length || rules.some(rule => !rule)) throw new Error('请选择有效的折算方案');
    preflight(state, rules);
    const records = [], retained = [], counts = { added: 0, updated: 0, unchanged: 0 };
    const existing = new Map(state.rows.map(row => [rowKey(row), row]));
    for (const rule of rules) {
      const source = baselines(state, rule);
      const conditions = new Set(source.map(conditionKey));
      for (const tier of rule.tiers) {
        for (const city of tier.cities) {
          if (city === norm(rule.baseline)) continue;
          for (const base of source) {
            const precision = currencies[base[7]];
            if (precision == null) throw new Error('未配置币种“' + base[7] + '”的字段精度');
            const row = copy(base);
            row[0] = ''; row[4] = city; row[15] = '';
            for (let i = 8; i < 15; i++) row[i] = multiply(base[i], tier.factor, precision);
            const old = existing.get(rowKey(row));
            if (!old) counts.added++;
            else if (sameValue(old, row)) counts.unchanged++;
            else counts.updated++;
            records.push(row);
          }
          for (const row of state.rows) {
            if (norm(row[1]) === rule.department && norm(row[3]) === countryName(rule.country) && norm(row[4]) === city && !conditions.has(conditionKey(row))) {
              retained.push({ row: copy(row), reason: '基准无相同条件记录' });
            }
          }
        }
      }
    }
    return { rules: copy(rules), records, retained, counts, generatedAt: new Date().toISOString() };
  }
  function commit(storage, snapshot) {
    const state = read(storage);
    preflight(state, snapshot.rules);
    const next = copy(state), existing = new Map(next.rows.map((row, i) => [rowKey(row), i]));
    const counts = { added: 0, updated: 0, unchanged: 0, retained: snapshot.retained.length };
    for (const row of snapshot.records) {
      // Protect sources again at the write boundary, even for a malformed snapshot.
      if (snapshot.rules.some(rule => row[1] === rule.department && row[3] === countryName(rule.country) && norm(row[4]) === norm(rule.baseline))) continue;
      const index = existing.get(rowKey(row));
      if (index == null) { existing.set(rowKey(row), next.rows.length); next.rows.push(copy(row)); counts.added++; }
      else { if (sameValue(next.rows[index], row)) counts.unchanged++; else counts.updated++; next.rows[index] = copy(row); }
    }
    const now = new Date().toISOString();
    for (const rule of next.cityConversion.rules) if (snapshot.rules.some(item => item.id === rule.id)) rule.executedAt = now;
    save(storage, next); // Exactly one atomic storage write for rows and timestamps.
    return counts;
  }
  function objects(rows, reason) {
    return rows.map((item, index) => {
      const row = reason ? item.row : item;
      const result = { key: rowKey(row), sequence: index + 1 };
      fields.forEach((field, i) => { result[field] = row[i + 1]; });
      if (reason) result.reason = item.reason;
      return result;
    });
  }
  const api = { STORE_KEY, departments, currencies, countries, labels, fields, copy, norm, ruleKey, rowKey, conditionKey, countryName, authorized,
    initialize, read, save, baselines, cityCatalog, ruleErrors, saveRule, toggleRule, multiply, preview, commit, objects };
  root.CityConversion = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);

;
/* Shared skill component adapters, locale and icons. */
(function(root){
const zhCN = {
    locale: 'zh-cn',
    global: { placeholder: '请选择', loading: '加载中', emptyText: '暂无数据' },
    Pagination: { items_per_page: '条/页', jump_to: '跳至', page: '页', prev_page: '上一页', next_page: '下一页', total: '共 {{total}} 条' },
    Select: { placeholder: '请选择', notFoundContent: '无数据' },
    Table: { emptyText: '暂无数据', filterConfirm: '确定', filterReset: '重置', selectAll: '全选' },
    Modal: { okText: '确定', cancelText: '取消' },
    Empty: { description: '暂无数据' },
    Popconfirm: { ok_text: '确定', cancel_text: '取消' },
    Descriptions: { emptyText: '暂无数据' },
    Form: { optional: '（可选）', defaultValidateMessages: { required: '请输入${label}' } }
  };
const ICONS = {
    // @ant-design/icons-svg/es/asn/FilterOutlined.js（查询条件卡片标题左侧漏斗）
    'i-filter': ['64 64 896 896', '<path d="M880 112H144c-17.7 0-32 14.3-32 32v120.5c0 16.5 7.7 32.2 20.9 42.3L400 507.3V848c0 16.7 8.7 32.2 23 40.7l120 71.4c19.7 11.7 45-2.5 45-25.3V507.3l267.1-200.5c13.2-10.1 20.9-25.8 20.9-42.3V144c0-17.7-14.3-32-32-32z"/>'],
    // @ant-design/icons-svg/es/asn/SettingOutlined.js
    'i-setting': ['64 64 896 896', '<path d="M924.8 625.7l-65.5-56c3.1-19 4.7-38.4 4.7-57.8s-1.6-38.8-4.7-57.8l65.5-56a32.03 32.03 0 009.3-35.2l-.9-2.6a443.74 443.74 0 00-79.7-137.9l-1.8-2.1a32.12 32.12 0 00-35.1-9.5l-81.3 28.9c-30-24.6-63.5-44-99.7-57.6l-15.7-85a32.05 32.05 0 00-25.8-25.7l-2.7-.5c-52.1-9.4-106.9-9.4-159 0l-2.7.5a32.05 32.05 0 00-25.8 25.7l-15.8 85.4a351.86 351.86 0 00-99 57.4l-81.9-29.1a32 32 0 00-35.1 9.5l-1.8 2.1a446.02 446.02 0 00-79.7 137.9l-.9 2.6c-4.5 12.5-.8 26.5 9.3 35.2l66.3 56.6c-3.1 18.8-4.6 38-4.6 57.1 0 19.2 1.5 38.4 4.6 57.1L99 625.5a32.03 32.03 0 00-9.3 35.2l.9 2.6c18.1 50.4 44.9 96.9 79.7 137.9l1.8 2.1a32.12 32.12 0 0035.1 9.5l81.9-29.1c29.8 24.5 63.1 43.9 99 57.4l15.8 85.4a32.05 32.05 0 0025.8 25.7l2.7.5a449.4 449.4 0 00159 0l2.7-.5a32.05 32.05 0 0025.8-25.7l15.7-85a350 350 0 0099.7-57.6l81.3 28.9a32 32 0 0035.1-9.5l1.8-2.1c34.8-41.1 61.6-87.5 79.7-137.9l.9-2.6c4.5-12.3.8-26.3-9.3-35zM788.3 465.9c2.5 15.1 3.8 30.6 3.8 46.1s-1.3 31-3.8 46.1l-6.6 40.1 74.7 63.9a370.03 370.03 0 01-42.6 73.6L721 702.8l-31.4 25.8c-23.9 19.6-50.5 35-79.3 45.8l-38.1 14.3-17.9 97a377.5 377.5 0 01-85 0l-17.9-97.2-37.8-14.5c-28.5-10.8-55-26.2-78.7-45.7l-31.4-25.9-93.4 33.2c-17-22.9-31.2-47.6-42.6-73.6l75.5-64.5-6.5-40c-2.4-14.9-3.7-30.3-3.7-45.5 0-15.3 1.2-30.6 3.7-45.5l6.5-40-75.5-64.5c11.3-26.1 25.6-50.7 42.6-73.6l93.4 33.2 31.4-25.9c23.7-19.5 50.2-34.9 78.7-45.7l37.9-14.3 17.9-97.2c28.1-3.2 56.8-3.2 85 0l17.9 97 38.1 14.3c28.7 10.8 55.4 26.2 79.3 45.8l31.4 25.8 92.8-32.9c17 22.9 31.2 47.6 42.6 73.6L781.8 426l6.5 39.9zM512 326c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm79.2 255.2A111.6 111.6 0 01512 614c-29.9 0-58-11.7-79.2-32.8A111.6 111.6 0 01400 502c0-29.9 11.7-58 32.8-79.2C454 401.6 482.1 390 512 390c29.9 0 58 11.6 79.2 32.8A111.6 111.6 0 01624 502c0 29.9-11.7 58-32.8 79.2z"/>'],
    // DeleteOutlined
    'i-delete': ['64 64 896 896', '<path d="M360 184h-8c4.4 0 8-3.6 8-8v8h304v-8c0 4.4 3.6 8 8 8h-8v72h72v-80c0-35.3-28.7-64-64-64H352c-35.3 0-64 28.7-64 64v80h72v-72zm504 72H160c-17.7 0-32 14.3-32 32v32c0 4.4 3.6 8 8 8h60.4l24.7 523c1.6 34.1 29.8 61 63.9 61h454c34.2 0 62.3-26.8 63.9-61l24.7-523H888c4.4 0 8-3.6 8-8v-32c0-17.7-14.3-32-32-32zM731.3 840H292.7l-24.2-512h487l-24.2 512z"/>'],
    // EyeOutlined
    'i-eye': ['64 64 896 896', '<path d="M942.2 486.2C847.4 286.5 704.1 186 512 186c-192.2 0-335.4 100.5-430.2 300.3a60.3 60.3 0 000 51.5C176.6 737.5 319.9 838 512 838c192.2 0 335.4-100.5 430.2-300.3 7.7-16.2 7.7-35 0-51.5zM512 766c-161.3 0-279.4-81.8-362.7-254C232.6 339.8 350.7 258 512 258c161.3 0 279.4 81.8 362.7 254C791.5 684.2 673.4 766 512 766zm-4-430c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm0 288c-61.9 0-112-50.1-112-112s50.1-112 112-112 112 50.1 112 112-50.1 112-112 112z"/>'],
    // EditOutlined（操作列平铺位：编辑）
    'i-edit': ['64 64 896 896', '<path d="M257.7 752c2 0 4-.2 6-.5L431.9 722c2-.4 3.9-1.3 5.3-2.8l423.9-423.9a9.96 9.96 0 000-14.1L694.9 114.9c-1.9-1.9-4.4-2.9-7.1-2.9s-5.2 1-7.1 2.9L256.8 538.8c-1.5 1.5-2.4 3.3-2.8 5.3l-29.5 168.2a33.5 33.5 0 009.4 29.8c6.6 6.4 14.9 9.9 23.8 9.9zm67.4-174.4L687.8 215l73.3 73.3-362.7 362.6-88.9 15.7 15.6-89zM880 836H144c-17.7 0-32 14.3-32 32v36c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-36c0-17.7-14.3-32-32-32z"/>'],
    // EllipsisOutlined（操作列「更多」下拉触发图标）
    'i-ellipsis': ['64 64 896 896', '<path d="M176 511a56 56 0 10112 0 56 56 0 10-112 0zm280 0a56 56 0 10112 0 56 56 0 10-112 0zm280 0a56 56 0 10112 0 56 56 0 10-112 0z"/>'],
    // DragOutlined（列设置排序）
    'i-drag': ['64 64 896 896', '<path d="M909.3 506.3L781.7 405.6a7.23 7.23 0 00-11.7 5.7V476H548V254h64.8c6 0 9.4-7 5.7-11.7L517.7 114.7a7.14 7.14 0 00-11.3 0L405.6 242.3a7.23 7.23 0 005.7 11.7H476v222H254v-64.8c0-6-7-9.4-11.7-5.7L114.7 506.3a7.14 7.14 0 000 11.3l127.5 100.8c4.7 3.7 11.7.4 11.7-5.7V548h222v222h-64.8c-6 0-9.4 7-5.7 11.7l100.8 127.5c2.9 3.7 8.5 3.7 11.3 0l100.8-127.5c3.7-4.7.4-11.7-5.7-11.7H548V548h222v64.8c0 6 7 9.4 11.7 5.7l127.5-100.8a7.3 7.3 0 00.1-11.4z"/>'],
    // PlusOutlined
    'i-plus': ['64 64 896 896', '<path d="M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8z"/><path d="M192 474h672q8 0 8 8v60q0 8-8 8H160q-8 0-8-8v-60q0-8 8-8z"/>'],
    // DownloadOutlined
    'i-download': ['64 64 896 896', '<path d="M505.7 661a8 8 0 0012.6 0l112-141.7c4.1-5.2.4-12.9-6.3-12.9h-74.1V168c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v338.3H400c-6.7 0-10.4 7.7-6.3 12.9l112 141.8zM878 626h-60c-4.4 0-8 3.6-8 8v154H214V634c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v198c0 17.7 14.3 32 32 32h684c17.7 0 32-14.3 32-32V634c0-4.4-3.6-8-8-8z"/>'],
    // ReloadOutlined
    'i-reload': ['64 64 896 896', '<path d="M909.1 209.3l-56.4 44.1C775.8 155.1 656.2 92 521.9 92 290 92 102.3 279.5 102 511.5 101.7 743.7 289.8 932 521.9 932c181.3 0 335.5-115.8 394.6-276.3l-71.9-33.7C799.3 755.1 673.3 839 521.9 839c-183.1 0-332.1-149-332.1-332.1 0-183.1 149-332.1 332.1-332.1 108.6 0 204.5 52.4 265.2 133.1l-68.4 53.5c-8.5 6.7-4.1 20.4 7 20.8l187.7 7.2c7.5.3 13.7-5.9 13.4-13.4l-7.2-187.7c-.3-11-14.1-15.4-20.9-6.9z"/>'],
    // SearchOutlined
    'i-search': ['64 64 896 896', '<path d="M909.6 854.5L649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-88.1-212.1C567.1 143 491.7 112 411.6 112c-80.1 0-155.5 31-212.2 87.9C142.6 256.6 112 331.8 112 412c0 80.1 30.6 155.3 87.4 212.1 56.7 56.8 132.1 87.9 212.2 87.9 66.7 0 130.4-21.8 182.5-62.1l259.6 259.6c7.7 7.7 20.3 7.7 28 0l28-28c7.8-7.7 7.8-20.3.1-28zM411.6 663.6c-138.8 0-251.6-112.8-251.6-251.6S272.8 160.4 411.6 160.4 663.2 273.2 663.2 412 550.4 663.6 411.6 663.6z"/>'],
    // bootstrap-icons/icons/nut.svg（系统里「导出设置」用 bi bi-nut）
    'i-nut': ['0 0 16 16', '<path d="m11.42 2 3.428 6-3.428 6H4.58L1.152 8 4.58 2zM4.58 1a1 1 0 0 0-.868.504l-3.428 6a1 1 0 0 0 0 .992l3.428 6A1 1 0 0 0 4.58 15h6.84a1 1 0 0 0 .868-.504l3.429-6a1 1 0 0 0 0-.992l-3.429-6A1 1 0 0 0 11.42 1z"/><path d="M6.848 5.933a2.5 2.5 0 1 0 2.5 4.33 2.5 2.5 0 0 0-2.5-4.33m-1.78 3.915a3.5 3.5 0 1 1 6.061-3.5 3.5 3.5 0 0 1-6.062 3.5z"/>'],
    // bootstrap-icons/icons/sd-card.svg（系统里「保存查询方案」用 bi bi-sd-card）
    'i-sdcard': ['0 0 16 16', '<path d="M6.25 3.5a.75.75 0 0 0-1.5 0v2a.75.75 0 0 0 1.5 0zm2 0a.75.75 0 0 0-1.5 0v2a.75.75 0 0 0 1.5 0zm2 0a.75.75 0 0 0-1.5 0v2a.75.75 0 0 0 1.5 0zm2 0a.75.75 0 0 0-1.5 0v2a.75.75 0 0 0 1.5 0z"/><path fill-rule="evenodd" d="M5.914 0H12.5A1.5 1.5 0 0 1 14 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5V3.914c0-.398.158-.78.44-1.06L4.853.439A1.5 1.5 0 0 1 5.914 0M13 1.5a.5.5 0 0 0-.5-.5H5.914a.5.5 0 0 0-.353.146L3.146 3.561A.5.5 0 0 0 3 3.914V14.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5z"/>']
  };
ICONS['i-arrow-up']=['0 0 16 16','<path d="M8 13V3M4 7l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'];
ICONS['i-arrow-down']=['0 0 16 16','<path d="M8 3v10M4 9l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'];
ICONS['i-stop']=['0 0 24 24','<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>'];
ICONS['i-play']=['0 0 24 24','<path d="M8 4v16l13-8z"/>'];
function mount(app){
 app.component('proto-table',{inheritAttrs:false,setup(_,ctx){return()=>Vue.h(antd.Table,{size:'small',...ctx.attrs},ctx.slots)}});
 for(const [name,[viewBox,path]] of Object.entries(ICONS)) app.component(name,{template:'<svg viewBox="'+viewBox+'" width="1em" height="1em" aria-hidden="true">'+path+'</svg>'});
 return app.use(antd).mount('#app');
}
const C=root.CityConversion;
const departmentOptions=[{name:'总部',poidOrgAdminNameTreePath:'root',disabled:true,children:C.departments.map(name=>({name,poidOrgAdminNameTreePath:name}))}];
const departmentFieldNames={label:'name',value:'poidOrgAdminNameTreePath'};
const theme={token:{colorPrimary:'#0E66FB',colorSuccess:'#00b259',colorError:'#FF4D4F',fontSize:12,controlHeight:30,borderRadius:6}};
function time(value){return value?new Date(value).toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}).slice(0,16):'--'}
function money(value,currency){if(value==null||value==='--'||value==='')return '--';return Number(value).toLocaleString('zh-CN',{minimumFractionDigits:C.currencies[currency]??2,maximumFractionDigits:C.currencies[currency]??2})}
function medianColumns(retained=false){
 const cols=C.fields.map((field,i)=>({title:C.labels[i],dataIndex:field,key:field,width:i<2?170:i<7?115:140,align:i>=7?'right':'left',...(i<2?{fixed:'left'}:{})}));
 if(retained)cols.push({title:'保留原因',dataIndex:'reason',key:'reason',width:210});
 return cols;
}
root.PrototypeUI={zhCN,theme,departmentOptions,departmentFieldNames,mount,time,money,medianColumns};
})(window);

;
/* Export support is loaded only when the user requests an Excel file. */
(function () {
  let loading;
  window.loadPrototypeExcel = function () {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('../海外薪酬中位值/assets/xlsx.full.min.js', document.baseURI).href;
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => {
        loading = null;
        script.remove();
        reject(new Error('Excel组件加载失败，请重试'));
      };
      document.head.append(script);
    });
    return loading;
  };
})();

;
/* Execution preview is a snapshot: only explicit refresh recalculates amounts. */
window.CityPreview = (function () {
const C = window.CityConversion, UI = window.PrototypeUI;
return {
  template: '#preview-tpl',
  props: { ids: { type: Array, required: true } },
  emits: ['cancel', 'success'],
  data() {
    return {
      zhCN: UI.zhCN, theme: UI.theme, departmentFieldNames: UI.departmentFieldNames,
      filters: {}, applied: {}, scope: [], snapshot: null, error: '', errorDetails: [],
      busy: false, refreshing: false, exporting: false, tab: 'generated', page: 1, pageSize: 20,
      amountFields: C.fields.slice(7)
    };
  },
  computed: {
    departmentOptions() {
      return UI.departmentOptions.map(root => ({ ...root, children: root.children.filter(item => this.scope.some(rule => rule.department === item.poidOrgAdminNameTreePath)) }));
    },
    countryOptions() {
      return C.countries.filter(country => this.scope.some(rule => rule.country === country.id)).map(country => ({ label: country.name, value: country.id }));
    },
    regionOptions() {
      const rows = [...(this.snapshot?.records || []), ...(this.snapshot?.retained || []).map(item => item.row)];
      return [...new Set(rows.map(row => row[4]))].sort((a, b) => a.localeCompare(b, 'zh-CN')).map(region => ({ label: region, value: region }));
    },
    columns() { return UI.medianColumns(this.tab === 'retained'); },
    filteredRows() {
      if (!this.snapshot) return [];
      const retained = this.tab === 'retained';
      const rows = C.objects(retained ? this.snapshot.retained : this.snapshot.records, retained);
      const { department, country, region } = this.applied;
      return rows.filter(row => (!department || row.secondLevelDeptId === department) && (!country || row.nationId === C.countryName(country)) && (!region || row.regionId === region));
    },
    pagination() { return { current: this.page, pageSize: this.pageSize, showSizeChanger: true, showQuickJumper: true, pageSizeOptions: ['10', '20', '50'], showTotal: total => '共' + total + '条数据' }; }
  },
  created() { this.refresh(); },
  methods: {
    money: UI.money,
    search() { this.applied = { ...this.filters }; this.page = 1; },
    reset() { this.filters = {}; this.search(); },
    changePage(pagination) { this.page = pagination.current; this.pageSize = pagination.pageSize; },
    refresh() {
      this.refreshing = true;
      this.error = ''; this.errorDetails = [];
      try {
        const state = C.read(localStorage);
        this.scope = state.cityConversion.rules.filter(rule => this.ids.includes(rule.id) && C.authorized(rule));
        const snapshot = C.preview(localStorage, this.ids);
        this.snapshot = snapshot;
        if (!snapshot.retained.length) this.tab = 'generated';
        this.page = 1;
      } catch (error) {
        this.snapshot = null;
        this.error = error.message;
        this.errorDetails = error.details || [];
      } finally { this.refreshing = false; }
    },
    async exportExcel() {
      if (!this.snapshot || this.error || this.exporting) return;
      this.exporting = true;
      const snapshot = this.snapshot;
      try {
        const XLSX = await window.loadPrototypeExcel();
        const book = XLSX.utils.book_new();
        for (const retained of [false, true]) {
          const list = retained ? snapshot.retained : snapshot.records;
          const data = [retained ? [...C.labels, '保留原因'] : C.labels];
          for (const item of list) {
            const row = retained ? item.row : item;
            const values = row.slice(1, 15).map((value, i) => i >= 7 && C.norm(value) !== '' ? Number(value) : value);
            if (retained) values.push(item.reason);
            data.push(values);
          }
          const sheet = XLSX.utils.aoa_to_sheet(data);
          list.forEach((item, index) => {
            const row = retained ? item.row : item;
            const precision = C.currencies[row[7]] ?? 2;
            for (let col = 7; col < 14; col++) {
              const cell = sheet[XLSX.utils.encode_cell({ r: index + 1, c: col })];
              if (cell?.t === 'n') cell.z = '#,##0' + (precision ? '.' + '0'.repeat(precision) : '');
            }
          });
          sheet['!cols'] = data[0].map((_, i) => ({ wch: i < 2 || i === 14 ? 25 : 18 }));
          XLSX.utils.book_append_sheet(book, sheet, retained ? '保留原值' : '折算明细');
        }
        XLSX.writeFile(book, '海外中位薪折算预览-' + new Date().toISOString().slice(0, 10) + '.xlsx');
        antd.message.success('已导出本次全部方案的完整明细');
      } catch (error) { antd.message.error('导出失败：' + error.message); }
      finally { this.exporting = false; }
    },
    back() { if (!this.busy) this.$emit('cancel'); },
    confirm() {
      if (this.busy || !this.snapshot?.records.length || this.error) return;
      this.busy = true;
      try {
        const result = C.commit(localStorage, this.snapshot);
        this.$emit('success', result);
      } catch (error) {
        this.error = error.message;
        this.errorDetails = error.details || [];
        antd.message.error('刷新失败：' + error.message);
        this.busy = false;
      }
    }
  }
};
})();

;
/* Country scheme list and simplified editor. */
const C = window.CityConversion, UI = window.PrototypeUI;
const app = Vue.createApp({
  template: '#page-tpl',
  data() {
    return {
      zhCN: UI.zhCN, theme: UI.theme, departmentOptions: UI.departmentOptions, departmentFieldNames: UI.departmentFieldNames,
      rules: [], filters: { status: 'enabled' }, applied: { status: 'enabled' }, selected: [], page: 1, pageSize: 20,
      draft: null, editingId: null, errors: {}, submitted: false, tierSequence: 0, fatal: '', saving: false, previewIds: null,
      countryOptions: C.countries.map(country => ({ label: country.name, value: country.id })),
      statusOptions: [{ label: '启用', value: 'enabled' }, { label: '停用', value: 'disabled' }],
      columns: [
        { title: '二级部门', dataIndex: 'department', key: 'department', width: 250 },
        { title: '国家', key: 'country', width: 130 },
        { title: '最近编辑', key: 'editedAt', width: 190 },
        { title: '上次执行刷新', key: 'executedAt', width: 190 },
        { title: '操作', key: 'action', width: 130, align: 'center', fixed: 'right' }
      ]
    };
  },
  computed: {
    visibleRules() {
      const { department, country, status } = this.applied;
      return this.rules.filter(C.authorized).filter(rule => (!department || rule.department === department) && (!country || rule.country === country) && (!status || rule.enabled === (status === 'enabled')))
        .sort((a, b) => a.department.localeCompare(b.department, 'zh-CN') || C.countryName(a.country).localeCompare(C.countryName(b.country), 'zh-CN'));
    },
    pagination() { return { current: this.page, pageSize: this.pageSize, showSizeChanger: true, showQuickJumper: true, pageSizeOptions: ['10', '20', '50'], showTotal: total => '共' + total + '条数据' }; },
    selection() {
      return { selectedRowKeys: this.selected, onChange: keys => { this.selected = keys; }, getCheckboxProps: rule => ({ disabled: !rule.enabled, name: rule.id }) };
    },
    editorCountries() {
      return this.countryOptions.map(option => ({ ...option, label: option.label + ' ' + option.value, disabled: !this.editingId && this.rules.some(rule => rule.department === this.draft?.department && rule.country === option.value) }));
    },
    baseCities() { return this.optionsForCities().map(city => ({ label: city, value: city })); }
  },
  watch: {
    draft: { deep: true, handler() { if (this.draft && this.submitted) this.validateDraft(); } }
  },
  created() {
    try {
      C.initialize(localStorage, window.PAGE_CAPTURE.rows);
      this.reload();
      const remembered = JSON.parse(sessionStorage.getItem('hrone-city-scheme2-list-query') || 'null');
      if (remembered) { this.filters = remembered; this.applied = { ...remembered }; }
    } catch (error) { this.fatal = error.message; }
  },
  mounted() {
    this.storageListener = event => { if (event.key === C.STORE_KEY) this.reload(); };
    window.addEventListener('storage', this.storageListener);
  },
  beforeUnmount() { window.removeEventListener('storage', this.storageListener); },
  methods: {
    countryName: C.countryName, formatTime: UI.time,
    reload() { this.rules = C.read(localStorage).cityConversion.rules; },
    search() { this.applied = { ...this.filters }; this.selected = []; this.page = 1; sessionStorage.setItem('hrone-city-scheme2-list-query', JSON.stringify(this.applied)); },
    reset() { this.filters = { status: 'enabled' }; this.search(); },
    changePage(pagination) { this.page = pagination.current; this.pageSize = pagination.pageSize; },
    openNew() {
      this.editingId = null; this.errors = {}; this.submitted = false;
      this.draft = { department: this.filters.department || C.departments[0], country: undefined, baseline: undefined, enabled: true, tiers: [this.createTier()] };
    },
    openEdit(rule) { this.editingId = rule.id; this.errors = {}; this.submitted = false; this.draft = C.copy(rule); this.draft.baseline ||= undefined; this.draft.tiers.forEach(tier => { tier.uid = 'tier-' + (++this.tierSequence); }); },
    createTier() { return { uid: 'tier-' + (++this.tierSequence), name: '', factor: null, cities: [] }; },
    changeCountry(country) { this.draft.country = country; this.changeScope(); },
    changeScope() {
      if (!this.draft) return;
      if (!this.editingId && this.rules.some(rule => rule.department === this.draft.department && rule.country === this.draft.country)) this.draft.country = undefined;
      this.draft.baseline = undefined;
      this.draft.tiers.forEach(tier => { tier.cities = []; });
      this.errors = {};
    },
    optionsForCities() {
      if (!this.draft?.country) return [];
      return C.cityCatalog(C.read(localStorage), this.draft.country);
    },
    cityOptions(tier) {
      const used = new Map();
      for (const other of this.draft.tiers) if (other.uid !== tier.uid) {
        for (const city of other.cities) used.set(city, other.name.trim() || '未命名档位');
      }
      return this.optionsForCities().map(city => ({ label: used.has(city) ? city + '（已归入' + used.get(city) + '）' : city, value: city, disabled: used.has(city) }));
    },
    addTier() {
      if (!this.draft.country) return;
      const tier = this.createTier(); this.draft.tiers.push(tier);
      this.$nextTick(() => document.getElementById('tier-name-' + tier.uid)?.focus());
    },
    moveTier(index, step) {
      const target = index + step;
      if (!this.draft.country || target < 0 || target >= this.draft.tiers.length) return;
      const [tier] = this.draft.tiers.splice(index, 1); this.draft.tiers.splice(target, 0, tier);
    },
    removeTier(tier) {
      if (this.draft.tiers.length <= 1) return;
      const remove = () => { this.draft.tiers = this.draft.tiers.filter(item => item.uid !== tier.uid); };
      if (!tier.name.trim() && tier.factor == null && !tier.cities.length) { remove(); return; }
      antd.Modal.confirm({ content: tier.name.trim() ? '将删除 ' + tier.name.trim() + '档位及其城市配置。' : '将删除该档位及其城市配置。', okText: '删除', cancelText: '取消', okType: 'danger', onOk: remove });
    },
    validateDraft() { this.errors = C.ruleErrors(this.draft, C.read(localStorage), this.editingId); },
    focusFirstError() {
      this.$nextTick(() => {
        const field = document.querySelector('.rule-modal .ant-select-status-error input, .rule-modal input.ant-input-status-error, .rule-modal .ant-input-number-status-error input');
        const target = field || document.querySelector('.rule-modal .field-error:not(.field-label .field-error)');
        target?.scrollIntoView({ block: 'center', behavior: 'auto' }); field?.focus({ preventScroll: true });
      });
    },
    saveDraft() {
      this.submitted = true;
      this.saving = true;
      try {
        const result = C.saveRule(localStorage, this.draft, this.editingId);
        this.errors = result.errors || {};
        if (result.rule) { this.draft = null; this.reload(); this.selected = []; antd.message.success('折算方案已保存'); }
        else this.focusFirstError();
      } catch (error) { antd.message.error(error.message); }
      finally { this.saving = false; }
    },
    changeStatus(rule) {
      const update = () => {
        try { C.toggleRule(localStorage, rule.id); this.reload(); this.selected = this.selected.filter(id => id !== rule.id); antd.message.success(rule.enabled ? '方案已停用' : '方案已启用'); }
        catch (error) { antd.message.error(error.message); }
      };
      if (rule.enabled) antd.Modal.confirm({ title: '停用折算方案', content: '确定停用“' + rule.department + '／' + C.countryName(rule.country) + '”？已有中位薪记录保留。', okText: '停用', cancelText: '取消', okButtonProps: { danger: true }, onOk: update });
      else update();
    },
    finishExecution(result) {
      this.previewIds = null;
      this.selected = [];
      this.reload();
      const text = '新增' + result.added + '条，更新' + result.updated + '条' + (result.retained ? '，' + result.retained + '条保留原值' : '') + '。';
      antd.message.success({ content: Vue.h('span', [Vue.h('span', '刷新成功，' + text + ' '), Vue.h('a', { href: '../海外薪酬中位值/index.html', target: '_blank', rel: 'noopener' }, '查看当前海外薪酬中位值')]), duration: 8 });
    },
    execute(ids) {
      try {
        const state = C.read(localStorage);
        const rules = ids.map(id => state.cityConversion.rules.find(rule => rule.id === id));
        if (rules.some(rule => !rule || !rule.enabled || !C.authorized(rule))) throw new Error('请选择有权限且已启用的方案');
        this.previewIds = [...ids];
      } catch (error) { antd.message.error(error.message); }
    }
  }
});
app.component('execution-preview', window.CityPreview);
UI.mount(app);
document.getElementById('boot-state')?.remove();
