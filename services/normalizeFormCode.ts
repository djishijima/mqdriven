const sanitize = (value: string) => value.toUpperCase().trim().replace(/[\s_-]+/g, '');

export const normalizeFormCode = (raw: string): string | null => {
<<<<<<< ours
  const k = (raw || '').toUpperCase().trim();
  const map: Record<string,string> = {
    EXPENSE:'EXP', TRANSPORT:'TRP', TRAVEL:'TRP', LEAVE:'LEV',
    APPROVAL:'APL', DAILY:'DLY', WEEKLY:'WKR',
    EXP:'EXP', TRP:'TRP', LEV:'LEV', APL:'APL', DLY:'DLY', WKR:'WKR'
=======
  if (!raw) {
    return null;
  }

  const upper = raw.toUpperCase().trim();
  const key = sanitize(raw);

  const map: Record<string, string> = {
    // Expense reimbursement
    EXP: 'EXP',
    EXPENSE: 'EXP',
    EXPENSES: 'EXP',
    EXPENSEREPORT: 'EXP',
    EXPENSEREIMBURSEMENT: 'EXP',
    EXPENSEFORM: 'EXP',
    EXPENSEAPPLICATION: 'EXP',
    EXPENSECLAIM: 'EXP',
    CODEEXP: 'EXP',
    KEIHISEISAN: 'EXP',
    '経費精算': 'EXP',
    '経費申請': 'EXP',

    // Transport / travel expense
    TRP: 'TRP',
    TRANSPORT: 'TRP',
    TRANSPORTATION: 'TRP',
    TRANSPORTEXPENSE: 'TRP',
    TRAVELEXPENSE: 'TRP',
    TRANSPORTFORM: 'TRP',
    TRANSPORTAPPLICATION: 'TRP',
    CODETRP: 'TRP',
    KOUTSUUHI: 'TRP',
    '交通費申請': 'TRP',
    '交通費精算': 'TRP',
    '旅費交通費': 'TRP',

    // Leave application
    LEV: 'LEV',
    LEAVE: 'LEV',
    LEAVEAPPLICATION: 'LEV',
    VACATION: 'LEV',
    HOLIDAY: 'LEV',
    CODELEV: 'LEV',
    KYUUKA: 'LEV',
    '休暇申請': 'LEV',
    '有給申請': 'LEV',

    // Approval request / ringi
    APL: 'APL',
    APPROVAL: 'APL',
    APPROVALREQUEST: 'APL',
    RINGI: 'APL',
    CODEAPL: 'APL',
    '稟議申請': 'APL',
    '稟議': 'APL',

    // Daily report
    DLY: 'DLY',
    DAILY: 'DLY',
    DAILYREPORT: 'DLY',
    NIPPOU: 'DLY',
    CODEDLY: 'DLY',
    '日報': 'DLY',

    // Weekly report
    WKR: 'WKR',
    WEEKLY: 'WKR',
    WEEKLYREPORT: 'WKR',
    SHUUHOU: 'WKR',
    CODEWKR: 'WKR',
    '週報': 'WKR',
>>>>>>> theirs
  };

  return map[key] ?? map[upper] ?? null;
};
