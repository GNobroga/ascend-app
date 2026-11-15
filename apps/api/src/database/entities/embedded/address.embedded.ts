import { Column } from "typeorm";

export class Address {

    /** CEP (8 dígitos, sem hífen). */
    @Column({ type: 'varchar', length: 8 })
    postalCode: string;

    /** Logradouro. */
    @Column({ type: 'varchar', length: 255 })
    street: string;

    /** Número (aceita "S/N"). */
    @Column({ type: 'varchar', length: 20 })
    number: string;

    /** Complemento. */
    @Column({ type: 'varchar', length: 255, nullable: true })
    complement: string | null;

    /** Bairro. */
    @Column({ type: 'varchar', length: 100 })
    district: string;

    /** Cidade. */
    @Column({ type: 'varchar', length: 100 })
    city: string;

    /** UF (ex.: SP). */
    @Column({ type: 'varchar', length: 2 })
    state: string;
}
