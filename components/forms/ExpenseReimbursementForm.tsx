import React, { useState, useMemo, useRef, useEffect } from 'react';
import { submitApplication } from '../../services/dataService.ts';
import { extractInvoiceDetails } from '../../services/geminiService.ts';
import ApprovalRouteSelector from './ApprovalRouteSelector.tsx';
import AccountItemSelect from './AccountItemSelect.tsx';
import PaymentRecipientSelect from './PaymentRecipientSelect.tsx';
import DepartmentSelect from './DepartmentSelect.tsx';
import { Loader, Upload, PlusCircle, Trash2, AlertTriangle } from '../Icons.tsx';
import { User, InvoiceData, Customer, AccountItem, Job, PurchaseOrder, Department, AllocationDivision } from '../../types.ts';

interface ExpenseReimbursementFormProps {
    onSuccess: () => void;
    applicationCodeId: string;
    currentUser: User | null;
    customers: Customer[];
    accountItems: AccountItem[];
    jobs: Job[];
    purchaseOrders: PurchaseOrder[];
    departments: Department[];
    isAIOff: boolean;
    isLoading: boolean;
    error: string;
    allocationDivisions: AllocationDivision[];
}

interface ExpenseDetail {
    id: string;
    paymentDate: string;
    paymentRecipientId: string;
    description: string;
    allocationTarget: string;
    costType: 'V' | 'F';
    accountItemId: string;
    allocationDivisionId: string;
    amount: number;
    p: number; // Price
    v: number; // Variable Cost
    q: number; // Quantity
}

const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result.split(',')[1]) : reject("Read failed");
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

