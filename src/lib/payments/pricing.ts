import "server-only";

function readIntegerEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name]);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export const CHECK_PACKAGES = {
  single: {
    checks: readIntegerEnv("CHECKS_SINGLE_COUNT", 1),
    description: "Одна расширенная проверка ENA в чеклисте.",
    packageId: "single_check",
    stars: readIntegerEnv("STARS_SINGLE_CHECK_PRICE", 5),
    title: "1 проверка токена",
  },
  pack5: {
    checks: readIntegerEnv("CHECKS_PACK_COUNT", 5),
    description: "Пять расширенных проверок ENA в чеклисте.",
    packageId: "five_checks",
    stars: readIntegerEnv("STARS_FIVE_CHECKS_PRICE", 20),
    title: "5 проверок токенов",
  },
} as const;

export type CheckPackage = (typeof CHECK_PACKAGES)[keyof typeof CHECK_PACKAGES];
export type CheckPackageId = CheckPackage["packageId"];

export function getCheckPackage(packageId: string | null | undefined) {
  return Object.values(CHECK_PACKAGES).find((item) => item.packageId === packageId) ?? null;
}
