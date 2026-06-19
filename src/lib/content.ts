export const telegramUrl = "https://t.me/ruscrypto2026";

export const financialDisclaimer =
  "Информация не является финансовой рекомендацией";

export const pageHeaders = {
  home: {
    eyebrow: "Telegram Mini App",
    title: "Крипта для новичков",
    description:
      "Навигатор по гайдам, портфелю, токенам и рискам. Для старта без лишней спешки и для спокойной проверки своих идей.",
  },
  guides: {
    eyebrow: "База знаний",
    title: "Гайды",
    description:
      "Подборка материалов по уровню подготовки: от первых действий до анализа рынка и секторов.",
  },
  portfolio: {
    eyebrow: "Инструмент",
    title: "Портфель",
    description:
      "Калькулятор показывает учебное распределение депозита по категориям. Меняйте сумму и профиль риска, чтобы увидеть логику долей.",
  },
  tokens: {
    eyebrow: "Watchlist",
    title: "Токены",
    description:
      "Бесплатный каталог разборов токенов. Расширенные фильтры и глубокая аналитика могут появиться позже.",
  },
  more: {
    eyebrow: "Дополнительно",
    title: "Ещё",
    description:
      "Дополнительные разделы, которые помогают развивать канал и держать важные материалы под рукой.",
  },
};

export type NavIcon = "home" | "guides" | "checklist" | "portfolio" | "tokens" | "more";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/guides", label: "Гайды", icon: "guides" },
  { href: "/token-checklist", label: "Чеклист", icon: "checklist" },
  { href: "/portfolio", label: "Портфель", icon: "portfolio" },
  { href: "/more", label: "Ещё", icon: "more" },
];

export const homeQuickAccess = {
  title: "Быстрый доступ",
  description: "Самые частые сценарии собраны в одну короткую карту.",
};

export type QuickAccessCard = {
  title: string;
  description: string;
  href?: string;
  links?: Array<{
    label: string;
    href: string;
  }>;
};

export const quickAccessCards: QuickAccessCard[] = [
  {
    title: "🚀 Старт без потерь",
    description:
      "Первые шаги, частые ошибки, скам, хранение и правила безопасности для новичка.",
    href: "/guides?tab=education",
  },
  {
    title: "🏦 Биржи и первые действия",
    description:
      "Как купить крипту, не ошибиться с сетью, комиссией и не полезть во фьючерсы раньше времени.",
    href: "/guides?tab=education",
  },
  {
    title: "📊 Рынок и фундамент",
    description:
      "Разберись, что двигает рынок: BTC, ETH, доминация, индикаторы, сектора и ончейн-инструменты.",
    links: [
      { label: "Индикаторы", href: "/guides?tab=indicators" },
      { label: "Фундамент и сектора", href: "/guides?tab=fundamentals" },
    ],
  },
];

export type Difficulty = "Новичок" | "Средний" | "Продвинутый";
export type PublicationStatus = "in_progress" | "published" | "soon";

export type GuideItem = {
  title: string;
  description: string;
  url: string | null;
  difficulty: Difficulty;
  status: PublicationStatus;
  coingeckoId?: string;
  kind?: "guide" | "token";
  logo?: string | null;
  isNew?: boolean;
  sector?: string;
  slug?: string;
  statusLabel?: string;
  tags?: string[];
  ticker?: string;
};

export type GuideSection = {
  id: string;
  tabLabel: string;
  title: string;
  description: string;
  items: GuideItem[];
};

