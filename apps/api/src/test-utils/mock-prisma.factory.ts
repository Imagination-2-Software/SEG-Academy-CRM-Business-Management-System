/**
 * Generic factory to create structured in-memory mock Prisma delegates for safe unit testing.
 * Prevents any accidental network calls to production Supabase.
 */

export function createMockPrismaClient(overrides: Record<string, any> = {}) {
  const defaultDelegate = () => ({
    findUnique: async () => null,
    findFirst: async () => null,
    findMany: async () => [],
    create: async ({ data }: any) => ({ id: `mock-${Date.now()}`, ...data, createdAt: new Date() }),
    update: async ({ data }: any) => ({ id: `mock-updated`, ...data, updatedAt: new Date() }),
    delete: async () => ({ id: `mock-deleted` }),
    count: async () => 0,
    aggregate: async () => ({ _sum: { paidAmount: null } }),
  });

  const baseClient = {
    user: defaultDelegate(),
    role: defaultDelegate(),
    permission: defaultDelegate(),
    profileStudent: defaultDelegate(),
    profileEmployee: defaultDelegate(),
    internDetails: defaultDelegate(),
    department: defaultDelegate(),
    team: defaultDelegate(),
    course: defaultDelegate(),
    batch: defaultDelegate(),
    enrolment: defaultDelegate(),
    invoice: defaultDelegate(),
    invoiceItem: defaultDelegate(),
    payment: defaultDelegate(),
    creditNote: defaultDelegate(),
    debitNote: defaultDelegate(),
    refund: defaultDelegate(),
    task: defaultDelegate(),
    taskSubmission: defaultDelegate(),
    submissionReview: defaultDelegate(),
    studentDocument: defaultDelegate(),
    auditLog: defaultDelegate(),
    notification: defaultDelegate(),
    $transaction: async (arg: any) => {
      if (typeof arg === 'function') {
        return arg(baseClient);
      }
      return Promise.all(arg);
    },
    ...overrides,
  };

  return baseClient;
}
