"use client";

interface Props {
  real: boolean;
  onChange: (real: boolean) => void;
}

const OPTIONS = [
  { real: false, label: "Nominálně" },
  { real: true, label: "Dnešní koruny" },
];

/** Switches between nominal CZK and inflation-adjusted "today's crowns". */
export function ModeToggle({ real, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1" role="radiogroup" aria-label="Jak počítat">
        {OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={real === option.real}
            onClick={() => onChange(option.real)}
            className="min-h-11 rounded-lg text-sm font-medium text-muted transition aria-checked:bg-surface-raised aria-checked:text-fg"
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="px-1 text-sm text-muted">
        {real
          ? "Vklady i hodnoty přepočtené inflací na dnešní ceny. Uvidíš, kolik si vzala inflace."
          : "Koruny tak, jak by šly na účet, bez ohledu na inflaci."}
      </p>
    </div>
  );
}
