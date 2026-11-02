import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { PaymentTransaction } from '../payments/entities/payment-transaction.entity';
import { RadiusAccounting } from '../radius/entities/radius-accounting.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Package } from '../packages/entities/package.entity';
import { SubscriberStatus } from '../subscribers/entities/subscriber.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentRepo: Repository<PaymentTransaction>,
    @InjectRepository(RadiusAccounting)
    private readonly accountingRepo: Repository<RadiusAccounting>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Package)
    private readonly packageRepo: Repository<Package>,
  ) {}

  async getDashboardKpis(tenantId: string | null, isSuperAdmin = false) {

    // 1. Total and Active Subscribers
    const subQuery = this.subscriberRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.package', 'pkg');
    if (!isSuperAdmin && tenantId) subQuery.where('s.tenantId = :tenantId', { tenantId });
    const subscribers = await subQuery.getMany();

    const totalSubscribers = subscribers.length;
    const activeSubscribers = subscribers.filter((s) => s.status === SubscriberStatus.ACTIVE).length;
    const churnedCount = subscribers.filter((s) => s.status === SubscriberStatus.TERMINATED || s.status === SubscriberStatus.SUSPENDED).length;
    const churnRate = totalSubscribers > 0 ? Number(((churnedCount / totalSubscribers) * 100).toFixed(2)) : 0;

    // 2. MRR (Monthly Recurring Revenue) & ARPU (Average Revenue Per User)
    const mrr = subscribers
      .filter((s) => s.status === SubscriberStatus.ACTIVE)
      .reduce((sum, s) => sum + (s.package?.price ? Number(s.package.price) : 0), 0);
    const arpu = activeSubscribers > 0 ? Number((mrr / activeSubscribers).toFixed(2)) : 0;

    // 3. Pending Receivables
    const invoiceQuery = this.invoiceRepo.createQueryBuilder('i')
      .where("i.status IN ('PENDING', 'OVERDUE')");
    if (!isSuperAdmin && tenantId) invoiceQuery.andWhere('i.tenantId = :tenantId', { tenantId });
    const pendingInvoices = await invoiceQuery.getMany();
    const pendingReceivables = pendingInvoices.reduce(
      (sum, inv) => sum + Number(inv.balanceAmount || inv.totalAmount || 0),
      0,
    );

    // 4. Active Sessions (Radius Accounting with stop_time IS NULL)
    const sessionQuery = this.accountingRepo.createQueryBuilder('a')
      .where('a.stop_time IS NULL');
    if (!isSuperAdmin && tenantId) sessionQuery.andWhere('a.tenant_id = :tenantId', { tenantId });
    const activeSessions = await sessionQuery.getCount();

    // 5. Open Tickets
    const ticketQuery = this.ticketRepo.createQueryBuilder('t')
      .where("t.status IN ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER')");
    if (!isSuperAdmin && tenantId) ticketQuery.andWhere('t.tenant_id = :tenantId', { tenantId });
    const openTickets = await ticketQuery.getCount();

    return {
      mrr: Number(mrr.toFixed(2)),
      arpu,
      totalSubscribers,
      activeSubscribers,
      churnRate,
      pendingReceivables: Number(pendingReceivables.toFixed(2)),
      activeSessions,
      openTickets,
    };
  }

  async getRevenueReports(tenantId: string | null, isSuperAdmin = false) {
    const tenantFilter = !isSuperAdmin && tenantId ? 'AND p.tenant_id = $1' : '';
    const invTenantFilter = !isSuperAdmin && tenantId ? 'AND i.tenant_id = $1' : '';

    // 1. Daily Revenue (last 30 days)
    const dailyData = await this.paymentRepo.query(
      `SELECT TO_CHAR(p.created_at, 'YYYY-MM-DD') AS date,
              COALESCE(SUM(p.amount), 0) AS total,
              COUNT(p.id) AS count
       FROM payment_transactions p
       WHERE p.status = 'SUCCESS'
         AND p.created_at >= NOW() - INTERVAL '30 days'
         ${tenantFilter}
       GROUP BY TO_CHAR(p.created_at, 'YYYY-MM-DD')
       ORDER BY date ASC`,
      !isSuperAdmin && tenantId ? [tenantId] : [],
    );

    // 2. Monthly Revenue (last 12 months)
    const monthlyData = await this.paymentRepo.query(
      `SELECT TO_CHAR(p.created_at, 'YYYY-MM') AS month,
              COALESCE(SUM(p.amount), 0) AS total,
              COUNT(p.id) AS count
       FROM payment_transactions p
       WHERE p.status = 'SUCCESS'
         AND p.created_at >= NOW() - INTERVAL '12 months'
         ${tenantFilter}
       GROUP BY TO_CHAR(p.created_at, 'YYYY-MM')
       ORDER BY month ASC`,
      !isSuperAdmin && tenantId ? [tenantId] : [],
    );

    // 3. Payment Reconciliation by Gateway
    const reconciliation = await this.paymentRepo.query(
      `SELECT p.gateway,
              COUNT(p.id) AS total_transactions,
              SUM(CASE WHEN p.status = 'SUCCESS' THEN 1 ELSE 0 END) AS successful_count,
              COALESCE(SUM(CASE WHEN p.status = 'SUCCESS' THEN p.amount ELSE 0 END), 0) AS settled_amount
       FROM payment_transactions p
       WHERE 1=1 ${tenantFilter}
       GROUP BY p.gateway`,
      !isSuperAdmin && tenantId ? [tenantId] : [],
    );

    // 4. Aging Receivables (0-30, 31-60, 61-90, 90+ days past due)
    const aging = await this.invoiceRepo.query(
      `SELECT
         COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.due_date) <= 30 THEN i.balance_amount ELSE 0 END), 0) AS "days0_30",
         COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.due_date) BETWEEN 31 AND 60 THEN i.balance_amount ELSE 0 END), 0) AS "days31_60",
         COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.due_date) BETWEEN 61 AND 90 THEN i.balance_amount ELSE 0 END), 0) AS "days61_90",
         COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.due_date) > 90 THEN i.balance_amount ELSE 0 END), 0) AS "days90_plus"
       FROM invoices i
       WHERE i.status IN ('PENDING', 'OVERDUE') ${invTenantFilter}`,
      !isSuperAdmin && tenantId ? [tenantId] : [],
    );

    return {
      dailyRevenue: dailyData.map((d: any) => ({
        date: d.date,
        total: parseFloat(d.total),
        count: parseInt(d.count, 10),
      })),
      monthlyRevenue: monthlyData.map((m: any) => ({
        month: m.month,
        total: parseFloat(m.total),
        count: parseInt(m.count, 10),
      })),
      reconciliation: reconciliation.map((r: any) => ({
        gateway: r.gateway,
        totalTransactions: parseInt(r.total_transactions, 10),
        successfulCount: parseInt(r.successful_count, 10),
        settledAmount: parseFloat(r.settled_amount),
      })),
      agingReceivables: {
        days0_30: parseFloat(aging[0]?.days0_30 || 0),
        days31_60: parseFloat(aging[0]?.days31_60 || 0),
        days61_90: parseFloat(aging[0]?.days61_90 || 0),
        days90Plus: parseFloat(aging[0]?.days90_plus || 0),
      },
    };
  }

  async getBandwidthAnalytics(tenantId: string | null, isSuperAdmin = false) {
    const tenantFilter = !isSuperAdmin && tenantId ? 'AND a.tenant_id = $1' : '';
    const pkgTenantFilter = !isSuperAdmin && tenantId ? 'AND s.tenant_id = $1' : '';

    // 1. Top Consumers
    const topConsumers = await this.accountingRepo.query(
      `SELECT a.username,
              COALESCE(SUM(a.bytes_in::numeric), 0) AS total_in,
              COALESCE(SUM(a.bytes_out::numeric), 0) AS total_out,
              COALESCE(SUM(a.bytes_in::numeric + a.bytes_out::numeric), 0) AS total_bytes,
              COUNT(a.id) AS sessions
       FROM radius_accounting a
       WHERE 1=1 ${tenantFilter}
       GROUP BY a.username
       ORDER BY total_bytes DESC
       LIMIT 10`,
      !isSuperAdmin && tenantId ? [tenantId] : [],
    );

    // 2. Usage by Package
    const usageByPackage = await this.subscriberRepo.query(
      `SELECT p.name AS package_name,
              p.price,
              p.download_speed_mbps AS download_speed,
              p.upload_speed_mbps AS upload_speed,
              COUNT(s.id) AS subscriber_count
       FROM packages p
       LEFT JOIN subscribers s ON s.package_id = p.id
       WHERE 1=1 ${pkgTenantFilter}
       GROUP BY p.id, p.name, p.price, p.download_speed_mbps, p.upload_speed_mbps
       ORDER BY subscriber_count DESC`,
      !isSuperAdmin && tenantId ? [tenantId] : [],
    );

    // 3. Peak Usage Trends (Daily aggregate of gigabytes)
    const trends = await this.accountingRepo.query(
      `SELECT TO_CHAR(a.start_time, 'YYYY-MM-DD') AS date,
              ROUND(COALESCE(SUM(a.bytes_in::numeric + a.bytes_out::numeric) / (1024*1024*1024), 0), 2) AS total_gb,
              COUNT(a.id) AS session_count
       FROM radius_accounting a
       WHERE a.start_time >= NOW() - INTERVAL '14 days'
         ${tenantFilter}
       GROUP BY TO_CHAR(a.start_time, 'YYYY-MM-DD')
       ORDER BY date ASC`,
      !isSuperAdmin && tenantId ? [tenantId] : [],
    );

    return {
      topConsumers: topConsumers.map((c: any) => ({
        username: c.username,
        totalBytes: Number(c.total_bytes),
        totalIn: Number(c.total_in),
        totalOut: Number(c.total_out),
        sessions: parseInt(c.sessions, 10),
      })),
      usageByPackage: usageByPackage.map((p: any) => ({
        packageName: p.package_name,
        price: parseFloat(p.price || 0),
        downloadSpeed: p.download_speed,
        uploadSpeed: p.upload_speed,
        subscriberCount: parseInt(p.subscriber_count, 10),
      })),
      trends: trends.map((t: any) => ({
        date: t.date,
        totalGb: parseFloat(t.total_gb),
        sessionCount: parseInt(t.session_count, 10),
      })),
    };
  }

  async exportCsv(type: string, tenantId: string | null, isSuperAdmin = false): Promise<string> {
    const whereTenant = !isSuperAdmin && tenantId ? { tenantId } : {};

    switch (type.toLowerCase()) {
      case 'subscribers': {
        const items = await this.subscriberRepo.find({
          where: whereTenant,
          relations: ['package'],
          order: { createdAt: 'DESC' },
        });
        const headers = ['ID', 'Username', 'Name', 'Email', 'Phone', 'Package', 'Status', 'IP', 'Created At'];
        const rows = items.map((s) => [
          s.id,
          s.username,
          `"${(s.fullName || s.firstName + ' ' + (s.lastName || '')).replace(/"/g, '""')}"`,
          s.email || '',
          s.phone || '',
          s.package?.name || '',
          s.status,
          s.staticIp || '',
          s.createdAt ? new Date(s.createdAt).toISOString() : '',
        ]);
        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      }

      case 'invoices': {
        const items = await this.invoiceRepo.find({
          where: whereTenant,
          order: { createdAt: 'DESC' },
        });
        const headers = ['ID', 'Invoice Number', 'Status', 'Total Amount', 'Paid Amount', 'Balance', 'Due Date', 'Created At'];
        const rows = items.map((i) => [
          i.id,
          i.invoiceNumber,
          i.status,
          i.totalAmount,
          i.paidAmount,
          i.balanceAmount,
          i.dueDate ? new Date(i.dueDate).toISOString().slice(0, 10) : '',
          i.createdAt ? new Date(i.createdAt).toISOString() : '',
        ]);
        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      }

      case 'payments': {
        const items = await this.paymentRepo.find({
          where: whereTenant,
          order: { createdAt: 'DESC' },
        });
        const headers = ['ID', 'Gateway', 'Transaction ID', 'Amount', 'Currency', 'Status', 'Payment Method', 'Created At'];
        const rows = items.map((p) => [
          p.id,
          p.gateway,
          p.gatewayTransactionId || '',
          p.amount,
          p.currency,
          p.status,
          p.paymentMethod || '',
          p.createdAt ? new Date(p.createdAt).toISOString() : '',
        ]);
        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      }

      case 'tickets': {
        const items = await this.ticketRepo.find({
          where: whereTenant,
          order: { createdAt: 'DESC' },
        });
        const headers = ['ID', 'Ticket Number', 'Subject', 'Category', 'Priority', 'Status', 'SLA Due At', 'Breached', 'Created At'];
        const rows = items.map((t) => [
          t.id,
          t.ticketNumber,
          `"${(t.subject || '').replace(/"/g, '""')}"`,
          t.category,
          t.priority,
          t.status,
          t.slaDueAt ? new Date(t.slaDueAt).toISOString() : '',
          (t.slaDueAt && new Date() > new Date(t.slaDueAt) && !t.resolvedAt) ? 'true' : 'false',
          t.createdAt ? new Date(t.createdAt).toISOString() : '',
        ]);
        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      }

      default:
        throw new BadRequestException(`Unsupported export type: ${type}. Supported types: subscribers, invoices, payments, tickets`);
    }
  }
}
