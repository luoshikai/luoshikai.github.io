/* 罗世凯 · 个人简历 — 轻量交互（无依赖） */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  /* ---------- 当前年份 ---------- */
  var yearEl = doc.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- 入场动画 ---------- */
  var revealItems = Array.prototype.slice.call(doc.querySelectorAll('.reveal'));

  function showAll() {
    revealItems.forEach(function (el) { el.classList.add('is-visible'); });
  }

  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    showAll();
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    revealItems.forEach(function (el) { revealObserver.observe(el); });

    window.addEventListener('load', function () {
      // 兜底：加载后仍在视口内的元素直接显示
      revealItems.forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add('is-visible');
        }
      });
    });
  }

  /* ---------- 章节导航高亮 ---------- */
  var navLinks = Array.prototype.slice.call(doc.querySelectorAll('.nav-pills a'));
  var sections = navLinks
    .map(function (link) {
      var id = link.getAttribute('href');
      return id ? doc.querySelector(id) : null;
    })
    .filter(Boolean);

  function setActive(id) {
    navLinks.forEach(function (link) {
      var isActive = link.getAttribute('href') === '#' + id;
      if (isActive) {
        link.setAttribute('aria-current', 'true');
        if (link.getAttribute('data-active') !== 'true') {
          centreInBar(link);
          link.setAttribute('data-active', 'true');
        }
      } else {
        link.removeAttribute('aria-current');
        link.removeAttribute('data-active');
      }
    });
  }

  // 移动端导航可横向滚动时，把当前章节按钮带入可见区域
  function centreInBar(link) {
    var bar = link.parentElement;
    if (!bar || bar.scrollWidth <= bar.clientWidth + 1) return;
    var linkRect = link.getBoundingClientRect();
    var barRect = bar.getBoundingClientRect();
    var left = linkRect.left - barRect.left + bar.scrollLeft;
    var width = linkRect.width;
    if (left < bar.scrollLeft || left + width > bar.scrollLeft + bar.clientWidth) {
      var target = Math.max(0, left - (bar.clientWidth - width) / 2);
      if (bar.scrollTo) {
        bar.scrollTo({ left: target, behavior: 'smooth' });
      } else {
        bar.scrollLeft = target;
      }
    }
  }

  var ticking = false;

  function updateActive() {
    ticking = false;
    if (!sections.length) return;

    var offset = 140;
    var current = sections[0].id;
    var atBottom = window.innerHeight + window.scrollY >= doc.body.offsetHeight - 4;

    if (atBottom) {
      current = sections[sections.length - 1].id;
    } else {
      sections.forEach(function (section) {
        if (section.getBoundingClientRect().top <= offset) current = section.id;
      });
    }

    setActive(current);
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateActive);
    }
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  updateActive();

  /* ---------- 项目筛选 ---------- */
  var chips = Array.prototype.slice.call(doc.querySelectorAll('[data-filter]'));
  var pubs = Array.prototype.slice.call(doc.querySelectorAll('.pub'));
  var countEl = doc.querySelector('[data-count]');

  function applyFilter(filter) {
    var shown = 0;
    pubs.forEach(function (pub) {
      var match = filter === 'all' || pub.getAttribute('data-cat') === filter;
      pub.hidden = !match;
      if (match) shown += 1;
    });
    if (countEl) countEl.textContent = String(shown);
    chips.forEach(function (chip) {
      chip.setAttribute('aria-pressed', chip.getAttribute('data-filter') === filter ? 'true' : 'false');
    });
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      applyFilter(chip.getAttribute('data-filter') || 'all');
    });
  });

  /* ---------- 电话展开 ---------- */
  var toast = doc.querySelector('.toast');
  var toastTimer = null;

  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.requestAnimationFrame(function () { toast.setAttribute('data-show', 'true'); });
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.removeAttribute('data-show');
      window.setTimeout(function () { toast.hidden = true; }, 260);
    }, 2200);
  }

  function formatPhone(value) {
    return value.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1 $2 $3');
  }

  Array.prototype.slice.call(doc.querySelectorAll('[data-tel]')).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tel = btn.getAttribute('data-tel');
      if (!tel) return;
      var link = doc.createElement('a');
      link.href = 'tel:' + tel;
      link.textContent = formatPhone(tel);
      btn.replaceWith(link);
      notify('已显示电话：' + formatPhone(tel));
    });
  });

  /* ---------- 打印 / 导出 PDF ---------- */
  var openedByPrint = [];

  function openAllDetails() {
    openedByPrint = [];
    Array.prototype.slice.call(doc.querySelectorAll('details:not([open])')).forEach(function (detail) {
      detail.open = true;
      openedByPrint.push(detail);
    });
  }

  function restoreDetails() {
    openedByPrint.forEach(function (detail) { detail.open = false; });
    openedByPrint = [];
  }

  Array.prototype.slice.call(doc.querySelectorAll('[data-print]')).forEach(function (btn) {
    btn.addEventListener('click', function () { window.print(); });
  });

  window.addEventListener('beforeprint', openAllDetails);
  window.addEventListener('afterprint', restoreDetails);

  // 生成 PDF 时（Chrome headless 传 ?print=1）一次性展开全部内容
  if (window.location.search.indexOf('print=1') !== -1) openAllDetails();

  /* ---------- 哈希定位时立即同步导航 ---------- */
  if (window.location.hash) {
    var targetId = window.location.hash.slice(1);
    if (doc.getElementById(targetId)) setActive(targetId);
  }

  root.classList.add('is-ready');
})();
