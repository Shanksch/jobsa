import * as React from "react";
import { cn } from "../lib/utils.js";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No results.",
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("w-full overflow-auto rounded-3xl border border-border/60 bg-card shadow-sm", className)}>
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b bg-muted/20">
          <tr className="border-b border-border/60 transition-colors hover:bg-muted/30 data-[state=selected]:bg-muted">
            {columns.map((col, index) => (
              <th
                key={index}
                className={cn(
                  "h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="h-24 text-center align-middle text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    className={cn(
                      "p-4 align-middle [&:has([role=checkbox])]:pr-0",
                      col.className
                    )}
                  >
                    {col.cell
                      ? col.cell(row)
                      : col.accessorKey
                      ? (row[col.accessorKey] as React.ReactNode)
                      : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
