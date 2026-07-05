# Технический паспорт Telegram Mini App "Крипта для новичков"

Дата инвентаризации: 2026-07-05

Проект: `C:\Vahtang\ruscrypto-miniapp`

Проверка выполнена read-only по репозиторию. До создания этого документа код приложения не изменялся. Этот файл является сводкой для переноса контекста в новый чат.

## 1. Общий скелет приложения

Что реализовано:

- Next.js `16.2.6`, React `19.2.4`, TypeScript, Tailwind CSS 4.
- Используется Next.js App Router.
- Основной shell Mini App находится в `src/app/layout.tsx`.
- API routes находятся в `src/app/api/**/route.ts`.
- UI-компоненты находятся в `src/components`.
- Бизнес-логика, данные и интеграции находятся в `src/lib`.
- Отдельной папки `src/data` нет.
- Публичные token-иконки находятся в `public/tokens`.

Где находится:

- `C:\Vahtang\ruscrypto-miniapp\package.json`
- `C:\Vahtang\ruscrypto-miniapp\src\app`
- `C:\Vahtang\ruscrypto-miniapp\src\components`
- `C:\Vahtang\ruscrypto-miniapp\src\lib`
- `C:\Vahtang\ruscrypto-miniapp\public\tokens`

Ключевые файлы:

- `src/app/layout.tsx` - app shell, Telegram SDK, analytics, bottom navigation.
- `src/lib/content.ts` - navigation, guides, token list, watchlist, more items, old portfolio profiles.
- `src/lib/portfolio/diaryModel.ts` - новая модель портфеля до 2028.
- `src/lib/btcLevel.ts` - типы btc-level-v2.
- `src/lib/tokenChecklist.ts` - scoring чеклиста.
- `src/lib/unlocks.ts` - Tokenomist/CoinGlass/CryptoRank unlock logic.
- `src/lib/supabase/server.ts` - Supabase REST client.

Что важно не сломать:

- App Router route-файлы.
- `src/lib/content.ts`, потому что он одновременно питает navigation, guides, tokens, watchlist, more.
- `src/app/api/btc-level/route.ts` и `src/app/api/home-live/route.ts`, так как от них зависит главный экран.
- Stars webhook и Supabase helper-логику.

## 2. Навигация и страницы

Основные страницы:

| Route | Компонент | Что показывает |
| --- | --- | --- |
| `/` | `src/components/home-screen.tsx` | Главная: BTC, действие, риск, уровни |
| `/guides` | `src/components/guide-browser.tsx` | Гайды по категориям |
| `/token-checklist` | `src/components/token-checklist.tsx` | Чеклист токенов |
| `/portfolio` | `src/components/portfolio-calculator.tsx` | Портфель, подготовленный отчёт, дневник |
| `/portfolio/prepared` | `src/components/prepared-portfolio-report.tsx` | Полный подготовленный отчёт |
| `/portfolio/diary` | `src/components/portfolio-diary.tsx` | Портфельный дневник |
| `/more` | `src/app/more/page.tsx` | Ещё: календарь, словарь, бонусы, карта |
| `/risk-calendar` | `src/components/risk-calendar-browser.tsx` | Календарь рисков |
| `/glossary` | `src/components/glossary-browser.tsx` | Словарь новичка |
| `/bonuses` | `src/app/bonuses/page.tsx` | MEXC акции/бонусы |
| `/virtual-card` | `src/app/virtual-card/page.tsx` | Виртуальная карта |
| `/tokens` | `src/components/token-explorer.tsx` | Обзор токенов |
| `/admin/analytics` | `src/components/admin-analytics-screen.tsx` | Admin Analytics |

Нижнее меню:

- Реализация: `src/components/bottom-navigation.tsx`.
- Данные пунктов: `navItems` в `src/lib/content.ts`.
- Пункты: Главная, Гайды, Чеклист, Портфель, Ещё.
- Active state: `pathname === item.href`; пункт "Ещё" также активен для `/risk-calendar`, `/glossary`, `/bonuses`, `/virtual-card`, `/wanttopay`.
- Telegram layout: `src/app/layout.tsx` подключает Telegram WebApp SDK, `TelegramThemeBridge`, `TelegramLinkInterceptor`, `AnalyticsTracker`.

## 3. API endpoints

Главная и рынок:

- `src/app/api/home-live/route.ts` - основной быстрый public state главной.
- `src/app/api/home-snapshot/route.ts` - legacy snapshot/fallback.
- `src/app/api/btc-level/route.ts` - btc-level-v2, OHLC, levels, action.
- `src/app/api/prices/route.ts` - цены по symbols через CoinGecko.
- `src/app/api/market/route.ts` - общий market snapshot.
- `src/app/api/risks/route.ts` - календарь рисков.

Чеклист и платежи:

- `src/app/api/token-checklist/route.ts` - анализ токена.
- `src/app/api/check-balance/route.ts` - баланс проверок.
- `src/app/api/stars/create-invoice/route.ts` - создание invoice Stars.
- `src/app/api/telegram/webhook/route.ts` - pre_checkout_query и successful_payment.
- `src/app/api/telegram/set-webhook/route.ts` - установка webhook.

Портфель:

