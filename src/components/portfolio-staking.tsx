"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import {
  portfolioStakingOptions,
  stakingReadingNotes,
  stakingTokenFilterOptions,
  type PortfolioStakingAsset,
  type StakingOption,
  type StakingTokenFilter,
} from "@/lib/portfolio/stakingOptions";
import { openExternalLink } from "@/lib/telegramLinks";

const allTokensFilter: StakingTokenFilter = "ALL";

function chipLabel(token: StakingTokenFilter) {
  return token === allTokensFilter ? "Все токены" : token;
}

function searchableText(asset: PortfolioStakingAsset) {
  return [
    asset.token,
    asset.tokenName,
    asset.summary,
    ...asset.options.flatMap((option) => [
      option.name,
      option.type,
      option.aprLabel,
      option.receiveToken,
      option.note,
      option.linkLabel,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function SourceButton({ option }: { option: StakingOption }) {
  if (!option.url) {
    return (
      <span className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-zinc-400">
        {option.linkLabel}
      </span>
    );
  }

  return (
    <button
      className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.1] px-3 text-sm font-bold text-emerald-100 transition hover:bg-emerald-300/[0.16]"
      onClick={() => openExternalLink(option.url)}
      type="button"
    >
      Проверить условия
    </button>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm leading-5 text-zinc-200">{value}</p>
    </div>
  );
}

function StakingOptionCard({ option }: { option: StakingOption }) {
  return (
    <article className="mini-card min-w-0 p-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="break-words text-base font-black text-white">
            {option.name}
          </h4>
          <p className="mt-1 text-sm font-semibold text-emerald-100">
            {option.type}
          </p>
        </div>
        <SourceButton option={option} />
      </div>

      <div className="mt-3 grid gap-2">
        <DetailRow label="APY/APR" value={option.aprLabel} />
        <DetailRow label="Выход" value={option.exitTerms} />
        <DetailRow label="Что получаете" value={option.receiveToken} />
      </div>

      <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-200/80">
          Риски
        </p>
        <ul className="mt-2 space-y-1 text-sm leading-5 text-amber-50/90">
          {option.risks.map((risk) => (
            <li className="break-words" key={risk}>
              - {risk}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 break-words text-sm leading-6 text-zinc-300">
        {option.note}
      </p>
      {option.reliabilityNote ? (
        <p className="mt-2 break-words text-sm leading-6 text-zinc-400">
          {option.reliabilityNote}
        </p>
      ) : null}
    </article>
  );
}

function StakingAssetCard({ asset }: { asset: PortfolioStakingAsset }) {
  return (
    <section className="app-card min-w-0 p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-xl font-black text-white">
              {asset.token}
            </h3>
            {asset.tokenName ? (
              <StatusBadge tone="neutral">{asset.tokenName}</StatusBadge>
            ) : null}
          </div>
          <p className="mt-2 break-words text-sm leading-6 text-zinc-400">
            {asset.summary}
          </p>
        </div>
      </div>

      {asset.generalWarning ? (
        <p className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-2 text-sm leading-5 text-cyan-50">
          {asset.generalWarning}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3">
        {asset.options.map((option) => (
          <StakingOptionCard key={`${asset.token}-${option.name}`} option={option} />
        ))}
      </div>
    </section>
  );
}

export function PortfolioStaking() {
  const [selectedToken, setSelectedToken] =
    useState<StakingTokenFilter>(allTokensFilter);
  const [query, setQuery] = useState("");

  const visibleAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return portfolioStakingOptions.filter((asset) => {
      const matchesToken =
        selectedToken === allTokensFilter || asset.token === selectedToken;
      const matchesQuery =
        !normalizedQuery || searchableText(asset).includes(normalizedQuery);

      return matchesToken && matchesQuery;
    });
  }, [query, selectedToken]);

  return (
    <div className="space-y-5">
      <section className="app-card p-4">
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-zinc-200 transition hover:bg-white/[0.07]"
          href="/portfolio"
        >
          Назад в портфель
        </Link>
        <div className="mt-4">
          <StatusBadge tone="green">Справка</StatusBadge>
          <h1 className="mt-3 text-2xl font-black text-white">Стейкинг</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Где можно получать доходность по активам из подготовленного портфеля.
            С учётом рисков, комиссий и сроков вывода.
          </p>
        </div>
      </section>

      <section className="rounded-[22px] border border-amber-300/25 bg-amber-300/[0.08] p-4">
        <h2 className="text-lg font-black text-amber-50">Важно</h2>
        <p className="mt-2 text-sm leading-6 text-amber-50/90">
          Это не рекомендация и не гарантия доходности. Список основан на
          рабочем отборе инструментов с упором на понятность, ликвидность выхода
          и уровень риска. Возможно, в других местах APY выше, но там может быть
          больше риск, сложность или хуже выход из позиции. Перед действием
          проверяйте актуальные условия, комиссии сети и сроки вывода.
        </p>
        <p className="mt-3 text-sm leading-6 text-amber-50/90">
          Если актив лежит на CEX, учитывайте комиссию вывода и комиссию сети.
          На маленьких суммах доходность стейкинга может не покрыть расходы на
          перевод туда-обратно.
        </p>
        <p className="mt-3 rounded-2xl border border-amber-200/20 bg-black/15 px-3 py-2 text-sm font-bold text-amber-50">
          Данные и ссылки сверены: 12.07.2026
        </p>
      </section>

      <section className="app-card p-4">
        <h2 className="text-lg font-black text-white">Как читать этот раздел</h2>
        <div className="mt-3 grid gap-2">
          {stakingReadingNotes.map((note) => (
            <div
              className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm leading-5 text-zinc-300"
              key={note}
            >
              {note}
            </div>
          ))}
        </div>
      </section>

      <section className="app-card p-4">
        <h2 className="text-lg font-black text-white">Фильтр токена</h2>
        <label className="mt-3 block">
          <span className="mb-2 block text-sm font-medium text-zinc-300">
            Поиск
          </span>
          <input
            className="search-input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Например, uni или Solana"
            type="search"
            value={query}
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {stakingTokenFilterOptions.map((token) => {
            const active = token === selectedToken;

            return (
              <button
                aria-pressed={active}
                className={`min-h-10 shrink-0 rounded-2xl border px-3 text-sm font-bold transition ${
                  active
                    ? "border-transparent bg-gradient-to-br from-teal-200 to-emerald-300 text-[#06201b] shadow-lg shadow-emerald-950/20"
                    : "border-white/10 bg-black/20 text-zinc-300 hover:bg-white/[0.06]"
                }`}
                key={token}
                onClick={() => setSelectedToken(token)}
                type="button"
              >
                {chipLabel(token)}
              </button>
            );
          })}
        </div>
      </section>

      {visibleAssets.length > 0 ? (
        <div className="grid gap-4">
          {visibleAssets.map((asset) => (
            <StakingAssetCard asset={asset} key={asset.token} />
          ))}
        </div>
      ) : (
        <section className="app-card p-4 text-sm leading-6 text-zinc-400">
          По этому фильтру ничего не найдено. Попробуйте тикер или название
          токена.
        </section>
      )}
    </div>
  );
}
