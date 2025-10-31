import React, { useState, useMemo } from 'react';
import { ApplicationWithDetails, SortConfig } from '../types.ts';
import ApplicationStatusBadge from './ApplicationStatusBadge.tsx';
import { ArrowUpDown, ChevronDown, Eye } from './Icons.tsx';
import { formatDateTime } from '../utils.ts';

interface ApplicationListProps {
  applications: ApplicationWithDetails[];
  onApplicationSelect: (app: ApplicationWithDetails) => void;
  selectedApplicationId: string | null;
}

const ApplicationList: React.FC<ApplicationListProps> = ({ applications, onApplicationSelect, selectedApplicationId }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'updatedAt', direction: 'descending' });

  const sortedApplications = useMemo(() => {
    let sortableItems = [...applications];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
            case 'applicant':
                aValue = a.applicant?.name?.toLowerCase() || '';
                bValue = b.applicant?.name?.toLowerCase() || '';
                break;
            case 'type':
                aValue = a.applicationCode?.name?.toLowerCase() || '';
                bValue = b.applicationCode?.name?.toLowerCase() || '';
                break;
            case 'updatedAt':
                aValue = a.updatedAt || a.createdAt;
                bValue = b.updatedAt || b.createdAt;
                break;
            default:
                aValue = a[sortConfig.key as keyof ApplicationWithDetails] || '';
                bValue = b[sortConfig.key as keyof ApplicationWithDetails] || '';
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [applications, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const SortableHeader: React.FC<{ sortKey: string; label: string; className?: string }> = ({ sortKey, label, className }) => {
    const isActive = sortConfig?.key === sortKey;
    const isAscending = sortConfig?.direction === 'ascending';

    return (
      <th scope="col" className={`px-6 py-3 ${className || ''}`}>
          <button onClick={() => requestSort(sortKey)} className="flex items-center gap-1 group">
              <span className={isActive ? 'font-bold text-slate-800 dark:text-slate-100' : ''}>{label}</span>
              <div className="w-4 h-4">
                  {isActive ? (
                      <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-slate-200 transition-transform duration-200 ${isAscending ? 'rotate-180' : 'rotate-0'}`} />
                  ) : (
                      <ArrowUpDown className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
              </div>
          </button>
      </th>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-base text-left text-slate-500 dark:text-slate-400">
          <thead className="text-sm text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <SortableHeader sortKey="type" label="申請種別" />
              <SortableHeader sortKey="applicant" label="申請者" />
              <SortableHeader sortKey="updatedAt" label="更新日時" />
              <SortableHeader sortKey="status" label="ステータス" />
              <th scope="col" className="px-6 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {sortedApplications.map((app) => (
              <tr 
                key={app.id} 
                className={`border-b dark:border-slate-700 transition-colors duration-150 cursor-pointer ${
                  selectedApplicationId === app.id 
                    ? 'bg-blue-50 dark:bg-blue-900/30' 
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                onClick={() => onApplicationSelect(app)}
              >
                <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{app.applicationCode?.name || 'N/A'}</td>
                <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{app.applicant?.name || '不明なユーザー'}</td>
                <td className="px-6 py-4">{formatDateTime(app.updatedAt || app.createdAt)}</td>
                <td className="px-6 py-4"><ApplicationStatusBadge status={app.status} /></td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => onApplicationSelect(app)} className="flex items-center justify-center gap-1.5 w-full text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    <Eye className="w-4 h-4" />
                    <span>詳細表示</span>
                  </button>
                </td>
              </tr>
            ))}
            {sortedApplications.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-16 text-slate-500 dark:text-slate-400">
                  <p>表示する申請がありません。</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ApplicationList;