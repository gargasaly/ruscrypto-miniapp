export type StakingOption = {
  name: string;
  type: string;
  aprLabel?: string;
  linkLabel: string;
  url: string;
  exitTerms?: string;
  receiveToken?: string;
  risks: string[];
  note: string;
  reliabilityNote?: string;
};

export type PortfolioStakingAsset = {
  token: string;
  tokenName?: string;
  summary: string;
  options: StakingOption[];
  generalWarning?: string;
};

export const stakingTokenFilterOptions = [
  "ALL",
  "BTC",
  "ETH",
  "SOL",
  "AAVE",
  "BNB",
  "LINK",
  "UNI",
  "HYPE",
  "TAO",
  "ENA",
  "RENDER",
  "JUP",
  "PENDLE",
  "SKY",
] as const;

export type StakingTokenFilter = (typeof stakingTokenFilterOptions)[number];

export const stakingReadingNotes = [
  "APY/APR - ориентир, а не обещание.",
  "Чем выше доходность, тем внимательнее смотрим на риск.",
  "Liquid staking удобнее, но добавляет риск LST/depeg.",
  "Native staking проще, но часто есть задержка вывода.",
  "LP-пулы - это не стейкинг, там есть impermanent loss.",
  "Для маленьких сумм всегда считайте комиссии вывода с CEX и комиссии сети.",
] as const;

