/**
 * Рендер секций, построенных из данных (modules/data/content.ts):
 *  - сетка стека;
 *  - карточки проектов.
 * Разметку собираем через безопасный помощник el() (без innerHTML).
 */
import { stack, projects, type Project } from '../data/content';
import { el } from './dom';

/** Сетка категорий стека. */
export function renderStack(): void {
  const grid = document.getElementById('stackGrid');
  if (!grid) return;

  for (const category of stack) {
    const list = el(
      'ul',
      { class: 'stack-card__list' },
      category.items.map((item) => el('li', {}, [item])),
    );
    const card = el('article', { class: 'stack-card reveal' }, [
      el('h4', { class: 'stack-card__title' }, [category.title]),
      list,
    ]);
    grid.append(card);
  }
}

/** Одна карточка проекта. */
function projectCard(project: Project): HTMLElement {
  // Шапка: бейдж (если есть) + тип проекта.
  const head = el('div', { class: 'project-card__head' }, [
    project.badge
      ? el('span', { class: 'project-card__badge' }, [project.badge])
      : el('span', { class: 'project-card__type' }, [project.type]),
    project.badge ? el('span', { class: 'project-card__type' }, [project.type]) : null,
  ]);

  // «Что делал лично».
  const role = el(
    'ul',
    { class: 'project-card__role' },
    project.contributions.map((c) => el('li', {}, [c])),
  );

  // Технологии.
  const stackList = el(
    'ul',
    { class: 'project-card__stack' },
    project.stack.map((tech) => el('li', {}, [tech])),
  );

  // Ссылка на проект (если публичный).
  const link = project.url
    ? el(
        'a',
        {
          class: 'project-card__link',
          href: project.url,
          target: '_blank',
          rel: 'noopener',
        },
        [`${hostname(project.url)} ↗`],
      )
    : null;

  const foot = el('div', { class: 'project-card__foot' }, [stackList, link]);

  const classes = `project-card reveal${project.featured ? ' project-card--featured' : ''}`;
  return el('article', { class: classes }, [
    head,
    el('h3', { class: 'project-card__title' }, [project.name]),
    el('p', { class: 'project-card__desc' }, [project.description]),
    role,
    foot,
  ]);
}

/** Сетка проектов. */
export function renderProjects(): void {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;
  for (const project of projects) {
    grid.append(projectCard(project));
  }
}

/** Достаём домен из URL для подписи ссылки. */
function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
