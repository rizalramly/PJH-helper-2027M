"use client";

import { Input } from "@/components/ui/input";
import type { ImportanceLevel, WizardState } from "@/lib/wizard/state";

import { CheckboxField } from "../CheckboxField";
import { ChoiceCards } from "../ChoiceCards";
import { useWizard } from "../context";
import { Field } from "../Field";

const LEVELS = [
  { value: "important" as const, label: "Penting" },
  { value: "normal" as const, label: "Biasa" },
  { value: "dont_care" as const, label: "Tidak kisah" },
];

type Key = keyof WizardState["importance"];

const ITEMS: { key: Key; legend: string; hint: string }[] = [
  {
    key: "savings",
    legend: "Penjimatan kos",
    hint: "Pakej lebih murah dalam bajet diberi skor lebih tinggi.",
  },
  {
    key: "masyair",
    legend: "Keselesaan masyair (Arafah dan Mina)",
    hint: "Contohnya PMN, khemah naik taraf atau jarak ke Jamarat.",
  },
  {
    key: "relocations",
    legend: "Kurang berpindah hotel",
    hint: "Bilangan perpindahan hotel sepanjang perjalanan.",
  },
  {
    key: "proximity",
    legend: "Hotel dekat masjid",
    hint: "Jarak hotel ke perkarangan Masjidil Haram dan Masjid Nabawi.",
  },
];

export function StepPreferences() {
  const { state, update, touch } = useWizard();
  const setImportance = (key: Key, v: ImportanceLevel) =>
    update((s) => ({ importance: { ...s.importance, [key]: v } }));

  return (
    <div className="flex flex-col gap-6">
      <p className="rounded-md bg-muted p-3 text-sm leading-relaxed">
        Langkah ini pilihan. Keutamaan hanya mempengaruhi susunan dan skor kesesuaian; ia tidak
        menyingkirkan pakej. Anda boleh terus ke Semakan.
      </p>

      {ITEMS.map((item) => (
        <ChoiceCards
          key={item.key}
          name={`keutamaan-${item.key}`}
          legend={item.legend}
          hint={item.hint}
          value={state.importance[item.key]}
          onChange={(v) => setImportance(item.key, v)}
          columns={3}
          choices={LEVELS}
        />
      ))}

      {state.importance.proximity !== "dont_care" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["proximityMakkahM", "Jarak maksimum hotel Makkah"],
              ["proximityMadinahM", "Jarak maksimum hotel Madinah"],
            ] as const
          ).map(([field, label]) => (
            <Field
              key={field}
              field={field}
              label={label}
              hint="Ke perkarangan masjid. Kosongkan jika tiada had."
            >
              {(a11y) => (
                <div className="flex items-center gap-2">
                  <Input
                    {...a11y}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    className="w-32 money"
                    value={state[field]}
                    onChange={(e) => update({ [field]: e.target.value })}
                    onBlur={() => touch(field)}
                  />
                  <span className="text-muted-foreground">meter</span>
                </div>
              )}
            </Field>
          ))}
        </div>
      ) : null}

      <CheckboxField
        id="medan-diversifyPjh"
        checked={state.diversifyPjh}
        onChange={(diversifyPjh) => update({ diversifyPjh })}
        label="Pelbagaikan PJH dalam cadangan"
        description="Elakkan semua cadangan datang daripada PJH yang sama."
      />
    </div>
  );
}
