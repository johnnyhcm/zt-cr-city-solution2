/* Country scheme list and simplified editor. */
const C = window.CityConversion, UI = window.PrototypeUI;
const app = Vue.createApp({
  template: '#page-tpl',
  data() {
    return {
      zhCN: UI.zhCN, theme: UI.theme, departmentOptions: UI.departmentOptions, departmentFieldNames: UI.departmentFieldNames,
      rules: [], filters: { status: 'enabled' }, applied: { status: 'enabled' }, selected: [], page: 1, pageSize: 20,
      draft: null, editingId: null, errors: {}, fatal: '', saving: false, previewIds: null,
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
      return this.countryOptions.map(option => ({ ...option, disabled: !this.editingId && this.rules.some(rule => rule.department === this.draft?.department && rule.country === option.value) }));
    },
    baseCities() { return this.optionsForCities().map(city => ({ label: city, value: city })); }
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
      this.editingId = null; this.errors = {};
      this.draft = { department: this.filters.department || C.departments[0], country: undefined, baseline: undefined, tiers: [{ name: '', factor: null, cities: [] }] };
    },
    openEdit(rule) { this.editingId = rule.id; this.errors = {}; this.draft = C.copy(rule); this.draft.baseline ||= undefined; },
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
    cityOptions(index) {
      const used = new Set(this.draft.tiers.filter((_, i) => i !== index).flatMap(tier => tier.cities));
      return this.optionsForCities().map(city => ({ label: city, value: city, disabled: used.has(city) }));
    },
    addTier() { this.draft.tiers.push({ name: '', factor: null, cities: [] }); this.errors = {}; },
    removeTier(index) {
      antd.Modal.confirm({ title: '删除档次', content: '确定删除该档次及其城市归档？薪酬中位值表中的已有记录保留。', okText: '删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => { this.draft.tiers.splice(index, 1); this.errors = {}; } });
    },
    saveDraft() {
      this.saving = true;
      try {
        const result = C.saveRule(localStorage, this.draft, this.editingId);
        this.errors = result.errors || {};
        if (result.rule) { this.draft = null; this.reload(); this.selected = []; antd.message.success('折算方案已保存'); }
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
