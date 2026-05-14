"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  empty?: React.ReactNode;
  rowKey: (row: T) => string;
}

export function DataTable<T>({ data, columns, rowKey, empty }: Props<T>) {
  if (data.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.06] bg-white/[0.015]">
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={cn(
                    "px-4 py-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.align !== "right" && c.align !== "center" && "text-left",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  "border-b border-white/[0.04] transition-colors hover:bg-white/[0.02] last:border-0",
                )}
              >
                {columns.map((c, i) => (
                  <td
                    key={i}
                    className={cn(
                      "px-4 py-3.5",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.className,
                    )}
                  >
                    {c.cell(row)}
                    <span className="hidden">{idx}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
