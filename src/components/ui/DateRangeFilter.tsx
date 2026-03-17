import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  fromDate: string;
  toDate: string;
  onFromChange: (date: string) => void;
  onToChange: (date: string) => void;
}

const PRESETS = [
  { label: "Today", from: () => new Date(), to: () => new Date() },
  { label: "7 Days", from: () => subDays(new Date(), 6), to: () => new Date() },
  { label: "This Month", from: () => startOfMonth(new Date()), to: () => endOfMonth(new Date()) },
  { label: "Last Month", from: () => startOfMonth(subMonths(new Date(), 1)), to: () => endOfMonth(subMonths(new Date(), 1)) },
  { label: "3 Months", from: () => startOfMonth(subMonths(new Date(), 2)), to: () => endOfMonth(new Date()) },
];

const inputCls = "px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-800 dark:text-white focus:outline-none focus:border-[#EAB308]/60 transition-colors w-36";

export default function DateRangeFilter({ fromDate, toDate, onFromChange, onToChange }: DateRangeFilterProps) {
  const setPreset = (from: Date, to: Date) => {
    onFromChange(format(from, "yyyy-MM-dd"));
    onToChange(format(to, "yyyy-MM-dd"));
  };

  const activePreset = PRESETS.find(p =>
    format(p.from(), "yyyy-MM-dd") === fromDate &&
    format(p.to(), "yyyy-MM-dd") === toDate
  )?.label;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
      {/* Date inputs */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0" strokeWidth={1.8} />
        <input type="date" value={fromDate} onChange={e => onFromChange(e.target.value)} className={inputCls} />
        <span className="text-xs text-neutral-400 dark:text-neutral-500">to</span>
        <input type="date" value={toDate} onChange={e => onToChange(e.target.value)} className={inputCls} />
      </div>

      {/* Preset buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => setPreset(p.from(), p.to())}
            className={cn(
              "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
              activePreset === p.label
                ? "bg-[#EAB308] border-[#EAB308] text-black"
                : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-[#EAB308]/50 hover:text-[#EAB308]"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}