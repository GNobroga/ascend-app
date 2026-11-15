import { DataSource } from 'typeorm';
import { dataSourceOptions } from './typeorm.config.js';

export default new DataSource(dataSourceOptions);
