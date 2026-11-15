export type { CreateMyAppointmentRequest } from './api/my-appointments.api';
export { useCreateMyAppointment } from './api/my-appointments.mutations';
export { hasMyAppointments, MY_APPOINTMENTS_PATH } from './loaders';
export { myAppointmentsRoutes } from './routes';
export type { MyAppointment } from './types';
