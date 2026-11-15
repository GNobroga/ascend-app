import { api } from '@/shared/api/http';
import type {
  Professional,
  ProfessionalTimeOff,
  ProfessionalTimeOffType,
  ProfessionalWorkingHour,
  Specialty,
} from '../types';

export type CreateProfessionalRequest = {
  memberId: string;
  displayName: string;
  bio: string | null;
  commissionPercent: number;
};

export type UpdateProfessionalRequest = Partial<Omit<CreateProfessionalRequest, 'memberId'>>;

export type SetProfessionalServicesRequest = {
  services: Array<{ serviceId: string; commissionPercent: number | null }>;
};

export type SetProfessionalPackagesRequest = {
  packages: Array<{ packageId: string; commissionPercent: number | null }>;
};

export type SetWorkingHoursRequest = {
  workingHours: ProfessionalWorkingHour[];
};

export type TimeOffRequest = {
  startAt: string;
  endAt: string;
  type: ProfessionalTimeOffType;
  reason: string | null;
};

export type SpecialtyRequest = {
  name: string;
  description: string | null;
};

export type SetProfessionalSpecialtiesRequest = {
  specialtyIds: string[];
};

const specialtiesPath = (businessId: string) => `/businesses/${businessId}/specialties`;

const professionalsPath = (businessId: string) => `/businesses/${businessId}/professionals`;

const professionalPath = (businessId: string, professionalId: string) =>
  `${professionalsPath(businessId)}/${professionalId}`;

const timeOffsPath = (businessId: string, professionalId: string) =>
  `${professionalPath(businessId, professionalId)}/time-offs`;

export const professionalsApi = {
  list: (businessId: string) => api.get<Professional[]>(professionalsPath(businessId)),
  getById: (businessId: string, professionalId: string) =>
    api.get<Professional>(professionalPath(businessId, professionalId)),
  create: (businessId: string, body: CreateProfessionalRequest) =>
    api.post<Professional>(professionalsPath(businessId), body),
  update: (businessId: string, professionalId: string, body: UpdateProfessionalRequest) =>
    api.patch<Professional>(professionalPath(businessId, professionalId), body),
  remove: (businessId: string, professionalId: string) =>
    api.delete<void>(professionalPath(businessId, professionalId)),
  setPhoto: (businessId: string, professionalId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.put<Professional>(`${professionalPath(businessId, professionalId)}/photo`, form);
  },
  removePhoto: (businessId: string, professionalId: string) =>
    api.delete<void>(`${professionalPath(businessId, professionalId)}/photo`),
  setServices: (businessId: string, professionalId: string, body: SetProfessionalServicesRequest) =>
    api.put<Professional>(`${professionalPath(businessId, professionalId)}/services`, body),
  setPackages: (businessId: string, professionalId: string, body: SetProfessionalPackagesRequest) =>
    api.put<Professional>(`${professionalPath(businessId, professionalId)}/packages`, body),
  setSpecialties: (businessId: string, professionalId: string, body: SetProfessionalSpecialtiesRequest) =>
    api.put<Professional>(`${professionalPath(businessId, professionalId)}/specialties`, body),
  listSpecialties: (businessId: string) => api.get<Specialty[]>(specialtiesPath(businessId)),
  createSpecialty: (businessId: string, body: SpecialtyRequest) =>
    api.post<Specialty>(specialtiesPath(businessId), body),
  updateSpecialty: (businessId: string, specialtyId: string, body: SpecialtyRequest) =>
    api.patch<Specialty>(`${specialtiesPath(businessId)}/${specialtyId}`, body),
  removeSpecialty: (businessId: string, specialtyId: string) =>
    api.delete<void>(`${specialtiesPath(businessId)}/${specialtyId}`),
  getWorkingHours: (businessId: string, professionalId: string) =>
    api.get<ProfessionalWorkingHour[]>(`${professionalPath(businessId, professionalId)}/working-hours`),
  setWorkingHours: (businessId: string, professionalId: string, body: SetWorkingHoursRequest) =>
    api.put<ProfessionalWorkingHour[]>(`${professionalPath(businessId, professionalId)}/working-hours`, body),
  listTimeOffs: (businessId: string, professionalId: string) =>
    api.get<ProfessionalTimeOff[]>(timeOffsPath(businessId, professionalId)),
  createTimeOff: (businessId: string, professionalId: string, body: TimeOffRequest) =>
    api.post<ProfessionalTimeOff>(timeOffsPath(businessId, professionalId), body),
  updateTimeOff: (businessId: string, professionalId: string, timeOffId: string, body: TimeOffRequest) =>
    api.patch<ProfessionalTimeOff>(`${timeOffsPath(businessId, professionalId)}/${timeOffId}`, body),
  removeTimeOff: (businessId: string, professionalId: string, timeOffId: string) =>
    api.delete<void>(`${timeOffsPath(businessId, professionalId)}/${timeOffId}`),
};