- `src/app/api/portfolio/diary/route.ts` - GET/POST дневника.
- `src/app/api/portfolio/diary/check/route.ts` - проверка портфеля.
- `src/app/api/portfolio/pro-status/route.ts` - статус Portfolio Pro.
- `src/app/api/portfolio/pro-buy/route.ts` - покупка Portfolio Pro.
- `src/app/api/portfolio-report/route.ts` - данные подготовленного отчёта.

Admin/analytics/debug:

- `src/app/api/admin/analytics/route.ts`
- `src/app/api/admin/analytics/user/route.ts`
- `src/app/api/admin/grant-checks/route.ts`
- `src/app/api/admin/health/route.ts`
- `src/app/api/analytics/track/route.ts`
- `src/app/api/me/route.ts`
- `src/app/api/env-check/route.ts`
- `src/app/api/bls-debug/route.ts`
- `src/app/api/fred-debug/route.ts`
- `src/app/api/cryptorank-debug/route.ts`
- `src/app/api/unlocks-debug/route.ts`

## 4. Главная

Основные файлы:

- UI: `src/components/home-screen.tsx`.
- API: `src/app/api/home-live/route.ts`.
- BTC levels: `src/app/api/btc-level/route.ts`.
- Legacy snapshot: `src/app/api/home-snapshot/route.ts`.
- Server cache: `src/lib/homeLive/cache.ts`.

Основной источник данных:

- `/api/home-live`.

Fallback:

- Server memory cache `__ruscrypto_home_live_state__` в `src/lib/homeLive/cache.ts`.
- Client localStorage key `ruscrypto.homeLiveState.v2`.
- Legacy `/api/home-snapshot` как старый fallback/совместимость.

TTL/cache:

- `HOME_LIVE_STATE_FRESH_TTL_MS = 90_000`.
- `HOME_LIVE_STATE_LAST_GOOD_TTL_MS = 24h`.
- Client localStorage TTL в `home-screen.tsx`: `HOME_LIVE_STORAGE_TTL_MS = 24h`.
- BTC-level cache TTL: `BTC_LEVEL_CACHE_TTL_MS = 15m`.
- BTC-level lastGood TTL: `BTC_LEVEL_LAST_GOOD_TTL_MS = 6h`.

Loading:

- В `home-screen.tsx` helper `hasDisplayableHomeLiveData(data)` разрешает показывать данные даже при `dataStatus: partial` или `homeStateSource: memory-lastGood`, если есть пригодные `price` и `level`.
- `shouldRefreshHomeLive(data)` может запускать фоновый refresh, но не должен скрывать уже пригодные данные.

localStorage:

- `readStoredHomeLiveState()` читает `{ data, savedAt }`.
- Проверяет TTL, `levelModelVersion = "btc-level-v2"` и displayable payload.
- `writeStoredHomeLiveState(payload)` сохраняет displayable state.

Поля главной:

- `price.value`, `price.change24h`.
- `action.status/title`, `action.reason/text`, `action.tone`, `action.whatToWait`.
- `mainRisk.title`, `mainRisk.impact`, `mainRisk.description`.
- `level.label`, `nearestWorkingResistance`, `nearestResistance`, `nextStrongResistance`, `nextKeyResistance`, `minorResistance`, `distantMajorResistance`.
- `meta.priceReady`, `meta.levelReady`, `meta.riskReady`, `meta.actionReady`, `meta.homeStateSource`.

## 5. BTC-level-v2: уровни, score, зоны

Основной файл:

- `src/app/api/btc-level/route.ts`.

Типы:

- `src/lib/btcLevel.ts`.

Версия:

- `LEVEL_MODEL_VERSION = "btc-level-v2"`.

OHLC providers:

- Binance public klines: `fetchBinanceCandles`.
- Coinbase Exchange candles: `fetchCoinbaseCandles`.
- Kraken OHLC: `fetchKrakenCandles`.
- Multi-provider flow: `fetchOhlcBundle`.

Нормализация:

- `normalizeCandles()` приводит свечи к `{ time, open, high, low, close, volume }`.
- Сортировка ASC.
- Фильтр битых свечей: finite values, `high >= low`, `close > 0`.

Минимальные свечи:

- 4H: `MIN_CANDLES_4H = 80`.
- 1D: `MIN_CANDLES_1D = 90`.

Источники зон:

- `4h_swing_high`, `4h_swing_low`.
- `1d_swing_high`, `1d_swing_low`.
- `previous_day_high`, `previous_week_high`, `previous_month_high`.
- `previous_day_low`, `previous_week_low`, `previous_month_low`.
- Lows above price переименовываются в `lost_support_flip_day/week/month`.
- `round_level_cluster`.
- `ema20`, `ema50`, `ema200`.

Индикаторы:

- `calculateAtr`.
- `calculateEma`.
- `calculateRsi`.

Strength thresholds:

- `<25` - `weak`.
- `25-99` - `working`.
- `100-179` - `strong`.
- `>=180` - `key`.
- Функция: `strengthFromScore`.

Caps:

- `ROUND_ONLY_SCORE_CAP = 20`.
- `SUPPORT_FLIP_SCORE_CAP = 60`.
- Single-source cap до `90`, если зона держится только на одном source family без подтверждений.

Роли сопротивления:

- `nearestWorkingResistance` - ближайшая рабочая структурная зона.
- `nearestResistance` - alias для обратной совместимости.
- `minorResistance` - слабая/round-only зона.
- `nextStrongResistance` - следующая strong/key зона выше рабочей.
- `nextKeyResistance` - ближайший key cluster.
- `distantMajorResistance` - ручная дальняя зона `$80,000-82,000`.

