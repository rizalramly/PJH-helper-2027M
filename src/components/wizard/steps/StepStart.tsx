"use client";

import { ChoiceCards } from "../ChoiceCards";
import { useWizard } from "../context";
import { Field } from "../Field";
import { MoneyInput } from "../MoneyInput";
import { parseRMToSen } from "@/lib/engine/money";
import { budgetRangeText, roomsForParty, totalPilgrims, type PartyType } from "@/lib/wizard/state";

export function StepStart() {
  const { state, update, touch } = useWizard();
  const budgetSen = parseRMToSen(state.budgetPerPersonRM);
  const range = budgetSen !== null && budgetSen > 0n ? budgetRangeText(budgetSen) : null;
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md bg-muted p-3 text-sm">
        <span className="font-medium">Musim:</span> Haji 1448H / 2027M. Data musim lain tidak
        dicampur.
      </div>

      <ChoiceCards<PartyType>
        name="jenis-rombongan"
        legend="Siapa yang akan pergi?"
        hint="Anda boleh ubah bilangan jemaah dan susunan bilik dalam langkah seterusnya."
        value={state.partyType}
        onChange={(partyType) => update({ partyType, rooms: roomsForParty(partyType) })}
        columns={3}
        choices={[
          { value: "couple", label: "Pasangan", description: "2 orang, satu bilik" },
          { value: "single", label: "Seorang", description: "Berkongsi bilik dengan jemaah lain" },
          { value: "group", label: "Keluarga / kumpulan", description: "Beberapa bilik" },
        ]}
      />

      <Field
        field="budgetPerPersonRM"
        label="Bajet seorang (RM)"
        hint={`Untuk ${totalPilgrims(state)} jemaah. Contoh: 100000. Kami cari pakej dalam julat RM10,000 di bawah bajet hingga bajet${range ? ` (${range} seorang)` : ""}, dan paparkan kos seorang serta kos seluruh rombongan.`}
      >
        {(a11y) => (
          <MoneyInput
            {...a11y}
            value={state.budgetPerPersonRM}
            onChange={(v) => update({ budgetPerPersonRM: v })}
            onBlur={() => touch("budgetPerPersonRM")}
          />
        )}
      </Field>

      <ChoiceCards
        name="skop-bajet"
        legend="Bajet ini meliputi"
        value={state.budgetScope}
        onChange={(budgetScope) => update({ budgetScope })}
        choices={[
          { value: "package_only", label: "Harga pakej dan naik taraf sahaja" },
          {
            value: "all_in",
            label: "Pakej serta perbelanjaan tambahan saya",
            description:
              "Contoh: belanja peribadi, dana kecemasan. Dikira berasingan daripada harga PJH.",
          },
        ]}
      />
      {state.budgetScope === "all_in" ? (
        <Field
          field="extrasPerPersonRM"
          label="Peruntukan tambahan seorang (RM)"
          hint="Jumlah yang anda mahu simpan untuk perbelanjaan lain."
        >
          {(a11y) => (
            <MoneyInput
              {...a11y}
              value={state.extrasPerPersonRM}
              onChange={(v) => update({ extrasPerPersonRM: v })}
              onBlur={() => touch("extrasPerPersonRM")}
            />
          )}
        </Field>
      ) : null}

      <ChoiceCards
        name="bajet-wajib"
        legend="Adakah julat bajet ini wajib?"
        value={state.budgetHard ? "wajib" : "keutamaan"}
        onChange={(v) => update({ budgetHard: v === "wajib" })}
        columns={2}
        choices={[
          {
            value: "wajib",
            label: "Ya, had wajib",
            description: "Pakej di luar julat bajet tidak dicadangkan",
          },
          {
            value: "keutamaan",
            label: "Tidak, keutamaan sahaja",
            description: "Pakej di luar julat bajet masih dinilai",
          },
        ]}
      />
    </div>
  );
}
