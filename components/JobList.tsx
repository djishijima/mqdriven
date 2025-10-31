import React, { useState, useMemo } from 'react';
import { Job, SortConfig } from '../types.ts';
import JobStatusBadge from './JobStatusBadge.tsx';
import { formatJPY, formatDate } from '../utils.ts';
import EmptyState from './ui/EmptyState.tsx';
import { Briefcase, PlusCircle } from './Icons.tsx';
import SortableHeader from './ui/SortableHeader.tsx';

interface JobListProps {
  jobs: Job[];
  searchTerm: string;
  onSelectJob: (job: Job) => void;
  onNewJob: () => void;
}

const JobList: React.FC<JobListProps> = ({ jobs, searchTerm, onSelectJob, onNewJob }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'jobNumber', direction: 'descending' });

  const filteredJobs = useMemo(() => {
    if (!searchTerm) return jobs;
    const lowercasedTerm = searchTerm.toLowerCase();
    return jobs.filter(job => 
      job.clientName.toLowerCase().includes(lowercasedTerm) ||
      job.title.toLowerCase().includes(lowercasedTerm) ||
      String(job.jobNumber).includes(lowercasedTerm)
    );
  }, [jobs, searchTerm]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedJobs = useMemo(() => {
    let sortableItems = [...filteredJobs];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof Job] as any;
        const bValue = b[sortConfig.key as keyof Job] as any;

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
  }, [filteredJobs, sortConfig]);

  if (jobs.length === 0 && !searchTerm) {
    return (
        <EmptyState 
            icon={Briefcase}
            title="案件がありません"
            message="最初の案件を登録して、ビジネスの管理を始めましょう。"
            action={{ label: "新規案件作成", onClick: onNewJob, icon: PlusCircle }}
        />
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-base text-left text-slate-500 dark:text-slate-400">
          <thead className="text-sm text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <SortableHeader sortKey="jobNumber" label="案件番号" sortConfig={sortConfig} requestSort={requestSort}/>
              <SortableHeader sortKey="clientName" label="顧客名 / 案件名" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader sortKey="paperType" label="紙種" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader sortKey="quantity" label="部数" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader sortKey="dueDate" label="納期" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader sortKey="price" label="金額" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader sortKey="status" label="ステータス" sortConfig={sortConfig} requestSort={requestSort} />
            </tr>
          </thead>
          <tbody>
            {sortedJobs.map((job) => (
                <tr key={job.id} onClick={() => onSelectJob(job)} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer odd:bg-slate-50 dark:odd:bg-slate-800/50">
                  <td className="px-6 py-5 font-mono text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {job.jobNumber}
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-medium text-base text-slate-800 dark:text-slate-200">{job.clientName}</div>
                    <div className="text-slate-500 dark:text-slate-400">{job.title}</div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">{job.paperType}</td>
                  <td className="px-6 py-5 whitespace-nowrap">{job.quantity.toLocaleString()}</td>
                  <td className="px-6 py-5 whitespace-nowrap">{formatDate(job.dueDate)}</td>
                  <td className="px-6 py-5 whitespace-nowrap font-semibold">{formatJPY(job.price)}</td>
                  <td className="px-6 py-5">
                    <JobStatusBadge status={job.status} />
                  </td>
                </tr>
              )
            )}
             {sortedJobs.length === 0 && (
                <tr>
                    <td colSpan={7}>
                        <EmptyState 
                            icon={Briefcase}
                            title="検索結果がありません"
                            message="検索条件を変更して、もう一度お試しください。"
                        />
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(JobList);