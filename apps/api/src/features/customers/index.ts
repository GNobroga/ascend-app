import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';

export { CustomersService } from './customers.service.js';

export const customersControllers = [CustomersController];
export const customersProviders = [CustomersService];
