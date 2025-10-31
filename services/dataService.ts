import { v4 as uuidv4 } from 'uuid';
import type { AuthUser } from '@supabase/supabase-js';
import { createDemoDataState, DemoDataState } from './demoData.ts';
import {
  EmployeeUser,
  Job,
  Customer,
  JournalEntry,
  User,
  AccountItem,
  Lead,
  AllocationDivision,
  AnalysisHistory,
  Application,
  ApplicationCode,
  ApplicationWithDetails,
  ApprovalRoute,
  BugReport,
  BugReportStatus,
  Department,
  Employee,
  Estimate,
  EstimateLineItem,
  EstimateStatus,
  InboxItem,
  InboxItemStatus,
  InventoryItem,
  Invoice,
  InvoiceData,
  InvoiceItem,
  InvoiceStatus,
  JobStatus,
  LeadStatus,
  MailOpenStatus,
  ManufacturingStatus,
  MasterAccountItem,
  PaymentRecipient,
  PostalInfo,
  PostalStatus,
  Project,
  ProjectAttachment,
  ProjectStatus,
  PurchaseOrder,
  PurchaseOrderStatus,
  Title,
  Toast,
  TrackingInfo,
  UUID,
  ConfirmationDialogProps,
} from '../types.ts';

type MinimalAuthUser = Pick<AuthUser, 'id'> & {
  email?: string | null;
  user_metadata?: { [key: string]: any; full_name?: string | null } | null;
};

const DEMO_AUTH_USER: MinimalAuthUser = {
  id: 'demo-user',
  email: 'demo.user@mqprint.co.jp',
  user_metadata: { full_name: 'デモユーザー' },
};

export const createDemoAuthUser = (): MinimalAuthUser => ({
  ...DEMO_AUTH_USER,
  user_metadata: DEMO_AUTH_USER.user_metadata
    ? { ...DEMO_AUTH_USER.user_metadata }
    : undefined,
});

const demoState: DemoDataState = createDemoDataState();