const baseGuideSections: GuideSection[] = [
  {
    id: "education",
    tabLabel: "Старт и безопасность",
    title: "Старт и безопасность",
    description:
      "Первые шаги, биржи, безопасность, спот и базовая практика без лишней спешки.",
    items: [
      {
        title: "ТОП-5 самых частых ошибок новичков",
        description:
          "Ошибки, из-за которых новички чаще всего теряют деньги",
        url: "https://t.me/ruscrypto2026/7",
        difficulty: "Новичок",
        status: "published",
      },
      {
        title: "Как новичку правильно начать с маленькой суммы",
        description:
          "Как выбрать сумму для старта, не перегрузить депозит и не торопиться с решениями",
        url: "https://t.me/ruscrypto2026/11",
        difficulty: "Новичок",
        status: "published",
      },
      {
        title: "5 реальных правил, которые спасли мне деньги в крипте",
        description:
          "Практические правила, которые помогают держать процесс под контролем",
        url: "https://t.me/ruscrypto2026/14",
        difficulty: "Новичок",
        status: "published",
      },
      {
        title: "Как безопасно хранить крипту и что такое кошелёк",
        description:
          "Базовые правила хранения, seed-фраза, биржи, личные кошельки и доступ к активам",
        url: "https://t.me/ruscrypto2026/8",
        difficulty: "Новичок",
        status: "published",
      },
      {
        title: "7 признаков, что перед вами скам-проект",
        description:
          "Красные флаги, которые стоит проверить до любых действий",
        url: "https://t.me/ruscrypto2026/10",
        difficulty: "Новичок",
        status: "published",
      },
      {
        title: "Закон 171.7 УК РФ",
        description:
          "Что важно знать новичку о правовых рисках и осторожности в операциях",
        url: "https://t.me/ruscrypto2026/30",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "Как купить криптовалюту без P2P в 2026 году",
        description:
          "Как купить крипту через биржу без P2P: пополнение, первая покупка, комиссии и базовые проверки безопасности.",
        url: "https://t.me/ruscrypto2026/20",
        difficulty: "Новичок",
        status: "published",
      },
      {
        title: "Пассивный заработок в крипте",
        description:
          "Какие механики встречаются на биржах и какие условия нужно читать заранее",
        url: "https://t.me/ruscrypto2026/15",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "Что такое Grid-бот",
        description:
          "Как работает сеточная стратегия и почему важно понимать боковой рынок",
        url: "https://t.me/ruscrypto2026/17",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "Спот vs фьючерсы: где новичку начинать",
        description:
          "Почему сначала лучше разобраться со спотом, комиссиями и риском ликвидации",
        url: null,
        difficulty: "Новичок",
        status: "soon",
      },
      {
        title: "Бонусы бирж — это не бесплатные деньги",
        description:
          "Какие условия часто стоят за бонусами и почему их нужно читать полностью",
        url: null,
        difficulty: "Новичок",
        status: "soon",
      },
    ],
  },
  {
    id: "fundamentals",
    tabLabel: "Фундамент",
    title: "Фундамент",
    description: "BTC, ETH, сети, DeFi, RWA, DePIN и токеномика",
    items: [
      {
        title: "Почему ETH — база для L2",
        description:
          "Как L2-сети связаны с Ethereum и зачем они разгружают основную сеть",
        url: "https://t.me/ruscrypto2026/66",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "Какие бывают сети",
        description:
          "Чем отличаются L1, L2 и экосистемы, где живут токены и приложения",
        url: "https://t.me/ruscrypto2026/68",
        difficulty: "Новичок",
        status: "published",
      },
      {
        title: "Burn - не гарантия роста",
        description:
          "Почему сжигание токенов нужно смотреть вместе со спросом и выпуском",
        url: "https://t.me/ruscrypto2026/77",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "Оракулы - основа DeFi",
        description:
          "Как оракулы передают данные в блокчейн и почему это важно для DeFi",
        url: "https://t.me/ruscrypto2026/84",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "DePIN",
        description:
          "Сектор физической инфраструктуры в блокчейне и его основные риски",
        url: "https://t.me/ruscrypto2026/45",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "Tokenomics",
        description:
          "Как смотреть выпуск, распределение, unlocks и стимулы участников",
        url: "https://t.me/ruscrypto2026/48",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "DeFiLlama",
        description:
          "Как смотреть TVL, протоколы и секторные данные без лишних выводов",
        url: "https://t.me/ruscrypto2026/52",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "RWA",
        description:
          "Что такое токенизация реальных активов и где у сектора ограничения",
        url: "https://t.me/ruscrypto2026/58",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "Subnets",
        description:
          "Что такое Subnets на Avalanche: зачем проектам свои сети, кастомные правила, комиссии, валидаторы и compliance на уровне отдельной подсети.",
        url: "https://t.me/ruscrypto2026/98",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "Chain Abstraction и Intents",
        description:
          "Как крипта становится проще для пользователя: intent-подход, абстракция сетей, скрытие мостов и UX без ручного выбора блокчейна.",
        url: "https://t.me/ruscrypto2026/107",
        difficulty: "Средний",
        status: "published",
      },
    ],
  },
  {
    id: "indicators",
    tabLabel: "Индикаторы",
    title: "Индикаторы",
    description: "Рыночные метрики, уровни, настроение и контекст без лишней суеты.",
    items: [
      {
        title: "ATR — индикатор волатильности",
        description: "Как ATR помогает понимать амплитуду движения без сигналов",
        url: "https://t.me/ruscrypto2026/180",
        difficulty: "Средний",
        status: "published",
        slug: "atr-volatility-indicator",
        tags: ["ATR", "Volatility", "Indicator", "Risk"],
        isNew: true,
      },
      {
        title: "Gamma и опционы",
        description:
          "Как опционы могут влиять на уровни и поведение цены около экспираций",
        url: "https://t.me/ruscrypto2026/33",
        difficulty: "Продвинутый",
        status: "published",
      },
      {
        title: "Volume Profile",
        description:
          "Как смотреть зоны объема и почему они важны для контекста рынка",
        url: "https://t.me/ruscrypto2026/34",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "CVDD и Whale accumulation",
        description:
          "Ончейн-метрики для оценки поведения крупных участников",
        url: "https://t.me/ruscrypto2026/36",
        difficulty: "Продвинутый",
        status: "published",
      },
      {
        title: "Token Metrics AI",
        description:
          "Как использовать аналитические сервисы как источник гипотез, а не готовых решений",
        url: "https://t.me/ruscrypto2026/39",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "Fear & Greed",
        description:
          "Что показывает индекс настроений и почему его нельзя читать отдельно от рынка",
        url: "https://t.me/ruscrypto2026/55",
        difficulty: "Новичок",
        status: "published",
      },
      {
        title: "BTC Dominance",
        description:
          "Как доминация BTC помогает понимать фазу рынка и риск по альтам",
        url: "https://t.me/ruscrypto2026/63",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "EMA 50/100/200",
        description:
          "Как использовать скользящие средние для тренда, поддержки и сопротивления",
        url: "https://t.me/ruscrypto2026/139",
        difficulty: "Средний",
        status: "published",
        slug: "ema-50-100-200",
        tags: ["EMA", "Indicator", "Trend"],
        isNew: true,
      },
      {
        title: "RSI",
        description: "Как понять перегрев рынка без магии и сигналов",
        url: "https://t.me/ruscrypto2026/154",
        difficulty: "Новичок",
        status: "published",
        slug: "rsi-indicator",
        tags: ["RSI", "Indicator", "Risk"],
        isNew: true,
      },
    ],
  },
  {
    id: "sector-microscope",
    tabLabel: "Сектор под микроскопом",
    title: "Сектор под микроскопом",
    description:
      "Product vs token, value capture, revenue, секторная логика и разница между сильным протоколом и слабым токеном.",
    items: [
      {
        title: "RWA: покупаем актив или ставку на экосистему",
        description: "Как отличать реальный RWA-актив от ставки на governance-токен",
        url: "https://t.me/ruscrypto2026/170",
        difficulty: "Средний",
        status: "published",
        slug: "rwa-asset-or-ecosystem-bet",
        tags: ["RWA", "Tokenization", "Value capture", "Risk"],
        isNew: true,
      },
      {
        title: "Product vs Token",
        description:
          "Почему сильный проект не всегда значит сильный токен. Разбираем разницу между хорошим продуктом, сильным протоколом и токеном, который реально получает ценность.",
        url: "https://t.me/ruscrypto2026/129",
        difficulty: "Продвинутый",
        status: "published",
      },
      {
        title: "DeFi без иллюзий",
        description: "Почему TVL и APY не равны сильному токену",
        url: "https://t.me/ruscrypto2026/144",
        difficulty: "Продвинутый",
        status: "published",
        slug: "defi-bez-illyuziy",
        tags: ["DeFi", "TVL", "Revenue", "Yield"],
        isNew: true,
      },
      {
        title: "USDT vs USDC",
        description: "Какой стейблкоин для какой задачи",
        url: "https://t.me/ruscrypto2026/159",
        difficulty: "Средний",
        status: "published",
        slug: "usdt-vs-usdc",
        tags: ["Stablecoins", "USDT", "USDC"],
        isNew: true,
      },
      {
        title: "Почему ETH может быть лучше L2-токенов",
        description: "Рост L2-сетей не всегда означает рост L2-токенов",
        url: "https://t.me/ruscrypto2026/161",
        difficulty: "Продвинутый",
        status: "published",
        slug: "eth-vs-l2-tokens",
        tags: ["ETH", "L2", "Scaling", "Token capture"],
        isNew: true,
      },
    ],
  },
  {
    id: "watchlist",
    tabLabel: "Watchlist",
    title: "Watchlist",
    description: "Список наблюдения: что отслеживать, как вести и где не путать интерес с действием.",
    items: [
      {
        title: "Watchlist: список наблюдения",
        description:
          "Как вести список активов для наблюдения и не путать watchlist со списком покупок.",
        url: "https://t.me/ruscrypto2026/132",
        difficulty: "Новичок",
        status: "published",
      },
    ],
  },
  {
    id: "airdrops",
    tabLabel: "Airdrop / Ретродроп",
    title: "Airdrop / Ретродроп",
    description: "Практика участия без обещаний, мультиакков и лишнего риска.",
    items: [
      {
        title: "Airdrop / безопасность",
        description: "Как не попасть на фейковый claim и не слить кошелёк",
        url: "https://t.me/ruscrypto2026/152",
        difficulty: "Новичок",
        status: "published",
        slug: "airdrop-security",
        tags: ["Airdrop", "Security", "Wallet", "Retrodrop"],
        isNew: true,
      },
      {
        title: "Abstract: XP, AGW, Portal, apps и badges",
        description: "Как устроен Abstract Portal и что делать без лишнего риска",
        url: "https://t.me/ruscrypto2026/177",
        difficulty: "Средний",
        status: "published",
        slug: "abstract-xp-agw-portal-badges",
        tags: ["Abstract", "Airdrop", "XP", "AGW", "Badges"],
        isNew: true,
      },
      {
        title: "Miden",
        description: "Low-cost testnet и builder-path без гарантий дропа",
        url: "https://t.me/ruscrypto2026/165",
        difficulty: "Средний",
        status: "published",
        slug: "miden-airdrop",
        tags: ["Miden", "Airdrop", "Testnet", "Retrodrop"],
        isNew: true,
      },
      {
        title: "Linea: первый ретродроп-гайд",
        description:
          "Как подойти к участию в Linea без обещаний дропа, мультиакков и лишнего риска.",
        url: "https://t.me/ruscrypto2026/134",
        difficulty: "Средний",
        status: "published",
      },
    ],
  },
  {
    id: "nft",
    tabLabel: "NFT",
    title: "NFT",
    description: "NFT-рынок, ликвидность, метрики и риск без лишнего шума.",
    items: [
      {
        title: "NFT: Ethereum, Solana, Bitcoin Ordinals и Telegram-коллекции",
        description: "Чем отличаются NFT-рынки по ликвидности, риску и аудитории",
        url: "https://t.me/ruscrypto2026/172",
        difficulty: "Средний",
        status: "published",
        slug: "nft-ethereum-solana-ordinals-telegram",
        tags: ["NFT", "Ethereum", "Solana", "Ordinals", "Telegram"],
        isNew: true,
      },
      {
        title: "NFT: рынок стал жёстче",
        description:
          "Почему NFT не умерли, но рынок стал намного требовательнее к метрикам, ликвидности и риску.",
        url: "https://t.me/ruscrypto2026/137",
        difficulty: "Средний",
        status: "published",
      },
      {
        title: "Почему floor price обманывает",
        description: "Почему floor price не показывает реальную ликвидность NFT",
        url: "https://t.me/ruscrypto2026/148",
        difficulty: "Средний",
        status: "published",
        slug: "nft-floor-price-obmanyvaet",
        tags: ["NFT", "Floor price", "Liquidity"],
        isNew: true,
      },
    ],
  },
];

