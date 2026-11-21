"use client";
import { useId } from "react";
import { m } from "motion/react";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { useDict } from "@/components/providers";

export type Accent = "lime" | "blue" | "pink";

const focusRing: Record<Accent, string> = {
  lime: "focus:ring-4 focus:ring-lime",
  blue: "focus:ring-4 focus:ring-[#8da0ff]",
  pink: "focus:ring-4 focus:ring-pink",
};
const accentChecked: Record<Accent, string> = {
  lime: "peer-checked:bg-lime peer-checked:text-ink peer-checked:ring-lime",
  blue: "peer-checked:bg-blue peer-checked:text-paper peer-checked:ring-blue",
  pink: "peer-checked:bg-pink peer-checked:text-ink peer-checked:ring-pink",
};

/** Error keys come from the shared zod schema ("tooShort:20", "handle", ...). */
export function useErrorText() {
  const t = useDict();
  return (key: string | undefined): string | undefined => {
    if (!key) return undefined;
    const [name, arg] = key.split(":");
    const e = t.forms.errors;
    switch (name) {
      case "tooShort":
        return e.tooShort(Number(arg));
      case "tooLong":
        return e.tooLong(Number(arg));
      case "chooseOne":
        return e.chooseOne;
      case "handle":
        return e.handle;
      case "consent":
        return e.consent;
      case "photoType":
        return e.photoType;
      case "photoSize":
        return e.photoSize;
      default:
        return e.required;
    }
  };
}

function Label({ htmlFor, id, children, optional, as = "label" }: { htmlFor?: string; id?: string; children: React.ReactNode; optional?: boolean; as?: "label" | "span" }) {
  const t = useDict();
  const Comp = as;
  return (
    <Comp {...(as === "label" ? { htmlFor } : {})} id={id} className="flex items-baseline gap-2 text-[17px] font-bold">
      {children}
      <span className="text-sm font-medium text-paper/70">{optional ? t.forms.optional : ""}</span>
    </Comp>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} className="min-h-5 text-[15px] font-semibold text-[#ff8fbd]" aria-live="polite">
      {message}
    </p>
  );
}

const inputBase =
  "w-full rounded-2xl bg-ink-2 px-4 text-[17px] text-paper ring-2 ring-white/15 transition-shadow placeholder:text-paper/55 outline-none aria-[invalid=true]:ring-[#ff8fbd]";

export function TextField({
  name,
  label,
  value,
  onChange,
  error,
  placeholder,
  optional,
  help,
  accent = "lime",
  maxLength,
  autoComplete = "off",
  inputMode,
  prefix,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  optional?: boolean;
  help?: string;
  accent?: Accent;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  prefix?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      {help && (
        <p id={`${id}-help`} className="-mt-1 text-[15px] text-paper/75">
          {help}
        </p>
      )}
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[17px] text-paper/60">{prefix}</span>}
        <input
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete={autoComplete}
          inputMode={inputMode}
          autoCapitalize={inputMode === "text" ? "none" : undefined}
          spellCheck={inputMode === "text" ? false : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${help ? `${id}-help ` : ""}${id}-err`}
          className={`${inputBase} h-14 ${prefix ? "pl-9" : ""} ${focusRing[accent]}`}
        />
      </div>
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}

export function TextArea({
  name,
  label,
  value,
  onChange,
  error,
  placeholder,
  help,
  max,
  accent = "lime",
  rows = 5,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  help?: string;
  max: number;
  accent?: Accent;
  rows?: number;
}) {
  const id = useId();
  const over = value.length > max;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {help && (
        <p id={`${id}-help`} className="-mt-1 text-[15px] text-paper/75">
          {help}
        </p>
      )}
      <textarea
        id={id}
        name={name}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${help ? `${id}-help ` : ""}${id}-err ${id}-count`}
        className={`${inputBase} resize-y py-3.5 leading-relaxed ${focusRing[accent]}`}
      />
      <div className="flex justify-between gap-4">
        <FieldError id={`${id}-err`} message={error} />
        <span id={`${id}-count`} className={`shrink-0 text-sm tabular-nums ${over ? "font-bold text-[#ff8fbd]" : "text-paper/65"}`}>
          {value.length}/{max}
        </span>
      </div>
    </div>
  );
}

/** Big radio pills: easy to hit with a thumb, real radio inputs underneath. */
export function Choice<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  error,
  accent = "lime",
  optional,
  compact = false,
}: {
  name: string;
  label: string;
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (v: T) => void;
  error?: string;
  accent?: Accent;
  optional?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={`${id}-err`} aria-invalid={error ? true : undefined}>
      <legend className="mb-2 contents">
        <Label as="span" optional={optional}>
          {label}
        </Label>
      </legend>
      <div className={`flex flex-wrap ${compact ? "gap-2" : "gap-2.5"}`}>
        {options.map((o) => (
          <label key={o.value} className="relative">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer absolute inset-0 cursor-pointer opacity-0"
            />
            <m.span
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 600, damping: 20 }}
              className={`flex items-center gap-2 rounded-full bg-ink-2 font-semibold text-paper ring-2 ring-white/15 transition-colors peer-hover:ring-white/35 peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-paper ${accentChecked[accent]} ${
                compact ? "h-12 min-w-12 justify-center px-4 text-[17px]" : "h-12 px-5 text-[16px]"
              }`}
            >
              {o.label}
            </m.span>
          </label>
        ))}
      </div>
      <FieldError id={`${id}-err`} message={error} />
    </fieldset>
  );
}

export function CheckRow({
  name,
  checked,
  onChange,
  children,
  error,
  accent = "lime",
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  error?: string;
  accent?: Accent;
}) {
  const id = useId();
  const box = accent === "lime" ? "peer-checked:bg-lime peer-checked:ring-lime" : accent === "blue" ? "peer-checked:bg-blue peer-checked:ring-blue" : "peer-checked:bg-pink peer-checked:ring-pink";
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3.5 rounded-2xl bg-ink-2/70 p-4 ring-2 ring-white/10">
        <span className="relative mt-0.5 grid size-7 shrink-0 place-items-center">
          <input
            id={id}
            type="checkbox"
            name={name}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-err`}
            className="peer absolute inset-0 cursor-pointer opacity-0"
          />
          <span className={`absolute inset-0 rounded-lg bg-ink ring-2 ring-white/40 transition-colors peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-paper ${box}`} />
          <Check weight="bold" className={`relative size-5 opacity-0 transition-opacity peer-checked:opacity-100 ${accent === "blue" ? "text-paper" : "text-ink"}`} aria-hidden />
        </span>
        <span className="text-[17px] font-medium leading-snug">{children}</span>
      </label>
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}

/** Off-screen field that only bots fill in. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="hp" aria-hidden>
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
