const TWO_DECIMAL_CURRENCIES = new Set(["INR", "USD"]);

function normalizeAmount(value: string | number | bigint): bigint {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return 0n;
    }
    return BigInt(Math.trunc(value));
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return 0n;
  }
  try {
    return BigInt(trimmed);
  } catch {
    return 0n;
  }
}

export function formatMoney(
  amountBigint: string | number | bigint,
  currency: string,
): string {
  const normalizedCurrency = (currency || "INR").toUpperCase();
  const raw = normalizeAmount(amountBigint);
  const decimals = TWO_DECIMAL_CURRENCIES.has(normalizedCurrency) ? 2 : 2;
  const divisor = 10n ** BigInt(decimals);
  const major = raw / divisor;
  const minor = raw % divisor;

  const absoluteMajor = major < 0n ? -major : major;
  const absoluteMinor = minor < 0n ? -minor : minor;
  const minorPadded = absoluteMinor.toString().padStart(decimals, "0");
  const sign = raw < 0n ? "-" : "";
  const numeric = `${sign}${absoluteMajor.toString()}.${minorPadded}`;
  const numberValue = Number(numeric);

  if (Number.isFinite(numberValue)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numberValue);
  }

  return `${normalizedCurrency} ${numeric}`;
}
