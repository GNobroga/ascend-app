export const AppointmentStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const AppointmentOrigin = {
  TEAM: 'team',
  CUSTOMER: 'customer',
} as const;

export type AppointmentOrigin = (typeof AppointmentOrigin)[keyof typeof AppointmentOrigin];

export const AppointmentPaymentStatus = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
} as const;

export type AppointmentPaymentStatus = (typeof AppointmentPaymentStatus)[keyof typeof AppointmentPaymentStatus];

export type AppointmentParty = {
  id: string;
  name: string;
};

export type AppointmentLine = {
  serviceId: string;
  name: string;
  listPrice: number;
  price: number;
  durationMinutes: number;
  commissionPercent: number;
  commissionAmount: number;
};

export type AppointmentStatusChange = {
  previousStatus: AppointmentStatus | null;
  newStatus: AppointmentStatus;
  reason: string | null;
  changedByName: string | null;
  changedAt: string;
};

export type Appointment = {
  id: string;
  status: AppointmentStatus;
  origin: AppointmentOrigin | null;
  startAt: string;
  endAt: string;
  totalPrice: number;
  package: AppointmentParty | null;
  totalCommission: number;
  paidAmount: number;
  balance: number;
  paymentStatus: AppointmentPaymentStatus;
  customer: AppointmentParty;
  professional: AppointmentParty;
  services: AppointmentLine[];
  customerNotes: string | null;
  internalNotes: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  history?: AppointmentStatusChange[];
  createdAt: string;
};

export type AvailabilitySlot = {
  startAt: string;
  endAt: string;
  professionalIds: string[];
};

export type Availability = {
  date: string;
  timezone: string;
  durationMinutes: number;
  slots: AvailabilitySlot[];
};

export const PaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export type Payment = {
  id: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod: AppointmentParty;
  notes: string | null;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
};
