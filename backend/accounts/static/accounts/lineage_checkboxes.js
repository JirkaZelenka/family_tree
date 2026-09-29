(function () {
  function syncSelectAll(selectAll) {
    var name = selectAll.getAttribute("data-target-name");
    if (!name) return;
    var boxes = document.querySelectorAll(
      'input[type="checkbox"][name="' + name + '"]',
    );
    if (!boxes.length) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
      return;
    }
    var checked = 0;
    boxes.forEach(function (box) {
      if (box.checked) checked += 1;
    });
    selectAll.checked = checked === boxes.length;
    selectAll.indeterminate = checked > 0 && checked < boxes.length;
  }

  function bindSelectAll(selectAll) {
    if (selectAll.dataset.bound === "1") return;
    selectAll.dataset.bound = "1";
    var name = selectAll.getAttribute("data-target-name");
    selectAll.addEventListener("change", function () {
      document
        .querySelectorAll('input[type="checkbox"][name="' + name + '"]')
        .forEach(function (box) {
          box.checked = selectAll.checked;
        });
      selectAll.indeterminate = false;
    });
    document
      .querySelectorAll('input[type="checkbox"][name="' + name + '"]')
      .forEach(function (box) {
        box.addEventListener("change", function () {
          syncSelectAll(selectAll);
        });
      });
    syncSelectAll(selectAll);
  }

  function init() {
    document
      .querySelectorAll("input.lineage-select-all")
      .forEach(bindSelectAll);
  }

  document.addEventListener("DOMContentLoaded", init);
  // Django admin inlines / formset refreshes
  if (typeof django !== "undefined" && django.jQuery) {
    django.jQuery(document).on("formset:added", init);
  }
})();