export type PortfolioCategory = {
  name: string;
  percent: number;
  note: string;
};

export type PortfolioProfile = {
  id: "careful" | "balanced" | "aggressive";
  title: string;
  description: string;
  rationale: string;
  categories: PortfolioCategory[];
};

export const portfolioAmounts = [100, 500, 1000];

export const portfolioProfiles: PortfolioProfile[] = [
  {
    id: "careful",
    title: "Осторожно",
    description: "Больше веса у BTC, ETH и резерва в стейблах.",
    rationale:
      "Такой пример снижает долю риск-альтов и оставляет запас в стейблах для спокойных действий в волатильные дни.",
    categories: [
      { name: "BTC", percent: 45, note: "Базовый актив рынка" },
      { name: "ETH", percent: 30, note: "Крупная инфраструктурная позиция" },
      { name: "крупные альты", percent: 10, note: "Ограниченная доля сектора" },
      { name: "риск-альты", percent: 0, note: "Без отдельной доли" },
      { name: "стейблы", percent: 15, note: "Резерв для действий" },
    ],
  },
  {
    id: "balanced",
    title: "Сбалансированно",
    description: "База остается в BTC и ETH, но добавляется больше альтов.",
    rationale:
      "Такой пример дает место крупным альтам, но не убирает резерв и не делает риск-альты основой портфеля.",
    categories: [
      { name: "BTC", percent: 35, note: "Опора портфеля" },
      { name: "ETH", percent: 25, note: "Инфраструктурная база" },
      { name: "крупные альты", percent: 20, note: "Секторная диверсификация" },
      { name: "риск-альты", percent: 5, note: "Небольшая учебная доля" },
      { name: "стейблы", percent: 15, note: "Резерв и гибкость" },
    ],
  },
  {
    id: "aggressive",
    title: "Агрессивно",
    description: "Больше места альтам, но стейблы остаются в структуре.",
    rationale:
      "Такой пример допускает повышенную волатильность и требует дисциплины: заранее понимать доли, лимиты и сценарии пересмотра.",
    categories: [
      { name: "BTC", percent: 25, note: "Базовая доля рынка" },
      { name: "ETH", percent: 20, note: "Крупная инфраструктура" },
      { name: "крупные альты", percent: 25, note: "Секторная экспозиция" },
      { name: "риск-альты", percent: 15, note: "Повышенная волатильность" },
      { name: "стейблы", percent: 15, note: "Резерв на случай рынка" },
    ],
  },
];

