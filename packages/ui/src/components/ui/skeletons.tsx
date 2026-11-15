import { cn } from "cn"
import { Card, CardContent, CardHeader } from "./card"
import { Skeleton } from "./skeleton"

const range = (count: number) => Array.from({ length: count }, (_, index) => index)

type ListSkeletonProps = {
  rows?: number
  avatar?: boolean
}

function ListSkeleton({ rows = 5, avatar = true }: ListSkeletonProps) {
  return (
    <Card className="py-0" role="status" aria-label="Carregando">
      <CardContent className="px-0">
        <ul className="flex flex-col divide-y">
          {range(rows).map((index) => (
            <li key={index} className="flex items-center gap-3 px-4 py-3">
              {avatar && <Skeleton className="size-10 shrink-0 rounded-full" />}
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/3 min-w-32" />
                <Skeleton className="h-3 w-1/2 min-w-40" />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

type CardGridSkeletonProps = {
  count?: number
  className?: string
}

function CardGridSkeleton({ count = 6, className }: CardGridSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
    >
      {range(count).map((index) => (
        <Card key={index}>
          <CardHeader className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

type FormSkeletonProps = {
  fields?: number
}

function FormSkeleton({ fields = 4 }: FormSkeletonProps) {
  return (
    <Card role="status" aria-label="Carregando">
      <CardHeader className="flex flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {range(fields).map((index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

type BlockSkeletonProps = {
  className?: string
}

function BlockSkeleton({ className }: BlockSkeletonProps) {
  return (
    <div role="status" aria-label="Carregando" className={cn("h-64", className)}>
      <Skeleton className="size-full rounded-xl" />
    </div>
  )
}

export { BlockSkeleton, CardGridSkeleton, FormSkeleton, ListSkeleton }
