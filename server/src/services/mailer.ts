/**
 * Отправка писем через SMTP (nodemailer).
 *
 * По умолчанию настроено на SMTP Beget — тот же узел, что используется в рабочем
 * сервисе МойМомент. Все параметры берутся из .env, поэтому при необходимости
 * почтовый ящик меняется без правок кода.
 *
 * По заявке уходит ДВА письма:
 *   1) владельцу сайта — уведомление о новой заявке (+ AI-анализ);
 *   2) пользователю    — копия-подтверждение, что заявка принята.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config';
import { ownerEmail, userEmail, type LeadData } from './emailTemplates';
import type { LeadAnalysis } from './groq';

let transporter: Transporter | null = null;

/** Лениво создаём (и переиспользуем) один транспорт на всё приложение. */
function getTransporter(): Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure, // true для 465, false (+STARTTLS) для 587/25
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    // Не висим вечно, если SMTP недоступен.
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
  });

  return transporter;
}

const from = `"${config.mail.fromName}" <${config.mail.fromAddress}>`;

/**
 * Основной сценарий: отправить владельцу уведомление, а пользователю — копию.
 *
 * Письмо владельцу считаем критичным (если оно не ушло — операция провалилась).
 * Копию пользователю отправляем "best-effort": её неудача не должна валить
 * весь запрос, но мы вернём флаг, чтобы фронтенд при желании показал нюанс.
 */
export async function sendLeadEmails(
  lead: LeadData,
  analysis: LeadAnalysis | null,
): Promise<{ ownerSent: boolean; copySent: boolean }> {
  const tx = getTransporter();

  // 1. Письмо владельцу — ждём результат, ошибку пробрасываем наверх.
  const owner = ownerEmail(lead, analysis);
  await tx.sendMail({
    from,
    to: config.mail.ownerEmail,
    replyTo: `"${lead.name}" <${lead.email}>`, // "Ответить" сразу пишет заявителю
    subject: owner.subject,
    html: owner.html,
  });

  // 2. Копия пользователю — лучшее усилие, не роняем запрос при ошибке.
  let copySent = false;
  try {
    const user = userEmail(lead);
    await tx.sendMail({
      from,
      to: lead.email,
      subject: user.subject,
      html: user.html,
    });
    copySent = true;
  } catch (err) {
    console.error('[mailer] Не удалось отправить копию пользователю:', (err as Error).message);
  }

  return { ownerSent: true, copySent };
}

/**
 * Проверка соединения с SMTP при старте — чтобы в логах сразу было видно,
 * корректны ли учётные данные (без падения приложения).
 */
export async function verifyMailer(): Promise<boolean> {
  try {
    await getTransporter().verify();
    return true;
  } catch (err) {
    console.warn('[mailer] SMTP-проверка не пройдена:', (err as Error).message);
    return false;
  }
}