export const portfolioStakingOptions: PortfolioStakingAsset[] = [
  {
    token: "BTC",
    tokenName: "Bitcoin",
    summary:
      "Для BTC в этой модели стейкинг не используется. Рабочий подход - хранение на холодном кошельке.",
    options: [
      {
        name: "Холодное хранение",
        type: "Без стейкинга",
        aprLabel: "0%",
        linkLabel: "Не требуется",
        url: "",
        risks: [
          "нет доходности",
          "ответственность за seed phrase и хранение",
          "нельзя терять доступ к кошельку",
        ],
        note:
          "BTC - базовый актив портфеля. Для новичка безопаснее не гнаться за доходностью на BTC, а хранить его отдельно и не отдавать в сомнительные wrapped/lending-схемы.",
      },
    ],
  },
  {
    token: "ETH",
    tokenName: "Ethereum",
    summary:
      "Для ETH базовый вариант - liquid staking через крупный LST. Более сложные protocol staking/revenue-share варианты подходят только после понимания смарт-контрактных рисков.",
    options: [
      {
        name: "Lido stETH / wstETH",
        type: "Liquid staking",
        aprLabel:
          "Ориентир: около 2.2% APR по калькулятору; виджет может показывать earn up to 3.9% APY",
        linkLabel: "Lido",
        url: "https://lido.fi/",
        exitTerms: "Фиксированный срок не указан; вывод через withdrawal queue",
        receiveToken: "stETH / wstETH",
        risks: [
          "смарт-контрактный риск",
          "риск node-operator set",
          "риск depeg stETH к ETH",
          "очередь на вывод",
        ],
        note:
          "LST-слой над Ethereum validators. Это не CEX-стейкинг, но риск смарт-контракта остаётся.",
      },
      {
        name: "Aave WETH staking",
        type: "Protocol staking / revenue share",
        aprLabel: "Ориентир: около 4.99% APR, проверить актуально",
        linkLabel: "Aave",
        url: "https://app.aave.com/",
        exitTerms: "Срок зависит от текущих условий продукта",
        receiveToken: "Receipt-позиция в Aave staking",
        risks: [
          "смарт-контрактный риск",
          "протокол-специфический риск Aave",
          "условия могут меняться",
          "это не классический Ethereum validator staking",
        ],
        note:
          "Это отдельный Aave-продукт, а не нативный ETH staking.",
      },
    ],
  },
  {
    token: "SOL",
    tokenName: "Solana",
    summary:
      "Для SOL показать два варианта, как в Phantom: liquid staking и native staking.",
    options: [
      {
        name: "Ликвидный стейкинг SOL",
        type: "Liquid staking",
        aprLabel: "Ориентир по Phantom: около 6.17% APY",
        linkLabel: "Phantom / liquid staking",
        url: "https://phantom.app/",
        exitTerms:
          "Выход зависит от конкретного LST/провайдера; часто возможен swap, но условия нужно проверять",
        receiveToken: "LST, например PSOL или аналогичный токен в интерфейсе Phantom",
        risks: [
          "смарт-контрактный риск",
          "риск LST depeg",
          "риск провайдера",
          "комиссия swap/выхода",
          "APY меняется",
        ],
        note:
          "Более гибкий вариант: можно получать ликвидный токен и использовать его дальше. Для новичка удобнее, но рисков больше, чем у нативного стейкинга.",
      },
      {
        name: "Нативный стейкинг SOL",
        type: "Native staking",
        aprLabel: "Ориентир по Phantom: около 5.44% APY",
        linkLabel: "Phantom / native staking",
        url: "https://phantom.app/",
        exitTerms: "Есть период активации/деактивации Solana stake account",
        receiveToken: "Нативная stake-позиция SOL",
        risks: [
          "validator risk",
          "unbonding/deactivation delay",
          "APY меняется",
          "актив не такой гибкий, как liquid staking",
        ],
        note:
          "Более простой и консервативный вариант для SOL: меньше DeFi-слоёв, но ниже гибкость.",
      },
    ],
  },
  {
    token: "AAVE",
    tokenName: "Aave",
    summary:
      "AAVE можно использовать в продуктах Aave, но это уже protocol-specific risk, а не простой стейкинг без риска.",
    options: [
      {
        name: "Aave Pro",
        type: "Aave ecosystem / institutional product",
        aprLabel: "Проверить актуальные условия",
        linkLabel: "Aave Pro",
        url: "https://pro.aave.com/",
        exitTerms: "Зависит от продукта",
        risks: [
          "протокольный риск",
          "смарт-контрактный риск",
          "условия продукта могут отличаться от обычного Aave",
          "не подходит без понимания механики",
        ],
        note:
          "Добавить как справочный вариант, но не продвигать как простой стейкинг.",
      },
      {
        name: "Aave Safety Module",
        type: "Safety module / protocol staking",
        aprLabel: "Проверить актуальный APR в интерфейсе",
        linkLabel: "Aave Safety Module",
        url: "https://app.aave.com/safety-module/",
        exitTerms: "Есть cooldown/slashing mechanics, проверить в интерфейсе",
        risks: [
          "slashing risk",
          "смарт-контрактный риск",
          "cooldown на выход",
          "доходность меняется",
        ],
        note:
          "Это не безрисковый стейкинг. Доходность начисляется за участие в защите протокола, но вместе с ней принимается slashing-риск.",
      },
    ],
  },
  {
    token: "BNB",
    tokenName: "BNB",
    summary:
      "Для BNB есть liquid staking через Lista DAO и нативный стейкинг BNB Chain.",
    options: [
      {
        name: "slisBNB / Lista DAO",
        type: "Liquid staking",
        aprLabel: "Проверить актуальный APY",
        linkLabel: "Lista DAO",
        url: "https://lista.org/",
        exitTerms: "Выход через swap/ликвидность, условия нужно проверять",
        receiveToken: "slisBNB",
        risks: [
          "смарт-контрактный риск",
          "риск LST",
          "риск ликвидности выхода",
          "риск depeg",
          "условия APY меняются",
        ],
        note:
          "slisBNB растёт в цене по ставке стейкинга BNB. Это удобнее, чем ждать анбондинг, но появляется риск liquid staking слоя.",
      },
      {
        name: "Нативный стейкинг BNB Chain",
        type: "Native staking",
        aprLabel: "Ориентир: около 0.92% APY",
        linkLabel: "BNB Chain Staking",
        url: "https://www.bnbchain.org/en/staking",
        exitTerms: "Около 7 дней unbonding",
        risks: [
          "validator risk",
          "7-дневный анбондинг",
          "APY низкий и меняется",
          "на маленьких суммах комиссии могут съесть смысл",
        ],
        note:
          "Более простой вариант, но доходность невысокая и выход не мгновенный.",
      },
    ],
  },
  {
    token: "LINK",
    tokenName: "Chainlink",
    summary:
      "Для LINK рабочий вариант - stLINK через stake.link, но важно понимать риск ликвидности выхода.",
    options: [
      {
        name: "stLINK / stake.link",
        type: "Liquid staking",
        aprLabel: "Ориентир: около 5.35% APY",
        linkLabel: "stake.link",
        url: "https://app.stake.link/stake/link",
        exitTerms: "Выход может идти через swap на Curve",
        receiveToken: "stLINK",
        risks: [
          "смарт-контрактный риск",
          "риск stLINK/LINK depeg",
          "риск ликвидности Curve pool",
          "APY меняется",
          "выход зависит от рынка",
        ],
        note:
          "Удобный способ получить staking exposure на LINK, но перед входом нужно проверить ликвидность stLINK/LINK.",
      },
      {
        name: "Curve stLINK/LINK pool",
        type: "Exit / liquidity pool",
        aprLabel: "Не основной источник доходности; использовать для проверки ликвидности",
        linkLabel: "Curve",
        url: "https://curve.fi/",
        exitTerms: "Swap зависит от ликвидности и slippage",
        risks: [
          "slippage",
          "pool liquidity risk",
          "smart-contract risk Curve",
        ],
        note:
          "Нужен не как обязательный стейкинг, а как место проверки выхода из stLINK.",
      },
    ],
  },
  {
    token: "UNI",
    tokenName: "Uniswap",
    summary:
      "Для UNI нет простого безопасного нативного стейкинга. Реальный вариант - liquidity pool на Uniswap, но это уже LP-риск.",
    options: [
      {
        name: "Uniswap pools",
        type: "Liquidity providing",
        aprLabel: "Доходность зависит от пула и комиссий",
        linkLabel: "Uniswap Pools",
        url: "https://app.uniswap.org/explore/pools/ethereum",
        exitTerms: "Выход через закрытие LP-позиции",
        risks: [
          "impermanent loss",
          "smart-contract risk",
          "риск неправильного выбора диапазона",
          "доходность зависит от объёма торгов",
          "это не классический staking",
        ],
        note:
          "Показывать только как вариант для опытных пользователей. Для новичка UNI лучше не стейкать автоматически, а сначала понять LP-механику.",
      },
    ],
  },
  {
    token: "HYPE",
    tokenName: "Hyperliquid",
    summary:
      "HYPE выглядит одной из более удобных staking-позиций в списке из-за доходности и режима Instant через STEX AMM.",
    options: [
      {
        name: "HYPE staking",
        type: "Protocol staking",
        aprLabel: "Ориентир: около 2.28% APY",
        linkLabel: "HYPE staking / Valantis docs",
        url: "https://docs.valantis.xyz/staked-amm/swap",
        exitTerms: "Около 3 дней; есть Instant через встроенный STEX AMM",
        receiveToken: "Staked HYPE / protocol receipt, проверить в интерфейсе",
        risks: [
          "protocol risk",
          "smart-contract risk",
          "STEX AMM fee",
          "APY меняется",
          "ликвидность Instant-выхода зависит от механики AMM",
        ],
        note:
          "По сверке на 11.07.2026: Instant swap через STEX AMM проходил примерно 1:1 с небольшой динамической комиссией. Это не гарантия будущих условий — перед выходом нужно проверить текущий rate и fee в интерфейсе.",
      },
    ],
  },
  {
    token: "TAO",
    tokenName: "Bittensor",
    summary:
      "TAO стейкинг/делегирование некастодиальный: токены не покидают кошелёк, но важен выбор валидатора.",
    options: [
      {
        name: "tao.bot validator",
        type: "TAO delegation",
        aprLabel:
          "Ориентир по данным на 12.07.2026: 21.06% reward rate, 0% комиссия, TVL $304.29M",
        linkLabel: "tao.bot",
        url: "https://tao.bot/",
        exitTerms: "Проверить актуальные условия в кошельке/интерфейсе",
        risks: [
          "validator performance risk",
          "параметры reward/commission могут меняться",
          "экосистемный риск TAO",
          "высокий reward rate не гарантирует будущую доходность",
        ],
        note:
          "По текущим метрикам tao.bot выглядит сильным вариантом: высокая reward rate, 0% комиссия, крупный TVL как прокси доверия.",
      },
      {
        name: "Taostats / Corcel",
        type: "TAO delegation",
        aprLabel:
          "Ориентир по данным на 12.07.2026: валидатор #3, 16.76% reward rate, 9% комиссия, TVL $156.59M",
        linkLabel: "Taostats FAQ",
        url: "https://docs.taostats.io/docs/faq",
        exitTerms: "Проверить актуальные условия",
        risks: [
          "validator risk",
          "комиссия валидатора",
          "reward rate меняется",
          "данные нужно проверять перед делегированием",
        ],
        note:
          "Taostats FAQ рекомендует Taostats and Corcel как безопасный выбор для новичков.",
      },
      {
        name: "Список валидаторов",
        type: "Validator list",
        aprLabel: "Для проверки альтернативных валидаторов",
        linkLabel: "Validator list",
        url: "https://subnetalpha.ai/validators",
        risks: [
          "нужно самостоятельно сравнить reward rate, комиссию и TVL",
          "метрики валидаторов меняются",
        ],
        note:
          "Использовать как справочник для сравнения валидаторов перед делегированием.",
      },
    ],
  },
  {
    token: "ENA",
    tokenName: "Ethena",
    summary:
      "sENA - это не классический процент в токене, а vault-like accrual model с отдельными рисками.",
    options: [
      {
        name: "sENA",
        type: "Protocol stake / vault-like accrual",
        aprLabel: "Ориентир: около 3.8% APY, проверить актуально",
        linkLabel: "Ethena",
        url: "https://app.ethena.fi/",
        exitTerms: "7 дней unstake cooldown; docs также показывают отдельный 7-day unlock flow",
        receiveToken: "sENA",
        risks: [
          "smart-contract risk",
          "cooldown",
          "blacklist/compliance roles",
          "reward-discretion risk",
          "distributions may be discretionary",
          "APY не гарантирован",
        ],
        note:
          "Это не классический staking с фиксированной выплатой. Нужно проверять текущий статус распределений в официальных docs/интерфейсе.",
      },
    ],
  },
  {
    token: "RENDER",
    tokenName: "Render",
    summary: "Для RENDER в этом списке использовать только гибкий стейкинг на бирже.",
    options: [
      {
        name: "Flexible staking on CEX",
        type: "CEX flexible earn",
        aprLabel: "Проверить актуальный APY на бирже",
        linkLabel: "Биржа, где хранится RENDER",
        url: "",
        exitTerms: "Обычно гибкий вывод, но зависит от биржи",
        risks: [
          "custodial risk",
          "риск биржи",
          "APY может быстро меняться",
          "условия могут отличаться по регионам",
          "комиссии вывода могут съесть доходность",
        ],
        note:
          "Не отправлять RENDER в сложные DeFi-схемы ради маленького процента. Если актив уже на бирже, можно смотреть только гибкий earn.",
      },
    ],
  },
  {
    token: "JUP",
    tokenName: "Jupiter",
    summary: "JUP staking связан с DAO/ASR и переменными наградами.",
    options: [
      {
        name: "JUP ASR staking",
        type: "DAO staking / ASR",
        aprLabel: "Награды переменные, проверить текущий цикл",
        linkLabel: "Jupiter Vote",
        url: "https://vote.jup.ag/",
        exitTerms: "Unstake около 7 дней",
        risks: [
          "variable rewards",
          "governance participation risk",
          "cooldown на unstake",
          "награды зависят от правил DAO",
          "APY нельзя считать фиксированным",
        ],
        note:
          "Подходит тем, кто понимает DAO-механику Jupiter. Это не банковский вклад и не фиксированный staking.",
      },
    ],
  },
  {
    token: "PENDLE",
    tokenName: "Pendle",
    summary:
      "sPENDLE даёт участие в buyback-механике, но короткий горизонт может быть невыгоден.",
    options: [
      {
        name: "sPENDLE",
        type: "Protocol staking / buyback-linked staking",
        aprLabel: "Доход из buyback, до 80% выручки протокола, проверить актуально",
        linkLabel: "sPENDLE",
        url: "https://app.pendle.finance/spendle/stake/in",
        exitTerms: "14 дней или мгновенно за 5% штраф",
        receiveToken: "sPENDLE",
        risks: [
          "smart-contract risk",
          "protocol revenue risk",
          "14 дней ожидания",
          "instant exit с 5% штрафом",
          "на коротком горизонте экономически невыгодно",
        ],
        note:
          "Смысл есть только при понимании Pendle и горизонте дольше короткой спекуляции.",
      },
    ],
  },
  {
    token: "SKY",
    tokenName: "Sky",
    summary:
      "Для SKY использовать Sky Staking Engine через DeFi Saver, потому что официальный app.sky.money недоступен из-за анти-VPN детекта.",
    options: [
      {
        name: "Sky Staking Engine via DeFi Saver",
        type: "Protocol staking via DeFi Saver",
        aprLabel: "Ориентир: около 5.69% APY",
        linkLabel: "DeFi Saver Sky Stake",
        url: "https://app.defisaver.com/sky/stake",
        exitTerms: "Проверить актуальные условия в интерфейсе",
        risks: [
          "smart-contract risk",
          "DeFi Saver integration risk",
          "protocol risk Sky",
          "APY меняется",
          "интерфейсы могут быть недоступны из-за региона/VPN",
        ],
        note:
          "Использовать DeFi Saver как рабочий доступный фронтенд. Официальный app.sky.money не использовать в интерфейсе из-за анти-VPN детекта.",
      },
    ],
  },
];
