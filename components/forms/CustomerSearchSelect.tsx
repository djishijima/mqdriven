import React, { useEffect, useMemo, useState } from 'react';
import { Customer } from '../../types.ts';
import { normalizeSearchText } from '../../utils.ts';

const DEFAULT_LIMIT = 20;

type CustomerSearchSelectProps = {
  customers: Customer[];
  value?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
};

const formatCustomerLabel = (customer: Customer): string => {
  const code = customer.customerCode ? `（${customer.customerCode}）` : '';
  return `${customer.customerName}${code}`;
};

const buildSearchTarget = (customer: Customer): string => {
  return [
    customer.customerName,
    customer.customerCode,
    customer.address1,
    customer.address2,
    customer.postNo,
  ]
    .filter(Boolean)
    .join(' ');
};

const CustomerSearchSelect: React.FC<CustomerSearchSelectProps> = ({
  customers,
  value,
  onChange,
  disabled,
  required,
  name = 'customerId',
  id = 'customerId',
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 180);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setLimit(DEFAULT_LIMIT);
  }, [debouncedQuery]);

  const activeCustomers = useMemo(
    () => customers.filter(customer => customer.isActive !== false),
    [customers]
  );

  const selectedCustomer = useMemo(
    () => activeCustomers.find(customer => customer.id === value) ?? null,
    [activeCustomers, value]
  );

  useEffect(() => {
    if (selectedCustomer) {
      setQuery(formatCustomerLabel(selectedCustomer));
    } else if (!value) {
      setQuery('');
    }
  }, [selectedCustomer, value]);

  const normalizedQuery = normalizeSearchText(debouncedQuery);

  const { visibleCustomers, hasMore } = useMemo(() => {
    if (!normalizedQuery) {
      return {
        visibleCustomers: activeCustomers
          .slice()
          .sort((a, b) => a.customerName.localeCompare(b.customerName, 'ja'))
          .slice(0, limit),
        hasMore: activeCustomers.length > limit,
      };
    }
    const prefix: Customer[] = [];
    const partial: Customer[] = [];
    activeCustomers.forEach(customer => {
      const target = normalizeSearchText(buildSearchTarget(customer));
      if (target.startsWith(normalizedQuery)) {
        prefix.push(customer);
      } else if (target.includes(normalizedQuery)) {
        partial.push(customer);
      }
    });
    const combined = [...prefix, ...partial];
    return {
      visibleCustomers: combined.slice(0, limit),
      hasMore: combined.length > limit,
    };
  }, [activeCustomers, normalizedQuery, limit]);

  const selectClass =
    'w-full text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-md p-2 focus:ring-blue-500 focus:border-blue-500';
  const inputClass =
    'w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-md p-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="space-y-1">
      <input
        type="text"
        value={query}
        onChange={event => setQuery(event.target.value)}
        className={inputClass}
        placeholder="顧客名 / コード / 住所で検索"
        disabled={disabled}
        autoComplete="off"
      />
      <select
        id={id}
        name={name}
        value={value ?? ''}
        required={required}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        className={selectClass}
      >
        <option value="">顧客を選択</option>
        {visibleCustomers.map(customer => (
          <option key={customer.id} value={customer.id}>
            {formatCustomerLabel(customer)}
          </option>
        ))}
      </select>
      {!disabled && visibleCustomers.length === 0 && (
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

export default CustomerSearchSelect;
