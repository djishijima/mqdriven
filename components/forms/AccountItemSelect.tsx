import React, { useEffect, useMemo, useState } from 'react';
import { getActiveAccountItems } from '../../services/dataService.ts';
import { AccountItem } from '../../types.ts';

type Props = {
  value?: string;
  onChange: (id: string) => void;
  required?: boolean;
  name?: string;
  id?: string;
  disabled?: boolean;
  items?: AccountItem[];
  onSelect?: (item: AccountItem | null) => void;
};

const AccountItemSelect: React.FC<Props> = ({
  value,
  onChange,
  required,
  name = 'accountItemId',
  id = 'accountItemId',
  disabled,
  items,
  onSelect,
}) => {
  const [list, setList] = useState<AccountItem[]>(items ?? []);
  const [loading, setLoading] = useState(!items);

  useEffect(() => {
    if (!items) {
      getActiveAccountItems()
        .then(data => setList(data.filter(account => account.isActive)))
        .finally(() => setLoading(false));
    }
  }, [items]);

  useEffect(() => {
    if (items) {
      setList(items.filter(account => account.isActive));
      setLoading(false);
    }
  }, [items]);

  const selectedItem = useMemo(
    () => list.find(item => item.id === value) ?? null,
    [list, value]
  );

  useEffect(() => {
    if (onSelect) {
      onSelect(selectedItem);
    }
  }, [selectedItem, onSelect]);

  return (
    <select
      id={id}
      name={name}
      required={required}
      value={value ?? ''}
      onChange={event => {
        const newValue = event.target.value;
        onChange(newValue);
        if (onSelect) {
          const item = list.find(account => account.id === newValue) ?? null;
          onSelect(item);
        }
      }}
      disabled={disabled || loading}
      className="w-full text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="">勘定科目を選択</option>
      {list.map(item => (
        <option key={item.id} value={item.id}>
          {item.code}：{item.name}
        </option>
      ))}
    </select>
  );
};

export default AccountItemSelect;
