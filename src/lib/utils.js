import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';

export const MARKETS = ['nigeria', 'ghana'];
export const CURRENCIES = { nigeria: '₦', ghana: 'GH₵' };

export const PRODUCTS = [
  'Net Repair Tape',
  'Heavy Duty Mesh Tape',
  'Car Scratch Remover',
  'Deep Edge Crevice Brush',
];

export const EXPENSE_CATEGORIES = [
  { value: 'ad_spend', label: 'Ad Spend' },
  { value: 'import_shipping', label: 'Import / Shipping' },
  { value: 'delivery_commission', label: 'Delivery / Commission' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'tools_subscriptions', label: 'Tools & Subscriptions' },
  { value: 'other', label: 'Other' },
];

export const CATEGORY_COLORS = {
  ad_spend: '#E8594F',
  import_shipping: '#F4A142',
  delivery_commission: '#4ECDC4',
  packaging: '#7B68EE',
  tools_subscriptions: '#45B7D1',
  other: '#95A5A6',
};

export const PRODUCT_COLORS = {
  'Net Repair Tape': '#E8594F',
  'Heavy Duty Mesh Tape': '#F4A142',
  'Car Scratch Remover': '#4ECDC4',
  'Deep Edge Crevice Brush': '#7B68EE',
};

export function formatMoney(amount, market = 'nigeria') {
  const currency = CURRENCIES[market] || '₦';
  const num = Number(amount) || 0;
  return `${currency}${num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatMoneyShort(amount) {
  const num = Number(amount) || 0;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function formatDate(date) {
  return format(new Date(date), 'MMM dd, yyyy');
}

export function getDateRange(period) {
  const today = new Date();
  switch (period) {
    case 'today':
      return { from: format(today, 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
    case 'week':
      return {
        from: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    case 'month':
      return {
        from: format(startOfMonth(today), 'yyyy-MM-dd'),
        to: format(endOfMonth(today), 'yyyy-MM-dd'),
      };
    case 'last30':
      return {
        from: format(subDays(today, 30), 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      };
    case 'last3months':
      return {
        from: format(subMonths(today, 3), 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      };
    case 'all':
      return { from: '2020-01-01', to: format(today, 'yyyy-MM-dd') };
    default:
      return { from: format(startOfMonth(today), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
  }
}

export function calcChange(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
