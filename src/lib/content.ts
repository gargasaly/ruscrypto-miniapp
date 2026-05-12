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

export type NavIcon = "home" | "guides" | "portfolio" | "tokens" | "more";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/guides", label: "Гайды", icon: "guides" },
  { href: "/portfolio", label: "Портфель", icon: "portfolio" },
  { href: "/tokens", label: "Токены", icon: "tokens" },
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
    href: "/guides?tab=start",
  },
  {
    title: "🏦 Биржи и первые действия",
    description:
      "Как купить крипту, не ошибиться с сетью, комиссией и не полезть во фьючерсы раньше времени.",
    href: "/guides?tab=exchange",
  },
  {
    title: "📊 Рынок и фундамент",
    description:
      "Разберись, что двигает рынок: BTC, ETH, доминация, индикаторы, сектора и ончейн-инструменты.",
    links: [
      { label: "Анализ рынка", href: "/guides?tab=market" },
      { label: "Фундамент и сектора", href: "/guides?tab=fundamentals" },
    ],
  },
];

export type Difficulty = "Новичок" | "Средний" | "Продвинутый";
export type PublicationStatus = "published" | "soon";

export type GuideItem = {
  title: string;
  description: string;
  url: string | null;
  difficulty: Difficulty;
  status: PublicationStatus;
};

export type GuideSection = {
  id: string;
  tabLabel: string;
  title: string;
  description: string;
  items: GuideItem[];
};

export const guideSections: GuideSection[] = [
  {
    id: "start",
    tabLabel: "Старт",
    title: "Старт без потерь",
    description:
      "Первые шаги, базовая безопасность и правила, которые помогают новичку не потерять деньги в крипте.",
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
    ],
  },
  {
    id: "exchange",
    tabLabel: "Биржи",
    title: "Биржи и первые действия",
    description: "Покупка, спот, комиссии и аккуратная практика",
    items: [
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
    id: "market",
    tabLabel: "Анализ",
    title: "Анализ рынка",
    description: "Инструменты, индикаторы и контекст без лишней суеты",
    items: [
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
    ],
  },
  {
    id: "fundamentals",
    tabLabel: "Фундамент",
    title: "Фундамент и сектора",
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
        url: null,
        difficulty: "Средний",
        status: "soon",
      },
      {
        title: "Chain Abstraction и Intents",
        description:
          "Как крипта становится проще для пользователя: intent-подход, абстракция сетей, скрытие мостов и UX без ручного выбора блокчейна.",
        url: null,
        difficulty: "Средний",
        status: "soon",
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
// PENDLE pendle, ENA ethena, AVAX avalanche-2, NEAR near.
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
    ticker: "RNDR",
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
    status: "soon",
    conclusion: "ждать",
    description:
      "L1-экосистема с Subnets для отдельных сетей, где важны активность приложений, комиссии, валидаторы и спрос на инфраструктуру.",
    url: null,
    logo: "/tokens/avax.png",
  },
  {
    title: "NEAR Protocol",
    ticker: "NEAR",
    coingeckoId: "near",
    sector: "L1 / Chain Abstraction",
    risk: "средний",
    status: "soon",
    conclusion: "ждать",
    description:
      "L1-платформа, которая делает упор на удобство пользователя, абстракцию сетей и приложения без лишней сложности для новичка.",
    url: null,
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
    status: "soon",
    conclusion: "ждать",
    description:
      "Крупный DEX-протокол, где важны комиссии, управление, конкуренция и регуляторный фон.",
    url: null,
    logo: "/tokens/uni.png",
  },
  {
    title: "Jupiter",
    ticker: "JUP",
    coingeckoId: "jupiter-exchange-solana",
    sector: "Solana DeFi",
    risk: "высокий",
    status: "soon",
    conclusion: "ждать",
    description:
      "Агрегатор в экосистеме Solana, который зависит от активности пользователей и конкуренции внутри DeFi.",
    url: null,
    logo: "/tokens/jup.png",
  },
  {
    title: "Pendle",
    ticker: "PENDLE",
    coingeckoId: "pendle",
    sector: "DeFi",
    risk: "высокий",
    status: "soon",
    conclusion: "ждать",
    description:
      "Сложный DeFi-инструмент вокруг будущей доходности, который требует понимания механики протокола.",
    url: null,
    logo: "/tokens/pendle.png",
  },
  {
    title: "Ethena",
    ticker: "ENA",
    coingeckoId: "ethena",
    sector: "Stablecoin / DeFi",
    risk: "высокий",
    status: "soon",
    conclusion: "не лезть",
    description:
      "Инфраструктура синтетического доллара с особыми рисками стратегии, ликвидности и рыночных стрессов.",
    url: null,
    logo: "/tokens/ena.png",
  },
];

export type MoreItem = {
  title: string;
  description: string;
  url: string | null;
  internalUrl?: string;
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
    title: "Чеклист перед покупкой токена",
    description:
      "Проверь токен перед покупкой: сектор, цена, объём, хайп, unlocks и риски.",
    url: null,
    internalUrl: "/token-checklist",
    status: "published",
  },
  {
    title: "Тест ссылок",
    description: "Проверка открытия постов и закрытия Mini App.",
    url: null,
    internalUrl: "/link-test",
    status: "published",
  },
  {
    title: "Поддержать канал",
    description: "Проголосовать за канал и помочь развитию проекта.",
    url: "https://t.me/boost/ruscrypto2026",
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
  {
    title: "Watchlist",
    description: "За какими активами и уровнями следим.",
    url: null,
    status: "soon",
  },
];
