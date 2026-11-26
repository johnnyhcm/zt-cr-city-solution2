/* Country scheme list and simplified editor. */
const C = window.CityConversion, UI = window.PrototypeUI;
const listQuery = (query = { status: ['enabled'] }) => Object.fromEntries(
  ['department', 'country', 'status'].map(key => [key, Array.isArray(query[key]) ? [...query[key]] : query[key] ? [query[key]] : []])
);
const app = Vue.createApp({
  template: '#page-tpl',
  data() {
    return {
      zhCN: UI.zhCN, theme: UI.theme, departmentOptions: UI.departmentOptions, departmentFieldNames: UI.departmentFieldNames,
      rules: [], filters: listQuery(), applied: listQuery(), selected: [], page: 1, pageSize: 20,
      draft: null, editingId: null, errors: {}, submitted: false, tierSequence: 0, fatal: '', saving: false, previewIds: null,
      countryOptions: C.countries.map(country => ({ label: country.name, value: country.id })),
      statusOptions: [{ label: '启用', value: 'enabled' }, { label: '停用', value: 'disabled' }],
      columns: [
        { title: '二级部门', dataIndex: 'department', key: 'department', width: 220, fixed: 'left' },
        { title: '国家', key: 'country', width: 110, fixed: 'left' },
        { title: '基准城市', key: 'baseline', width: 140 },
        { title: '启用状态', key: 'status', width: 100 },
        { title: '档位：系数', key: 'tiers', width: 360 },
        { title: '最近编辑', key: 'editedAt', width: 170 },
        { title: '上次执行刷新', key: 'executedAt', width: 180 },
        { title: '操作', key: 'action', width: 130, align: 'center', fixed: 'right' }
      ]
    };
  },
  computed: {
    visibleRules() {
      const { department, country, status } = this.applied;
      return this.rules.filter(C.authorized).filter(rule => (!department.length || department.includes(rule.department)) && (!country.length || country.includes(rule.country)) && (!status.length || status.includes(rule.enabled ? 'enabled' : 'disabled')))
        .sort((a, b) => a.department.localeCompare(b.department, 'zh-CN') || C.countryName(a.country).localeCompare(C.countryName(b.country), 'zh-CN'));
    },
    pagination() { return { current: this.page, pageSize: this.pageSize, showSizeChanger: true, showQuickJumper: true, pageSizeOptions: ['10', '20', '50'], showTotal: total => '共' + total + '条数据' }; },
    tableWidth() { return this.columns.reduce((width, column) => width + column.width, 32); },
    selection() {
      return { fixed: true, columnWidth: 32, selectedRowKeys: this.selected, onChange: keys => { this.selected = keys; }, getCheckboxProps: rule => ({ disabled: !rule.enabled, name: rule.id }) };
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
      if (remembered) { this.filters = listQuery(remembered); this.applied = listQuery(remembered); }
    } catch (error) { this.fatal = error.message; }
  },
  mounted() {
    this.storageListener = event => { if (event.key === C.STORE_KEY) this.reload(); };
    window.addEventListener('storage', this.storageListener);
  },
  beforeUnmount() { window.removeEventListener('storage', this.storageListener); },
  methods: {
    countryName: C.countryName, formatTime: UI.time,
    formatFactor(factor) { return factor == null ? '--' : factor.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 12 }); },
    reload() { this.rules = C.read(localStorage).cityConversion.rules; },
    search() { this.applied = listQuery(this.filters); this.selected = []; this.page = 1; sessionStorage.setItem('hrone-city-scheme2-list-query', JSON.stringify(this.applied)); },
    reset() { this.filters = listQuery(); this.search(); },
    changePage(pagination) { this.page = pagination.current; this.pageSize = pagination.pageSize; },
    openNew() {
      this.editingId = null; this.errors = {}; this.submitted = false;
      this.draft = { department: this.filters.department.length === 1 ? this.filters.department[0] : C.departments[0], country: undefined, baseline: undefined, enabled: true, tiers: [this.createTier()] };
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
    deleteRule(rule) {
      if (rule.enabled) return;
      antd.Modal.confirm({
        content: '将删除“' + rule.department + ' / ' + C.countryName(rule.country) + '”的全部城市折算规则。',
        okText: '删除', cancelText: '取消', okType: 'danger',
        onOk: close => {
          try {
            C.removeRule(localStorage, rule.id);
            this.reload(); this.selected = this.selected.filter(id => id !== rule.id);
            this.page = Math.min(this.page, Math.max(1, Math.ceil(this.visibleRules.length / this.pageSize)));
            close(); antd.message.success('城市折算方案已删除');
          } catch (error) { antd.message.error('删除失败：' + error.message); }
        }
      });
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
