import React, { useEffect, useMemo, useState } from 'react';
import { Project } from '../../types.ts';

const DEFAULT_LIMIT = 20;

type ProjectSelectProps = {
  projects: Project[];
  customerId?: string;
  value?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
};

const sortProjects = (list: Project[]): Project[] => {
  return list.slice().sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return a.projectName.localeCompare(b.projectName, 'ja');
  });
};

const ProjectSelect: React.FC<ProjectSelectProps> = ({
  projects,
  customerId,
  value,
  onChange,
  disabled,
  required,
  name = 'projectId',
  id = 'projectId',
}) => {
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  useEffect(() => {
    setLimit(DEFAULT_LIMIT);
  }, [customerId]);

  const filteredProjects = useMemo(() => {
    if (!customerId) {
      return [];
    }
    return sortProjects(
      projects.filter(project => project.customerId === customerId && project.isActive !== false)
    );
  }, [projects, customerId]);

  const visibleProjects = filteredProjects.slice(0, limit);
  const hasMore = filteredProjects.length > limit;

  const selectClass =
    'w-full text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-md p-2 focus:ring-blue-500 focus:border-blue-500';

  const isDisabled = disabled || !customerId;

  return (
    <div className="space-y-1">
      <select
        id={id}
        name={name}
        value={value ?? ''}
        onChange={event => onChange(event.target.value)}
        disabled={isDisabled}
        required={required && !isDisabled}
        className={selectClass}
      >
        <option value="">{customerId ? '案件を選択' : '顧客を先に選択'}</option>
        {visibleProjects.map(project => (
          <option key={project.id} value={project.id}>
            {project.projectName}
          </option>
        ))}
      </select>
      {customerId && !isDisabled && visibleProjects.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">結果が見つかりませんでした。</p>
      )}
      {hasMore && (
        <button
          type="button"
          onClick={() => setLimit(prev => prev + DEFAULT_LIMIT)}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          さらに表示
        </button>
      )}
    </div>
  );
};

export default ProjectSelect;
