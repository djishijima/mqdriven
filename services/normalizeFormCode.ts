export const normalizeFormCode = (raw: string): string | null => {
  const m: Record<string,string> = {
    EXPENSE:'EXP', TRANSPORT:'TRP', TRAVEL:'TRP',
    LEAVE:'LEV',   APPROVAL:'APL',  DAILY:'DLY', WEEKLY:'WKR',
    EXP:'EXP', TRP:'TRP', LEV:'LEV', APL:'APL', DLY:'DLY', WKR:'WKR'
  };
  const k = (raw || '').toUpperCase().trim();
  return m[k] ?? null;
};
