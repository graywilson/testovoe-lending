/**
 * Плавное появление элементов с классом .reveal при попадании в зону видимости.
 * Уважает настройку «уменьшить движение»: тогда всё показываем сразу.
 */
export function initReveal(): void {
  const items = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
  if (items.length === 0) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target); // анимируем один раз
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );

  items.forEach((item) => observer.observe(item));
}
