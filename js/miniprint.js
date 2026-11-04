(function () {
  // Placeholder photos for testing. Replace this list with the prints to give away.
  var PRINTS = [
    {
      src: '/photo/photography/FredAgain.webp',
      alt: 'Fred again.. performing, photographed by Gaurang Alat',
      file: 'FredAgain.webp'
    },
    {
      src: '/photo/photography/PeggyGou.webp',
      alt: 'Peggy Gou performing, photographed by Gaurang Alat',
      file: 'PeggyGou.webp'
    },
    {
      src: '/photo/photography/Bonobo.webp',
      alt: 'Bonobo performing, photographed by Gaurang Alat',
      file: 'Bonobo.webp'
    },
    {
      src: '/photo/photography/Kettama.webp',
      alt: 'Kettama performing, photographed by Gaurang Alat',
      file: 'Kettama.webp'
    },
    {
      src: '/photo/photography/Skrillex1.webp',
      alt: 'Skrillex performing, photographed by Gaurang Alat',
      file: 'Skrillex1.webp'
    }
  ];

  var stack = document.getElementById('stack');
  var status = document.getElementById('vend-status');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.vend'));
  var dialog = document.getElementById('print-modal');
  var modalImg = document.getElementById('print-modal-img');
  var download = document.getElementById('print-download');
  var closeBtn = document.getElementById('print-close');
  var busy = false;
  var lastIndex = -1;
  var closing = false;

  var supportsDisplayTransition;
  function canTransitionDisplay() {
    if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
    if (!window.CSS || !CSS.supports || !CSS.supports('transition-behavior', 'allow-discrete') || !document.body) {
      return false;
    }
    var probe = document.createElement('div');
    probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
    document.body.appendChild(probe);
    getComputedStyle(probe).display;
    probe.style.display = 'none';
    supportsDisplayTransition = getComputedStyle(probe).display === 'block';
    probe.remove();
    return supportsDisplayTransition;
  }

  function supportsTopLayerExit() {
    return window.CSS && CSS.supports && CSS.supports('overlay', 'auto') && canTransitionDisplay();
  }

  function closeTopLayer(element) {
    if (!element.open || closing) return;
    if (!supportsTopLayerExit()) {
      closing = true;
      element.setAttribute('data-closing', '');
      var animations = element.getAnimations({ subtree: true });
      var wait = animations.length > 0
        ? Promise.race([
            Promise.allSettled(animations.map(function (a) { return a.finished; })),
            new Promise(function (resolve) { setTimeout(resolve, 2000); })
          ])
        : Promise.resolve();
      wait.then(function () {
        if (!element.hasAttribute('data-closing')) {
          closing = false;
          return;
        }
        element.removeAttribute('data-closing');
        element.close();
        closing = false;
      });
      return;
    }
    element.close();
  }

  function pick() {
    var index = Math.floor(Math.random() * PRINTS.length);
    if (PRINTS.length > 1 && index === lastIndex) {
      index = (index + 1) % PRINTS.length;
    }
    lastIndex = index;
    return PRINTS[index];
  }

  function setBusy(next) {
    busy = next;
    buttons.forEach(function (button) {
      if (next) button.setAttribute('aria-disabled', 'true');
      else button.removeAttribute('aria-disabled');
    });
  }

  function openPrint(print) {
    modalImg.src = print.src;
    modalImg.alt = print.alt;
    dialog.setAttribute('aria-label', print.alt);
    download.href = print.src;
    download.setAttribute('download', print.file);
    if (typeof dialog.showModal !== 'function') {
      window.location.href = print.src;
      return;
    }
    if (!dialog.open) {
      dialog.removeAttribute('data-closing');
      dialog.showModal();
    }
  }

  function dispense() {
    if (busy) return;
    setBusy(true);

    var print = pick();
    var sheet = document.createElement('div');
    sheet.className = 'sheet';
    var clip = document.createElement('div');
    clip.className = 'sheet-clip';
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'print';
    card.setAttribute('aria-label', 'View and download. ' + print.alt);
    var img = document.createElement('img');
    img.src = print.src;
    img.alt = '';
    img.width = 630;
    img.height = 840;
    img.decoding = 'async';
    card.appendChild(img);
    clip.appendChild(card);
    sheet.appendChild(clip);
    stack.insertBefore(sheet, stack.firstChild);
    sheet.getBoundingClientRect();
    sheet.classList.add('is-out');
    status.textContent = 'A surprise print came out. Activate it to view and download.';

    card.addEventListener('click', function () {
      openPrint(print);
    });

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      while (stack.children.length > 4) {
        stack.removeChild(stack.lastElementChild);
      }
      setBusy(false);
    }

    if (reduce) {
      finish();
    } else {
      card.addEventListener('transitionend', function (event) {
        if (event.target === card && event.propertyName === 'translate') finish();
      });
      setTimeout(finish, 2600);
    }
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', dispense);
  });

  closeBtn.addEventListener('click', function () {
    closeTopLayer(dialog);
  });

  dialog.addEventListener('cancel', function (event) {
    event.preventDefault();
    closeTopLayer(dialog);
  });

  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var rect = dialog.getBoundingClientRect();
      var isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (isDialogContent) return;
      closeTopLayer(dialog);
    });
  }
})();
