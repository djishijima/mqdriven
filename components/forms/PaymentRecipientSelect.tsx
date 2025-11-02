import React, { useEffect, useMemo, useState } from 'react';
import { getPaymentRecipients } from '../../services/dataService.ts';
import { PaymentRecipient } from '../../types.ts';
import { normalizeSearchText } from '../../utils.ts';

const DEFAULT_LIMIT = 20;

type PaymentRecipientSelectProps = {
  value?: string;
  onChange: (id: string) => void;
  onRecipientSelected?: (recipient: PaymentRecipient | null) => void;
  required?: boolean;
  name?: string;
  id?: string;
  disabled?: boolean;
  recipients?: PaymentRecipient[];
};

const formatRecipientLabel = (recipient: PaymentRecipient): string => {
  if (recipient.companyName && recipient.recipientName) {
    return `${recipient.companyName}（${recipient.recipientName}）`;
  }
  return recipient.companyName ?? recipient.recipientName ?? '名称未設定';
};

const buildSearchTarget = (recipient: PaymentRecipient): string =>
  [recipient.companyName, recipient.recipientName, recipient.recipientCode]
    .filter(Boolean)
    .join(' ');

const PaymentRecipientSelect: React.FC<PaymentRecipientSelectProps> = ({
  value,
  onChange,
  onRecipientSelected,
  required,
  name = 'paymentRecipientId',
  id = 'paymentRecipientId',
  disabled,
  recipients,
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [list, setList] = useState<PaymentRecipient[]>(recipients ?? []);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [loading, setLoading] = useState(!recipients);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPaymentRecipients();
      setList(data);
    } catch (err) {
      console.error('Failed to load payment recipients', err);
      setError('取得できませんでした。再試行');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!recipients) {
      fetchRecipients();
    }
  }, [recipients]);

  useEffect(() => {
    if (recipients) {
      setList(recipients);
      setLoading(false);
    }
  }, [recipients]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 180);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setLimit(DEFAULT_LIMIT);
  }, [debouncedQuery]);

  const activeRecipients = useMemo(
    () => list.filter(recipient => recipient.isActive !== false),
    [list]
  );

  const selectedRecipient = useMemo(
    () => activeRecipients.find(recipient => recipient.id === value) ?? null,
    [activeRecipients, value]
  );

  useEffect(() => {
    if (selectedRecipient) {
      setQuery(formatRecipientLabel(selectedRecipient));
    } else if (!value) {
      setQuery('');
    }
    if (onRecipientSelected) {
      onRecipientSelected(selectedRecipient);
    }
  }, [selectedRecipient, value, onRecipientSelected]);

  const normalizedQuery = normalizeSearchText(debouncedQuery);

  const { visibleRecipients, hasMore } = useMemo(() => {
    if (!normalizedQuery) {
      return {
        visibleRecipients: activeRecipients
          .slice()
          .sort((a, b) => formatRecipientLabel(a).localeCompare(formatRecipientLabel(b), 'ja'))
          .slice(0, limit),
        hasMore: activeRecipients.length > limit,
      };
    }
    const prefix: PaymentRecipient[] = [];
    const partial: PaymentRecipient[] = [];
    activeRecipients.forEach(recipient => {
      const target = normalizeSearchText(buildSearchTarget(recipient));
      if (target.startsWith(normalizedQuery)) {
        prefix.push(recipient);
      } else if (target.includes(normalizedQuery)) {
        partial.push(recipient);
      }
    });
    const combined = [...prefix, ...partial];
    return {
      visibleRecipients: combined.slice(0, limit),
      hasMore: combined.length > limit,
    };
  }, [activeRecipients, normalizedQuery, limit]);

  const selectClass =
    'w-full text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-md p-2 focus:ring-blue-500 focus:border-blue-500';
  const inputClass =
    'w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-md p-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="space-y-1">
      <input
        type="text"
        placeholder="支払先検索（社名 / 担当者 / コード）"
        value={query}
        onChange={event => setQuery(event.target.value)}
        className={inputClass}
        autoComplete="organization"
        disabled={disabled || loading}
      />
      <select
        id={id}
        name={name}
        required={required}
        value={value ?? ''}
        onChange={event => {
          const newValue = event.target.value;
          onChange(newValue);
          if (onRecipientSelected) {
            const recipient = activeRecipients.find(item => item.id === newValue) ?? null;
            onRecipientSelected(recipient);
          }
        }}
        disabled={disabled || loading}
        className={selectClass}
      >
        <option value="">支払先を選択</option>
        {visibleRecipients.map(recipient => (
          <option key={recipient.id} value={recipient.id}>
            {formatRecipientLabel(recipient)}
          </option>
        ))}
      </select>
      {error && (
        <button
          type="button"
          onClick={fetchRecipients}
          className="text-xs text-red-600 hover:text-red-700"
        >
          {error}
        </button>
      )}
      {!error && !loading && visibleRecipients.length === 0 && (
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

export default PaymentRecipientSelect;
