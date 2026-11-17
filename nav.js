// Mobile menu: the toggle is hidden by CSS on wide screens, where the nav is always visible.
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('#site-nav');
if (navToggle && siteNav) {
  const setOpen = (open) => {
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.textContent = open ? 'close' : 'menu';
    siteNav.classList.toggle('open', open);
  };
  navToggle.addEventListener('click', () => setOpen(navToggle.getAttribute('aria-expanded') !== 'true'));
  siteNav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && siteNav.classList.contains('open')) { setOpen(false); navToggle.focus(); }
  });
}
