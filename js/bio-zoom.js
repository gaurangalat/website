(function () {
  var bio = document.querySelector('.bio');
  if (!bio) return;

  var levels = Array.prototype.slice.call(bio.querySelectorAll('.bio-level'));
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.bio-zoom-btn'));
  var max = levels.length - 1;
  var level = 0;
  var EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function settle() {
    bio.getAnimations().forEach(function (a) { a.cancel(); });
    levels.forEach(function (el, i) {
      el.getAnimations().forEach(function (a) { a.cancel(); });
      el.classList.remove('is-leaving');
      el.classList.toggle('is-active', i === level);
      el.hidden = i !== level;
    });
  }

  function updateButtons() {
    buttons.forEach(function (btn) {
      var next = level + Number(btn.dataset.dir);
      btn.disabled = next < 0 || next > max;
    });
  }

  function setLevel(next) {
    next = Math.max(0, Math.min(max, next));
    if (next === level) return;

    settle();
    var from = levels[level];
    var to = levels[next];
    var zoomingIn = next > level;
    level = next;
    from.classList.remove('is-active');
    to.classList.add('is-active');
    updateButtons();

    if (reduceMotion.matches || !bio.animate) {
      settle();
      return;
    }

    var h0 = bio.offsetHeight;
    from.classList.add('is-leaving');
    to.hidden = false;
    var h1 = bio.offsetHeight;

    var grow = 'scale(1.06)';
    var shrink = 'scale(0.95)';
    var rest = { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' };

    bio.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 520, easing: EASE });

    from.animate(
      [rest, { opacity: 0, transform: zoomingIn ? grow : shrink, filter: 'blur(6px)' }],
      { duration: 260, easing: 'ease-in', fill: 'forwards' }
    );

    to.animate(
      [{ opacity: 0, transform: zoomingIn ? shrink : grow, filter: 'blur(6px)' }, rest],
      { duration: 520, delay: 120, easing: EASE, fill: 'backwards' }
    ).onfinish = settle;
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setLevel(level + Number(btn.dataset.dir));
    });
  });

  settle();
  updateButtons();
})();
