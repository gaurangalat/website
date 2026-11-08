(function () {
  var filters = document.querySelector('.labs-filters');
  var list = document.querySelector('.labs-list');
  var empty = document.querySelector('.labs-empty');
  var chips = [];
  var labs = [];
  var labels = {};

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function renderProject(project) {
    var article = el('article', 'lab');
    var tags = project.tags || [];
    article.dataset.tags = tags.join(' ');
    article.appendChild(el('h2', 'lab-title', project.title));

    var body = el('div', 'lab-body');
    (project.body || []).forEach(function (paragraph) {
      body.appendChild(el('p', null, paragraph));
    });
    article.appendChild(body);

    if (tags.length) {
      var tagList = el('ul', 'lab-tags');
      tags.forEach(function (id) {
        var item = el('li');
        var button = el('button', 'lab-tag', labels[id] || id);
        button.type = 'button';
        button.dataset.filter = id;
        button.addEventListener('click', function () {
          apply(id);
        });
        item.appendChild(button);
        tagList.appendChild(item);
      });
      article.appendChild(tagList);
    }

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
      lab.hidden = !show;
      if (show) visible++;
    });

    empty.hidden = visible > 0;
  }

  fetch('/lab/projects.json?v=20261107b')
    .then(function (res) {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then(function (data) {
      (data.tags || []).forEach(function (tag) {
        labels[tag.id] = tag.label;
      });
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