let projects: Project[] = [
  {
    id: uuidv4(),
    projectName: '秋季キャンペーンプロジェクト',
    customerName: '株式会社ネオプリント',
    customerId: demoState.customers[0]?.id,
    status: ProjectStatus.InProgress,
    overview: '秋季キャンペーン向け販促物一式の制作と配送を行うプロジェクトです。',
    extracted_details: '主要 deliverables: チラシ、ポスター、SNSバナー。スケジュールは10月末まで。',
    createdAt: '2025-09-20T08:00:00Z',
    updatedAt: '2025-10-01T09:00:00Z',
    userId: demoState.employeeUsers[0]?.id || 'user-001',
    attachments: [],
    relatedEstimates: demoState.estimates.filter(
      (est) => est.customerName === '株式会社ネオプリント'
    ),
    relatedJobs: demoState.jobs.filter((job) => job.clientName === '株式会社ネオプリント'),
  },
  {
    id: uuidv4(),
    projectName: '新製品カタログ刷新',
    customerName: '株式会社リンクス',
    customerId: demoState.customers[2]?.id,
    status: ProjectStatus.New,
    overview: '2026年度版カタログの刷新に向けたコンテンツ整理とデザイン制作。',
    extracted_details: '最新製品ラインナップの取材、撮影、デザイン制作。納品予定は11月下旬。',
    createdAt: '2025-10-10T03:30:00Z',
    updatedAt: '2025-10-10T03:30:00Z',
    userId: demoState.employeeUsers[1]?.id || 'user-002',
    attachments: [],
    relatedEstimates: [],
    relatedJobs: [],
  },
];
let allocationDivisions: AllocationDivision[] = [
    { id: 'alloc-1', name: '営業部配賦', isActive: true, createdAt: '2024-01-05T00:00:00Z' },
    { id: 'alloc-2', name: '製造部配賦', isActive: true, createdAt: '2024-01-05T00:00:00Z' },
];
let titles: Title[] = [
    { id: 'title-1', name: '部長', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
    { id: 'title-2', name: '課長', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
    { id: 'title-3', name: '主任', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
];
let analysisHistory: AnalysisHistory[] = [];
let nextEstimateNumber = Math.max(0, ...demoState.estimates.map(est => est.estimateNumber)) + 1;


const deepClone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const findById = <T extends { id: string }>(
  collection: T[],
  id: string,
  entityName: string
): T => {
  const item = collection.find((it) => it.id === id);
  if (!item) {
    throw new Error(`${entityName} with ID ${id} not found`);
  }
  return item;
};

function calculateEstimateTotals(items: EstimateLineItem[], taxInclusive: boolean) {
  let subtotal = 0;
  let taxTotal = 0;
  const normalized = items.map((it) => {
    const rowSubtotal = it.qty * it.unitPrice;
    const rate = it.taxRate ?? 0.1;
    const rowTax = taxInclusive ? Math.round(rowSubtotal - rowSubtotal / (1 + rate)) : Math.round(rowSubtotal * rate);
    const rowTotal = taxInclusive ? rowSubtotal : rowSubtotal + rowTax;
    subtotal += rowSubtotal;
    taxTotal += rowTax;
    return {
      ...it,
      subtotal: Math.round(rowSubtotal),
      taxAmount: rowTax,
      total: rowTotal,
    };
  });
  const grandTotal = taxInclusive ? Math.round(subtotal) : Math.round(subtotal + taxTotal);
  return { items: normalized, subtotal: Math.round(subtotal), taxTotal, grandTotal };
}

const mapApplicationDetails = (app: Application): ApplicationWithDetails => ({
    ...app,
    applicant: demoState.employeeUsers.find(u => u.id === app.applicantId),
    applicationCode: demoState.applicationCodes.find(code => code.id === app.applicationCodeId),
    approvalRoute: demoState.approvalRoutes.find(route => route.id === app.approvalRouteId),
});


export const isSupabaseUnavailableError = (error: any): boolean => {
  if (!error) return false;
  const message = typeof error === 'string' ? error : error.message || error.details || error.error_description;
  if (!message) return false;
  return /fetch failed/i.test(message) || /failed to fetch/i.test(message) || /network/i.test(message);
};

export const resolveUserSession = async (authUser: MinimalAuthUser): Promise<EmployeeUser> => {
  const fallbackEmail = authUser.email ?? '';
  const existing = demoState.employeeUsers.find(user => user.id === authUser.id || (!!fallbackEmail && user.email === fallbackEmail));
  if (existing) {
    return deepClone(existing);
  }

  const newUser: EmployeeUser = {
    id: authUser.id,
    name: authUser.user_metadata?.full_name || fallbackEmail || 'ゲストユーザー',
    email: fallbackEmail || `${uuidv4()}@example.com`,
    department: null,
    title: null,
    role: 'user',
    createdAt: new Date().toISOString(),
    canUseAnythingAnalysis: true,
  };

  demoState.employeeUsers.push(newUser);
  demoState.employees.push({
    id: uuidv4(),
    name: newUser.name,
    department: newUser.department ?? '',
    title: newUser.title ?? '',
    hireDate: new Date().toISOString(),
    salary: 0,
    createdAt: new Date().toISOString(),
  });

  return deepClone(newUser);
};

export const getUsers = async (): Promise<EmployeeUser[]> => deepClone(demoState.employeeUsers);

export const addUser = async (input: {
  name: string;
  email: string | null;
  role: 'admin' | 'user';
  canUseAnythingAnalysis?: boolean;
  department?: string | null;
  title?: string | null;
}): Promise<EmployeeUser> => {
  const now = new Date().toISOString();
  const newUser: EmployeeUser = {
    id: uuidv4(),
    name: input.name,
    email: input.email ?? '',
    role: input.role,
    department: input.department ?? null,
    title: input.title ?? null,
    createdAt: now,
    canUseAnythingAnalysis: input.canUseAnythingAnalysis ?? true,
  };
  
  demoState.employeeUsers.push(newUser);
  demoState.employees.push({
    id: uuidv4(),
    name: newUser.name,
    department: newUser.department ?? '',
    title: newUser.title ?? '',
    hireDate: now,
    salary: 0,
    createdAt: now,
  });

  return deepClone(newUser);
};

export const updateUser = async (id: string, updates: Partial<EmployeeUser>): Promise<EmployeeUser> => {
  const target = findById(demoState.employeeUsers, id, 'ユーザー');
  Object.assign(target, updates);
  
  const employee = demoState.employees.find(emp => emp.name === target.name);
  if (employee) {
    employee.department = updates.department ?? employee.department;
    employee.title = updates.title ?? employee.title;
  }
  return deepClone(target);
};

export const deleteUser = async (id: string): Promise<void> => {
  const removed = demoState.employeeUsers.find(user => user.id === id);
  demoState.employeeUsers = demoState.employeeUsers.filter(user => user.id !== id);
  if (removed) {
    demoState.employees = demoState.employees.filter(emp => emp.name !== removed.name);
  }
};

export const getJobs = async (): Promise<Job[]> => deepClone(demoState.jobs);

export const addJob = async (job: Partial<Job>): Promise<Job> => {
  const now = new Date().toISOString();
  const newJob: Job = {
    id: uuidv4(),
    jobNumber: job.jobNumber ?? Math.floor(Math.random() * 100000),
    clientName: job.clientName ?? '新規顧客',
    title: job.title ?? '新規案件',
    status: job.status ?? demoState.jobs[0]?.status ?? JobStatus.Pending,
    dueDate: job.dueDate ?? now.substring(0, 10),
    quantity: job.quantity ?? 1,
    paperType: job.paperType ?? '',
    finishing: job.finishing ?? '',
    details: job.details ?? '',
    createdAt: now,
    price: job.price ?? 0,
    variableCost: job.variableCost ?? 0,
    invoiceStatus: job.invoiceStatus ?? InvoiceStatus.Uninvoiced,
    invoicedAt: job.invoicedAt ?? null,
    paidAt: job.paidAt ?? null,
    readyToInvoice: job.readyToInvoice ?? false,
    invoiceId: job.invoiceId ?? null,
    manufacturingStatus: job.manufacturingStatus,
    projectId: job.projectId,
    projectName: job.projectName,
    userId: job.userId,
  };
  demoState.jobs.push(newJob);
  return deepClone(newJob);
};

export const updateJob = async (id: string, updates: Partial<Job>): Promise<Job> => {
  const job = findById(demoState.jobs, id, '案件');
  Object.assign(job, updates);
  return deepClone(job);
};

export const deleteJob = async (id: string): Promise<void> => {
  demoState.jobs = demoState.jobs.filter(job => job.id !== id);
};

export const updateJobReadyToInvoice = async (id: string, ready: boolean): Promise<Job> => {
    const job = findById(demoState.jobs, id, '案件');
    job.readyToInvoice = ready;
    return deepClone(job);
};

export const createInvoiceFromJobs = async (jobIds: string[]): Promise<Invoice> => {
    if (jobIds.length === 0) {
      throw new Error('請求対象の案件が選択されていません。');
    }
    const jobs = jobIds.map(id => findById(demoState.jobs, id, '案件'));
    const customerName = jobs[0].clientName;
    if (!jobs.every(job => job.clientName === customerName)) {
      throw new Error('同じ顧客の案件のみまとめて請求できます。');
    }
    
    const subtotal = jobs.reduce((sum, job) => sum + (job.price ?? 0), 0);
    const taxAmount = Math.round(subtotal * 0.1);
    const totalAmount = subtotal + taxAmount;
    const now = new Date();
    const invoiceId = uuidv4();

    const items: InvoiceItem[] = jobs.map((job, index) => ({
        id: uuidv4(),
        invoiceId,
        jobId: job.id,
        description: job.title,
        quantity: 1,
        unit: '式',
        unitPrice: job.price ?? 0,
        lineTotal: job.price ?? 0,
        sortIndex: index,
    }));
    
    const invoice: Invoice = {
        id: invoiceId,
        invoiceNo: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getTime()}`,
        invoiceDate: now.toISOString().slice(0, 10),
        customerName,
        subtotalAmount: subtotal,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        status: 'issued',
        createdAt: now.toISOString(),
        items,
    };
    
    demoState.invoices.push(invoice);
    
    jobs.forEach(job => {
        job.invoiceStatus = InvoiceStatus.Invoiced;
        job.invoiceId = invoiceId;
        job.invoicedAt = now.toISOString();
        job.readyToInvoice = false;
    });

    return deepClone(invoice);
};

export const getCustomers = async (): Promise<Customer[]> => deepClone(demoState.customers);

export const addCustomer = async (customer: Partial<Customer>): Promise<Customer> => {
    const newCustomer: Customer = {
      id: uuidv4(),
      customerName: customer.customerName ?? '名称未設定',
      createdAt: customer.createdAt ?? new Date().toISOString(),
      representative: customer.representative,
      phoneNumber: customer.phoneNumber,
      address1: customer.address1,
      companyContent: customer.companyContent,
      annualSales: customer.annualSales,
      employeesCount: customer.employeesCount,
      note: customer.note,
      infoSalesActivity: customer.infoSalesActivity,
      infoRequirements: customer.infoRequirements,
      infoHistory: customer.infoHistory,
      postNo: customer.postNo,
      address2: customer.address2,
      fax: customer.fax,
      closingDay: customer.closingDay,
      monthlyPlan: customer.monthlyPlan,
      payDay: customer.payDay,
      recoveryMethod: customer.recoveryMethod,
      userId: customer.userId,
      name2: customer.name2,
      websiteUrl: customer.websiteUrl,
      zipCode: customer.zipCode,
      foundationDate: customer.foundationDate,
      capital: customer.capital,
      customerRank: customer.customerRank,
      customerDivision: customer.customerDivision,
      salesType: customer.salesType,
      creditLimit: customer.creditLimit,
      payMoney: customer.payMoney,
      bankName: customer.bankName,
      branchName: customer.branchName,
      accountNo: customer.accountNo,
      salesUserCode: customer.salesUserCode,
      startDate: customer.startDate,
      endDate: customer.endDate,
      drawingDate: customer.drawingDate,
      salesGoal: customer.salesGoal,
      infoSalesIdeas: customer.infoSalesIdeas,
      customerContactInfo: customer.customerContactInfo,
      aiAnalysis: customer.aiAnalysis ?? null,
    };
    demoState.customers.push(newCustomer);
    return deepClone(newCustomer);
};

export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<Customer> => {
    const customer = findById(demoState.customers, id, '顧客');
    Object.assign(customer, updates);
    return deepClone(customer);
};

export const getJournalEntries = async (): Promise<JournalEntry[]> => deepClone(demoState.journalEntries);

export const addJournalEntry = async (entry: Omit<JournalEntry, 'id'>): Promise<JournalEntry> => {
    const lastEntry = demoState.journalEntries[demoState.journalEntries.length - 1];
    const newEntry: JournalEntry = {
        ...entry,
        id: (lastEntry?.id ?? 0) + 1,
    };
    demoState.journalEntries.push(newEntry);
    return deepClone(newEntry);
};

export const getAccountItems = async (): Promise<AccountItem[]> => deepClone(demoState.accountItems);

export const getActiveAccountItems = async (): Promise<AccountItem[]> => deepClone(demoState.accountItems.filter(item => item.isActive));

export const saveAccountItem = async (item: Partial<AccountItem>): Promise<AccountItem> => {
    if (item.id) {
      const existing = findById(demoState.accountItems, item.id, '勘定科目');
      Object.assign(existing, item, { updatedAt: new Date().toISOString() });
      return deepClone(existing);
    }
    const now = new Date().toISOString();
    const newItem: AccountItem = {
      id: uuidv4(),
      code: item.code ?? `ACCT-${demoState.accountItems.length + 1}`,
      name: item.name ?? '新規勘定科目',
      categoryCode: item.categoryCode ?? '',
      isActive: item.isActive ?? true,
      sortOrder: item.sortOrder ?? demoState.accountItems.length,
      createdAt: now,
      updatedAt: now,
    };
    demoState.accountItems.push(newItem);
    return deepClone(newItem);
};

export const deactivateAccountItem = async (id: string): Promise<AccountItem> => {
    const item = findById(demoState.accountItems, id, '勘定科目');
    item.isActive = false;
    item.updatedAt = new Date().toISOString();
    return deepClone(item);
};

export const getLeads = async (): Promise<Lead[]> => deepClone(demoState.leads);

export const addLead = async (lead: Partial<Lead>): Promise<Lead> => {
    const now = new Date().toISOString();
    const newLead: Lead = {
      id: uuidv4(),
      status: lead.status ?? LeadStatus.New,
      createdAt: now,
      name: lead.name ?? '無名',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      company: lead.company ?? '',
      source: lead.source ?? '',
      tags: lead.tags ?? [],
      message: lead.message ?? '',
      updatedAt: now,
      referrer: lead.referrer,
      referrerUrl: lead.referrerUrl,
      landingPageUrl: lead.landingPageUrl,
      searchKeywords: lead.searchKeywords,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      utmTerm: lead.utmTerm,
      utmContent: lead.utmContent,
      userAgent: lead.userAgent,
      ipAddress: lead.ipAddress,
      deviceType: lead.deviceType,
      browserName: lead.browserName,
      osName: lead.osName,
      country: lead.country,
      city: lead.city,
      region: lead.region,
      employees: lead.employees,
      budget: lead.budget,
      timeline: lead.timeline,
      inquiryType: lead.inquiryType,
      inquiryTypes: lead.inquiryTypes,
      infoSalesActivity: lead.infoSalesActivity,
      score: lead.score,
      aiAnalysisReport: lead.aiAnalysisReport,
      aiDraftProposal: lead.aiDraftProposal,
      aiInvestigation: lead.aiInvestigation,
    };
    demoState.leads.push(newLead);
    return deepClone(newLead);
};

export const updateLead = async (id: string, updates: Partial<Lead>): Promise<Lead> => {
    const lead = findById(demoState.leads, id, 'リード');
    Object.assign(lead, updates, { updatedAt: new Date().toISOString() });
    return deepClone(lead);
};

export const deleteLead = async (id: string): Promise<void> => {
    demoState.leads = demoState.leads.filter(lead => lead.id !== id);
};

export const getApprovalRoutes = async (): Promise<ApprovalRoute[]> => deepClone(demoState.approvalRoutes);

export const addApprovalRoute = async (route: Omit<ApprovalRoute, 'id' | 'createdAt'>): Promise<ApprovalRoute> => {
    const newRoute: ApprovalRoute = {
      id: uuidv4(),
      name: route.name,
      routeData: deepClone(route.routeData),
      createdAt: new Date().toISOString(),
    };
    demoState.approvalRoutes.push(newRoute);
    return deepClone(newRoute);
};

export const updateApprovalRoute = async (id: string, updates: Partial<ApprovalRoute>): Promise<ApprovalRoute> => {
    const route = findById(demoState.approvalRoutes, id, '承認ルート');
    if (updates.routeData) {
      route.routeData = deepClone(updates.routeData);
    }
    if (updates.name) {
      route.name = updates.name;
    }
    return deepClone(route);
};

export const deleteApprovalRoute = async (id: string): Promise<void> => {
    demoState.approvalRoutes = demoState.approvalRoutes.filter(route => route.id !== id);
};

export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => deepClone(demoState.purchaseOrders);

export const addPurchaseOrder = async (order: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
    const newOrder: PurchaseOrder = {
      id: uuidv4(),
      supplierName: order.supplierName ?? '仕入先未設定',
      itemName: order.itemName ?? '品目未設定',
      orderDate: order.orderDate ?? new Date().toISOString().slice(0, 10),
      quantity: order.quantity ?? 0,
      unitPrice: order.unitPrice ?? 0,
      status: order.status ?? PurchaseOrderStatus.Ordered,
    };
    demoState.purchaseOrders.push(newOrder);
    return deepClone(newOrder);
};

export const getInventoryItems = async (): Promise<InventoryItem[]> => deepClone(demoState.inventoryItems);

export const addInventoryItem = async (item: Partial<InventoryItem>): Promise<InventoryItem> => {
    const newItem: InventoryItem = {
      id: uuidv4(),
      name: item.name ?? '新規資材',
      category: item.category ?? 'その他',
      quantity: item.quantity ?? 0,
      unit: item.unit ?? '個',
      unitPrice: item.unitPrice ?? 0,
    };
    demoState.inventoryItems.push(newItem);
    return deepClone(newItem);
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> => {
    const item = findById(demoState.inventoryItems, id, '在庫品目');
    Object.assign(item, updates);
    return deepClone(item);
};

export const getEmployees = async (): Promise<Employee[]> => deepClone(demoState.employees);

export const getBugReports = async (): Promise<BugReport[]> => deepClone(demoState.bugReports);

export const addBugReport = async (report: Omit<BugReport, 'id' | 'createdAt' | 'status'> & { status?: BugReportStatus }): Promise<BugReport> => {
    const newReport: BugReport = {
      id: uuidv4(),
      reporterName: report.reporterName,
      reportType: report.reportType,
      summary: report.summary,
      description: report.description,
      status: report.status ?? BugReportStatus.Open,
      createdAt: new Date().toISOString(),
    };
    demoState.bugReports.push(newReport);
    return deepClone(newReport);
};

export const updateBugReport = async (id: string, updates: Partial<BugReport>): Promise<BugReport> => {
    const report = findById(demoState.bugReports, id, 'バグ報告');
    Object.assign(report, updates);
    return deepClone(report);
};

export const getEstimates = async (): Promise<Estimate[]> => deepClone(demoState.estimates);

export const addEstimate = async (estimate: Partial<Estimate>): Promise<Estimate> => {
    const now = new Date().toISOString();
    const totals = calculateEstimateTotals(estimate.items ?? [], estimate.taxInclusive ?? false);
    const newEstimate: Estimate = {
      id: uuidv4() as UUID,
      estimateNumber: estimate.estimateNumber ?? nextEstimateNumber++,
      customerName: estimate.customerName ?? '顧客未設定',
      title: estimate.title ?? '新規見積',
      items: totals.items,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      deliveryDate: estimate.deliveryDate ?? now.slice(0, 10),
      paymentTerms: estimate.paymentTerms ?? '末締め翌月末払い',
      deliveryTerms: estimate.deliveryTerms,
      deliveryMethod: estimate.deliveryMethod ?? 'メール送付',
      notes: estimate.notes ?? '',
      status: estimate.status ?? EstimateStatus.Draft,
      version: estimate.version ?? 1,
      userId: estimate.userId ?? (demoState.employeeUsers[0]?.id || 'user-001'),
      user: estimate.user ?? demoState.employeeUsers.find(u => u.id === estimate.userId) ?? demoState.employeeUsers[0],
      createdAt: now,
      updatedAt: now,
      projectId: estimate.projectId,
      projectName: estimate.projectName,
      taxInclusive: estimate.taxInclusive ?? false,
      pdfUrl: estimate.pdfUrl,
      tracking: estimate.tracking,
      postal: estimate.postal,
    };
    demoState.estimates.push(newEstimate);
    return deepClone(newEstimate);
};

export const updateEstimate = async (id: UUID, updates: Partial<Estimate>): Promise<Estimate> => {
    const estimate = findById(demoState.estimates, id, '見積');

    if (updates.items || typeof updates.taxInclusive !== 'undefined') {
      const totals = calculateEstimateTotals(updates.items ?? estimate.items, updates.taxInclusive ?? estimate.taxInclusive ?? false);
      estimate.items = totals.items;
      estimate.subtotal = totals.subtotal;
      estimate.taxTotal = totals.taxTotal;
      estimate.grandTotal = totals.grandTotal;
    }
    if (updates.postal) {
      estimate.postal = { ...(estimate.postal ?? { method: 'inhouse_print', status: 'preparing', toName: estimate.customerName }), ...updates.postal };
    }
    if (updates.tracking) {
      estimate.tracking = { ...(estimate.tracking ?? { trackId: uuidv4(), mailStatus: 'unopened', totalOpens: 0, totalClicks: 0 }), ...updates.tracking };
    }

    Object.assign(estimate, updates, { updatedAt: new Date().toISOString() });
    return deepClone(estimate);
};

export const savePostal = async (estimateId: UUID, updates: Partial<PostalInfo>): Promise<Estimate> => {
    const estimate = findById(demoState.estimates, estimateId, '見積');
    const nextPostal: PostalInfo = {
      method: estimate.postal?.method ?? 'inhouse_print',
      status: estimate.postal?.status ?? 'preparing',
      toName: estimate.postal?.toName ?? estimate.customerName,
      ...estimate.postal,
      ...updates,
    };
    if (nextPostal.toName && !nextPostal.labelPreviewSvg) {
      nextPostal.labelPreviewSvg = renderPostalLabelSvg(nextPostal.toName, nextPostal.toCompany);
    }
    estimate.postal = nextPostal;
    estimate.updatedAt = new Date().toISOString();
    return deepClone(estimate);
};

export const saveTracking = async (estimateId: UUID, updates: Partial<TrackingInfo>): Promise<Estimate> => {
    const estimate = findById(demoState.estimates, estimateId, '見積');
    const tracking: TrackingInfo = {
      trackId: estimate.tracking?.trackId ?? uuidv4(),
      mailStatus: updates.mailStatus ?? estimate.tracking?.mailStatus ?? 'unopened',
      totalOpens: updates.totalOpens ?? estimate.tracking?.totalOpens ?? 0,
      totalClicks: updates.totalClicks ?? estimate.tracking?.totalClicks ?? 0,
      lastEventAt: updates.lastEventAt ?? estimate.tracking?.lastEventAt,
      firstOpenedAt: updates.firstOpenedAt ?? estimate.tracking?.firstOpenedAt,
    };
    estimate.tracking = tracking;
    estimate.updatedAt = new Date().toISOString();
    return deepClone(estimate);
};

export const renderPostalLabelSvg = (toName: string, toCompany?: string): string => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250">
<rect width="400" height="250" fill="#ffffff" stroke="#1f2937" stroke-width="2" rx="12" ry="12" />
<text x="200" y="90" font-size="28" text-anchor="middle" font-family="'Noto Sans JP', sans-serif">${toCompany ?? ''}</text>
<text x="200" y="140" font-size="36" text-anchor="middle" font-family="'Noto Sans JP', sans-serif" font-weight="bold">${toName} 様</text>
<text x="200" y="190" font-size="16" text-anchor="middle" fill="#4b5563">印刷DXソリューションズ株式会社</text>
</svg>`;
};

export const getApplications = async (_currentUser: EmployeeUser | null): Promise<ApplicationWithDetails[]> => {
    return deepClone(demoState.applications.map(mapApplicationDetails));
};

interface SubmissionPayload {
  applicationCodeId: string;
  formData: any;
  approvalRouteId: string;
  status?: Application['status'];
  submittedAt?: string | null;
  approverId?: string | null;
  currentLevel?: number;
  rejectionReason?: string | null;
}

export const submitApplication = async (payload: SubmissionPayload, applicantId: string): Promise<ApplicationWithDetails> => {
    const route = findById(demoState.approvalRoutes, payload.approvalRouteId, '承認ルート');
    const now = new Date().toISOString();
    const status = payload.status ?? 'pending_approval';
    const currentLevel = payload.currentLevel ?? (status === 'pending_approval' ? 1 : 0);
    const application: Application = {
      id: uuidv4(),
      applicantId,
      applicationCodeId: payload.applicationCodeId,
      formData: payload.formData,
      status,
      submittedAt: status === 'draft' ? null : (payload.submittedAt ?? now),
      approvedAt: null,
      rejectedAt: null,
      currentLevel,
      approverId: payload.approverId ?? route.routeData.steps[currentLevel - 1]?.approverId ?? null,
      rejectionReason: payload.rejectionReason ?? null,
      approvalRouteId: payload.approvalRouteId,
      createdAt: now,
      updatedAt: now,
    };
    demoState.applications.push(application);
    return deepClone(mapApplicationDetails(application));
};

export const approveApplication = async (application: ApplicationWithDetails, approver: EmployeeUser): Promise<ApplicationWithDetails> => {
    const stored = findById(demoState.applications, application.id, '申請');
    stored.status = 'approved';
    stored.approvedAt = new Date().toISOString();
    stored.rejectedAt = null;
    stored.rejectionReason = null;
    stored.currentLevel = (stored.currentLevel ?? 0) + 1;
    stored.approverId = approver.id;
    stored.updatedAt = new Date().toISOString();
    return deepClone(mapApplicationDetails(stored));
};

export const rejectApplication = async (application: ApplicationWithDetails, reason: string, approver: EmployeeUser): Promise<ApplicationWithDetails> => {
    const stored = findById(demoState.applications, application.id, '申請');
    stored.status = 'rejected';
    stored.rejectedAt = new Date().toISOString();
    stored.approvedAt = null;
    stored.rejectionReason = reason;
    stored.approverId = approver.id;
    stored.updatedAt = new Date().toISOString();
    return deepClone(mapApplicationDetails(stored));
};

export const getApplicationCodes = async (): Promise<ApplicationCode[]> => deepClone(demoState.applicationCodes);

export const getInvoices = async (): Promise<Invoice[]> => deepClone(demoState.invoices);

export const getProjects = async (): Promise<Project[]> => deepClone(projects);

type AttachmentInput = { file: File | { name: string; type?: string }; category?: string };

export const addProject = async (data: Partial<Project>, attachments: AttachmentInput[] = []): Promise<Project> => {
    const now = new Date().toISOString();
    const projectId = uuidv4();
    const projectAttachments: ProjectAttachment[] = attachments.map((item, index) => ({
      id: uuidv4(),
      projectId,
      fileName: (item.file as File).name ?? (item.file as { name: string }).name ?? `attachment-${index + 1}`,
      filePath: `project_files/${projectId}/${index + 1}`,
      fileUrl: `https://example.com/project_files/${projectId}/${index + 1}`,
      mimeType: (item.file as File).type ?? (item.file as { type?: string }).type ?? 'application/octet-stream',
      category: item.category ?? 'その他',
      createdAt: now,
    }));

    const newProject: Project = {
      id: projectId,
      projectName: data.projectName ?? '新規案件',
      customerName: data.customerName ?? '顧客未設定',
      customerId: data.customerId,
      status: data.status ?? ProjectStatus.New,
      overview: data.overview ?? '',
      extracted_details: data.extracted_details ?? '',
      createdAt: now,
      updatedAt: now,
      userId: data.userId ?? demoState.employeeUsers[0]?.id ?? 'user-001',
      attachments: projectAttachments,
      relatedEstimates: [],
      relatedJobs: [],
    };
    projects.push(newProject);
    return deepClone(newProject);
};

export const getDepartments = async (): Promise<Department[]> => deepClone(demoState.departments);

export const saveDepartment = async (department: Partial<Department>): Promise<Department> => {
    if (department.id) {
      const existing = findById(demoState.departments, department.id, '部署');
      Object.assign(existing, department);
      return deepClone(existing);
    }
    const newDepartment: Department = {
      id: uuidv4(),
      name: department.name ?? '新規部署',
    };
    demoState.departments.push(newDepartment);
    return deepClone(newDepartment);
};

export const deleteDepartment = async (id: string): Promise<void> => {
    demoState.departments = demoState.departments.filter(dep => dep.id !== id);
};

export const getPaymentRecipients = async (): Promise<PaymentRecipient[]> => deepClone(demoState.paymentRecipients);

export const savePaymentRecipient = async (recipient: Partial<PaymentRecipient>): Promise<PaymentRecipient> => {
    if (recipient.id) {
        const existing = findById(demoState.paymentRecipients, recipient.id, '支払先');
        Object.assign(existing, recipient);
        return deepClone(existing);
    }
    const newRecipient: PaymentRecipient = {
        id: uuidv4(),
        recipientCode: recipient.recipientCode ?? `V${String(demoState.paymentRecipients.length + 1).padStart(3, '0')}`,
        companyName: recipient.companyName ?? '',
        recipientName: recipient.recipientName ?? '',
    };
    demoState.paymentRecipients.push(newRecipient);
    return deepClone(newRecipient);
};

export const deletePaymentRecipient = async (id: string): Promise<void> => {
    demoState.paymentRecipients = demoState.paymentRecipients.filter(rec => rec.id !== id);
};

export const getAllocationDivisions = async (): Promise<AllocationDivision[]> => deepClone(allocationDivisions);

export const saveAllocationDivision = async (division: Partial<AllocationDivision>): Promise<AllocationDivision> => {
    if (division.id) {
        const existing = findById(allocationDivisions, division.id, '振分区分');
        Object.assign(existing, division);
        return deepClone(existing);
    }
    const newDivision: AllocationDivision = {
        id: uuidv4(),
        name: division.name ?? '新規振分区分',
        isActive: division.isActive ?? true,
        createdAt: new Date().toISOString(),
    };
    allocationDivisions.push(newDivision);
    return deepClone(newDivision);
};

export const deleteAllocationDivision = async (id: string): Promise<void> => {
    allocationDivisions = allocationDivisions.filter(div => div.id !== id);
};

export const getTitles = async (): Promise<Title[]> => deepClone(titles);

export const saveTitle = async (title: Partial<Title>): Promise<Title> => {
    if (title.id) {
        const existing = findById(titles, title.id, '役職');
        Object.assign(existing, title);
        return deepClone(existing);
    }
    const newTitle: Title = {
        id: uuidv4(),
        name: title.name ?? '新規役職',
        isActive: title.isActive ?? true,
        createdAt: new Date().toISOString(),
    };
    titles.push(newTitle);
    return deepClone(newTitle);
};

export const deleteTitle = async (id: string): Promise<void> => {
    titles = titles.filter(title => title.id !== id);
};

export const getInboxItems = async (): Promise<InboxItem[]> => deepClone(demoState.inboxItems);

export const addInboxItem = async (item: Omit<InboxItem, 'id' | 'createdAt' | 'fileUrl'> & { fileUrl?: string }): Promise<InboxItem> => {
    const newItem: InboxItem = {
      id: uuidv4(),
      fileName: item.fileName,
      filePath: item.filePath,
      fileUrl: item.fileUrl ?? `https://example.com/storage/${item.filePath}`,
      mimeType: item.mimeType,
      status: item.status,
      extractedData: item.extractedData ?? null,
      errorMessage: item.errorMessage ?? null,
      createdAt: new Date().toISOString(),
    };
    demoState.inboxItems.unshift(newItem);
    return deepClone(newItem);
};

export const updateInboxItem = async (id: string, updates: Partial<InboxItem>): Promise<InboxItem> => {
    const item = findById(demoState.inboxItems, id, 'インボックス項目');
    Object.assign(item, updates);
    return deepClone(item);
};

export const deleteInboxItem = async (item: InboxItem): Promise<void> => {
    demoState.inboxItems = demoState.inboxItems.filter(i => i.id !== item.id);
};

export const uploadFile = async (file: File, bucket: string): Promise<{ path: string; url: string }> => {
    const identifier = uuidv4();
    const fileName = file.name ?? `${identifier}.bin`;
    const path = `${bucket}/${identifier}-${fileName}`;
    return {
      path,
      url: `https://example.com/storage/${path}`,
    };
};

export const getAnalysisHistory = async (): Promise<AnalysisHistory[]> => {
    const sorted = [...analysisHistory].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    return deepClone(sorted);
};

export const addAnalysisHistory = async (entry: Omit<AnalysisHistory, 'id' | 'createdAt'> & { createdAt?: string; id?: UUID }): Promise<AnalysisHistory> => {
    const newEntry: AnalysisHistory = {
      id: entry.id ?? uuidv4(),
      userId: entry.userId,
      viewpoint: entry.viewpoint,
      dataSources: entry.dataSources,
      result: entry.result,
      createdAt: entry.createdAt ?? new Date().toISOString(),
    };
    analysisHistory.unshift(newEntry);
    return deepClone(newEntry);
};