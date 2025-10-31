import React, { useState, useEffect, useMemo } from 'react';
import ApplicationList from '../ApplicationList.tsx';
import ApplicationDetailModal from '../ApplicationDetailModal.tsx';
import { getApplications, getApplicationCodes, approveApplication, rejectApplication } from '../../services/dataService.ts';
import { normalizeFormCode } from '../../services/normalizeFormCode.ts';
import { ApplicationWithDetails, ApplicationCode, EmployeeUser, Toast, Customer, AccountItem, Job, PurchaseOrder, Department, AllocationDivision } from '../../types.ts';
import { Loader, AlertTriangle } from '../Icons.tsx';

// Form components
// FIX: Change to default import for ExpenseReimbursementForm
import ExpenseReimbursementForm from '../forms/ExpenseReimbursementForm.tsx';
import TransportExpenseForm from '../forms/TransportExpenseForm.tsx';
import LeaveApplicationForm from '../forms/LeaveApplicationForm.tsx';
import ApprovalForm from '../forms/ApprovalForm.tsx';
import DailyReportForm from '../forms/DailyReportForm.tsx';
import WeeklyReportForm from '../forms/WeeklyReportForm.tsx';

interface ApprovalWorkflowPageProps {
    currentUser: EmployeeUser | null;
    view: 'list' | 'form';
    formCode?: string;
    searchTerm?: string;
    addToast: (message: string, type: Toast['type']) => void;
    customers?: Customer[];
    accountItems?: AccountItem[];
    jobs?: Job[];
    purchaseOrders?: PurchaseOrder[];
    departments?: Department[];
    isAIOff?: boolean;
    allocationDivisions?: AllocationDivision[];
    onSuccess?: () => void; // Added for form submission success callback
    onRefreshData?: () => void; // Added for list data refresh
}

const TABS_CONFIG = {
    pending: { title: "あなたが承認する申請", description: "あなたが承認する必要がある申請の一覧です。" },
    submitted: { title: "自分の申請", description: "あなたが過去に提出したすべての申請履歴です。" },
    completed: { title: "完了済", description: "承認または却下されたすべての申請の履歴です。" },
};

