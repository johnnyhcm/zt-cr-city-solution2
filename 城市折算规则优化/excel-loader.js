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
