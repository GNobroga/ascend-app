import { ProfessionalTimeOffsController } from './professional-time-offs.controller.js';
import { ProfessionalTimeOffsService } from './professional-time-offs.service.js';
import { ProfessionalWorkingHoursService } from './professional-working-hours.service.js';
import { ProfessionalsController } from './professionals.controller.js';
import { ProfessionalsService } from './professionals.service.js';
import { PublicProfessionalsController } from './public-professionals.controller.js';
import { SpecialtiesController } from './specialties.controller.js';
import { SpecialtiesService } from './specialties.service.js';

export { ProfessionalsService } from './professionals.service.js';
export { ProfessionalWorkingHoursService } from './professional-working-hours.service.js';
export { ProfessionalTimeOffsService } from './professional-time-offs.service.js';

export const professionalsControllers = [SpecialtiesController, ProfessionalsController, ProfessionalTimeOffsController, PublicProfessionalsController];
export const professionalsProviders = [SpecialtiesService, ProfessionalsService, ProfessionalWorkingHoursService, ProfessionalTimeOffsService];
