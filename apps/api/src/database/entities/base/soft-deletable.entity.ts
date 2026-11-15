import { DeleteDateColumn } from 'typeorm';
import { BaseEntity } from './base.entity.js';

/** Base com exclusão lógica. */
export abstract class SoftDeletableEntity extends BaseEntity {
  /** Data da exclusão lógica. */
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
