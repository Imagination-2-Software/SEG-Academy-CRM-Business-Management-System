'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import {
  billingService,
  formatINR,
  StudentReference,
  InvoiceItem,
} from '@/lib/api/billing';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Receipt,
  CheckCircle2,
  Calendar,
  UserCheck,
  Percent,
  AlertCircle,
  FileText,
  Calculator,
} from 'lucide-react';

interface FormItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();

  // Student selection state
  const [students, setStudents] = useState<StudentReference[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentReference | null>(null);

  // Form fields
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState(
    'Tuition fee for academic enrollment. Please quote the invoice number when making bank transfers or UPI payments.',
  );

  // Line items state
  const [items, setItems] = useState<FormItem[]>([
    {
      id: 'item-init-1',
      description: 'Tuition Fee - Academic Program (Semester 1)',
      quantity: 1,
      unitPrice: 50000,
      taxRate: 18,
    },
    {
      id: 'item-init-2',
      description: 'Lab & Learning Management System Access Pass',
      quantity: 1,
      unitPrice: 5000,
      taxRate: 18,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load registered students
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const res: any = await apiClient.get('/students?limit=100');
        if (res?.success && res?.data) {
          const list = Array.isArray(res.data) ? res.data : res.data.data || [];
          if (list.length > 0) {
            setStudents(list);
            setSelectedStudentId(list[0].id);
            setSelectedStudent(list[0]);
            return;
          }
        }
      } catch {
        // Fallback default students
      }

      const defaultStudents: StudentReference[] = [
        {
          id: 'stu-uuid-1',
          studentCode: 'SEG-26-0001',
          fullName: 'Aarav Sharma',
          email: 'aarav.sharma@example.com',
          phoneNumber: '+91 98765 43210',
          address: 'Flat 402, Highrise Residency, Andheri East, Mumbai, Maharashtra 400069',
        },
        {
          id: 'stu-uuid-2',
          studentCode: 'SEG-26-0002',
          fullName: 'Priya Patel',
          email: 'priya.patel@example.com',
          phoneNumber: '+91 91234 56789',
          address: 'B-12 Nilgiri Heights, Vastrapur, Ahmedabad, Gujarat 380015',
        },
        {
          id: 'stu-uuid-3',
          studentCode: 'SEG-26-0003',
          fullName: 'Rohan Mehta',
          email: 'rohan.mehta@example.com',
          phoneNumber: '+91 99887 76655',
          address: '74 Park View Apartments, Koramangala, Bengaluru, Karnataka 560034',
        },
        {
          id: 'stu-uuid-4',
          studentCode: 'SEG-26-0004',
          fullName: 'Neha Gupta',
          email: 'neha.gupta@example.com',
          phoneNumber: '+91 97654 32109',
          address: 'Block C-9, Sector 62, Noida, Uttar Pradesh 201309',
        },
      ];

      setStudents(defaultStudents);
      setSelectedStudentId(defaultStudents[0].id);
      setSelectedStudent(defaultStudents[0]);
    };

    loadStudents();
  }, []);

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    const found = students.find((s) => s.id === id);
    setSelectedStudent(found || null);
  };

  // Line item handlers
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleItemChange = (
    id: string,
    field: keyof FormItem,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        return {
          ...it,
          [field]:
            field === 'quantity' || field === 'unitPrice' || field === 'taxRate'
              ? Number(value)
              : value,
        };
      }),
    );
  };

  // Calculations
  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.quantity) * Number(it.unitPrice),
    0,
  );

  const totalTax = items.reduce((sum, it) => {
    const itemAmount = Number(it.quantity) * Number(it.unitPrice);
    const tax = (itemAmount * (Number(it.taxRate) || 0)) / 100;
    return sum + tax;
  }, 0);

  const grandTotal = Math.max(0, subtotal - Number(discountAmount) + totalTax);

  // Form submission
  const handleSubmit = async (isFinalized: boolean) => {
    if (!selectedStudentId) {
      setErrorMessage('Please select a student for this invoice.');
      return;
    }

    if (items.some((it) => !it.description.trim() || it.unitPrice <= 0)) {
      setErrorMessage('Every line item must have a valid description and positive unit price.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await billingService.createInvoice({
        studentId: selectedStudentId,
        issueDate,
        dueDate,
        items: items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxRate: it.taxRate,
          amount: it.quantity * it.unitPrice,
        })),
        subtotal,
        discountAmount: Number(discountAmount) || 0,
        taxAmount: totalTax,
        totalAmount: grandTotal,
        notes,
        isFinalized,
      });

      router.push(`/invoices/${created.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create invoice.');
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER']}
      requiredPermission="invoices:read"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/invoices"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </Link>
          <span className="text-xs font-semibold text-muted-foreground">
            Invoice Generator • SEG Academy CRM
          </span>
        </div>

        {/* Title Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Create Student Invoice
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate an official itemized tax invoice with automatic GST calculations
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Form (2 cols) */}
          <div className="space-y-6 lg:col-span-2">
            {/* Student & Billing Dates Section */}
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
                <UserCheck className="h-4 w-4 text-seg-plum" />
                Customer & Invoice Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Select Student <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => handleStudentChange(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    required
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.studentCode}) — {s.email}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedStudent && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-semibold text-foreground">Student ID:</span>{' '}
                        {selectedStudent.studentCode}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Phone:</span>{' '}
                        {selectedStudent.phoneNumber || 'Not provided'}
                      </div>
                      <div className="col-span-2">
                        <span className="font-semibold text-foreground">Billing Address:</span>{' '}
                        {selectedStudent.address || 'SEG Academy Campus'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Issue Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Payment Due Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="text-sm"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Itemized Line Items */}
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Receipt className="h-4 w-4 text-seg-plum" />
                  Line Items & Fee Breakdown
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-8 text-xs font-medium text-seg-plum"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Line Item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div
                    key={it.id}
                    className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                        Item #{idx + 1} Description
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Tuition Fee, Exam Certification, Lab Fee"
                        value={it.description}
                        onChange={(e) =>
                          handleItemChange(it.id, 'description', e.target.value)
                        }
                        className="text-xs"
                        required
                      />
                    </div>

                    <div className="w-20">
                      <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                        Qty
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) =>
                          handleItemChange(it.id, 'quantity', e.target.value)
                        }
                        className="text-xs"
                        required
                      />
                    </div>

                    <div className="w-28">
                      <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                        Unit Rate (₹)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        value={it.unitPrice}
                        onChange={(e) =>
                          handleItemChange(it.id, 'unitPrice', e.target.value)
                        }
                        className="text-xs font-medium"
                        required
                      />
                    </div>

                    <div className="w-24">
                      <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                        GST %
                      </label>
                      <select
                        value={it.taxRate}
                        onChange={(e) =>
                          handleItemChange(it.id, 'taxRate', e.target.value)
                        }
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value={0}>0% (Exempt)</option>
                        <option value={5}>5% GST</option>
                        <option value={12}>12% GST</option>
                        <option value={18}>18% GST</option>
                      </select>
                    </div>

                    <div className="w-28 text-right">
                      <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                        Amount
                      </label>
                      <div className="py-2 text-xs font-bold text-foreground">
                        {formatINR(it.quantity * it.unitPrice)}
                      </div>
                    </div>

                    <div className="pt-4 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        disabled={items.length <= 1}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-30"
                        title="Remove Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes & Payment Terms */}
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <FileText className="h-4 w-4 text-seg-plum" />
                Payment Instructions & Terms
              </h2>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Add bank details, UPI address or fee policy notes..."
              />
            </div>
          </div>

          {/* Right Column: Financial Calculation Summary */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
                <Calculator className="h-4 w-4 text-seg-plum" />
                Invoice Calculation
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal (Net Items):</span>
                  <span className="font-medium text-foreground">{formatINR(subtotal)}</span>
                </div>

                <div className="border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Discount (Scholarship / Promo):</span>
                  </div>
                  <div className="mt-1.5 relative">
                    <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-semibold">
                      ₹
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="h-8 pl-6 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Tax (CGST 9% + SGST 9%):</span>
                    <span className="font-medium text-foreground">{formatINR(totalTax)}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Standard educational services GST applicable in India
                  </p>
                </div>

                <div className="border-t border-border/80 pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-extrabold text-foreground">Total Invoiced:</span>
                    <span className="text-base font-extrabold text-seg-plum">
                      {formatINR(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col gap-2.5">
                <Button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting || grandTotal <= 0}
                  className="w-full bg-seg-plum text-white hover:bg-seg-plum-hover"
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  {isSubmitting ? 'Creating...' : 'Create & Issue Invoice'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || grandTotal <= 0}
                  className="w-full text-xs font-medium"
                >
                  Save as Draft
                </Button>

                <Link href="/invoices" className="w-full">
                  <Button variant="ghost" className="w-full text-xs text-muted-foreground">
                    Cancel
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Helper Card */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground">
              <h3 className="font-semibold text-foreground">SEG Billing Policy</h3>
              <p className="mt-1 leading-relaxed">
                Issuing an invoice marks it active for student payment tracking and enables online UPI / NEFT reconciliation. Once paid, a verified payment receipt is generated automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
