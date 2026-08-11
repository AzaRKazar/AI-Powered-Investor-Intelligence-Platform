type NumericMetricKey =
  | 'revenue'
  | 'net_income'
  | 'operating_income'
  | 'cash_flow'
  | 'total_assets'
  | 'total_liabilities';

export interface KpiDefinition {
  key: NumericMetricKey;
  title: string;
  description: string;
  iconPaths: string[];
  catIndex: 1 | 2 | 3 | 4 | 5 | 6;
}

// Fixed order, matches the categorical palette's assigned meaning
// (--cat-1..6 in tokens.css) - never cycled or reordered.
export const KPI_DEFINITIONS: KpiDefinition[] = [
  {
    key: 'revenue',
    title: 'Revenue',
    description: 'Total company revenue',
    iconPaths: [
      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    ],
    catIndex: 1,
  },
  {
    key: 'net_income',
    title: 'Net Income',
    description: 'Net profitability after expenses',
    iconPaths: [
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    ],
    catIndex: 2,
  },
  {
    key: 'operating_income',
    title: 'Operating Income',
    description: 'Earnings from operations',
    iconPaths: [
      'M21 13.255A9.001 9.001 0 1111.75 3v9.25H21z',
      'M14.75 3.245A8.968 8.968 0 0120.755 9.25H14.75V3.245z',
    ],
    catIndex: 3,
  },
  {
    key: 'cash_flow',
    title: 'Operating Cash Flow',
    description: 'Cash flow from operations',
    iconPaths: [
      'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    ],
    catIndex: 4,
  },
  {
    key: 'total_assets',
    title: 'Total Assets',
    description: 'Total economic resources',
    iconPaths: [
      'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    ],
    catIndex: 5,
  },
  {
    key: 'total_liabilities',
    title: 'Total Liabilities',
    description: 'Total outstanding obligations',
    iconPaths: [
      'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
    ],
    catIndex: 6,
  },
];
