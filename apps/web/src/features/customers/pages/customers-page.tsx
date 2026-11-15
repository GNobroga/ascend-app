import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@packages/ui/components/input-group';
import { ListSkeleton } from '@packages/ui/components/skeletons';
import { Spinner } from '@packages/ui/components/spinner';
import { cn } from '@packages/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, SearchIcon, UserPlusIcon, UsersRoundIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { customerQueries } from '../api/customers.queries';
import { CustomerFormDialog } from '../components/customer-form-dialog';
import { CustomerRow } from '../components/customer-row';
import { CustomersTable } from '../components/customers-table';
import { customerPath, customersPath } from '../loaders';
import { customerListSearchParams } from '../search-params';

const SEARCH_DELAY_MS = 300;

function CustomersPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return <Customers businessId={businessId} />;
}

type CustomersProps = {
  businessId: string;
};

function Customers({ businessId }: CustomersProps) {
  const navigate = useNavigate();
  const [filters, setFilters] = useQueryStates(customerListSearchParams);
  const [searchInput, setSearchInput] = useState(filters.search);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { data, isPending, isPlaceholderData, isFetching } = useQuery(customerQueries.list(businessId, filters));

  const changeSearch = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => void setFilters({ search: value || null, page: null }), SEARCH_DELAY_MS);
  };

  const customers = data?.data ?? [];
  const meta = data?.meta;
  const isSearching = filters.search !== '';

  const newCustomerButton = (
    <Button type="button" onClick={() => setIsFormOpen(true)}>
      <UserPlusIcon />
      Novo cliente
    </Button>
  );

  return (
    <PageContainer>
      <PageHeader
        title="Clientes"
        description="Quem já agendou ou foi cadastrado no balcão."
        actions={
          <>
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link to={`${customersPath(businessId)}/duplicates`} />}
            >
              <CopyIcon />
              Duplicados
            </Button>
            {newCustomerButton}
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <InputGroup className="sm:max-w-sm">
          <InputGroupAddon>{isFetching && isPlaceholderData ? <Spinner /> : <SearchIcon />}</InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Buscar por nome, telefone ou e-mail"
            aria-label="Buscar cliente"
            value={searchInput}
            onChange={(event) => changeSearch(event.target.value)}
          />
        </InputGroup>

        {isPending && <ListSkeleton />}

        {!isPending && customers.length === 0 && (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">{isSearching ? <SearchIcon /> : <UsersRoundIcon />}</EmptyMedia>
              <EmptyTitle>{isSearching ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}</EmptyTitle>
              <EmptyDescription>
                {isSearching
                  ? 'Confira a grafia ou busque por outra parte do nome, telefone ou e-mail.'
                  : 'Os clientes que agendarem online aparecem aqui. Você também pode cadastrar no balcão.'}
              </EmptyDescription>
            </EmptyHeader>
            {!isSearching && <EmptyContent>{newCustomerButton}</EmptyContent>}
          </Empty>
        )}

        {customers.length > 0 && (
          <>
            <Card className="py-0 sm:hidden">
              <CardContent className="px-0">
                <ul className={cn('flex flex-col divide-y', isPlaceholderData && 'opacity-60')}>
                  {customers.map((customer) => (
                    <CustomerRow key={customer.id} customer={customer} to={customerPath(businessId, customer.id)} />
                  ))}
                </ul>
              </CardContent>
            </Card>
            <CustomersTable
              customers={customers}
              customerPath={(customer) => customerPath(businessId, customer.id)}
              className={cn('hidden sm:block', isPlaceholderData && 'opacity-60')}
            />
          </>
        )}

        {meta && meta.totalPages > 1 && (
          <nav aria-label="Paginação" className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Página {meta.page} de {meta.totalPages} · {meta.total} clientes
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={meta.page <= 1 || isPlaceholderData}
                onClick={() => void setFilters({ page: meta.page - 1 === 1 ? null : meta.page - 1 })}
              >
                <ChevronLeftIcon />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={meta.page >= meta.totalPages || isPlaceholderData}
                onClick={() => void setFilters({ page: meta.page + 1 })}
              >
                Próxima
                <ChevronRightIcon />
              </Button>
            </div>
          </nav>
        )}
      </div>

      <CustomerFormDialog
        businessId={businessId}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSaved={(customer) => void navigate(customerPath(businessId, customer.id))}
      />
    </PageContainer>
  );
}

export { CustomersPage as Component };