export type TokenRisk = "низкий" | "средний" | "высокий";
export type TokenStatus = PublicationStatus;
export type TokenConclusion = "держать" | "ждать" | "не лезть";

export type TokenCard = {
  title: string;
  ticker: string;
  coingeckoId: string;
  sector: string;
  risk: TokenRisk;
  status: TokenStatus;
  statusLabel?: string;
  conclusion: TokenConclusion;
  description: string;
  url: string | null;
  logo: string | null;
};

// Логотипы токенов лучше сверять по CoinGecko, CoinMarketCap или Trust Wallet assets.
// Не использовать случайные или AI-сгенерированные логотипы.
// Если логотип не добавлен локально в /public/tokens/, показываем fallback с тикером.
// CoinGecko IDs для сверки: BTC bitcoin, ETH ethereum, BNB binancecoin,
// LINK chainlink, HYPE hyperliquid, SOL solana, AAVE aave, XRP ripple,
// Render render-token, SUI sui, TAO bittensor, TON the-open-network,
// ONDO ondo-finance, UNI uniswap, JUP jupiter-exchange-solana,
// PENDLE pendle, ENA ethena, AVAX avalanche-2, NEAR near,
// MORPHO morpho, ARB arbitrum, OP optimism, SKY sky, SYRUP syrup,
// AERO aerodrome-finance, SEI sei-network, LDO lido-dao,
// JTO jito-governance-token, PYTH pyth-network.
export const tokens: TokenCard[] = [
  {
    title: "Bitcoin",
    ticker: "BTC",
    coingeckoId: "bitcoin",
    sector: "Store of value",
    risk: "низкий",
    status: "published",
    conclusion: "держать",
    description:
      "Базовый актив крипторынка и главный ориентир для всего рынка.",
    url: "https://t.me/ruscrypto2026/62",
    logo: "/tokens/btc.png",
  },
  {
    title: "Ethereum",
    ticker: "ETH",
    coingeckoId: "ethereum",
    sector: "Smart contracts",
    risk: "низкий",
    status: "published",
    conclusion: "держать",
    description:
      "Ключевая инфраструктура для DeFi, L2, токенов и смарт-контрактов.",
    url: "https://t.me/ruscrypto2026/65",
    logo: "/tokens/eth.png",
  },
  {
    title: "Toncoin",
    ticker: "TON",
    coingeckoId: "the-open-network",
    sector: "L1 / Telegram",
    risk: "средний",
    status: "published",
    conclusion: "ждать",
    description:
      "Экосистема вокруг Telegram с сильным вниманием рынка, но зависимостью от темпа развития приложений.",
    url: "https://t.me/ruscrypto2026/31",
    logo: "/tokens/ton.png",
  },
  {
    title: "Ondo",
    ticker: "ONDO",
    coingeckoId: "ondo-finance",
    sector: "RWA",
    risk: "средний",
    status: "published",
    conclusion: "ждать",
    description:
      "Один из заметных активов RWA-сектора, где важны регуляторика, спрос и качество токеномики.",
    url: "https://t.me/ruscrypto2026/37",
    logo: "/tokens/ondo.png",
  },
  {
    title: "XRP",
    ticker: "XRP",
    coingeckoId: "ripple",
    sector: "Payments",
    risk: "средний",
    status: "published",
    conclusion: "ждать",
    description:
      "Старый крупный актив платежного сектора, который лучше оценивать через новости и рыночный контекст.",
    url: "https://t.me/ruscrypto2026/46",
    logo: "/tokens/xrp.png",
  },
  {
    title: "Render",
    ticker: "RENDER",
    coingeckoId: "render-token",
    sector: "AI / DePIN",
    risk: "высокий",
    status: "published",
    conclusion: "ждать",
    description:
      "Проект на пересечении вычислений и AI, чувствительный к ожиданиям по сектору и общей ликвидности.",
    url: "https://t.me/ruscrypto2026/50",
    logo: "/tokens/render.png",
  },
  {
    title: "Sui",
    ticker: "SUI",
    coingeckoId: "sui",
    sector: "L1",
    risk: "высокий",
    status: "published",
    conclusion: "ждать",
    description:
      "Быстрая L1-сеть с активной экосистемой, где нужно следить за unlocks и реальным использованием.",
    url: "https://t.me/ruscrypto2026/53",
    logo: "/tokens/sui.png",
  },
  {
    title: "Bittensor",
    ticker: "TAO",
    coingeckoId: "bittensor",
    sector: "AI",
    risk: "высокий",
    status: "published",
    conclusion: "не лезть",
    description:
      "Сложный AI-актив с высокой волатильностью и большим количеством технических нюансов.",
    url: "https://t.me/ruscrypto2026/56",
    logo: "/tokens/tao.png",
  },
  {
    title: "Solana",
    ticker: "SOL",
    coingeckoId: "solana",
    sector: "L1",
    risk: "средний",
    status: "published",
    conclusion: "держать",
    description:
      "Крупная L1-экосистема с высокой активностью, где важно смотреть нагрузку сети и качество проектов.",
    url: "https://t.me/ruscrypto2026/69",
    logo: "/tokens/sol.png",
  },
  {
    title: "Aave",
    ticker: "AAVE",
    coingeckoId: "aave",
    sector: "DeFi",
    risk: "средний",
    status: "published",
    conclusion: "держать",
    description:
      "Крупный DeFi-протокол кредитования, который стоит оценивать через TVL, риски и доходность протокола.",
    url: "https://t.me/ruscrypto2026/71",
    logo: "/tokens/aave.png",
  },
  {
    title: "Avalanche",
    ticker: "AVAX",
    coingeckoId: "avalanche-2",
    sector: "L1 / Subnets",
    risk: "средний",
    status: "published",
    conclusion: "ждать",
    description:
      "L1-экосистема с Subnets для отдельных сетей, где важны активность приложений, комиссии, валидаторы и спрос на инфраструктуру.",
    url: "https://t.me/ruscrypto2026/102",
    logo: "/tokens/avax.png",
  },
  {
    title: "NEAR Protocol",
    ticker: "NEAR",
    coingeckoId: "near",
    sector: "L1 / Chain Abstraction",
    risk: "средний",
    status: "published",
    conclusion: "ждать",
    description:
      "L1-платформа, которая делает упор на удобство пользователя, абстракцию сетей и приложения без лишней сложности для новичка.",
    url: "https://t.me/ruscrypto2026/110",
    logo: "/tokens/near.png",
  },
  {
    title: "BNB",
    ticker: "BNB",
    coingeckoId: "binancecoin",
    sector: "Exchange ecosystem",
    risk: "низкий",
    status: "published",
    conclusion: "держать",
    description:
      "Биржевой экосистемный актив, завязанный на активность Binance, BNB Chain и регуляторный фон.",
    url: "https://t.me/ruscrypto2026/81",
    logo: "/tokens/bnb.png",
  },
  {
    title: "Chainlink",
    ticker: "LINK",
    coingeckoId: "chainlink",
    sector: "Oracles",
    risk: "средний",
    status: "published",
    conclusion: "держать",
    description:
      "Ключевой проект оракулов, важный для DeFi и передачи внешних данных в блокчейны.",
    url: "https://t.me/ruscrypto2026/87",
    logo: "/tokens/link.png",
  },
  {
    title: "Hyperliquid",
    ticker: "HYPE",
    coingeckoId: "hyperliquid",
    sector: "DeFi / Perps",
    risk: "высокий",
    status: "published",
    conclusion: "ждать",
    description:
      "Биржевая DeFi-инфраструктура с высокой активностью и повышенной чувствительностью к риску рынка.",
    url: "https://t.me/ruscrypto2026/89",
    logo: "/tokens/hype.png",
  },
  {
    title: "Uniswap",
    ticker: "UNI",
    coingeckoId: "uniswap",
    sector: "DeFi",
    risk: "средний",
    status: "published",
    conclusion: "ждать",
    description:
      "Крупный DEX-протокол, где важны комиссии, управление, конкуренция и регуляторный фон.",
    url: "https://t.me/ruscrypto2026/114",
    logo: "/tokens/uni.png",
  },
  {
    title: "Jupiter",
    ticker: "JUP",
    coingeckoId: "jupiter-exchange-solana",
    sector: "Solana DeFi",
    risk: "высокий",
    status: "published",
    conclusion: "ждать",
    description:
      "Агрегатор в экосистеме Solana, который зависит от активности пользователей и конкуренции внутри DeFi.",
    url: "https://t.me/ruscrypto2026/117",
    logo: "/tokens/jup.png",
  },
  {
    title: "Pendle",
    ticker: "PENDLE",
    coingeckoId: "pendle",
    sector: "DeFi",
    risk: "высокий",
    status: "published",
    conclusion: "ждать",
    description:
      "Сложный DeFi-инструмент вокруг будущей доходности, который требует понимания механики протокола.",
    url: "https://t.me/ruscrypto2026/119",
    logo: "/tokens/pendle.png",
  },
  {
    title: "Ethena",
    ticker: "ENA",
    coingeckoId: "ethena",
    sector: "Stablecoin / DeFi",
    risk: "высокий",
    status: "published",
    conclusion: "не лезть",
    description:
      "Инфраструктура синтетического доллара с особыми рисками стратегии, ликвидности и рыночных стрессов.",
    url: "https://t.me/ruscrypto2026/121",
    logo: "/tokens/ena.png",
  },
  {
    title: "Morpho",
    ticker: "MORPHO",
    coingeckoId: "morpho",
    sector: "DeFi Lending",
    risk: "высокий",
    status: "published",
    conclusion: "ждать",
    description: "Сильный lending-продукт, но что получает токен?",
    url: "https://t.me/ruscrypto2026/150",
    logo: "/tokens/morpho.png",
  },
  {
    title: "Arbitrum",
    ticker: "ARB",
    coingeckoId: "arbitrum",
    sector: "L2 / Orbit / DAO",
    risk: "высокий",
    status: "published",
    conclusion: "ждать",
    description: "Почему ARB — это не просто токен Arbitrum One",
    url: "https://t.me/ruscrypto2026/163",
    logo: "/tokens/arb.jpg",
  },
  {
    title: "Optimism",
    ticker: "OP",
    coingeckoId: "optimism",
    sector: "L2 / Superchain",
    risk: "высокий",
    status: "published",
    conclusion: "ждать",
    description: "Почему OP — это ставка на Superchain, а не только на OP Mainnet",
    url: "https://t.me/ruscrypto2026/175",
    logo: null,
  },
  {
    title: "Sky",
    ticker: "SKY",
    coingeckoId: "sky",
    sector: "Stablecoin DeFi / RWA",
    risk: "средний",
    status: "in_progress",
    statusLabel: "В процессе",
    conclusion: "ждать",
    description: "Stablecoin/DeFi cash-flow через USDS, sUSDS и Spark",
    url: null,
    logo: "/tokens/sky.jpg",
  },
  {
    title: "Syrup",
    ticker: "SYRUP",
    coingeckoId: "syrup",
    sector: "RWA Credit / DeFi",
    risk: "высокий",
    status: "in_progress",
    statusLabel: "В процессе",
    conclusion: "ждать",
    description: "Maple/RWA credit и ставка на токенизированный кредит",
    url: null,
    logo: "/tokens/SYRUP.png",
  },
  {
    title: "Aerodrome Finance",
    ticker: "AERO",
    coingeckoId: "aerodrome-finance",
    sector: "Base DEX / DeFi",
    risk: "высокий",
    status: "in_progress",
    statusLabel: "В процессе",
    conclusion: "ждать",
    description: "DEX и liquidity hub экосистемы Base",
    url: null,
    logo: "/tokens/aero.png",
  },
  {
    title: "Sei",
    ticker: "SEI",
    coingeckoId: "sei-network",
    sector: "L1 / Trading infrastructure",
    risk: "высокий",
    status: "in_progress",
    statusLabel: "В процессе",
    conclusion: "ждать",
    description: "High-performance L1 и trading-infra тезис",
    url: null,
    logo: "/tokens/SEI.png",
  },
  {
    title: "Lido DAO",
    ticker: "LDO",
    coingeckoId: "lido-dao",
    sector: "Liquid staking",
    risk: "средний",
    status: "in_progress",
    statusLabel: "В процессе",
    conclusion: "ждать",
    description: "Liquid staking: сильный продукт, но сложный token capture",
    url: null,
    logo: "/tokens/Ldo.png",
  },
  {
    title: "Jito",
    ticker: "JTO",
    coingeckoId: "jito-governance-token",
    sector: "Solana staking / MEV",
    risk: "высокий",
    status: "in_progress",
    statusLabel: "В процессе",
    conclusion: "ждать",
    description: "Solana liquid staking и MEV/tips-инфраструктура",
    url: null,
    logo: "/tokens/jto.png",
  },
  {
    title: "Pyth Network",
    ticker: "PYTH",
    coingeckoId: "pyth-network",
    sector: "Oracle / Data layer",
    risk: "высокий",
    status: "in_progress",
    statusLabel: "В процессе",
    conclusion: "ждать",
    description: "Oracle/data layer для DeFi, perps и ончейн-рынков",
    url: null,
    logo: "/tokens/pyth.png",
  },
];

