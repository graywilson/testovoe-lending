/**
 * Контент сайта, вынесенный в данные.
 *
 * Секции «Стек» и «Проекты» рендерятся из этих массивов (см. modules/render.ts).
 * Так разметка отделена от содержимого: добавить проект или технологию можно
 * правкой одного файла, не трогая HTML.
 */

export interface StackCategory {
  title: string;
  items: string[];
}

export const stack: StackCategory[] = [
  {
    title: 'Языки',
    items: ['TypeScript / JavaScript', 'C#', 'Python', 'C++', 'SQL'],
  },
  {
    title: 'Frontend',
    items: ['HTML, SCSS / CSS', 'Адаптивная вёрстка', 'Vite', 'REST API, fetch, async/await'],
  },
  {
    title: 'Backend',
    items: ['Node.js / Express', 'ASP.NET Core (MVC + Web API)', 'REST API', 'SignalR (realtime)'],
  },
  {
    title: 'Базы данных',
    items: ['PostgreSQL', 'MS SQL Server', 'MongoDB', 'Redis, Neo4j'],
  },
  {
    title: 'DevOps / инструменты',
    items: ['Docker', 'Git (branches, merge/rebase)', 'Linux', 'Тестирование, документация'],
  },
  {
    title: 'AI-инструменты',
    items: ['OpenAI / Groq / Claude API', 'Prompt engineering', 'Tool calling', 'AI прямо в IDE'],
  },
];

export interface Project {
  name: string;
  type: string;
  featured?: boolean;
  badge?: string;
  description: string;
  /** Что делал лично — главный акцент в кейсах. */
  contributions: string[];
  stack: string[];
  url?: string;
}

export const projects: Project[] = [
  {
    name: 'МойМомент',
    type: 'Главный проект · соцсеть + ML',
    featured: true,
    badge: 'Главный проект',
    url: 'https://moimoment.ru',
    description:
      'Социальная сеть для обмена «моментами» с друзьями: быстрая публикация личных фото ' +
      'и рекомендации контента. Под капотом — нейросети, которые анализируют и размечают ' +
      'контент для умной ленты. Вырос из научно-исследовательской работы (144 страницы).',
    contributions: [
      'Архитектура и backend сервиса',
      'Интеграция нейросетей: анализ и маркировка контента',
      'Рекомендательная лента и онлайн-функции (SignalR)',
      'Публикация Android-приложения (Google Play, RuStore)',
    ],
    stack: ['ASP.NET Core', 'SignalR', 'ML / нейросети', 'PostgreSQL', 'Android'],
  },
  {
    name: 'Anonim.Space',
    type: 'Продукт · realtime-чат',
    url: 'https://anonim.space',
    description:
      'Анонимный чат один-на-один: подбор собеседника по полу и возрасту, без сохранения ' +
      'истории переписки. Есть модерация, жалобы, мобильные приложения и интеграция с Telegram.',
    contributions: [
      'Realtime-бэкенд и логика подбора собеседников',
      'Система модерации и обработки жалоб',
      'Анонимность без хранения истории',
      'Мобильные клиенты + Telegram-интеграция',
    ],
    stack: ['Backend', 'WebSocket', 'Android', 'Telegram'],
  },
  {
    name: 'Litra.Su',
    type: 'Продукт · веб',
    url: 'https://litra.su',
    description:
      'Цифровая библиотека русской классики: около 25 000 стихотворений, 59 авторов, ' +
      'удобный поиск, биографии и цитаты. Делает культурное наследие доступным онлайн.',
    contributions: [
      'Full-stack разработка сайта',
      'Каталог и быстрый поиск по произведениям',
      'Страницы авторов с биографиями',
      'SEO и наполнение контентом',
    ],
    stack: ['Full-stack', 'Поиск', 'SEO'],
  },
  {
    name: 'Сервис аренды жилья',
    type: 'Коммерческий проект · 1+ год',
    description:
      'Платформа аренды домов и коттеджей для туристов. Отвечал за развитие, оптимизацию ' +
      'и миграцию на современный стек — с измеримым результатом по скорости.',
    contributions: [
      'Миграция ASP.NET MVC → ASP.NET Core',
      'Ускорил загрузку: 1–2 c → 200–800 мс',
      'Локализация интерфейса (финский, шведский)',
      'Оплата в евро + корректные фискальные чеки (Робокасса)',
      'Админ-панель управления заказами с нуля',
    ],
    stack: ['ASP.NET Core', 'Робокасса', 'Локализация', 'Оптимизация'],
  },
  {
    name: '13 приложений в Google Play',
    type: 'Pet-проекты · геймдев',
    description:
      'Опубликованные игры и приложения на Unity3D. От идеи и кода до 3D-моделей ' +
      'и онлайн-функций, и до публикации в сторе.',
    contributions: [
      'Разработка игр на Unity3D (C#)',
      '3D-модели в Blender',
      'Онлайн-функции через SignalR',
      'Публикация и поддержка в Google Play',
    ],
    stack: ['Unity3D', 'C#', 'Blender', 'SignalR'],
  },
  {
    name: 'Этот сайт-портфолио',
    type: 'Demo · полный цикл',
    description:
      'Лендинг, который вы сейчас смотрите. Сделан как демонстрация полного цикла: ' +
      'фронтенд → API → обработка ошибок → результат, плюс живые AI-функции.',
    contributions: [
      'Frontend: Vite + TypeScript + SCSS, адаптив',
      'API на Node.js/Express: валидация, отправка писем',
      'AI на Groq: улучшение текста, анализ заявок, чат',
      'Docker — запуск одной командой',
    ],
    stack: ['Vite', 'TypeScript', 'Node.js', 'Groq AI', 'Docker'],
  },
];

/** Готовые вопросы для AI-ассистента (чипы-подсказки). */
export const assistantSuggestions: string[] = [
  'Какой у Вадима стек?',
  'Опыт с AI и интеграциями?',
  'Расскажи про главный проект',
  'Подходит под fullstack-вакансию?',
];
