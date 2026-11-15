import { Avatar, AvatarFallback } from '@packages/ui/components/avatar';
import { Button } from '@packages/ui/components/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@packages/ui/components/input-group';
import { Spinner } from '@packages/ui/components/spinner';
import { useQuery } from '@tanstack/react-query';
import { SearchIcon, UserPlusIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { customerQueries, type Customer } from '@/features/customers';
import { initialsOf } from '@/shared/lib/initials';
import { formatStoredPhone } from '@/shared/lib/masks';

const SEARCH_DELAY_MS = 300;

const MAX_RESULTS = 6;

type CustomerPickerProps = {
  businessId: string;
  inputId: string;
  selected: Customer | null;
  invalid: boolean;
  onSelect: (customer: Customer | null) => void;
  onCreate: () => void;
};

const contactOf = (customer: Customer) =>
  [customer.phone && formatStoredPhone(customer.phone), customer.email].filter(Boolean).join(' · ');

export function CustomerPicker({ businessId, inputId, selected, invalid, onSelect, onCreate }: CustomerPickerProps) {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { data, isFetching } = useQuery({
    ...customerQueries.list(businessId, { search, page: 1 }),
    enabled: !selected && search !== '',
  });

  const changeInput = (value: string) => {
    setInput(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(value.trim()), SEARCH_DELAY_MS);
  };

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border px-3 py-2">
        <Avatar>
          <AvatarFallback>{initialsOf(selected.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{selected.name}</span>
          <span className="truncate text-sm text-muted-foreground">{contactOf(selected) || 'Sem contato'}</span>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onSelect(null)}>
          Trocar
        </Button>
      </div>
    );
  }

  const results = (data?.data ?? []).slice(0, MAX_RESULTS);

  return (
    <div className="flex flex-col gap-2">
      <InputGroup>
        <InputGroupAddon>{isFetching ? <Spinner /> : <SearchIcon />}</InputGroupAddon>
        <InputGroupInput
          id={inputId}
          type="search"
          autoComplete="off"
          placeholder="Buscar por nome, telefone ou e-mail"
          aria-invalid={invalid}
          value={input}
          onChange={(event) => changeInput(event.target.value)}
        />
      </InputGroup>
      {search !== '' && (
        <ul className="flex flex-col overflow-hidden rounded-2xl border">
          {results.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => onSelect(customer)}
                className="flex w-full flex-col px-3 py-2 text-left outline-none hover:bg-accent/50 focus-visible:bg-accent/50"
              >
                <span className="truncate text-sm font-medium">{customer.name}</span>
                <span className="truncate text-xs text-muted-foreground">{contactOf(customer) || 'Sem contato'}</span>
              </button>
            </li>
          ))}
          {!isFetching && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado.</li>
          )}
        </ul>
      )}
      <Button type="button" variant="ghost" size="sm" className="self-start" onClick={onCreate}>
        <UserPlusIcon />
        Cadastrar novo cliente
      </Button>
    </div>
  );
}
