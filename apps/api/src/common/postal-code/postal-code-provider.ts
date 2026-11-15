export interface PostalCodeAddress {
    postalCode: string;
    street: string | null;
    district: string | null;
    city: string;
    state: string;
}

export class PostalCodeProviderError extends Error {

    constructor(message: string) {
        super(message);
        this.name = PostalCodeProviderError.name;
    }
}

export abstract class PostalCodeProvider {

    abstract lookup(postalCode: string): Promise<PostalCodeAddress | null>;
}
