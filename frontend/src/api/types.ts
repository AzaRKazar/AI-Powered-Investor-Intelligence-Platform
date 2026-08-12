export interface MetricRow {
  id: number;
  company: string;
  // VARCHAR(10) on the backend - a string, not a number.
  year: string;
  revenue: string | null;
  net_income: string | null;
  operating_income: string | null;
  cash_flow: string | null;
  total_assets: string | null;
  total_liabilities: string | null;
  // '\n'-joined; can be an empty string.
  risk_factors: string;
  growth_drivers: string;
  created_at: string;
}

export interface UploadResponse {
  message: string;
  file_name: string;
}

export interface ChatRequestPayload {
  question: string;
  // Must be omitted (not sent as null) when unscoped - see ChatComposer.
  company?: string;
  year?: number;
}

export interface ChatResponse {
  answer: string;
}
