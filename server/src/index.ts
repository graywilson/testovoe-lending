/**
 * Точка входа бэкенда.
 *
 * В проде один и тот же процесс:
 *   - отдаёт собранный фронтенд (статику из client/dist);
 *   - обслуживает API формы и AI-функции по префиксу /api.
 * Это удобно для деплоя: один контейнер, один порт (41321).
 */
import path from 'node:path';
import fs from 'node:fs';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { config, aiEnabled } from './config';
import { contactRouter } from './routes/contact';
import { aiRouter } from './routes/ai';
import { verifyMailer } from './services/mailer';

const app = express();

// За reverse-proxy (nginx и т.п.) корректно вычисляем IP клиента для rate-limit.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// В dev фронт живёт на отдельном порту Vite — разрешаем ему ходить к API.
// В prod фронт и API на одном origin, CORS фактически не нужен.
app.use(cors({ origin: config.isProd ? false : config.corsOrigin }));
// Лимит с запасом: история чата может содержать кириллицу (2 байта/символ).
app.use(express.json({ limit: '256kb' }));

// --- Ограничители частоты запросов (защита публичных эндпоинтов) ---
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // не более 20 заявок с одного IP за 15 минут
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, message: 'Слишком много заявок. Попробуйте позже.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30, // AI-эндпоинты платные — бережём ключ от перебора
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, message: 'Слишком много запросов к AI. Подождите минуту.' },
});

// --- API ---
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, aiEnabled, time: new Date().toISOString() });
});
app.use('/api/contact', contactLimiter, contactRouter);
app.use('/api/ai', aiLimiter, aiRouter);

// Неизвестный /api/* — честная 404 в JSON (а не отдача index.html).
app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, message: 'Метод API не найден.' });
});

// --- Статика собранного фронтенда (если есть) ---
const staticDir = resolveStaticDir();
if (staticDir) {
  console.log(`[server] Отдаю статику фронтенда из: ${staticDir}`);
  app.use(express.static(staticDir));
  // SPA-fallback: любой не-API GET отдаёт index.html.
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
} else {
  // Dev-режим: фронт поднимает Vite, бэкенд отвечает только за API.
  app.get('/', (_req, res) => {
    res.json({ ok: true, message: 'API работает. Фронтенд в dev-режиме — на Vite (порт 5173).' });
  });
}

// --- Единый обработчик ошибок ---
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('[server] Необработанная ошибка:', err);
  // Тело распарсилось с ошибкой (битый JSON) — это 400, а не 500.
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ ok: false, message: 'Некорректный формат запроса.' });
    return;
  }
  res.status(500).json({
    ok: false,
    message: 'На сервере произошла ошибка. Письмо могло не отправиться — попробуйте ещё раз.',
  });
};
app.use(errorHandler);

/**
 * Ищем папку с собранным фронтендом среди вероятных мест:
 *   1) явный путь из переменной STATIC_DIR;
 *   2) ../public — так кладёт Docker-образ;
 *   3) ../../client/dist — локальная сборка без Docker.
 * Возвращаем первый существующий путь или null (dev-режим).
 */
function resolveStaticDir(): string | null {
  const candidates = [
    config.staticDir,
    path.join(__dirname, '../public'),
    path.join(__dirname, '../../client/dist'),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return null;
}

app.listen(config.port, () => {
  console.log(`\n  ▸ Сервер запущен:    http://localhost:${config.port}`);
  console.log(`  ▸ Режим:             ${config.nodeEnv}`);
  console.log(`  ▸ AI (Groq):         ${aiEnabled ? `включён (${config.groq.model})` : 'выключен (нет GROQ_API_KEY)'}`);
  console.log(`  ▸ Письма владельцу:  ${config.mail.ownerEmail}\n`);

  // Фоновая проверка SMTP — просто диагностика в логах, не блокирует старт.
  void verifyMailer().then((ok) => {
    console.log(`  ▸ SMTP (${config.smtp.host}:${config.smtp.port}): ${ok ? 'соединение ОК' : 'не удалось проверить'}\n`);
  });
});
