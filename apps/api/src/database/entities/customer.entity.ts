import { Column, Entity, Index, ManyToOne, OneToMany, type Relation } from "typeorm";
import { SoftDeletableEntity } from "./base/soft-deletable.entity.js";
import { AppointmentEntity } from "./appointment.entity.js";
import { BusinessEntity } from "./business.entity.js";
import { CustomerBlockEntity } from "./customer-block.entity.js";
import { ReviewEntity } from "./review.entity.js";
import { UserEntity } from "./user.entity.js";

/** Cliente de um negócio, com ou sem conta de usuário. */
@Entity('customers')
@Index(["business", "user"], { unique: true })
@Index(["user"])
export class CustomerEntity extends SoftDeletableEntity {

    /** Nome do cliente. */
    @Column({ type: 'varchar', length: 255 })
    name: string;

    /** E-mail do cliente. */
    @Column({ type: 'varchar', length: 320, nullable: true })
    email: string | null;

    /** Telefone do cliente, com DDI (ex.: +5511999999999). */
    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    whatsappOptedOutAt: Date | null;

    /** Observações internas sobre o cliente. */
    @Column({ type: 'text', nullable: true })
    notes: string | null;

    /** Negócio do cliente. */
    @ManyToOne(() => BusinessEntity, e => e.customers, { nullable: false, onDelete: 'CASCADE' })
    business: Relation<BusinessEntity>;

    /** Usuário vinculado ao cliente; opcional. */
    @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
    user: Relation<UserEntity> | null;

    /** Avaliações feitas pelo cliente. */
    @OneToMany(() => ReviewEntity, e => e.customer)
    reviews: ReviewEntity[];

    /** Agendamentos do cliente. */
    @OneToMany(() => AppointmentEntity, e => e.customer)
    appointments: AppointmentEntity[];

    /** Bloqueios do cliente, inclusive os já encerrados. */
    @OneToMany(() => CustomerBlockEntity, e => e.customer)
    blocks: CustomerBlockEntity[];

    // Não são colunas: preenchidos pelo CustomersService ao carregar o cliente para a equipe.
    activeBlock?: CustomerBlockEntity | null;
    noShowCount?: number;
}