Поддержка:

- `activeSupportZone` - цена внутри или рядом с зоной поддержки.
- `nearestSupport` - ближайшая поддержка для UI.
- `riskRewardSupport` - поддержка, достаточно ниже цены для risk/reward.
- `supportState` - `inside_support_zone`, `near_support_zone`, `above_support`, `no_support_below`.

Debug:

- `providerDebug` показывает provider, interval, host, status, candles, elapsedMs, error.
- `debug.zones[].scoreBreakdown` показывает raw/final score и компоненты.

## 6. Action-логика главной

Где формируется:

- `buildLevelActionV2()` в `src/app/api/btc-level/route.ts`.
- `/api/home-live` берёт `btcLevel.action` в `buildAction()` и отдаёт UI.

Action codes:

- `LEVEL_PENDING`
- `WAIT_RANGE`
- `WAIT_RECLAIM`
- `WAIT_RETEST`
- `DCA_CORE_SMALL`
- `DCA_SMALL`
- `DO_NOT_CHASE`
- `PARTIAL_CASH`
- `RISK_OFF`
- `WAIT`
- `WAIT_BREAKOUT_CONFIRMATION`

Контекст action:

- `workingZoneState`.
- `roomToStrongPercent`.
- `roomToKeyPercent`.
- `riskRewardToStrong`.
- `nextStrongResistanceLabel`.
- `nextKeyResistanceLabel`.
- `overheated`.

Условие -> action:

| Условие | action.code | Что видит пользователь |
| --- | --- | --- |
| Нет цены или нет динамического уровня | `LEVEL_PENDING` | Уровень уточняется |
| Цена близко к `nextStrongResistance` или `nextKeyResistance`, либо overheated | `DO_NOT_CHASE` | Не догонять |
| Цена рядом с поддержкой и рабочей зоной сверху | `WAIT_RANGE` | Ждать, BTC зажат в диапазоне |
| Цена ниже или внутри `nearestWorkingResistance` | `WAIT_RECLAIM` | Ждать закрепления |
| Цена выше рабочей зоны, но ретест не подтверждён | `WAIT_RETEST` | Ждать ретест |
| `retest_confirmed`, roomToStrong >= 3%, RR >= 1.3, не overheated | `DCA_CORE_SMALL` | DCA малыми частями |
| Ничего не подошло | `WAIT` | Нейтрально, ждать понятной зоны |

Что нужно для `DCA_CORE_SMALL`:

- `workingZoneState = retest_confirmed`.
- `roomToStrongPercent >= 3`.
- `riskRewardToStrong >= 1.3`.
- `overheated = false`.
- Нет high-risk события, которое `/api/home-live` делает главным ограничителем.

Когда включается `DO_NOT_CHASE`:

- `distanceToStrongLower <= 1.5%`.
- или `distanceToKeyLower <= 2%`.
- или overheated.

## 7. Источники данных главной и рынка

| Источник | Что берём | Где в коде | Fallback | Комментарий |
| --- | --- | --- | --- | --- |
| CoinGecko | prices, market data, chart, tickers | `src/lib/coingecko.ts`, `src/lib/market.ts`, `src/app/api/prices/route.ts` | memory lastGood | Основной источник цен |
| Binance | BTC OHLC | `src/app/api/btc-level/route.ts` | Coinbase/Kraken | Первый provider |
| Coinbase | BTC OHLC | `src/app/api/btc-level/route.ts` | Kraken | Второй provider |
| Kraken | BTC OHLC | `src/app/api/btc-level/route.ts` | lastGood/level_pending | Production fallback |
| FRED | Macro release calendar | `src/app/api/risks/route.ts` | other providers/manual | Требует `FRED_API_KEY` |
| FMP | Macro calendar | `src/app/api/risks/route.ts` | manual | Требует `FMP_API_KEY` |
| Trading Economics | Macro calendar | `src/app/api/risks/route.ts` | manual | Требует `TRADING_ECONOMICS_KEY` |
| CoinMarketCal | Crypto events | `src/app/api/risks/route.ts`, `src/lib/unlocks.ts` | manual | Требует API key |
| Tokenomist | Unlocks/tokenomics | `src/lib/unlocks.ts` | CoinGlass/CryptoRank/manual | Для чеклиста и portfolio context |
| CoinGlass | Unlocks | `src/lib/unlocks.ts` | other providers | Optional |
| CryptoRank | Unlocks/debug | `src/lib/unlocks.ts` | manual | Optional |
| Mobula | Events/unlocks hints | `src/app/api/risks/route.ts`, `src/lib/unlocks.ts` | partial/manual | Optional |
| Messari | Упомянут/TODO | `src/app/api/risks/route.ts`, `src/lib/unlocks.ts` | manual | Не выглядит полно реализованным |
| Alternative.me Fear & Greed | Не найден fetch/API | text only | none | Есть только упоминания в текстах |
| Farside/SoSoValue/Dune/TradingView | Не найден fetch/API | нет | none | Фактически не подключены |
| DefiLlama | Гайд/источник в тексте | `src/lib/content.ts`, markdown | none | API не найден |
| CoinMarketCap | Только комментарий про сверку логотипов | `src/lib/content.ts` | none | API не подключён |

## 8. Чеклист токенов

Основные файлы:

