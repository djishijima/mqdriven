import React, { useState, useEffect, useCallback } from 'react';
import { User, Toast, ConfirmationDialogProps, EmployeeUser } from '../../types';
import { getUsers, addUser, updateUser, deleteUser } from '../../services/dataService';
import { Loader, PlusCircle, X, Save, Trash2, Pencil } from '../Icons';

const UserModal: React.FC<{
    user: EmployeeUser | null;
    onClose: () => void;
    onSave: (user: Partial<EmployeeUser>) => Promise<void>;
}> = ({ user, onClose, onSave }) => {
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [role, setRole] = useState<'admin' | 'user'>(user?.role || 'user');
    const [canUseAnythingAnalysis, setCanUseAnythingAnalysis] = useState(user?.canUseAnythingAnalysis ?? true);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) return;
        setIsSaving(true);
        await onSave({ ...user, name, email, role, canUseAnythingAnalysis });
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold">{user ? 'ユーザー編集' : '新規ユーザー作成'}</h2>
                    <button type="button" onClick={onClose}><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium mb-1">氏名</label>
                        <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1">メールアドレス</label>
                        <input id="email" type="email" value={email || ''} onChange={e => setEmail(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5" />
                    </div>
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium mb-1">役割</label>
                        <select id="role" value={role} onChange={e => setRole(e.target.value as 'admin' | 'user')} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5">
                            <option value="user">一般ユーザー</option>
                            <option value="admin">管理者</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">権限</label>
                        <div className="flex items-center gap-2 mt-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <input id="canUseAnythingAnalysis" name="canUseAnythingAnalysis" type="checkbox" checked={canUseAnythingAnalysis} onChange={e => setCanUseAnythingAnalysis(e.target.checked)} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" />
                            <label htmlFor="canUseAnythingAnalysis" className="text-sm">「なんでも分析」機能の利用を許可</label>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-4 p-6 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-slate-200 dark:bg-slate-600 font-semibold py-2 px-4 rounded-lg">キャンセル</button>
                    <button type="submit" disabled={isSaving} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 disabled:bg-slate-400">
                        {isSaving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {isSaving ? '保存中...' : '保存'}
                    </button>
                </div>
            </form>
        </div>
    );
};

interface UserManagementPageProps {
    addToast: (message: string, type: Toast['type']) => void;
    requestConfirmation: (dialog: Omit<ConfirmationDialogProps, 'isOpen' | 'onClose'>) => void;
}

const UserManagementPage: React.FC<UserManagementPageProps> = ({ addToast, requestConfirmation }) => {
    const [users, setUsers] = useState<EmployeeUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<EmployeeUser | null>(null);

    const loadUsers = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await getUsers();
            setUsers(data);
        } catch (err: any) {
            setError(err.message || 'ユーザーデータの読み込みに失敗しました。');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleOpenModal = (user: EmployeeUser | null = null) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    const handleSaveUser = async (userData: Partial<EmployeeUser>) => {
        try {
            if (userData.id) {
                await updateUser(userData.id, userData);
                addToast('ユーザー情報が更新されました。', 'success');
            } else {
                await addUser({ name: userData.name || '', email: userData.email || null, role: userData.role || 'user', canUseAnythingAnalysis: userData.canUseAnythingAnalysis });
                addToast('新規ユーザーが追加されました。', 'success');
            }
            await loadUsers();
            handleCloseModal();
        } catch (err: any) {
            addToast(`保存に失敗しました: ${err.message}`, 'error');
        }
    };

    const handleDeleteUser = (user: EmployeeUser) => {
        requestConfirmation({
            title: 'ユーザーを削除',
            message: `本当にユーザー「${user.name}」を削除しますか？この操作は元に戻せません。`,
            onConfirm: async () => {
                try {
                    await deleteUser(user.id);
                    addToast('ユーザーが削除されました。', 'success');
                    await loadUsers();
                } catch (err: any) {
                    addToast(`削除に失敗しました: ${err.message}`, 'error');
                }
            }
        });
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">ユーザー管理</h2>
                    <p className="mt-1 text-base text-slate-500">ユーザーの追加、編集、役割の変更を行います。</p>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">
                    <PlusCircle className="w-5 h-5" />
                    新規ユーザー追加
                </button>
            </div>
            {isLoading ? (
                <div className="p-16 text-center"><Loader className="w-8 h-8 mx-auto animate-spin" /></div>
            ) : error ? (
                <div className="p-16 text-center text-red-600">{error}</div>
            ) : (
                <table className="w-full text-base text-left">
                    <thead className="text-sm uppercase bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-6 py-3">氏名</th>
                            <th className="px-6 py-3">メールアドレス</th>
                            <th className="px-6 py-3">役割</th>
                            <th className="px-6 py-3">なんでも分析</th>
                            <th className="px-6 py-3">登録日</th>
                            <th className="px-6 py-3 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-6 py-4 font-medium">{user.name}</td>
                                <td className="px-6 py-4 text-slate-500">{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'}`}>
                                        {user.role === 'admin' ? '管理者' : '一般ユーザー'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {user.canUseAnythingAnalysis ? '✅' : '❌'}
                                </td>
                                <td className="px-6 py-4">{new Date(user.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center items-center gap-2">
                                        <button onClick={() => handleOpenModal(user)} className="p-2 text-slate-500 hover:text-blue-600"><Pencil className="w-5 h-5" /></button>
                                        <button onClick={() => handleDeleteUser(user)} className="p-2 text-slate-500 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {isModalOpen && <UserModal user={selectedUser} onClose={handleCloseModal} onSave={handleSaveUser} />}
        </div>
    );
};

export default UserManagementPage;