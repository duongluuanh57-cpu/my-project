(function () {
  var saved = localStorage.getItem('theme');
  // Ap dung ngay khi load (tranh flash)
  if (saved === 'dark') document.documentElement.classList.add('dark');

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;

    function updateIcon() {
      var isDark = document.documentElement.classList.contains('dark');
      btn.innerHTML = isDark
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
      btn.title = isDark ? 'Chuyển sang sáng' : 'Chuyển sang tối';
    }

    updateIcon();

    btn.addEventListener('click', function () {
      document.documentElement.classList.toggle('dark');
      var isDark = document.documentElement.classList.contains('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      updateIcon();
    });
  });
})();
