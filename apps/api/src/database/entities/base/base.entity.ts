import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Base das entities. */
export abstract class BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Data de criação. */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /** Data da última atualização. */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
