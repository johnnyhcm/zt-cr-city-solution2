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
      busy: false, refreshing: false, tab: 'generated', page: 1, pageSize: 20,
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
    exportExcel() {
      if (!this.snapshot || this.error) return;
      try {
        const book = XLSX.utils.book_new();
        for (const retained of [false, true]) {
          const list = retained ? this.snapshot.retained : this.snapshot.records;
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
