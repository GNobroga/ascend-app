import { Column } from "typeorm";
import { BaseEntity } from "./base.entity.js";

/** Base das entities de imagem. */
export abstract class ImageBaseEntity extends BaseEntity {

    /** Key do objeto no storage; a URL pública é montada na resposta. */
    @Column({ type: 'varchar', length: 2048 })
    storageKey: string;

    /** Texto alternativo. */
    @Column({ type: 'varchar', length: 255, nullable: true })
    altText: string | null;

    /** Ordem de exibição. */
    @Column({ type: 'int', default: 0 })
    displayOrder: number;
}
