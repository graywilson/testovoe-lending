import { qs } from './dom';

/**
 * Поведение шапки и навигации:
 *  - фон/обводка при скролле;
 *  - бургер-меню на мобильных (открытие/закрытие, Esc, клик по ссылке);
 *  - подсветка активного пункта по секции в зоне видимости.
 */
export function initNav(): void {
  const header = qs<HTMLElement>('#siteHeader');
  const toggle = qs<HTMLButtonElement>('#navToggle');
  const nav = qs<HTMLElement>('#primaryNav');
  if (!header || !toggle || !nav) return;

  // 1. Фон шапки при прокрутке.
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // 2. Мобильное меню.
  const closeMenu = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // 3. Активная ссылка по текущей секции.
  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('.nav__link'));
  const linkById = new Map<string, HTMLAnchorElement>();
  for (const link of links) {
    const id = link.getAttribute('href')?.slice(1);
    if (id) linkById.set(id, link);
  }

  const sections = [...linkById.keys()]
    .map((id) => document.getElementById(id))
    .filter((node): node is HTMLElement => node !== null);

  if (!('IntersectionObserver' in window) || sections.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((l) => l.classList.remove('is-active'));
        linkById.get(entry.target.id)?.classList.add('is-active');
      }
    },
    // Активной считаем секцию примерно в середине вьюпорта.
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
  );
  sections.forEach((section) => observer.observe(section));
}
