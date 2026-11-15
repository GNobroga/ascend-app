export type ServiceCategory = {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  durationInMinutes: number;
  price: number;
  categoryId: string | null;
  displayOrder: number;
  isActive: boolean;
  coverImageUrl: string | null;
  createdAt: string;
};

export type ServiceGroup = {
  id: string;
  name: string;
  isActive: boolean;
  services: Service[];
};

export const CommissionMode = {
  PACKAGE: 'package',
  PRORATED: 'prorated',
} as const;

export type CommissionMode = (typeof CommissionMode)[keyof typeof CommissionMode];

export type PackageService = {
  serviceId: string;
  name: string;
  price: number;
  durationInMinutes: number;
  isActive: boolean;
};

export type PackageProfessional = {
  professionalId: string;
  displayName: string;
  commissionPercent: number | null;
};

export type Package = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  servicesPrice: number;
  durationMinutes: number;
  servicesDurationInMinutes: number;
  commissionMode: CommissionMode;
  displayOrder: number;
  isActive: boolean;
  services: PackageService[];
  professionals: PackageProfessional[];
  coverImageUrl: string | null;
  createdAt: string;
};

export type CatalogImage = {
  id: string;
  url: string;
  altText: string | null;
  displayOrder: number;
  createdAt: string;
};

export type ImageOwner = {
  kind: 'services' | 'packages';
  id: string;
};