- Page: `src/app/token-checklist/page.tsx`.
- UI: `src/components/token-checklist.tsx`.
- API: `src/app/api/token-checklist/route.ts`.
- Access: `src/lib/checklist/accessPolicy.ts`.
- Legacy/client access helper: `src/lib/checklistAccess.ts`.
- Scoring: `src/lib/tokenChecklist.ts`.
- Metadata: `src/lib/tokenMetadata.ts`.
- Supabase: `src/lib/supabase/checks.ts`.
- Unlocks: `src/lib/unlocks.ts`.

Доступ:

- Бесплатные токены: `BTC`, `ETH`.
- Платные/Pro/admin: `BNB`, `LINK`, `HYPE`, `SOL`, `AAVE`, `XRP`, `RENDER`, `SUI`, `TAO`, `TON`, `ONDO`, `UNI`, `JUP`, `PENDLE`, `ENA`, `AVAX`, `NEAR`, `MORPHO`, `ARB`, `OP`, `SKY`, `SYRUP`, `AERO`, `SEI`, `LDO`, `JTO`, `PYTH`.
- Admin bypass: `isAdminTelegramUser()`.
- Portfolio Pro bypass: POST `/api/token-checklist` вызывает `getPortfolioProStatus()`.
- 24h active result unlock: `getActiveChecklistResultAccess()` в `src/lib/supabase/checks.ts`.

Оплата:

- 1 проверка - 5 Stars.
- 5 проверок - 20 Stars.
- Pricing: `src/lib/payments/pricing.ts`.

Таблицы:

- `app_users`.
- `check_balances`.
- `check_history`.
- `payment_events`.
- `user_entitlements` для Portfolio Pro.

## 9. Аналитическая логика чеклиста

Где считается:

- `src/lib/tokenChecklist.ts`.
- API wrapper и source сборка: `src/app/api/token-checklist/route.ts`.

Шкала:

- Score 0-100.
- Base score 70.
- Финальный score clamp 0-100.

Основные категории:

- Market price/change.
- Technical: RSI, SMA, near high/low.
- Volume/liquidity.
- Macro/BTC risk.
- Tokenomics/unlocks.
- Missing-data confidence.

Примеры правил:

- Pump risk high/extreme снижает score.
- RSI > 70 снижает score.
- Хороший volume/market cap может добавить баллы.
- Низкая ликвидность снижает score.
- High macro risk снижает score.
- Большой ближайший unlock снижает score.
- Missing market price даёт penalty.

Формируются:

- `score`.
- `verdict`.
- `riskLevel`.
- `scoreBreakdown`.
- `factors`.
- `badges`.
- `analysisSignals`.
- `warnings`.
- `confidence`.

Источники чеклиста:

| Источник | Для чего | Что если не отвечает |
| --- | --- | --- |
| CoinGecko market | price, mcap, volume, 24h/7d/30d | cache/lastGood/fallback |
| CoinGecko details | FDV, supply, links/details | partial |
| CoinGecko chart | RSI/SMA/history | partial technical |
| CoinGecko tickers | liquidity | partial liquidity |
| `/api/market` | fallback market data | partial |
| `/api/risks` | macro/BTC risk | fallback risk |
| Tokenomist | unlock schedule/tokenomics | CoinGlass/CryptoRank/manual |
| CoinGlass | unlock fallback | other providers |
| CryptoRank | unlock fallback | manual |

Технические фразы:

- В `src/lib/unlocks.ts` есть fallback-тексты вроде "Автоматически не удалось получить точный график unlocks..." и "Перед входом проверь CryptoRank / TokenUnlocks...".
- Поиск по прямым опечаткам/техническим строкам `undefined`, `null` в UI как отображаемым значениям не выявил явной карточки, но в коде много nullable types.

## 10. Watchlist

Где хранится:

- `tokens`, `watchlistTokenOrder`, `watchlistGuideOverrides` в `src/lib/content.ts`.

Watchlist tokens:

| Токен | Название | Статус | Иконка | Market id | Где описан |
| --- | --- | --- | --- | --- | --- |
| MORPHO | MORPHO | published | `/tokens/morpho.png` | `morpho` | `src/lib/content.ts` |
| ARB | Arbitrum | published | `/tokens/arb.jpg` | `arbitrum` | `src/lib/content.ts` |
| OP | Optimism | published | `null` | `optimism` | `src/lib/content.ts` |
| TON | Toncoin | watchlist | `/tokens/ton.png` | `the-open-network` | `src/lib/content.ts` |
| XRP | XRP | watchlist | `/tokens/xrp.png` | `ripple` | `src/lib/content.ts` |
| ENA | Ethena | watchlist | `/tokens/ena.png` | `ethena` | `src/lib/content.ts` |
| SKY | Sky | in_progress | `/tokens/sky.jpg` | `sky` | `src/lib/content.ts` |
| SYRUP | Syrup | token in_progress, guide published | `/tokens/SYRUP.png` | `syrup` | `src/lib/content.ts` |
| AERO | Aerodrome Finance | in_progress | `/tokens/aero.png` | `aerodrome-finance` | `src/lib/content.ts` |
| SEI | Sei | in_progress | `/tokens/SEI.png` | `sei-network` | `src/lib/content.ts` |
| LDO | Lido DAO | in_progress | `/tokens/Ldo.png` | `lido-dao` | `src/lib/content.ts` |
| JTO | Jito | in_progress | `/tokens/jto.png` | `jito-governance-token` | `src/lib/content.ts` |
| PYTH | Pyth Network | in_progress | `/tokens/pyth.png` | `pyth-network` | `src/lib/content.ts` |