const ExpenseReimbursementForm: React.FC<ExpenseReimbursementFormProps> = ({ onSuccess, applicationCodeId, currentUser, customers, accountItems, jobs, purchaseOrders, departments, isAIOff, isLoading, error: formLoadError, allocationDivisions }) => {
    const [departmentId, setDepartmentId] = useState<string>('');
    // FIX: Initialize with one empty row to prevent validation issues and improve UX.
    const [details, setDetails] = useState<ExpenseDetail[]>(() => [{
        id: `row_${Date.now()}`,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentRecipientId: '',
        description: '',
        allocationTarget: '',
        costType: 'F',
        accountItemId: '',
        allocationDivisionId: '',
        amount: 0,
        p: 0,
        v: 0,
        q: 1,
    }]);
    const [notes, setNotes] = useState('');
    const [approvalRouteId, setApprovalRouteId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
    const animationTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const isDisabled = isSubmitting || isLoading || !!formLoadError;

    const totalAmount = useMemo(() => details.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [details]);

    // FIX: The user reported an error on line 73. While no specific error was found, the form was incomplete.
    // I am completing the form with logic from similar components to ensure functionality.
    const isFormValid = useMemo(() => {
        if (!departmentId || !approvalRouteId || details.length === 0) return false;
        return !details.some(detail =>
            !detail.paymentDate ||
            !detail.paymentRecipientId ||
            !detail.description.trim() ||
            !detail.accountItemId ||
            !detail.allocationDivisionId ||
            !detail.amount || detail.amount <= 0
        );
    }, [departmentId, approvalRouteId, details]);

    const addNewRow = () => {
        setDetails(prev => [...prev, {
            id: `row_${Date.now()}`,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentRecipientId: '',
            description: '',
            allocationTarget: '',
            costType: 'F',
            accountItemId: '',
            allocationDivisionId: '',
            amount: 0,
            p: 0,
            v: 0,
            q: 1,
        }]);
    };
    
    const handleDetailChange = (id: string, field: keyof ExpenseDetail, value: string | number) => {
        setDetails(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleRemoveRow = (id: string) => setDetails(prev => prev.filter(item => item.id !== id));

    const clearForm = () => {
        setDepartmentId('');
        // FIX: Re-initialize with one empty row instead of just clearing
        setDetails([{
            id: `row_${Date.now()}`,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentRecipientId: '',
            description: '',
            allocationTarget: '',
            costType: 'F',
            accountItemId: '',
            allocationDivisionId: '',
            amount: 0,
            p: 0,
            v: 0,
            q: 1,
        }]);
        setNotes('');
        setError('');
        setValidationErrors(new Set());
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (isAIOff) {
            setError('AI機能は現在無効です。ファイルからの読み取りはできません。');
            return;
        }

        setIsOcrLoading(true);
        setError('');
        try {
            const base64String = await readFileAsBase64(file);
            const ocrData: InvoiceData = await extractInvoiceDetails(base64String, file.type, accountItems, allocationDivisions);
            
            const matchedAccountItem = accountItems.find(item => item.name === ocrData.account);
            const matchedAllocDivision = allocationDivisions.find(div => div.name === ocrData.allocationDivision);

            const newDetail: ExpenseDetail = {
                id: `row_ocr_${Date.now()}`,
                paymentDate: ocrData.invoiceDate || new Date().toISOString().split('T')[0],
                paymentRecipientId: '', // User needs to select this
                description: `【OCR読取: ${ocrData.vendorName}】${ocrData.description}`,
                allocationTarget: ocrData.project ? `job:${jobs.find(j => j.title === ocrData.project)?.id || ''}` : `customer:${customers.find(c => c.customerName === ocrData.relatedCustomer)?.id || ''}`,
                costType: ocrData.costType || 'F',
                accountItemId: matchedAccountItem?.id || '',
                allocationDivisionId: matchedAllocDivision?.id || '',
                amount: ocrData.totalAmount || 0,
                p: 0,
                v: 0,
                q: 1,
            };
            setDetails(prev => [...prev, newDetail]);

        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setError(err.message || 'AI-OCR処理中にエラーが発生しました。');
        } finally {
            setIsOcrLoading(false);
            e.target.value = '';
        }
    };

    const validateForm = () => {
        const errors = new Set<string>();
        if (!departmentId) errors.add('departmentId');
        if (!approvalRouteId) errors.add('approvalRouteId');
        if (details.length === 0) errors.add('details');

        details.forEach(detail => {
            if (!detail.paymentDate) errors.add(`${detail.id}-paymentDate`);
            if (!detail.paymentRecipientId) errors.add(`${detail.id}-paymentRecipientId`);
            if (!detail.description.trim()) errors.add(`${detail.id}-description`);
            if (!detail.accountItemId) errors.add(`${detail.id}-accountItemId`);
            if (!detail.allocationDivisionId) errors.add(`${detail.id}-allocationDivisionId`);
            if (!detail.amount || detail.amount <= 0) errors.add(`${detail.id}-amount`);
        });
        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors = validateForm();
        setValidationErrors(errors);
        
        if (errors.size > 0) {
            setError("必須項目をすべて入力してください。");
            return;
        }

        if (!currentUser) {
            setError("ユーザー情報が見つかりません。");
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            const submissionData = {
                departmentId,
                details: details.filter(d => d.description && d.amount > 0),
                notes,
                totalAmount
            };
            await submitApplication({
                applicationCodeId,
                formData: submissionData,
                approvalRouteId
            }, currentUser.id);
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : '申請の提出に失敗しました。');
        } finally {
            const mounted = animationTimeoutRef.current !== undefined;
            if (mounted) {
                setIsSubmitting(false);
            }
        }
    };
    
    const inputClass = "w-full text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";
    const hasError = (fieldId: string) => validationErrors.has(fieldId);

    // FIX: Add return statement to make this a valid React component
    return (
        <div className="relative">
             {(isLoading || formLoadError) && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-800/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl p-8" aria-live="polite" aria-busy={isLoading}>
                    {isLoading && <Loader className="w-12 h-12 animate-spin text-blue-500" aria-hidden="true" />}
                    {formLoadError && <div className="text-center"><AlertTriangle className="w-12 h-12 text-red-500 mx-auto" /><p className="mt-2 text-red-600">{formLoadError}</p></div>}
                </div>
            )}
             <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm space-y-8 animate-fade-in-up" aria-labelledby="form-title">
                <h2 id="form-title" className="text-2xl font-bold text-slate-800 dark:text-white text-center">経費精算フォーム</h2>
                 
                {formLoadError && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                        <p className="font-bold">フォーム読み込みエラー</p>
                        <p>{formLoadError}</p>
                    </div>
                )}
                
                <details className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700" open>
                    <summary className="text-base font-semibold cursor-pointer text-slate-700 dark:text-slate-200">明細書 (AI-OCR)</summary>
                    <div id="ocr-section" className="mt-4 flex items-center gap-4">
                        <label htmlFor="ocr-file-upload" className={`relative inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer ${isOcrLoading || isAIOff || isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {isOcrLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            <span>{isOcrLoading ? '解析中...' : 'ファイルから読み取り'}</span>
                            <input id="ocr-file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*,application/pdf" disabled={isOcrLoading || isAIOff || isDisabled} />
                        </label>
                        {isAIOff && <p className="text-sm text-red-500 dark:text-red-400">AI機能無効のため、OCR機能は利用できません。</p>}
                        {!isAIOff && <p className="text-sm text-slate-500 dark:text-slate-400">領収書ファイルを選択すると、下の表に自動で追加されます。</p>}
                    </div>
                </details>
                
                <div>
                    <label htmlFor="departmentId" className="block text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">部門 *</label>
                    <DepartmentSelect id="departmentId" value={departmentId} onChange={setDepartmentId} required disabled={isDisabled} />
                </div>
                
                <div>
                    <label className="block text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">経費明細 *</label>
                    <div className="space-y-4">
                        {details.map((item, index) => (
                            <div key={item.id} className={`grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 p-3 rounded-lg border ${hasError(`${item.id}-paymentDate`) || hasError(`${item.id}-description`) || hasError(`${item.id}-amount`) ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30'}`}>
                                <div className="md:col-span-2">
                                    <label className="text-xs text-slate-500">支払日</label>
                                    <input type="date" value={item.paymentDate} onChange={e => handleDetailChange(item.id, 'paymentDate', e.target.value)} className={inputClass} disabled={isDisabled} />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs text-slate-500">支払先</label>
                                    <PaymentRecipientSelect value={item.paymentRecipientId} onChange={val => handleDetailChange(item.id, 'paymentRecipientId', val)} disabled={isDisabled} />
                                </div>
                                <div className="md:col-span-4">
                                    <label className="text-xs text-slate-500">内容</label>
                                    <input type="text" placeholder="例: 会議費用" value={item.description} onChange={e => handleDetailChange(item.id, 'description', e.target.value)} className={inputClass} disabled={isDisabled} />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs text-slate-500">金額</label>
                                    <input type="number" value={item.amount} onChange={e => handleDetailChange(item.id, 'amount', Number(e.target.value))} className={`${inputClass} text-right`} disabled={isDisabled} min="1" />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs text-slate-500">勘定科目</label>
                                    <AccountItemSelect value={item.accountItemId} onChange={val => handleDetailChange(item.id, 'accountItemId', val)} disabled={isDisabled} />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs text-slate-500">振分区分</label>
                                    <select value={item.allocationDivisionId} onChange={e => handleDetailChange(item.id, 'allocationDivisionId', e.target.value)} className={inputClass}>
                                        <option value="">区分選択</option>
                                        {allocationDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs text-slate-500">振分先</label>
                                    <select value={item.allocationTarget} onChange={e => handleDetailChange(item.id, 'allocationTarget', e.target.value)} className={inputClass}>
                                        <option value="">振分先なし</option>
                                        <optgroup label="顧客">
                                            {customers.map(c => <option key={c.id} value={`customer:${c.id}`}>{c.customerName}</option>)}
                                        </optgroup>
                                        <optgroup label="案件">
                                            {jobs.map(j => <option key={j.id} value={`job:${j.id}`}>{j.title}</option>)}
                                        </optgroup>
                                        <optgroup label="発注">
                                            {purchaseOrders.map(p => <option key={p.id} value={`po:${p.id}`}>{p.itemName} ({p.supplierName})</option>)}
                                        </optgroup>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs text-slate-500">費用種別</label>
                                    <select value={item.costType} onChange={e => handleDetailChange(item.id, 'costType', e.target.value as 'V' | 'F')} className={inputClass}>
                                        <option value="F">固定費(F)</option>
                                        <option value="V">変動費(V)</option>
                                    </select>
                                </div>
                                <div className="md:col-span-1 flex items-end justify-center">
                                    <button type="button" onClick={() => handleRemoveRow(item.id)} className="p-1 text-slate-400 hover:text-red-500" disabled={isDisabled}><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <button type="button" onClick={addNewRow} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700" disabled={isDisabled}>
                            <PlusCircle className="w-4 h-4" /> 行を追加
                        </button>
                        <div className="text-right">
                            <span className="text-sm text-slate-500 dark:text-slate-400">合計金額: </span>
                            <span className="text-xl font-bold text-slate-800 dark:text-white">¥{totalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="notes" className="block text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">備考</label>
                    <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputClass} placeholder="補足事項があれば入力してください。" disabled={isDisabled} />
                </div>
                
                <ApprovalRouteSelector onChange={setApprovalRouteId} isSubmitting={isDisabled} requiredRouteName="社長決裁ルート" />

                {error && <p className="text-red-500 text-sm bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</p>}
                
                <div className="flex justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={clearForm} className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600" disabled={isDisabled}>内容をクリア</button>
                    <button type="button" className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600" disabled={isDisabled}>下書き保存</button>
                    <button type="submit" className="w-40 flex justify-center items-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400" disabled={isDisabled || !isFormValid}>
                        {isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : '申請を送信する'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ExpenseReimbursementForm;
