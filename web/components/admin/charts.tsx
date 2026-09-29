"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

// Single-series charts in --chart (validated against --card in both themes); the panel title names the series.

/** Rounds up to a clean axis maximum (1, 2, 5 × 10ⁿ). */
function niceMax(n: number): number {
  if (n <= 4) return Math.max(n, 1)
  const exp = 10 ** Math.floor(Math.log10(n))
  for (const step of [1, 2, 5, 10]) if (step * exp >= n) return step * exp
  return 10 * exp
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })

export function DailyColumns({
  data,
  label,
  unit,
}: {
  data: { date: string; value: number }[]
  label: string
  unit: [string, string]
}) {
  const [active, setActive] = useState<number | null>(null)
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const total = data.reduce((s, d) => s + d.value, 0)
  const point = active !== null ? data[active] : null
  const noun = (n: number) => (n === 1 ? unit[0] : unit[1])

  return (
    <figure className="m-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-foreground text-2xl font-extrabold tracking-tight">
          {total.toLocaleString()}
          <span className="text-muted-foreground ml-1.5 text-xs font-semibold">
            {noun(total)} in 30 days
          </span>
        </p>
        <p className="text-muted-foreground h-4 text-xs tabular-nums" aria-live="polite">
          {point ? `${shortDate(point.date)} · ${point.value} ${noun(point.value)}` : ""}
        </p>
      </div>

      <div className="relative mt-3 flex h-36 gap-2">
        <div className="text-muted-foreground flex w-6 flex-col justify-between text-right text-[10px] tabular-nums">
          <span>{max}</span>
          <span>0</span>
        </div>
        <div className="relative flex-1">
          <div className="border-border absolute inset-x-0 top-0 border-t" aria-hidden />
          <div className="border-border absolute inset-x-0 bottom-0 border-t" aria-hidden />
          <div
            className="absolute inset-0 flex items-end gap-0.5"
            onMouseLeave={() => setActive(null)}
            aria-hidden
          >
            {data.map((d, i) => (
              <div
                key={d.date}
                className="flex h-full min-w-0 flex-1 cursor-default items-end justify-center"
                onMouseEnter={() => setActive(i)}
              >
                <div
                  className={cn(
                    "bg-chart w-full max-w-6 rounded-t-lg transition-opacity",
                    active !== null && active !== i && "opacity-45",
                  )}
                  style={{ height: d.value ? `${Math.max((d.value / max) * 100, 3)}%` : 0 }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="text-muted-foreground mt-1.5 ml-8 flex justify-between text-[10px]">
        <span>{data[0] && shortDate(data[0].date)}</span>
        <span>{data.at(-1) && "Today"}</span>
      </div>

      <table className="sr-only">
        <caption>{label}, daily for the last 30 days</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>{unit[1]}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export function BarList({
  items,
  label,
  empty = "Nothing yet",
}: {
  items: { name: string; value: number; note?: string }[]
  label: string
  empty?: string
}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (!items.length)
    return <p className="text-muted-foreground py-6 text-center text-sm">{empty}</p>
  return (
    <figure className="m-0">
      <ul className="space-y-2.5" aria-hidden>
        {items.map((item) => (
          <li
            key={item.name}
            className="grid grid-cols-[minmax(5rem,9rem)_1fr] items-center gap-3"
            title={`${item.name}: ${item.value.toLocaleString()}${item.note ? ` (${item.note})` : ""}`}
          >
            <span className="text-foreground truncate text-xs font-semibold">{item.name}</span>
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="bg-chart h-3 shrink-0 rounded-r-lg"
                style={{
                  width: `calc(${(item.value / max) * 100}% - 4rem)`,
                  minWidth: item.value ? 4 : 0,
                }}
              />
              <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
                <span className="text-foreground font-bold">{item.value.toLocaleString()}</span>
                {item.note && <span className="ml-1">{item.note}</span>}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {items.map((i) => (
            <tr key={i.name}>
              <th scope="row">{i.name}</th>
              <td>
                {i.value}
                {i.note ? ` (${i.note})` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