const watchlistTokenOrder = [
  "OP",
  "MORPHO",
  "ARB",
  "SKY",
  "SYRUP",
  "AERO",
  "SEI",
  "LDO",
  "JTO",
  "PYTH",
  "TON",
  "XRP",
  "ENA",
] as const;
const watchlistTokenTickers = new Set<string>(watchlistTokenOrder);
const watchlistGuideOverrides: Record<string, Partial<GuideItem>> = {
  ARB: {
    title: "ARB: DAO, Orbit, AEP и value capture",
    slug: "arb-orbit-aep-value-capture",
    tags: ["ARB", "L2", "Orbit", "DAO", "Watchlist"],
    isNew: true,
  },
  MORPHO: {
    title: "MORPHO",
    slug: "morpho-token-review",
    tags: ["MORPHO", "DeFi", "Lending", "Watchlist"],
    isNew: true,
  },
  OP: {
    title: "OP: Superchain/OP Stack, а не просто OP Mainnet",
    slug: "op-superchain-op-stack",
    tags: ["OP", "L2", "Superchain", "OP Stack", "Watchlist"],
    isNew: true,
  },
  AERO: {
    slug: "aero-watchlist",
    tags: ["Base", "DEX", "DeFi", "Watchlist"],
    statusLabel: "В процессе",
  },
  JTO: {
    slug: "jto-watchlist",
    tags: ["Solana", "Liquid staking", "MEV", "Watchlist"],
    statusLabel: "В процессе",
  },
  LDO: {
    slug: "ldo-watchlist",
    tags: ["Liquid staking", "ETH", "DeFi", "Watchlist"],
    statusLabel: "В процессе",
  },
  PYTH: {
    slug: "pyth-watchlist",
    tags: ["Oracle", "Data", "DeFi", "Watchlist"],
    statusLabel: "В процессе",
  },
  SEI: {
    slug: "sei-watchlist",
    tags: ["L1", "Trading", "Infrastructure", "Watchlist"],
    statusLabel: "В процессе",
  },
  SKY: {
    slug: "sky-watchlist",
    tags: ["Stablecoins", "DeFi", "RWA", "Watchlist"],
    statusLabel: "В процессе",
  },
  SYRUP: {
    slug: "syrup-watchlist",
    tags: ["RWA", "Credit", "DeFi", "Watchlist"],
    statusLabel: "В процессе",
  },
};

