"use client";

import { Input } from "@/components/ui/input";

import { CheckboxField } from "../CheckboxField";
import { ChoiceCards } from "../ChoiceCards";
import { useWizard } from "../context";
import { Field } from "../Field";
import { GlossaryTerm } from "../GlossaryTerm";

function DaysInput({
  value,
  onChange,
  onBlur,
  ...a11y
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        {...a11y}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="w-28 money"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      <span className="text-muted-foreground">hari</span>
    </div>
  );
}

export function StepTrip() {
  const { state, update, touch } = useWizard();
  const azWanted = state.aziziyahMode === "required" || state.aziziyahMode === "preferred";
  const tarWanted = state.tarwiyahMode === "required" || state.tarwiyahMode === "preferred";

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4" aria-labelledby="tajuk-tempoh">
        <h2 id="tajuk-tempoh" className="text-xl font-semibold">
          Tempoh perjalanan
        </h2>
        <ChoiceCards
          name="mod-tempoh"
          legend="Berapa lama anda mahu berada di Tanah Suci?"
          value={state.durationMode}
          onChange={(durationMode) => update({ durationMode })}
          columns={3}
          choices={[
            { value: "any", label: "Tidak kisah" },
            { value: "target", label: "Sasaran hari", description: "Contoh: 40 hari ± 5" },
            { value: "range", label: "Julat hari", description: "Contoh: 30 hingga 45 hari" },
          ]}
        />
        {state.durationMode === "target" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field field="durationTarget" label="Sasaran tempoh">
              {(a11y) => (
                <DaysInput
                  {...a11y}
                  value={state.durationTarget}
                  onChange={(durationTarget) => update({ durationTarget })}
                  onBlur={() => touch("durationTarget")}
                />
              )}
            </Field>
            <Field field="durationTolerance" label="Toleransi (lebih atau kurang)">
              {(a11y) => (
                <DaysInput
                  {...a11y}
                  value={state.durationTolerance}
                  onChange={(durationTolerance) => update({ durationTolerance })}
                  onBlur={() => touch("durationTolerance")}
                />
              )}
            </Field>
          </div>
        ) : null}
        {state.durationMode === "range" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field field="durationMin" label="Minimum">
              {(a11y) => (
                <DaysInput
                  {...a11y}
                  value={state.durationMin}
                  onChange={(durationMin) => update({ durationMin })}
                  onBlur={() => touch("durationMin")}
                />
              )}
            </Field>
            <Field field="durationMax" label="Maksimum">
              {(a11y) => (
                <DaysInput
                  {...a11y}
                  value={state.durationMax}
                  onChange={(durationMax) => update({ durationMax })}
                  onBlur={() => touch("durationMax")}
                />
              )}
            </Field>
          </div>
        ) : null}
        {state.durationMode !== "any" ? (
          <>
            <CheckboxField
              id="medan-acceptApproximate"
              checked={state.acceptApproximate}
              onChange={(acceptApproximate) => update({ acceptApproximate })}
              label="Terima tempoh anggaran (contohnya '±40 hari')"
              description="Banyak brosur hanya menyatakan anggaran. Jika tidak ditanda, pakej sebegini ditanda 'Perlu pengesahan'."
            />
            <ChoiceCards
              name="tempoh-wajib"
              legend="Tempoh ini"
              value={state.durationHard ? "wajib" : "keutamaan"}
              onChange={(v) => update({ durationHard: v === "wajib" })}
              columns={2}
              choices={[
                { value: "wajib", label: "Syarat wajib" },
                { value: "keutamaan", label: "Keutamaan sahaja" },
              ]}
            />
          </>
        ) : null}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="tajuk-aziziyah">
        <h2
          id="tajuk-aziziyah"
          className="flex flex-wrap items-center gap-x-2 text-xl font-semibold"
        >
          Aziziyah <GlossaryTerm term="aziziyah" />
        </h2>
        <ChoiceCards
          name="mod-aziziyah"
          legend="Penginapan di Aziziyah"
          hint="'Tidak kisah' bermaksud Aziziyah tidak mempengaruhi penilaian; ia tidak bermaksud anda mahu pakej tanpa Aziziyah."
          value={state.aziziyahMode}
          onChange={(aziziyahMode) => update({ aziziyahMode })}
          columns={2}
          choices={[
            { value: "required", label: "Wajib ada" },
            { value: "preferred", label: "Diutamakan" },
            { value: "not_wanted", label: "Mahu pakej tanpa Aziziyah" },
            { value: "any", label: "Tidak kisah" },
          ]}
        />
        {azWanted ? (
          <CheckboxField
            id="medan-aziziyahAcceptConditional"
            checked={state.aziziyahAcceptConditional}
            onChange={(aziziyahAcceptConditional) => update({ aziziyahAcceptConditional })}
            label="Terima Aziziyah yang tertakluk kepada kebenaran pihak berkuasa"
            description="Pakej sebegini dipaparkan dengan status 'Bersyarat', bukan 'Memenuhi'."
          />
        ) : null}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="tajuk-tarwiyah">
        <h2
          id="tajuk-tarwiyah"
          className="flex flex-wrap items-center gap-x-2 text-xl font-semibold"
        >
          Tarwiyah <GlossaryTerm term="tarwiyah" />
        </h2>
        <ChoiceCards
          name="mod-tarwiyah"
          legend="Bermalam di Mina pada 8 Zulhijjah"
          hint="Kebanyakan PJH menyatakan Tarwiyah tertakluk kepada kebenaran pihak berkuasa, jadi pelaksanaannya tidak pasti."
          value={state.tarwiyahMode}
          onChange={(tarwiyahMode) => update({ tarwiyahMode })}
          columns={2}
          choices={[
            { value: "required", label: "Wajib ditawarkan" },
            { value: "preferred", label: "Diutamakan" },
            { value: "want_not_offered", label: "Mahu pakej tanpa Tarwiyah" },
            { value: "any", label: "Tidak kisah" },
          ]}
        />
        {tarWanted ? (
          <CheckboxField
            id="medan-tarwiyahAcceptConditional"
            checked={state.tarwiyahAcceptConditional}
            onChange={(tarwiyahAcceptConditional) => update({ tarwiyahAcceptConditional })}
            label="Terima Tarwiyah yang tertakluk kepada kebenaran"
            description="Jika tidak ditanda, hanya pakej yang menawarkan Tarwiyah tanpa syarat dikira memenuhi."
          />
        ) : null}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="tajuk-pmn">
        <h2 id="tajuk-pmn" className="flex flex-wrap items-center gap-x-2 text-xl font-semibold">
          PMN <GlossaryTerm term="pmn" />
        </h2>
        <ChoiceCards
          name="mod-pmn"
          legend="Perkhidmatan Masyair Naik Taraf"
          hint="Tanpa PMN, jemaah ditempatkan di khemah Muassasah di Muaisim."
          value={state.pmn}
          onChange={(pmn) => update({ pmn })}
          columns={3}
          choices={[
            { value: "required", label: "Wajib" },
            { value: "preferred", label: "Diutamakan" },
            { value: "any", label: "Tidak kisah" },
          ]}
        />
      </section>
    </div>
  );
}
