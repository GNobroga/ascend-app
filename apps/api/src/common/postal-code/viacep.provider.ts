import { Injectable } from '@nestjs/common';
import { env } from '../../config/env.config.js';
import { PostalCodeProvider, PostalCodeProviderError, type PostalCodeAddress } from './postal-code-provider.js';

const REQUEST_TIMEOUT_MS = 5_000;

interface ViaCepResponse {
    cep?: string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    erro?: boolean | string;
}

const blankToNull = (value: string | undefined): string | null => value?.trim() || null;

@Injectable()
export class ViaCepProvider extends PostalCodeProvider {

    async lookup(postalCode: string): Promise<PostalCodeAddress | null> {
        let response: Response;
        try {
            response = await fetch(new URL(`${postalCode}/json/`, env.VIACEP_URL), { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        } catch (error) {
            throw new PostalCodeProviderError(`ViaCEP indisponível: ${error instanceof Error ? error.message : String(error)}`);
        }

        if (!response.ok) {
            throw new PostalCodeProviderError(`ViaCEP respondeu ${response.status} para o CEP ${postalCode}.`);
        }

        const body = await response.json() as ViaCepResponse;
        // O ViaCEP responde 200 com `erro: true` (ou "true") quando o CEP tem formato válido mas não existe.
        if (body.erro || !body.localidade || !body.uf) {
            return null;
        }

        return {
            postalCode,
            street: blankToNull(body.logradouro),
            district: blankToNull(body.bairro),
            city: body.localidade,
            state: body.uf,
        };
    }
}