Цены:

- Hook: `src/hooks/use-token-prices.ts`.
- Endpoint: `src/app/api/prices/route.ts`.
- Mapping идёт из `tokens` по `coingeckoId`.

## 11. Иконки токенов

Папка:

- `C:\Vahtang\ruscrypto-miniapp\public\tokens`

Файлы:

- `aave.png`, `aero.png`, `arb.jpg`, `avax.png`, `bnb.png`, `btc.png`, `ena.png`, `eth.png`, `filecoin.png`, `hype.png`, `jto.png`, `jup.png`, `Ldo.png`, `link.png`, `morpho.png`, `near.png`, `ondo.png`, `pendle.png`, `pyth.png`, `render.png`, `SEI.png`, `sky.jpg`, `sol.png`, `sui.png`, `SYRUP.png`, `tao.png`, `ton.png`, `uni.png`, `xrp.png`.

Проверка регистра:

- `MORPHO -> /tokens/morpho.png` - ok.
- `ARB -> /tokens/arb.jpg` - ok.
- `SKY -> /tokens/sky.jpg` - ok.
- `SYRUP -> /tokens/SYRUP.png` - ok, регистр важен.
- `AERO -> /tokens/aero.png` - ok.
- `SEI -> /tokens/SEI.png` - ok, регистр важен.
- `LDO -> /tokens/Ldo.png` - ok, регистр важен.
- `JTO -> /tokens/jto.png` - ok.
- `PYTH -> /tokens/pyth.png` - ok.
- `OP` сейчас без иконки (`logo: null`).

## 12. Гайды

Где данные:

- `src/lib/content.ts`, export `guideSections`.

UI:

- `src/components/guide-browser.tsx`.

Категории:

- `Старт и безопасность`.
- `Фундамент`.
- `Индикаторы`.
- `Фундамент под микроскопом`.
- `Сектор под прицелом`.
- `Watchlist`.
- `Airdrop / Ретродроп`.
- `NFT`.
- `Разборы токенов`.

Проверенные новые/важные темы:

| Тема | URL | Категория | Статус |
| --- | --- | --- | --- |
| DeFi без иллюзий | `https://t.me/ruscrypto2026/144` | Сектор под прицелом | есть |
| Почему floor price обманывает | `https://t.me/ruscrypto2026/148` | NFT | есть |
| MORPHO | `https://t.me/ruscrypto2026/150` | Watchlist | есть |
| Airdrop / безопасность | `https://t.me/ruscrypto2026/152` | Airdrop / Ретродроп | есть, первый |
| RSI | `https://t.me/ruscrypto2026/154` | Индикаторы | есть |
| USDT vs USDC | `https://t.me/ruscrypto2026/159` | Сектор под прицелом | есть |
| Почему ETH может быть лучше L2-токенов | `https://t.me/ruscrypto2026/161` | Сектор под прицелом | есть |
| ARB: DAO, Orbit, AEP и value capture | `https://t.me/ruscrypto2026/163` | Watchlist | есть |
| Miden | `https://t.me/ruscrypto2026/165` | Airdrop / Ретродроп | есть |
| RWA: покупаем актив или ставку на экосистему | `https://t.me/ruscrypto2026/170` | Сектор под прицелом | есть |
| NFT: Ethereum, Solana, Bitcoin Ordinals и Telegram-коллекции | `https://t.me/ruscrypto2026/172` | NFT | есть |
| OP: Superchain/OP Stack, а не просто OP Mainnet | `https://t.me/ruscrypto2026/175` | Watchlist | есть |
| Abstract: XP, AGW, Portal, apps и badges | `https://t.me/ruscrypto2026/177` | Airdrop / Ретродроп | есть |
| ATR - индикатор волатильности | `https://t.me/ruscrypto2026/180` | Индикаторы | есть |
| RWA: Tokenized Treasuries вблизи | `https://t.me/ruscrypto2026/185` | Фундамент под микроскопом | есть |
| L2 Stages на L2Beat | `https://t.me/ruscrypto2026/187` | Фундамент под микроскопом | есть |
| SYRUP (Maple) | `https://t.me/ruscrypto2026/190` | Watchlist | есть |
| Ethereal: разбор airdrop | `https://t.me/ruscrypto2026/192` | Airdrop / Ретродроп | есть |
| Поддержка и сопротивление | `https://t.me/ruscrypto2026/194` | Индикаторы | есть |

Проверка опечаток:

- `Mainnetв` не найдено.
- `волатильностив` не найдено.
- `SYRUP (Maple)` отображается без лишней скобки.

## 13. Раздел "Ещё" и словарь

Ещё:

- Данные: `moreItems` в `src/lib/content.ts`.
- Страница: `src/app/more/page.tsx`.
- Карточки:
  - Календарь рисков - `/risk-calendar`.
  - Словарь новичка - `/glossary`.
  - Виртуальная карта - `/virtual-card`.
  - Поддержать канал - `https://t.me/boost/ruscrypto2026`.
  - Акции и бонусы - `/bonuses`.
- MEXC: `src/app/bonuses/page.tsx`.
- Virtual card / WantToPay: `src/app/virtual-card/page.tsx`.
- Admin Analytics: показывается admin/dev через `/api/me` и dev `?admin=1`.