function tokenToGuideItem(token: TokenCard, overrides: Partial<GuideItem> = {}): GuideItem {
  return {
    coingeckoId: token.coingeckoId,
    description: token.description,
    difficulty:
      token.risk === "низкий"
        ? "Новичок"
        : token.risk === "средний"
          ? "Средний"
          : "Продвинутый",
    kind: "token",
    logo: token.logo,
    sector: token.sector,
    status: token.status,
    statusLabel: token.statusLabel ?? (token.status === "in_progress" ? "В процессе" : undefined),
    ticker: token.ticker,
    title: `${token.ticker} · ${token.title}`,
    url: token.url,
    ...overrides,
  };
}

export const guideSections: GuideSection[] = [
  ...baseGuideSections.map((section) =>
    section.id === "watchlist"
      ? {
          ...section,
          items: [
            ...section.items,
            ...watchlistTokenOrder
              .map((ticker) => tokens.find((token) => token.ticker === ticker))
              .filter((token): token is TokenCard => Boolean(token))
              .map((token) => tokenToGuideItem(token, watchlistGuideOverrides[token.ticker])),
          ],
        }
      : section,
  ),
  {
    id: "token-reviews",
    tabLabel: "Разборы токенов",
    title: "Разборы токенов",
    description:
      "Краткие разборы проектов: что делает токен, где риск, какие метрики смотреть и почему не стоит покупать только из-за хайпа.",
    items: tokens
      .filter((token) => !watchlistTokenTickers.has(token.ticker))
      .map((token) => tokenToGuideItem(token)),
  },
];

