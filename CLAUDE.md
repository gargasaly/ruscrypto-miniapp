@AGENTS.md

# ruscrypto-miniapp

Telegram Mini App (WebApp) для криптовалютной аудитории: портфель, чек-листы токенов, риск-календарь, статус рынка, бонусы и подписки через Telegram Stars.

## Стек

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4
- Supabase (БД, см. `supabase/`)
- Интеграция с Telegram (Bot API, авторизация по initData, Stars-платежи)
- Внешние данные о рынке: CoinGecko, CryptoRank, FRED, BLS

## Структура папок

- `src/app` — страницы (App Router) и API-роуты (`src/app/api/*`)
- `src/components` — UI-компоненты
- `src/hooks` — React-хуки
- `src/lib` — бизнес-логика и интеграции
- `src/content` — контент (например, портфельные материалы)
- `supabase` — схема/миграции БД
- `specs`, `docs` — спецификации и документация

## Ключевые модули в `src/lib`

- `lib/supabase` — клиент и доступ к Supabase
- `lib/telegram`, `telegramLinks.ts` — интеграция с Telegram (initData, ссылки)
- `lib/payments` — оплата через Telegram Stars
- `lib/portfolio` — логика портфеля пользователя
- `lib/checklist`, `tokenChecklist.ts`, `checklistAccess.ts` — чек-листы токенов и доступ к ним
- `lib/homeLive` — live-данные главного экрана
- `lib/analytics` — аналитика/метрики
- `lib/market.ts`, `marketStatus.ts`, `coingecko.ts` — рыночные данные и статус
- `lib/btcLevel.ts`, `riskCalendar.ts`, `unlocks.ts` — индикаторы риска и анлоков
- `lib/glossary.ts`, `tokenMetadata.ts`, `formatters.ts`, `content.ts` — справочные данные и форматирование

## Правила работы

- Все изменения вносить через отдельные ветки и Pull Request.
- **Запрещено пушить напрямую в `main`.**
