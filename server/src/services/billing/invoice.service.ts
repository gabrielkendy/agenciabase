import { supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { creditsService } from './credits.service.js';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  organizationId: string;
  number: string;
  status: 'draft' | 'pending' | 'paid' | 'cancelled';
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

interface CreateInvoiceParams {
  organizationId: string;
  items: InvoiceItem[];
  dueDate?: Date;
  notes?: string;
}

export const invoiceService = {
  async create(params: CreateInvoiceParams): Promise<Invoice> {
    const { organizationId, items, dueDate, notes } = params;

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = 0; // Adjust tax calculation as needed
    const total = subtotal + tax;

    // Generate invoice number
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const invoiceNumber = `INV-${organizationId.substring(0, 6).toUpperCase()}-${String((count || 0) + 1).padStart(5, '0')}`;

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        organization_id: organizationId,
        number: invoiceNumber,
        status: 'pending',
        items,
        subtotal,
        tax,
        total,
        due_date: dueDate?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        notes,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create invoice: ${error.message}`);
    }

    logger.info('Invoice created', { invoiceId: data.id, number: invoiceNumber });

    return this.formatInvoice(data);
  },

  async getById(invoiceId: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.formatInvoice(data);
  },

  async listByOrganization(
    organizationId: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<{ invoices: Invoice[]; total: number }> {
    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list invoices: ${error.message}`);
    }

    return {
      invoices: (data || []).map(this.formatInvoice),
      total: count || 0,
    };
  },

  async markAsPaid(invoiceId: string, paymentMethod?: string): Promise<Invoice> {
    const invoice = await this.getById(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Invoice is already paid');
    }

    if (invoice.status === 'cancelled') {
      throw new Error('Cannot pay a cancelled invoice');
    }

    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to mark invoice as paid: ${error.message}`);
    }

    // Credit the organization if this is a credits purchase
    const creditsItem = invoice.items.find(item =>
      item.description.toLowerCase().includes('credits') ||
      item.description.toLowerCase().includes('créditos')
    );

    if (creditsItem) {
      await creditsService.credit({
        organizationId: invoice.organizationId,
        amount: creditsItem.quantity,
        type: 'purchase',
        description: `Credits purchase - Invoice ${invoice.number}`,
      });
    }

    logger.info('Invoice marked as paid', { invoiceId, paymentMethod });

    return this.formatInvoice(data);
  },

  async cancel(invoiceId: string, reason?: string): Promise<Invoice> {
    const invoice = await this.getById(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Cannot cancel a paid invoice');
    }

    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel invoice: ${error.message}`);
    }

    logger.info('Invoice cancelled', { invoiceId, reason });

    return this.formatInvoice(data);
  },

  async createCreditsPurchaseInvoice(
    organizationId: string,
    creditsAmount: number,
    pricePerCredit: number = 0.01
  ): Promise<Invoice> {
    const total = creditsAmount * pricePerCredit;

    return this.create({
      organizationId,
      items: [
        {
          description: `${creditsAmount.toLocaleString()} Créditos`,
          quantity: creditsAmount,
          unitPrice: pricePerCredit,
          total,
        },
      ],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
  },

  formatInvoice(data: any): Invoice {
    return {
      id: data.id,
      organizationId: data.organization_id,
      number: data.number,
      status: data.status,
      items: data.items || [],
      subtotal: data.subtotal,
      tax: data.tax || 0,
      total: data.total,
      dueDate: data.due_date,
      paidAt: data.paid_at,
      createdAt: data.created_at,
    };
  },
};

export default invoiceService;
