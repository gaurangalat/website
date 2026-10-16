(function () {
  var ENABLED = false;
  if (!ENABLED) return;

  var destinations = [
    { label: 'Home', href: '/' },
    { label: 'Lab', href: '/lab' },
    { label: 'Thoughts', href: '/thoughts' },
    { label: 'Photos', href: '/photo/' }
  ];

  var tools = document.querySelector('.page-tools');
  if (!tools) {
    tools = document.createElement('div');
    tools.className = 'page-tools';
    document.body.appendChild(tools);
  }
  tools.insertAdjacentHTML('afterbegin',
    '<button type="button" class="cmdk-trigger" aria-label="Open navigation search">' +
      '<span>Jump to</span><kbd class="cmdk-trigger-keys">⌘K</kbd>' +
    '</button>');

  document.body.insertAdjacentHTML('beforeend',
    '<div class="cmdk-overlay" id="cmdk" aria-hidden="true">' +
      '<div class="cmdk" role="dialog" aria-modal="true" aria-label="Jump to a page">' +
        '<div class="cmdk-search">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
          '<div class="cmdk-field">' +
            '<div class="cmdk-ghost" aria-hidden="true"></div>' +
            '<input class="cmdk-input" type="text" placeholder="Where to?" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"' +
              ' role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="both">' +
          '</div>' +
          '<kbd class="cmdk-kbd">esc</kbd>' +
        '</div>' +
        '<ul class="cmdk-list" id="cmdk-list" role="listbox"></ul>' +
        '<div class="cmdk-empty" hidden>No matches</div>' +
        '<div class="cmdk-footer">' +
          '<span><kbd>↑↓</kbd>navigate</span>' +
          '<span><kbd>tab</kbd>autofill</span>' +
          '<span><kbd>↵</kbd>open</span>' +
          '<span><kbd>esc</kbd>close</span>' +
        '</div>' +
      '</div>' +
    '</div>');

  var overlay = document.getElementById('cmdk');
  var input = overlay.querySelector('.cmdk-input');
  var ghost = overlay.querySelector('.cmdk-ghost');
  var list = overlay.querySelector('.cmdk-list');
  var empty = overlay.querySelector('.cmdk-empty');
  var trigger = document.querySelector('.cmdk-trigger');
  var results = destinations;
  var active = 0;
  var lastFocus = null;

  if (!/Mac|iPhone|iPad/.test(navigator.platform)) {
    document.querySelector('.cmdk-trigger-keys').textContent = 'Ctrl K';
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function query() {
    return input.value.trim().toLowerCase();
  }

  function filter() {
    var q = query();
    if (!q) return destinations.slice();
    var prefix = [], contains = [];
    destinations.forEach(function (d) {
      var label = d.label.toLowerCase();
      if (label.indexOf(q) === 0) prefix.push(d);
      else if (label.indexOf(q) > -1) contains.push(d);
    });
    return prefix.concat(contains);
  }

  function completion() {
    var q = input.value;
    var item = results[active];
    if (!q || !item) return null;
    if (item.label.toLowerCase().indexOf(q.toLowerCase()) !== 0) return null;
    if (item.label.length === q.length) return null;
    return item;
  }

  function highlight(label) {
    var q = query();
    var i = q ? label.toLowerCase().indexOf(q) : -1;
    if (i < 0) return escapeHtml(label);
    return escapeHtml(label.slice(0, i)) +
      '<mark>' + escapeHtml(label.slice(i, i + q.length)) + '</mark>' +
      escapeHtml(label.slice(i + q.length));
  }

  function renderGhost() {
    var c = completion();
    ghost.innerHTML = c
      ? '<span class="cmdk-ghost-typed">' + escapeHtml(input.value) + '</span>' + escapeHtml(c.label.slice(input.value.length))
      : '';
  }

  function render() {
    list.innerHTML = results.map(function (d, i) {
      return '<li class="cmdk-item' + (i === active ? ' is-active' : '') + '" id="cmdk-opt-' + i +
        '" role="option" aria-selected="' + (i === active) + '" data-index="' + i + '">' +
        '<span>' + highlight(d.label) + '</span>' +
        '<span class="cmdk-item-hint">' + (i === active ? '↵' : escapeHtml(d.href)) + '</span></li>';
    }).join('');
    empty.hidden = results.length > 0;
    if (results.length) input.setAttribute('aria-activedescendant', 'cmdk-opt-' + active);
    else input.removeAttribute('aria-activedescendant');
    renderGhost();
  }

  function update() {
    results = filter();
    active = 0;
    render();
  }

  function setActive(i) {
    if (!results.length) return;
    active = (i + results.length) % results.length;
    render();
  }

  function accept() {
    var c = completion();
    if (!c) return false;
    input.value = c.label;
    update();
    return true;
  }

  function go(item) {
    if (!item) return;
    close();
    window.location.href = item.href;
  }

  function open() {
    if (overlay.classList.contains('is-open')) return;
    lastFocus = document.activeElement;
    input.value = '';
    update();
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    input.focus();
  }

  function close() {
    if (!overlay.classList.contains('is-open')) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      overlay.classList.contains('is-open') ? close() : open();
    }
  });

  input.addEventListener('input', update);

  input.addEventListener('keydown', function (e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive(active + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive(active - 1);
        break;
      case 'Tab':
        e.preventDefault();
        accept();
        break;
      case 'ArrowRight':
        if (input.selectionStart === input.value.length && accept()) e.preventDefault();
        break;
      case 'Enter':
        e.preventDefault();
        go(results[active]);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
    }
  });

  list.addEventListener('mousemove', function (e) {
    var li = e.target.closest('.cmdk-item');
    if (li && +li.dataset.index !== active) setActive(+li.dataset.index);
  });

  list.addEventListener('mousedown', function (e) {
    e.preventDefault();
    var li = e.target.closest('.cmdk-item');
    if (li) go(results[+li.dataset.index]);
  });

  overlay.addEventListener('mousedown', function (e) {
    if (e.target === overlay) close();
  });

  trigger.addEventListener('click', open);
})();