Словарь:

- Данные: `src/lib/glossary.ts`.
- UI: `src/components/glossary-browser.tsx`.
- Структура термина: `id`, `term`, `description`, `category`, иногда `short`.
- Термины: DYOR, FOMO, FUD, ATH, ATL, Market Cap, FDV, TVL, Liquidity, Volume, BTC.D, CEX, DEX, Wallet, Seed phrase, Gas, Network, ERC-20, TRC-20, BEP-20, L1, L2, Bridge, Slippage, Spot, Futures, Leverage, Liquidation, Funding, APY, Staking, Unlock, Vesting, TGE, Airdrop, ETF, Stablecoin, RWA, Oracle, on-chain, Whale accumulation, DePIN, Burn, Revenue, watchlist, supply, DAU, fees, DeFi, holders, Hold, buyback, TVS, smart contracts, retail velocity, active addresses, pure-play, user-throughput.

## 14. Портфель

Основные файлы:

- `src/components/portfolio-calculator.tsx` - `/portfolio`.
- `src/components/prepared-portfolio-report.tsx` - prepared report UI.
- `src/lib/portfolio/preparedReport.ts` - prepared report data parser/model.
- `src/content/portfolio/long-term-crypto-portfolio-2028.md` - markdown отчёт.
- `src/lib/portfolio/diaryModel.ts` - дневник и активная модель.

Что есть в `/portfolio`:

- Калькулятор/профили.
- Карточка "Наш подготовленный портфель".
- Кнопки: "Открыть отчёт" и "Портфельный дневник".

Важно:

- `portfolioProfiles` в `src/lib/content.ts` ещё выглядят как старый/иллюстративный калькулятор.
- Новая модель 2028 фактически находится в `src/lib/portfolio/diaryModel.ts` и `src/lib/portfolio/preparedReport.ts`.

## 15. Портфельная модель 2028

Фактическая версия:

- `portfolioModelVersion = "2026-06-23-risk-off-2028"`.
- Файл: `src/lib/portfolio/diaryModel.ts`.

Активная модель:

| Актив | Цель | Коридор | Роль |
| --- | ---: | --- | --- |
| BTC | 30% | 28-33% | core |
| ETH | 20% | 17-23% | core |
| SOL | 8.5% | 6-11% | core |
| AAVE | 6% | 4-8% | satellite |
| HYPE | 6% | 4-8% | satellite |
| LINK | 5% | 4-6.5% | core |
| UNI | 5% | 3.5-6.5% | satellite |
| BNB | 3% | 2-4% | core |
| TAO + RENDER | 3% | 1.5-5% | AI-блок |
| ENA | 2.5% | 1.25-4% | satellite |
| JUP | 2.5% | 1.25-4% | satellite |
| PENDLE | 2% | 1-3.5% | satellite |
| SKY | 1.5% | 0.75-2.5% | satellite |
| Стейбл-буфер | 5% | 3-7% | cash |

Фактических override `BTC 32%`, `ETH 19%`, `SOL 8.5%` с узкими коридорами в коде не найдено.

За скобками:

- ONDO.
- SUI.
- AVAX.

Watchlist 0%:

- MORPHO, SYRUP, AERO, NEAR, TON, XRP, SEI, ARB, OP, LDO, JTO, PYTH.

Контрольные даты:

- 6-е число каждого месяца - HYPE unlock.
- Q3 2026 - ENA fee switch.
- 18.01.2027 - ONDO cliff unlock.
- Весна 2028 - BTC halving.

Пороги режима:

- Бычий разворот: ФРС смягчает / DXY < 97 / ETF inflows / Fear & Greed вышел из страха.
- Глубже risk-off: ФРС повышает / US10Y > 4.8% / DXY > 102.
- ENA: нет fee switch к концу Q3 2026 или sUSDe < 5%.
- HYPE: клеймы команды по разлокам резко выросли.

## 16. Портфельный дневник

Основные файлы:

- UI: `src/components/portfolio-diary.tsx`.
- Model: `src/lib/portfolio/diaryModel.ts`.
- GET/POST: `src/app/api/portfolio/diary/route.ts`.
- Check: `src/app/api/portfolio/diary/check/route.ts`.

Сохранение:

- Supabase `portfolio_positions`.
- Supabase `portfolio_cash`.
- `telegram_user_id` определяется server-side через Telegram initData.
- Dev fallback: local admin `?admin=1` только в development.

Расчёты:

- amount * price = valueUsd.
- cryptoTotalUsd = сумма активов.
- totalWithCashUsd = cryptoTotalUsd + cash.
- currentWeight считается внутри crypto-части.
- Cash считается отдельно.

Коридоры:

- `getPortfolioRangeStatus(currentWeight, minWeight, maxWeight)`.
- `getPortfolioRangeActionHint(status)`.
- Статусы: `below_range`, `in_range`, `above_range`.
- Автоматической продажи из-за `above_range` нет.

AI-блок:

- TAO и RENDER имеют `group: "AI-блок"`.
- Совокупный лимит группы: target 3%, corridor 1.5-5%.

Проверка портфеля:

- Без Pro: проверяются только BTC/ETH.
- Pro/admin: проверяются все активные model assets.
- Результат группируется в `recommendations.buy`, `recommendations.cashOut`, `recommendations.hold`.
- Locked assets возвращаются в `lockedAssets`.
- Score/signals берутся из `/api/token-checklist`.

