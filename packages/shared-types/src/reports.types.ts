export interface IDashboardKpis {
  mrr: number;
  arpu: number;
  totalSubscribers: number;
  activeSubscribers: number;
  suspendedSubscribers: number;
  churnRate: number;
  pendingReceivables: number;
  activeSessions: number;
  openTickets: number;
  totalPackages: number;
  revenueChart: Array<{ date: string; amount: number; count: number }>;
}

export interface IRevenueReportItem {
  date: string;
  revenue: number;
  transactionsCount: number;
}

export interface IBandwidthReportItem {
  subscriberId: string;
  username: string;
  name: string;
  packageName: string;
  downloadBytes: number;
  uploadBytes: number;
  totalBytes: number;
  downloadGb: number;
  uploadGb: number;
  status: string;
}
