(() => {
  // aria-disabled links stay discoverable, but cannot navigate or invoke handlers.
  document.addEventListener('click', event => {
    if (event.target?.closest?.('a[aria-disabled="true"], button[aria-disabled="true"]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  if (!menu || !nav) return;
  const narrow = window.matchMedia('(max-width: 700px)');
  const symbol = menu.querySelector('span');
  const header = document.querySelector('.site-header');
  const controls = document.querySelector('.header-controls');
  const mobileNav = document.querySelector('.mobile-tabs');
  let focusedMobileLink = null;
  mobileNav?.addEventListener('focusin', event => {
    focusedMobileLink = event.target.closest('a[href]');
  });
  mobileNav?.addEventListener('focusout', () => {
    // A breakpoint may hide the focused link before the media-query handler runs.
    if (narrow.matches) focusedMobileLink = null;
  });
  const measureHeader = () => {
    document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
    document.documentElement.classList.add('header-ready');
  };
  const setOpen = (open, restoreFocus = false) => {
    nav.hidden = narrow.matches && !open;
    menu.setAttribute('aria-expanded', String(open));
    symbol.textContent = open ? '−' : '＋';
    if (restoreFocus && narrow.matches) menu.focus();
    measureHeader();
  };
  const sync = () => {
    document.documentElement.dataset.archetype = narrow.matches ? 'mobile' : 'web';
    const active = document.activeElement;
    const bottomLink = mobileNav?.contains(active) ? active.closest('a[href]') :
      (!narrow.matches && active === document.body ? focusedMobileLink : null);
    const focusedNavElement = nav.contains(document.activeElement) ? document.activeElement : null;
    const focusWasOnMenu = document.activeElement === menu;
    // Keep DOM and visual order aligned at both layouts, including Tab after Menu.
    if (narrow.matches) controls.after(nav);
    else controls.before(nav);
    menu.hidden = !narrow.matches;
    setOpen(false, narrow.matches && !!focusedNavElement);
    if (!narrow.matches) {
      const destination = bottomLink?.getAttribute('href');
      const matchingLink = destination && [...nav.querySelectorAll('a[href]')].find(link =>
        new URL(link.getAttribute('href'), location.href).href === new URL(destination, location.href).href);
      const target = focusedNavElement || (focusWasOnMenu ? nav.querySelector('a[href]') : null) ||
        matchingLink || (bottomLink ? nav.querySelector('a[href]') : null);
      target?.focus({ preventScroll: true });
      focusedMobileLink = null;
    }
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

  if (mobileNav) {
    const links = [...mobileNav.querySelectorAll('a[href]')];
    const updateMobileLocation = () => {
      const matching = location.hash && links.find(link => {
        const url = new URL(link.getAttribute('href'), location.href);
        return url.pathname === location.pathname && url.hash === location.hash;
      });
      const selected = matching || links.find(link => link.dataset.mobilePage === 'true');
      links.forEach(link => {
        if (link === selected) link.setAttribute('aria-current', matching ? 'location' : 'page');
        else link.removeAttribute('aria-current');
      });
    };
    mobileNav.addEventListener('click', event => {
      const anchor = event.target.closest('a[href^="#"]');
      const target = anchor && document.getElementById(anchor.getAttribute('href').slice(1));
      if (target) { target.setAttribute('tabindex', '-1'); target.focus({preventScroll:true}); }
    });
    window.addEventListener('hashchange', updateMobileLocation);
    updateMobileLocation();
  }

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

