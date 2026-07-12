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
  recommendedNote?: string;
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
      "Для BTC в этой модели стейкинг не используется. Рабочий подход — холодное хранение.",
    recommendedNote:
      "Не стейкаю. Любая доходность на BTC — это обёртка поверх моста, lending-схемы или чужого контракта. Ради 1–3% брать риск потери базового актива не готов. BTC — холодный кошелёк.",
    options: [
      {
        name: "Холодное хранение",
        type: "Без стейкинга",
        aprLabel: "0%",
        linkLabel: "Не требуется",
        url: "",
        risks: [
          "нет доходности",
          "ответственность за seed phrase",
          "риск потери доступа к холодному кошельку",
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
    recommendedNote:
      "Рабочий вариант — stETH / wstETH через Lido. Доходность скромная, ориентир около 2.2% APR, зато это доходность от Ethereum staking, а не премия за страхование чужого протокола. Для быстрого выхода можно использовать swap stETH → ETH, но перед выходом нужно проверить курс, ликвидность и комиссию. Aave WETH staking для ETH-части как оборонного актива не основной вариант.",
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
          "при swap-выходе возможны slippage и комиссия",
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
          "smart-contract risk",
          "Aave protocol risk",
          "possible slashing / списание части депозита при shortfall-событии Aave",
          "это не классический Ethereum validator staking",
          "доходность — компенсация за принятие протокольного риска",
        ],
        note:
          "Aave WETH staking даёт более высокий ориентир доходности, но это не бесплатный бонус. Участник страхует протокол своими деньгами: при shortfall-событии часть депозита может быть списана для покрытия дефицита.",
      },
    ],
  },
  {
    token: "SOL",
    tokenName: "Solana",
    summary:
      "Для SOL показать два варианта, как в Phantom: liquid staking и native staking.",
    recommendedNote:
      "Рабочий вариант — PSOL через Phantom. Доходность выше нативного staking, а выход гибче через swap на Jupiter. Нативный staking проще по слоям риска, но вывод занимает 2–3 дня, поэтому для гибкости PSOL выглядит удобнее.",
    options: [
      {
        name: "Ликвидный стейкинг SOL",
        type: "Liquid staking",
        aprLabel: "Ориентир по Phantom: около 6.17% APY",
        linkLabel: "Phantom / liquid staking",
        url: "https://phantom.app/",
        exitTerms:
          "Выход через swap, например через Jupiter; по сверке комиссия около 0.1%, но перед выходом нужно проверить rate, fee и slippage.",
        receiveToken: "LST, например PSOL или аналогичный токен в интерфейсе Phantom",
        risks: [
          "LST risk",
          "smart-contract/provider risk",
          "depeg/liquidity risk",
          "swap fee/slippage",
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
        exitTerms: "Вывод обычно 2–3 дня, зависит от эпохи Solana.",
        receiveToken: "Нативная stake-позиция SOL",
        risks: [
          "validator risk",
          "задержка вывода 2–3 дня",
          "APY меняется",
          "ниже гибкость, чем у liquid staking",
        ],
        note:
          "Нативный staking проще по слоям риска, но менее гибкий по выходу.",
      },
    ],
  },
  {
    token: "AAVE",
    tokenName: "Aave",
    summary:
      "AAVE можно использовать в продуктах Aave, но это уже protocol-specific risk, а не простой стейкинг без риска.",
    recommendedNote:
      "Стейкать можно, но не весь объём. Главный минус — длинный выход: 20 дней cooldown и ещё 2 дня окно вывода. Даже если legacy stkAAVE slashing отключён на время перехода, сам локап слишком длинный под быстрый горизонт.",
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
        exitTerms: "Cooldown 20 дней, затем 2-дневное окно вывода.",
        risks: [
          "slashing до 20% в Umbrella-модели",
          "cooldown 20 дней",
          "2-дневное окно вывода",
          "smart-contract risk",
          "governance/protocol parameter risk",
          "условия могут меняться",
        ],
        note:
          "Legacy stkAAVE slashing сейчас отключён на время перехода на Umbrella, но новая модель предполагает slashing до 20%. Это не безрисковый staking, а участие в защите протокола.",
      },
    ],
  },
  {
    token: "BNB",
    tokenName: "BNB",
    summary:
      "Для BNB есть liquid staking через Lista DAO и нативный стейкинг BNB Chain.",
    recommendedNote:
      "Рабочий вариант — нативный staking BNB, но не весь объём. Доходность выше, чем у многих базовых staking-вариантов, но 7 дней unbonding ограничивают гибкость.",
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
          "depeg/liquidity risk",
          "protocol risk Lista",
          "выход через swap зависит от ликвидности",
          "условия APY меняются",
        ],
        note:
          "slisBNB растёт в цене по ставке стейкинга BNB. Это удобнее, чем ждать анбондинг, но появляется риск liquid staking слоя.",
      },
      {
        name: "Нативный стейкинг BNB Chain",
        type: "Native staking",
        aprLabel: "Ориентир: около 3.78% APY, проверить актуально",
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
    recommendedNote:
      "Рабочий вариант — stLINK через stake.link, ориентир около 5.35% APY. Перед входом обязательно смотреть глубину пула stLINK/LINK: на небольшой сумме swap может пройти нормально, на крупной будет проскальзывание.",
    options: [
      {
        name: "stLINK / stake.link",
        type: "Liquid staking",
        aprLabel: "Ориентир: около 5.35% APY",
        linkLabel: "stake.link",
        url: "https://app.stake.link/stake/link",
        exitTerms: "Выход возможен через swap stLINK/LINK, но на крупных суммах может быть slippage. Если буфера протокола не хватает, протокольный вывод может занять до 7 дней.",
        receiveToken: "stLINK",
        risks: [
          "смарт-контрактный риск",
          "риск stLINK/LINK depeg",
          "тонкая ликвидность пула",
          "slippage на крупных суммах",
          "ожидание вывода до 7 дней при исчерпании буфера",
          "APY меняется",
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
      "У UNI нет простого нативного staking для держателей. Реальный вариант доходности — LP-пулы, но это уже не staking.",
    recommendedNote:
      "Не стейкаю. У UNI нет обычного staking. LP-пулы — это отдельный риск: impermanent loss, диапазоны ликвидности и зависимость от объёмов торгов. Для этой модели UNI лучше держать ликвидным.",
    options: [
      {
        name: "Uniswap pools",
        type: "Не staking, а liquidity providing",
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
    recommendedNote:
      "Один из лучших вариантов в списке по сочетанию доходности и выхода. Рабочий вариант — stHYPE через Valantis. При выходе предпочтительнее сначала смотреть Instant через STEX AMM; Delayed — это очередь до ~7 дней.",
    options: [
      {
        name: "stHYPE / Valantis",
        type: "Protocol staking",
        aprLabel: "Ориентир: около 2.28% APY",
        linkLabel: "HYPE staking / Valantis docs",
        url: "https://docs.valantis.xyz/staked-amm/swap",
        exitTerms: "Delayed — до ~7 дней через протокольную очередь Hyperliquid. Instant — мгновенный выход через STEX AMM за динамическую комиссию.",
        receiveToken: "Staked HYPE / protocol receipt, проверить в интерфейсе",
        risks: [
          "protocol risk",
          "smart-contract risk",
          "STEX AMM fee",
          "liquidity/rate risk для instant exit",
          "APY меняется",
        ],
        note:
          "По сверке на 11.07.2026: Instant swap через STEX AMM проходил примерно 1:1 с небольшой динамической комиссией. Это не гарантия будущих условий — перед выходом нужно проверить текущий rate и fee.",
      },
    ],
  },
  {
    token: "TAO",
    tokenName: "Bittensor",
    summary:
      "TAO — нативное некастодиальное делегирование: токены не покидают кошелёк, анбондинга нет, но важен выбор валидатора и действует лимит операций примерно раз в 72 минуты.",
    recommendedNote:
      "Рабочий вариант — нативное делегирование TAO. Главный плюс — анбондинга нет, забрать можно почти сразу; ограничение — одна операция примерно раз в 72 минуты. Основной валидатор — tao.bot: 0% комиссии и крупнейший TVL. Более консервативная альтернатива — Taostats and Corcel.",
    options: [
      {
        name: "tao.bot validator",
        type: "TAO delegation",
        aprLabel:
          "Ориентир по данным на 12.07.2026: 21.06% reward rate, 0% комиссия, TVL $304.29M",
        linkLabel: "tao.bot",
        url: "https://tao.bot/",
        exitTerms: "Анбондинга нет; действует операционный лимит примерно одна операция раз в 72 минуты.",
        risks: [
          "validator performance risk",
          "reward rate меняется",
          "комиссия валидатора может меняться",
          "ecosystem risk TAO",
          "операционный лимит примерно 72 минуты",
        ],
        note:
          "По текущим метрикам tao.bot выглядит сильным вариантом: высокая reward rate, 0% комиссия, крупный TVL как прокси доверия.",
      },
      {
        name: "Taostats / Corcel",
        type: "TAO delegation",
        aprLabel:
          "Ориентир по данным на 12.07.2026: 16.76% reward rate, 9% комиссия, TVL $156.59M",
        linkLabel: "Taostats FAQ",
        url: "https://docs.taostats.io/docs/faq",
        exitTerms: "Анбондинга нет; действует операционный лимит примерно одна операция раз в 72 минуты.",
        risks: [
          "validator risk",
          "reward rate меняется",
          "комиссия валидатора может меняться",
          "ecosystem risk TAO",
          "операционный лимит примерно 72 минуты",
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
    recommendedNote:
      "sENA можно использовать, но не на весь объём. Есть 7 дней cooldown. Быстрый выход через Uniswap возможен, но пул может быть тонким. Реальный поток доходности от fee switch пока требует проверки, поэтому ENA не должен быть полностью заблокирован в staking.",
    options: [
      {
        name: "sENA",
        type: "Protocol stake / vault-like accrual",
        aprLabel: "Ориентир: около 3.8% APY, проверить актуально",
        linkLabel: "Ethena",
        url: "https://app.ethena.fi/",
        exitTerms: "7 дней cooldown. Быстрый выход возможен через swap sENA → ENA на Uniswap, но пул может быть тонким: на малой сумме swap может пройти нормально, на крупной будет slippage.",
        receiveToken: "sENA",
        risks: [
          "smart-contract risk",
          "7 дней cooldown",
          "тонкая ликвидность sENA/ENA",
          "slippage",
          "blacklist/compliance roles",
          "reward-discretion risk",
          "реальный поток от fee switch в sENA может быть не подтверждён",
          "цифры доходности могут сильно меняться",
        ],
        note:
          "Это не классический staking с фиксированной выплатой. Нужно проверять текущий статус распределений в официальных docs/интерфейсе.",
      },
    ],
  },
  {
    token: "RENDER",
    tokenName: "Render",
    summary: "У RENDER нет нативного staking для держателей.",
    recommendedNote:
      "Не стейкаю. Нативного staking у держателей RENDER нет. Возможен только гибкий Earn на CEX, но это custodial risk и зависит от условий биржи.",
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
    recommendedNote:
      "Стейкать можно, но не весь объём. JUP ASR — это не вклад под процент: награды дают за участие в голосованиях DAO. Если не голосовать, можно не получить ничего, даже если токены застейканы. Анстейк — около 7 дней.",
    options: [
      {
        name: "JUP ASR staking",
        type: "DAO staking / ASR",
        aprLabel: "Награды ASR переменные и завязаны на участие в голосованиях DAO",
        linkLabel: "Jupiter Vote",
        url: "https://vote.jup.ag/",
        exitTerms: "Unstake около 7 дней",
        risks: [
          "variable rewards",
          "governance participation requirement",
          "7 дней unstake",
          "DAO rule changes",
          "APY нельзя считать фиксированным",
        ],
        note:
          "Это не процент на вклад. Награды ASR завязаны на участие в голосованиях DAO; если не голосовать, награды можно не получить.",
      },
    ],
  },
  {
    token: "PENDLE",
    tokenName: "Pendle",
    summary:
      "sPENDLE даёт участие в buyback-механике, но короткий горизонт может быть невыгоден.",
    recommendedNote:
      "sPENDLE имеет смысл только не на весь объём и не на короткий горизонт. Вывод 14 дней, либо мгновенно со штрафом 5%. На коротком горизонте штраф может съесть годовую доходность — математика не сходится.",
    options: [
      {
        name: "sPENDLE",
        type: "Protocol staking / buyback-linked staking",
        aprLabel: "Доход из buyback, до 80% выручки протокола, проверить актуально",
        linkLabel: "sPENDLE",
        url: "https://app.pendle.finance/spendle/stake/in",
        exitTerms: "14 дней или мгновенно со штрафом 5%.",
        receiveToken: "sPENDLE",
        risks: [
          "smart-contract risk",
          "protocol revenue risk",
          "14 дней ожидания",
          "instant exit penalty 5%",
          "buyback/revenue может меняться",
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
    recommendedNote:
      "Один из лучших вариантов по сочетанию доходности и ликвидности. Рабочий вариант — Sky Staking Engine через DeFi Saver: ориентир 5.69% APY, награды в USDS, локапа нет, вывод в любой момент. Заём USDS под застейканный SKY не использовать: это добавляет риск ликвидации.",
    options: [
      {
        name: "Sky Staking Engine via DeFi Saver",
        type: "Protocol staking via DeFi Saver",
        aprLabel: "Ориентир: около 5.69% APY",
        linkLabel: "DeFi Saver Sky Stake",
        url: "https://app.defisaver.com/sky/stake",
        exitTerms: "Локапа нет, вывод в любой момент.",
        receiveToken: "Награды в USDS.",
        risks: [
          "smart-contract risk",
          "DeFi Saver integration risk",
          "protocol risk Sky",
          "APY меняется",
          "если брать заём под позицию, появляется liquidation risk",
          "app.sky.money не использовать как основной фронтенд, если он недоступен из-за анти-VPN/регионального детекта",
        ],
        note:
          "Использовать DeFi Saver как рабочий доступный фронтенд. Официальный app.sky.money не использовать в интерфейсе из-за анти-VPN детекта.",
      },
    ],
  },
];
