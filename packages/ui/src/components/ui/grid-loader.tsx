import { cn } from "cn"

const DOT_DELAYS_MS = [0, 100, 200, 100, 200, 300, 200, 300, 400]

function GridLoader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="grid-loader"
      role="status"
      aria-label="Loading"
      className={cn("grid size-8 grid-cols-3 gap-1 text-primary", className)}
      {...props}
    >
      {DOT_DELAYS_MS.map((delay, index) => (
        <span
          key={index}
          className="animate-grid-pulse rounded-full bg-current motion-reduce:animate-none"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  )
}

export { GridLoader }