## 17. Portfolio Pro

Основной файл:

- `src/lib/portfolio/proAccess.ts`.

Параметры:

- Product: `portfolio_pro_7d`.
- Title: `Portfolio Pro`.
- Price: `100` Stars.
- Duration: `7` days.

Admin:

- `telegram_user_id = 1720794119`.
- username `K_Vahtang`.
- Admin always Pro.

Endpoints:

- `src/app/api/portfolio/pro-status/route.ts`.
- `src/app/api/portfolio/pro-buy/route.ts`.

Storage:

- Supabase `user_entitlements`.

Продление:

- `grantOrExtendPortfolioPro()` продлевает от текущего будущего `expires_at`; если Pro истёк, считает от now.

Интеграция с чеклистом:

- `/api/token-checklist` проверяет Portfolio Pro.
- При active Pro не списывает check balance.
- В history может писать `accessType: "portfolio_pro"`.

## 18. Telegram Stars payments

Основные файлы:

- Pricing: `src/lib/payments/pricing.ts`.
- Create invoice: `src/app/api/stars/create-invoice/route.ts`.
- Bot API: `src/lib/telegram/botApi.ts`.
- Webhook: `src/app/api/telegram/webhook/route.ts`.

Products:

- `single_check` - 1 проверка, 5 Stars.
- `five_checks` - 5 проверок, 20 Stars.
- `portfolio_pro_7d` - 100 Stars / 7 дней.

Flow:

- Client вызывает create invoice endpoint.
- Создаётся `payment_events` со status `created`.
- Telegram отправляет `pre_checkout_query`.
- `handlePreCheckoutQuery()` проверяет payload/payment event.
- Telegram отправляет `successful_payment`.
- `handleSuccessfulPayment()` делает idempotent claim.
- Для check packages вызывается `addChecksToBalance`.
- Для Portfolio Pro вызывается `grantOrExtendPortfolioPro`.

Важно:

- Валюта Telegram Stars: `XTR`.
- Внешних рублёвых оплат в коде не найдено.
- Service role key и bot token не раскрываются на клиент.

## 19. Supabase

Client:

- `src/lib/supabase/server.ts`.
- Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- REST через service role headers.

Helpers:

- `src/lib/supabase/checks.ts`.

Таблицы:

- `app_users` - Telegram users/admin/session metadata.
- `check_balances` - баланс проверок.
- `check_history` - история чеклиста.
- `payment_events` - invoices/payments.
- `portfolio_positions` - позиции дневника.
- `portfolio_cash` - cash дневника.
- `user_entitlements` - Portfolio Pro.
- `user_activity_log` - analytics events.

SQL:

- `supabase/schema.sql` - core users/checks/payments/RPC.
- `docs/supabase-portfolio-diary-stage1.sql` - diary tables.
- `docs/supabase-portfolio-pro-stage3.sql` - entitlements.
- `docs/supabase-analytics-migration.sql` - analytics.

RPC:

- `consume_check`.
- `add_checks`.

Ошибки:

- Если env отсутствуют, helper возвращает `missing-supabase-env`.
- Paid routes без Supabase не могут начислять/списывать.

## 20. Tokenomist / unlocks

Основной файл:

- `src/lib/unlocks.ts`.

Покрытие:

- Mapping `cryptoRankTokenMap` покрывает BTC, ETH, BNB, LINK, HYPE, SOL, AAVE, XRP, RENDER, SUI, TAO, TON, ONDO, UNI, JUP, PENDLE, ENA, AVAX, NEAR, MORPHO, ARB, OP, SKY, SYRUP, AERO, SEI, LDO, JTO, PYTH.

Providers:

- Tokenomist v5.
- CoinGlass.
- CoinMarketCal.
- CoinGecko supply fallback.
- Mobula.
- Messari.
- CryptoRank.
- Base asset rule for BTC/ETH.

Ошибки/fallback:

- Если точный unlock не найден, выбирается partial/manual fallback.
- Есть `attemptsSummary`.
- В UI/checklist не должно падать, score снижается по доступным данным.

Используется:

- В `/api/token-checklist`.
- Косвенно в portfolio diary check через checklist.
- В prepared portfolio/control notes как текстовый контекст HYPE/ENA/ONDO.

## 21. Env, fallback, debug debt, итоговая карта

Env names без значений:

