import { twelveHourToLocalTime, type TwelveHourClock } from "@/components/twelveHourTime";

const fieldClass =
  "min-h-12 min-w-0 flex-1 rounded-md border border-stone-700 bg-stone-900 px-2 text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300";

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 60 }, (_, minute) => minute);

export function LocalTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TwelveHourClock;
  onChange: (value: TwelveHourClock) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-1 flex gap-2">
        <select
          aria-label={`${label} hour`}
          value={value.hour === null ? "" : String(value.hour)}
          onChange={(event) =>
            onChange(commit(value, { hour: event.target.value ? Number(event.target.value) : null }))
          }
          className={fieldClass}
        >
          <option value="">Hour</option>
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} minute`}
          value={value.minute === null ? "" : String(value.minute)}
          onChange={(event) =>
            onChange(
              commit(value, { minute: event.target.value ? Number(event.target.value) : null }),
            )
          }
          className={fieldClass}
        >
          <option value="">Min</option>
          {MINUTES.map((minute) => (
            <option key={minute} value={minute}>
              {String(minute).padStart(2, "0")}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} AM or PM`}
          value={value.meridiem}
          onChange={(event) =>
            onChange(commit(value, { meridiem: event.target.value === "PM" ? "PM" : "AM" }))
          }
          className={fieldClass}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </fieldset>
  );
}

function commit(current: TwelveHourClock, patch: Partial<TwelveHourClock>): TwelveHourClock {
  const next = { ...current, ...patch };
  try {
    twelveHourToLocalTime(next);
  } catch {
    return current;
  }
  return next;
}
