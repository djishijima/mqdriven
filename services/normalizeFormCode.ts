export const normalizeFormCode = (raw: string): string | null => {
  if (!raw) return null;
  const k = raw.toUpperCase().trim();

  const map: Record<string, string> = {
    APL:"APL", DLY:"DLY", EXP:"EXP", LEV:"LEV", TRP:"TRP", WKR:"WKR",
    EXP:"EXP", TRP:"TRP", TRP:"TRP",
    LEV:"LEV", APL:"APL", DLY:"DLY", WKR:"WKR",
  };

  return map[k] ?? null;
};
