/**
 * Единая точка чтения конфигурации из переменных окружения.
 *
 * Все секреты (SMTP-пароль, ключ Groq) живут только на сервере и в .env —
 * на фронтенд они никогда не попадают. Здесь же задаём разумные значения
 * по умолчанию, чтобы проект поднимался "из коробки" в Docker.
 */
import path from 'node:path';
import dotenv from 'dotenv';

// Грузим .env. Поддерживаем оба сценария запуска:
//  - из корня репозитория (npm run dev) -> ./.env
//  - из папки server/ -> ../.env
// В проде переменные приходят из docker-compose (env_file), и dotenv
// просто не перезаписывает уже заданные значения.
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

/** Утилита: вернуть переменную окружения или значение по умолчанию. */
function env(name: string, fallback = ''): string {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

/** Утилита: распарсить булеву переменную окружения ("true"/"1"/"yes"). */
function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export const config = {
  /** Порт приложения. По умолчанию 41321 — тот, на котором поднимаем контейнер. */
  port: Number(env('PORT', '41321')),
  nodeEnv: env('NODE_ENV', 'development'),
  isProd: env('NODE_ENV', 'development') === 'production',

  /** Куда сервер отдаёт собранный фронтенд (в проде). Может не существовать в dev. */
  staticDir: env('STATIC_DIR', ''),

  /** Настройки SMTP (по умолчанию — Beget, как в рабочем сервисе МойМомент). */
  smtp: {
    host: env('SMTP_HOST', 'smtp.beget.com'),
    // 465 = SSL (рекомендуемый Beget), 587/25 = STARTTLS. Меняется через .env.
    port: Number(env('SMTP_PORT', '465')),
    secure: envBool('SMTP_SECURE', true),
    user: env('SMTP_USER', 'info@mailmoment.ru'),
    pass: env('SMTP_PASS', ''),
  },

  /** От кого уходят письма и кому падает копия-уведомление (владельцу сайта). */
  mail: {
    fromName: env('MAIL_FROM_NAME', 'Вадим Искаков · Портфолио'),
    fromAddress: env('MAIL_FROM_ADDRESS', 'info@mailmoment.ru'),
    ownerEmail: env('OWNER_EMAIL', 'graywilsonwise@gmail.com'),
  },

  /** Groq — OpenAI-совместимый API. Ключ только серверный. */
  groq: {
    apiKey: env('GROQ_API_KEY', ''),
    baseUrl: env('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
    model: env('GROQ_MODEL', 'openai/gpt-oss-120b'),
  },

  /** Разрешённый источник для CORS в dev-режиме (Vite dev-server). */
  corsOrigin: env('CORS_ORIGIN', 'http://localhost:5173'),
};

/** Удобный флаг: включены ли AI-функции (есть ли ключ). */
export const aiEnabled = Boolean(config.groq.apiKey);
