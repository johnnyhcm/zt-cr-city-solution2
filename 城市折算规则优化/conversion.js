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
    const catalog = cityCatalog(state, rule.country);
    if (rule.baseline && !catalog.includes(rule.baseline)) errors.baseline = '请选择本国城市';
    if (rule.department && rule.country && !baselines(state, rule).length) errors.baseline = '薪酬中位值表中没有对应基准记录，请先维护';
    if (!rule.tiers.length) errors.tiers = '请新增档次并选择适用城市';
    const names = new Set(), cities = new Set();
    rule.tiers.forEach((tier, i) => {
      const name = String(tier.name || '').trim();
      if (!name || names.has(name)) errors['name' + i] = name ? '档次名称不能重复' : '请输入档次名称';
      names.add(name);
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
      baseline: norm(draft.baseline), tiers: copy(draft.tiers).map(tier => ({ ...tier, name: tier.name.trim() })),
      enabled: current ? current.enabled : true, editedAt: new Date().toISOString(), executedAt: current?.executedAt || null };
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