export type MoreItem = {
  title: string;
  description: string;
  url: string | null;
  internalUrl?: string;
  links?: Array<{
    href: string;
    kind: "external" | "telegram";
    label: string;
    preserveMiniApp?: boolean;
  }>;
  disclaimer?: string;
  preserveMiniApp?: boolean;
  status: PublicationStatus;
};

export const moreItems: MoreItem[] = [
  {
    title: "Календарь рисков",
    description:
      "События на неделю, которые могут повлиять на BTC, ETH и альткоины.",
    url: null,
    internalUrl: "/risk-calendar",
    status: "published",
  },
  {
    title: "Словарь новичка",
    description:
      "FOMO, DYOR, ATH, FDV, TVL, unlock и другие термины простыми словами.",
    url: null,
    internalUrl: "/glossary",
    status: "published",
  },
  {
    title: "Виртуальная карта",
    description:
      "Внутренний разбор Wanttopay: для чего нужна виртуальная карта, как использовать аккуратно и какие ограничения помнить.",
    url: null,
    internalUrl: "/virtual-card",
    status: "published",
  },
  {
    title: "Поддержать канал",
    description: "Проголосовать за канал и помочь развитию проекта.",
    url: "https://t.me/boost/ruscrypto2026",
    preserveMiniApp: true,
    status: "published",
  },
  {
    title: "Акции и бонусы",
    description:
      "Партнёрские акции бирж без обещаний доходности. Бонусы обычно завязаны на условия, депозит или активность.",
    url: null,
    internalUrl: "/bonuses",
    status: "published",
  },
];