const ApprovalWorkflowPage: React.FC<ApprovalWorkflowPageProps> = ({ currentUser, view, formCode, searchTerm, addToast, customers, accountItems, jobs, purchaseOrders, departments, isAIOff, allocationDivisions, onSuccess, onRefreshData }) => {
    // State for list view
    const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'completed'>('pending');

    // State for form view
    const [applicationCodes, setApplicationCodes] = useState<ApplicationCode[]>([]);
    const [isCodesLoading, setIsCodesLoading] = useState(true);

    const fetchListData = async () => {
        if (!currentUser) return;
        try {
            setIsLoading(true);
            setError('');
            const apps = await getApplications(currentUser);
            setApplications(apps);
        } catch (err: any) {
            setError(err.message || '申請データの取得に失敗しました。');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchFormData = async () => {
        setIsCodesLoading(true);
        setError('');
        try {
            const codes = await getApplicationCodes();
            setApplicationCodes(codes);
        } catch (err: any) {
             setError(err.message || '申請フォームの基本データの読み込みに失敗しました。');
        } finally {
            setIsCodesLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'list' && currentUser) {
            fetchListData();
        } else if (view === 'form') {
            fetchFormData();
        }
    }, [view, currentUser]);

    // List View Logic
    const handleSelectApplication = (app: ApplicationWithDetails) => {
        setSelectedApplication(app);
        setIsDetailModalOpen(true);
    };

    const handleModalClose = () => {
        setIsDetailModalOpen(false);
        setSelectedApplication(null);
    };

    const handleApprove = async (application: ApplicationWithDetails) => {
        if (!currentUser) return;
        try {
            await approveApplication(application, currentUser as any);
            addToast('申請を承認しました。', 'success');
            handleModalClose();
            await fetchListData(); // Refresh list after action
            onRefreshData?.(); // Notify parent to refresh if needed
        } catch (err: any) {
            addToast(`エラー: ${err.message}`, 'error');
        }
    };

    const handleReject = async (application: ApplicationWithDetails, reason: string) => {
        if (!currentUser) return;
        try {
            await rejectApplication(application, reason, currentUser as any);
            addToast('申請を差し戻しました。', 'success');
            handleModalClose();
            await fetchListData(); // Refresh list after action
            onRefreshData?.(); // Notify parent to refresh if needed
        } catch (err: any) {
            addToast(`エラー: ${err.message}`, 'error');
        }
    };
    
    const { displayedApplications, tabCounts } = useMemo(() => {
        const pendingApps = applications.filter(app => app.approverId === currentUser?.id && app.status === 'pending_approval');
        const submittedApps = applications.filter(app => app.applicantId === currentUser?.id);
        const completedApps = applications.filter(app => app.status === 'approved' || app.status === 'rejected');

        const counts = {
            pending: pendingApps.length,
            submitted: submittedApps.length,
            completed: completedApps.length
        };

        let filteredByTab: ApplicationWithDetails[];
        switch(activeTab) {
            case 'pending':
                filteredByTab = pendingApps;
                break;
            case 'submitted':
                filteredByTab = submittedApps;
                break;
            case 'completed':
                filteredByTab = completedApps;
                break;
            default:
                filteredByTab = [];
        }
        
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filteredByTab = filteredByTab.filter(app =>
                app.applicant?.name?.toLowerCase().includes(lowercasedTerm) ||
                app.applicationCode?.name?.toLowerCase().includes(lowercasedTerm) ||
                app.status.toLowerCase().includes(lowercasedTerm)
            );
        }
        return { displayedApplications: filteredByTab, tabCounts: counts };
    }, [applications, activeTab, searchTerm, currentUser]);


    // Form View Logic
    const handleFormSuccess = () => {
        addToast('申請が提出されました。承認一覧で確認できます。', 'success');
        onSuccess?.(); // Call parent onSuccess to trigger global data reload
    };

    const renderActiveForm = () => {
        const effectiveFormCode = normalizeFormCode(formCode ?? '') ?? (formCode ? formCode.toUpperCase() : '');
        const activeApplicationCode = applicationCodes.find(c => c.code === effectiveFormCode);
        const displayFormCode = formCode ?? effectiveFormCode;

        const formError = error || (!isCodesLoading && !activeApplicationCode)
            ? (error || `申請種別'${displayFormCode}'の定義が見つかりません。`)
            : '';
        
        if (!currentUser) {
            return (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                    <p className="font-bold">致命的なエラー</p>
                    <p>ユーザー情報が読み込めませんでした。再ログインしてください。</p>
                </div>
            );
        }

        const formProps = {
            onSuccess: handleFormSuccess,
            applicationCodeId: activeApplicationCode?.id || '',
            currentUser: currentUser as any,
            addToast: addToast,
            isAIOff: isAIOff,
            isLoading: isCodesLoading,
            error: formError,
        };

        switch(effectiveFormCode) {
            case 'EXP': return <ExpenseReimbursementForm {...formProps} customers={customers || []} accountItems={accountItems || []} jobs={jobs || []} purchaseOrders={purchaseOrders || []} departments={departments || []} allocationDivisions={allocationDivisions || []} />;
            case 'TRP': return <TransportExpenseForm {...formProps} accountItems={accountItems || []} allocationDivisions={allocationDivisions || []} />;
            case 'LEV': return <LeaveApplicationForm {...formProps} />;
            case 'APL': return <ApprovalForm {...formProps} />;
            case 'DLY': return <DailyReportForm {...formProps} />;
            case 'WKR': return <WeeklyReportForm {...formProps} />;
            default: return (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" aria-hidden="true" />
                    <h3 className="mt-4 text-lg font-bold">フォームが見つかりません</h3>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">申請フォーム '{displayFormCode}' は存在しないか、正しく設定されていません。</p>
                </div>
            );
        }
    };
    
    const EmptyState = () => {
        const messages = {
            pending: "承認待ちの申請はありません。",
            submitted: "あなたが申請した案件はありません。",
            completed: "完了した申請はまだありません。"
        };
        return (
            <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                <p className="font-semibold">{messages[activeTab]}</p>
                <p className="mt-1 text-base">新しい活動があると、ここに表示されます。</p>
            </div>
        );
    };


    if (view === 'list') {
        const TabButton = ({ id, label, count }: { id: 'pending' | 'submitted' | 'completed', label: string, count: number }) => (
            <button
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 rounded-t-lg border-b-2 font-semibold text-base transition-colors ${
                    activeTab === id
                        ? 'border-blue-500 text-blue-600 bg-white dark:bg-slate-800'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                aria-selected={activeTab === id}
                role="tab"
            >
                {label}
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                    {count}
                </span>
            </button>
        );

        return (
            <div className="flex flex-col gap-6">
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="flex space-x-2" role="tablist">
                        <TabButton id="pending" label="あなたが承認する申請" count={tabCounts.pending} />
                        <TabButton id="submitted" label="自分の申請" count={tabCounts.submitted} />
                        <TabButton id="completed" label="完了済" count={tabCounts.completed} />
                    </nav>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{TABS_CONFIG[activeTab].title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{TABS_CONFIG[activeTab].description}</p>
                </div>

                {isLoading ? (
                    <div className="text-center p-16" aria-live="polite"><Loader className="w-8 h-8 mx-auto animate-spin" aria-hidden="true" /></div>
                ) : error ? (
                    <div className="text-center p-16 text-red-500" role="alert">{error}</div>
                ) : displayedApplications.length > 0 ? (
                    <ApplicationList
                        applications={displayedApplications}
                        onApplicationSelect={handleSelectApplication}
                        selectedApplicationId={selectedApplication?.id || null}
                    />
                ) : (
                    <EmptyState />
                )}

                {isDetailModalOpen && (
                    <ApplicationDetailModal
                        application={selectedApplication}
                        currentUser={currentUser}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onClose={handleModalClose}
                    />
                )}
            </div>
        );
    }

    if (view === 'form') {
        return (
            <div>
                {renderActiveForm()}
            </div>
        );
    }

    return null;
};

export default ApprovalWorkflowPage;