- `SUPABASE_URL` - Supabase REST.
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role.
- `TELEGRAM_BOT_TOKEN` - Telegram validation/Bot API.
- `TELEGRAM_WEBHOOK_SECRET` - webhook setup/security.
- `ADMIN_TELEGRAM_IDS` - admin bypass.
- `ADMIN_TELEGRAM_USERNAMES` - admin bypass.
- `COINGECKO_API_KEY` - CoinGecko.
- `COINGECKO_API_PLAN` - CoinGecko demo/pro.
- `TOKENOMIST_API_KEY` - Tokenomist.
- `TOKENOMIST_ENABLED` - provider toggle.
- `COINGLASS_API_KEY` - CoinGlass.
- `COINGLASS_ENABLED` - provider toggle.
- `CRYPTORANK_API_KEY` - CryptoRank.
- `CRYPTORANK_ENABLED` - provider toggle.
- `COINMARKETCAL_API_KEY` - CoinMarketCal.
- `MOBULA_API_KEY` - Mobula.
- `MESSARI_API_KEY` - Messari.
- `FRED_API_KEY` - FRED calendar.
- `FMP_API_KEY` - FMP calendar.
- `ALPHAVANTAGE_API_KEY` - macro context.
- `TRADING_ECONOMICS_KEY` - macro calendar.
- `NEXT_PUBLIC_APP_URL` - internal origin.
- `VERCEL_URL` - origin fallback.
- `NEXT_PUBLIC_FREE_CHECKLIST_SYMBOLS` - client free symbols.
- `NEXT_PUBLIC_ALT_CHECKLIST_LOCKED` - client checklist lock.
- `CHECKS_SINGLE_COUNT` - pricing override.
- `STARS_SINGLE_CHECK_PRICE` - pricing override.
- `CHECKS_PACK_COUNT` - pricing override.
- `STARS_FIVE_CHECKS_PRICE` - pricing override.
- `NODE_ENV` - dev fallback.

Fallback map:

- Home: server lastGood, client localStorage, background refresh.
- BTC-level: Binance/Coinbase/Kraken, lastGood 6h, `level_pending`.
- Prices: CoinGecko cache, lastGood, per-symbol `missing`.
- Risks: provider chain, cacheOnly, manual fallback.
- Checklist: CoinGecko per-kind cache, market fallback, unlock provider chain, no-charge on failed paid analysis.
- Supabase: explicit missing env error.
- Telegram user id: free BTC/ETH can run; paid/user diary needs initData/session.

Debug/technical debt:

| Проблема | Файл | Риск | Что делать |
| --- | --- | --- | --- |
| Legacy `home-snapshot` хранит ручную `$80,000-82,000` | `src/app/api/home-snapshot/route.ts` | Старый fallback может путать диагностику | Держать только как distant |
| Старый `buildLevelAction` рядом с `buildLevelActionV2` | `src/app/api/btc-level/route.ts` | Дублирование action logic | Cleanup отдельной задачей |
| `console.info` в checklist route | `src/app/api/token-checklist/route.ts` | Шум в логах | Убрать/guard |
| `console.info` в Telegram links | `src/lib/telegramLinks.ts`, `src/components/telegram-link-interceptor.tsx` | Шум в клиенте | Убрать/guard |
| TODO Messari risk endpoint | `src/app/api/risks/route.ts` | Заявленный источник неполный | Реализовать или убрать TODO |
| OP без локальной иконки | `src/lib/content.ts` | Watchlist без logo | Добавить asset/mapping |
| Новые Watchlist токены не все в tracked risk assets | `src/lib/riskCalendar.ts` | События могут не мапиться | Расширить mapping |
| `portfolioProfiles` старее модели 2028 | `src/lib/content.ts` | `/portfolio` калькулятор и дневник концептуально разные | Решить продуктово |
| `RENDER` vs `RNDR` в metadata | `src/lib/tokenMetadata.ts` | Символьная путаница | Унифицировать |

Итог:

- Главная, btc-level-v2, чеклист, Stars, Portfolio Pro, портфельный дневник, гайды, Watchlist и Supabase-интеграции фактически реализованы.
- Частично требуют проверки/cleanup: legacy home-snapshot, OP icon, risk mapping новых watchlist токенов, старые portfolioProfiles, debug logs.
- Не найдено фактическое подключение Alternative.me, Farside, SoSoValue, Dune, TradingView, DefiLlama API, CoinMarketCap API.

Карта файлов:

| Функция | Файлы |
| --- | --- |
| App shell/nav | `src/app/layout.tsx`, `src/components/bottom-navigation.tsx`, `src/lib/content.ts` |
| Главная | `src/components/home-screen.tsx`, `src/app/api/home-live/route.ts`, `src/lib/homeLive/cache.ts` |
| BTC levels | `src/app/api/btc-level/route.ts`, `src/lib/btcLevel.ts` |
| Prices/market | `src/app/api/prices/route.ts`, `src/lib/market.ts`, `src/lib/coingecko.ts` |
| Risks | `src/app/api/risks/route.ts`, `src/lib/riskCalendar.ts` |
| Гайды/Watchlist | `src/lib/content.ts`, `src/components/guide-browser.tsx` |
| Словарь | `src/lib/glossary.ts`, `src/components/glossary-browser.tsx` |
| Чеклист | `src/app/api/token-checklist/route.ts`, `src/components/token-checklist.tsx`, `src/lib/tokenChecklist.ts`, `src/lib/checklist/accessPolicy.ts` |
| Unlocks | `src/lib/unlocks.ts` |
| Portfolio | `src/components/portfolio-calculator.tsx`, `src/lib/portfolio/preparedReport.ts`, `src/lib/portfolio/diaryModel.ts` |
| Diary API | `src/app/api/portfolio/diary/route.ts`, `src/app/api/portfolio/diary/check/route.ts` |
| Pro | `src/lib/portfolio/proAccess.ts`, `src/app/api/portfolio/pro-status/route.ts`, `src/app/api/portfolio/pro-buy/route.ts` |
| Stars | `src/lib/payments/pricing.ts`, `src/app/api/stars/create-invoice/route.ts`, `src/app/api/telegram/webhook/route.ts` |
| Supabase | `src/lib/supabase/server.ts`, `src/lib/supabase/checks.ts`, `supabase/schema.sql` |
