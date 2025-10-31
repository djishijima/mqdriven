export const normalizeFormCode = (raw: string): string | null => {
  const k = (raw || '').toUpperCase().trim();
  const map: Record<string,string> = {
    EXPENSE:'EXP', TRANSPORT:'TRP', TRAVEL:'TRP', LEAVE:'LEV', APPROVAL:'APL', DAILY:'DLY', WEEKLY:'WKR',
    EXP:'EXP', TRP:'TRP', LEV:'LEV', APL:'APL', DLY:'DLY', WKR:'WKR'
  };
  return map[k] ?? null;
};
