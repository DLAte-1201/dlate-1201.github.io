(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  if (!menu || !nav) return;
  const narrow = window.matchMedia('(max-width: 700px)');
  const symbol = menu.querySelector('span');
  const header = document.querySelector('.site-header');
  const controls = document.querySelector('.header-controls');
  const measureHeader = () => document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
  const setOpen = (open, restoreFocus = false) => {
    nav.hidden = narrow.matches && !open;
    menu.setAttribute('aria-expanded', String(open));
    symbol.textContent = open ? '−' : '＋';
    if (restoreFocus && narrow.matches) menu.focus();
    measureHeader();
  };
  const sync = () => {
    const focusWasInNav = nav.contains(document.activeElement);
    const focusWasOnMenu = document.activeElement === menu;
    // Keep DOM and visual order aligned at both layouts, including Tab after Menu.
    if (narrow.matches) controls.after(nav);
    else controls.before(nav);
    menu.hidden = !narrow.matches;
    setOpen(false, narrow.matches && focusWasInNav);
    if (!narrow.matches && focusWasOnMenu) nav.querySelector('a[href]')?.focus();
  };
  menu.addEventListener('click', () => setOpen(menu.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && narrow.matches && menu.getAttribute('aria-expanded') === 'true') {
      setOpen(false, true);
    }
  });
  document.addEventListener('click', event => {
    if (narrow.matches && menu.getAttribute('aria-expanded') === 'true' &&
        !nav.contains(event.target) && !menu.contains(event.target)) {
      setOpen(false, nav.contains(document.activeElement));
    }
  });
  nav.addEventListener('click', event => {
    const anchor = event.target.closest('a');
    if (!anchor || !narrow.matches) return;
    setOpen(false);
    const href = anchor.getAttribute('href');
    if (href.startsWith('#')) {
      const target = document.getElementById(href.slice(1));
      if (target) {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    }
  });
  narrow.addEventListener('change', sync);
  sync();
  new ResizeObserver(measureHeader).observe(header);

  const tocLinks = [...document.querySelectorAll('.detail-nav a[href^="#"]')];
  const sections = tocLinks.map(link => document.getElementById(link.hash.slice(1)));
  if (!tocLinks.length) return;
  let queued = false;
  const updateSection = () => {
    queued = false;
    const threshold = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 2;
    let current = -1;
    sections.forEach((section, i) => { if (section.getBoundingClientRect().top <= threshold) current = i; });
    const last = sections.at(-1);
    if (last.getBoundingClientRect().bottom <= threshold) current = -1;
    tocLinks.forEach((link, i) => {
      if (i === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const scheduleSection = () => {
    if (!queued) { queued = true; requestAnimationFrame(updateSection); }
  };
  window.addEventListener('scroll', scheduleSection, { passive: true });
  window.addEventListener('resize', scheduleSection);
  window.addEventListener('hashchange', scheduleSection);
  updateSection();
})();

