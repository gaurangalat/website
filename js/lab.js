(function () {
  var filters = document.querySelector('.labs-filters');
  var list = document.querySelector('.labs-list');
  var count = document.querySelector('.labs-count');
  var empty = document.querySelector('.labs-empty');
  var chips = [];
  var labs = [];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function isVideo(src) {
    return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src);
  }

  function renderMedia(media) {
    var figure = el('figure', 'lab-media');
    var node;
    if (isVideo(media.src)) {
      node = el('video');
      node.muted = true;
      node.autoplay = true;
      node.loop = true;
      node.playsInline = true;
      node.controls = true;
      node.preload = 'metadata';
      if (media.poster) node.poster = media.poster;
      if (media.alt) node.setAttribute('aria-label', media.alt);
    } else {
      node = el('img');
      node.alt = media.alt || '';
      node.loading = 'lazy';
    }
    node.src = media.src;
    figure.appendChild(node);
    return figure;
  }

  function renderProject(project) {
    var article = el('article', 'lab');
    article.dataset.tags = (project.tags || []).join(' ');
    if (project.media && project.media.src) article.appendChild(renderMedia(project.media));
    article.appendChild(el('h1', 'lab-title', project.title));
    var body = el('div', 'lab-body');
    (project.body || []).forEach(function (paragraph) {
      body.appendChild(el('p', null, paragraph));
    });
    article.appendChild(body);
    return article;
  }

  function renderChip(id, label) {
    var chip = el('button', 'labs-chip', label);
    chip.type = 'button';
    chip.dataset.filter = id;
    chip.addEventListener('click', function () {
      var isActive = chip.getAttribute('aria-pressed') === 'true';
      apply(isActive && id !== 'all' ? 'all' : id);
    });
    filters.appendChild(chip);
    return chip;
  }

  function apply(filter) {
    var visible = 0;

    chips.forEach(function (chip) {
      chip.setAttribute('aria-pressed', String(chip.dataset.filter === filter));
    });

    labs.forEach(function (lab) {
      var tags = lab.dataset.tags.split(' ');
      var show = filter === 'all' || tags.indexOf(filter) > -1;
      var video = lab.querySelector('video');
      lab.hidden = !show;
      if (show) visible++;
      if (video && !show) video.pause();
      else if (video && video.autoplay) video.play().catch(function () {});
    });

    count.textContent = visible + (visible === 1 ? ' experiment' : ' experiments');
    empty.hidden = visible > 0;
  }

  fetch('/lab/projects.json')
    .then(function (res) {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then(function (data) {
      chips.push(renderChip('all', 'All'));
      (data.tags || []).forEach(function (tag) {
        chips.push(renderChip(tag.id, tag.label));
      });
      (data.projects || []).forEach(function (project) {
        var article = renderProject(project);
        list.insertBefore(article, empty);
        labs.push(article);
      });
      apply('all');
    })
    .catch(function () {
      empty.textContent = 'Projects could not be loaded.';
      empty.hidden = false;
    });
})();
