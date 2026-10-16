(function () {
  var bio = document.querySelector('.bio');
  if (!bio) return;

  var COMPANIES = {
    rakuten: {
      name: 'Rakuten',
      meta: '2023 – Present',
      body: 'Rakuten is a free online shopping and rewards platform that lets you earn a percentage of your money back when you shop at thousands of partner stores'
    },
    thumbtack: {
      name: 'Thumbtack',
      meta: '2021 – 2023',
      body: 'An online marketplace and technology company that connects homeowners with local service professionals.'
    },
    victoriassecret: {
      name: "Victoria's Secret",
      meta: '2019 – 2021',
      body: 'American retailer specializing in women’s lingerie, sleepwear, beauty products, and fragrances.'
    }
  };

  var EDGE = 16;
  var GAP = 32;

  var card = document.createElement('div');
  card.className = 'peek';
  card.id = 'company-peek';
  card.setAttribute('role', 'tooltip');
  card.innerHTML =
    '<div class="peek-head"><span class="peek-dot"></span><span class="peek-name"></span><span class="peek-meta"></span></div>' +
    '<p class="peek-body"></p>';
  document.body.appendChild(card);

  var nameEl = card.querySelector('.peek-name');
  var metaEl = card.querySelector('.peek-meta');
  var bodyEl = card.querySelector('.peek-body');
  var current = null;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function place(link) {
    var r = link.getBoundingClientRect();
    var b = bio.getBoundingClientRect();
    var w = card.offsetWidth;
    var h = card.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var x, y, side;

    if (b.right + GAP + w <= vw - EDGE) {
      side = 'right';
      x = b.right + GAP;
    } else if (b.left - GAP - w >= EDGE) {
      side = 'left';
      x = b.left - GAP - w;
    }

    if (side) {
      y = clamp(r.top + r.height / 2 - h / 2, EDGE, vh - h - EDGE);
    } else {
      x = clamp(r.left, EDGE, vw - w - EDGE);
      side = r.top - h - 12 >= EDGE ? 'above' : 'below';
      y = side === 'above' ? r.top - h - 12 : r.bottom + 12;
    }

    card.dataset.side = side;
    card.style.left = Math.round(x) + 'px';
    card.style.top = Math.round(y) + 'px';
  }

  function show(link) {
    var data = COMPANIES[link.dataset.company];
    if (!data) return;

    nameEl.textContent = data.name;
    metaEl.textContent = data.meta;
    bodyEl.textContent = data.body;
    card.style.setProperty('--peek-accent', getComputedStyle(link).color);

    if (current) current.removeAttribute('aria-describedby');
    link.setAttribute('aria-describedby', card.id);

    if (!card.classList.contains('is-open')) {
      card.style.transition = 'none';
      place(link);
      card.offsetWidth;
      card.style.transition = '';
      card.classList.add('is-open');
    } else {
      place(link);
    }
    current = link;
  }

  function hide() {
    if (current) current.removeAttribute('aria-describedby');
    current = null;
    card.classList.remove('is-open');
  }

  function companyLink(target) {
    return target && target.closest ? target.closest('a[data-company]') : null;
  }

  bio.addEventListener('mouseover', function (e) {
    var link = companyLink(e.target);
    if (link && link !== current) show(link);
  });

  bio.addEventListener('mouseout', function (e) {
    var link = companyLink(e.target);
    if (link && !link.contains(e.relatedTarget)) hide();
  });

  bio.addEventListener('focusin', function (e) {
    var link = companyLink(e.target);
    if (link) show(link);
  });

  bio.addEventListener('focusout', function (e) {
    if (companyLink(e.target)) hide();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current) hide();
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.bio-zoom-btn')) hide();
  });

  window.addEventListener('scroll', function () {
    if (current) place(current);
  }, { passive: true });

  window.addEventListener('resize', function () {
    if (current) place(current);
  });
})();
