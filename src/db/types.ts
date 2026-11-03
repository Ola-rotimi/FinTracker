import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { Frequency } from '@/lib/dates';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export type TxType = 'income' | 'expense';

export type Category = {
  id: number;
  name: string;
  type: TxType;
  icon: IconName;
  color: string;
  archived: number;
};

export type Transaction = {
  id: number;
  type: TxType;
  /** Minor units (cents). Always positive; `type` carries the sign. */
  amount: number;
  category_id: number;
  date: string;
  note: string;
  created_at: string;
};

export type Budget = { category_id: number; amount: number };

export type Goal = {
  id: number;
  name: string;
  target: number;
  saved: number;
  deadline: string | null;
  color: string;
  icon: IconName;
  created_at: string;
};

export type Bill = {
  id: number;
  name: string;
  amount: number;
  category_id: number;
  due_date: string;
  frequency: Frequency;
  active: number;
};
