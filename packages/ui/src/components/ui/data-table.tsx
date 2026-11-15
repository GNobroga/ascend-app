import {
  constructSortFn,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react"
import { cn } from "cn"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table"

type DataTableColumnMeta = {
  className?: string
}

const textCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true })

const sortFn_text = constructSortFn({
  sort: (valueA, valueB) => textCollator.compare(String(valueA ?? ""), String(valueB ?? "")),
})

const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text, basic: sortFn_basic },
  columnMeta: {} as DataTableColumnMeta,
})

type DataTableFeatures = typeof dataTableFeatures

type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData>

const createDataTableColumnHelper = <TData extends RowData>() => createColumnHelper<DataTableFeatures, TData>()

type DataTableProps<TData extends RowData> = {
  columns: DataTableColumn<TData>[]
  data: TData[]
  getRowId?: (row: TData) => string
  className?: string
}

function DataTable<TData extends RowData>({ columns, data, getRowId, className }: DataTableProps<TData>) {
  const table = useTable({ features: dataTableFeatures, columns, data, getRowId })
  const { sorting } = table.state

  return (
    <div
      data-slot="data-table"
      className={cn(
        "overflow-hidden rounded-[min(var(--radius-4xl),24px)] bg-card text-card-foreground shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10",
        className
      )}
    >
      <Table className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => {
                const canSort = header.column.getCanSort()
                const sort = sorting.find(({ id }) => id === header.column.id)
                const SortIcon = !sort ? ChevronsUpDownIcon : sort.desc ? ArrowDownIcon : ArrowUpIcon

                return (
                  <TableHead
                    key={header.id}
                    aria-sort={canSort ? (sort ? (sort.desc ? "descending" : "ascending") : "none") : undefined}
                    className={cn("text-muted-foreground", header.column.columnDef.meta?.className)}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
                      >
                        <table.FlexRender header={header} />
                        <SortIcon className={cn("size-3.5", !sort && "opacity-50")} />
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export { createDataTableColumnHelper, DataTable }
export type { DataTableColumn }
