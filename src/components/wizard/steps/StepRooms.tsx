"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { madinahOf, newRoom, type RoomState } from "@/lib/wizard/state";

import { CheckboxField } from "../CheckboxField";
import { fieldId, useWizard } from "../context";
import { Field } from "../Field";
import { GlossaryTerm } from "../GlossaryTerm";
import { NativeSelect, OCCUPANCY_LABEL } from "../NativeSelect";

const OCC = [1, 2, 3, 4, 5, 6];

export function StepRooms() {
  const { state, update } = useWizard();
  const setRoom = (i: number, patch: Partial<RoomState>) =>
    update((s) => ({ rooms: s.rooms.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md bg-muted p-3 text-sm leading-relaxed">
        Harga pakej bergantung pada bilangan orang sebilik di hotel Makkah dan Madinah. Bilik di{" "}
        <strong>Aziziyah</strong> ditetapkan berasingan: pakej bilik berdua di Makkah tidak
        semestinya berdua di Aziziyah. Naik taraf bilik Aziziyah (jika ditawarkan) dikira sebagai
        caj tambahan. <GlossaryTerm term="aziziyah" />
      </div>

      <ol className="flex flex-col gap-4">
        {state.rooms.map((r, i) => (
          <li key={r.id} className="rounded-lg border bg-card p-4">
            <fieldset className="flex flex-col gap-4">
              <legend className="flex w-full items-center justify-between gap-2 font-heading text-lg font-semibold">
                Bilik {i + 1}
              </legend>
              <Field
                field={`rooms.${i}.pilgrims`}
                label="Bilangan jemaah rombongan anda dalam bilik ini"
              >
                {(a11y) => (
                  <NativeSelect
                    {...a11y}
                    value={r.pilgrims}
                    onChange={(e) => setRoom(i, { pilgrims: Number(e.target.value) })}
                  >
                    {OCC.map((n) => (
                      <option key={n} value={n}>
                        {n} orang
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              <Field
                field={`rooms.${i}.makkah`}
                label="Bilik hotel Makkah"
                hint="Jika jemaah kurang daripada saiz bilik, bilik dikongsi dengan jemaah lain."
              >
                {(a11y) => (
                  <NativeSelect
                    {...a11y}
                    value={r.makkah}
                    onChange={(e) => setRoom(i, { makkah: Number(e.target.value) })}
                  >
                    {OCC.slice(1).map((n) => (
                      <option key={n} value={n}>
                        {OCCUPANCY_LABEL[n]}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              <CheckboxField
                id={`${fieldId(`rooms.${i}.madinahSame`)}`}
                checked={r.madinahSame}
                onChange={(madinahSame) => setRoom(i, { madinahSame, madinah: r.makkah })}
                label="Bilik Madinah sama seperti Makkah"
              />
              {!r.madinahSame ? (
                <Field field={`rooms.${i}.madinah`} label="Bilik hotel Madinah">
                  {(a11y) => (
                    <NativeSelect
                      {...a11y}
                      value={madinahOf(r)}
                      onChange={(e) => setRoom(i, { madinah: Number(e.target.value) })}
                    >
                      {OCC.slice(1).map((n) => (
                        <option key={n} value={n}>
                          {OCCUPANCY_LABEL[n]}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </Field>
              ) : null}
              <Field
                field={`rooms.${i}.aziziyah`}
                label="Bilik Aziziyah"
                hint="Pilih susunan yang anda mahu. 'Ikut susunan asal' biasanya bilik 4–6 orang mengikut jantina."
              >
                {(a11y) => (
                  <NativeSelect
                    {...a11y}
                    value={String(r.aziziyah)}
                    onChange={(e) =>
                      setRoom(i, {
                        aziziyah: e.target.value === "default" ? "default" : Number(e.target.value),
                      })
                    }
                  >
                    <option value="default">Ikut susunan asal pakej</option>
                    {OCC.slice(1).map((n) => (
                      <option key={n} value={n}>
                        {OCCUPANCY_LABEL[n]}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              {state.rooms.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="self-start"
                  onClick={() => update((s) => ({ rooms: s.rooms.filter((_, j) => j !== i) }))}
                >
                  <Trash2 aria-hidden="true" />
                  Buang bilik {i + 1}
                </Button>
              ) : null}
            </fieldset>
          </li>
        ))}
      </ol>

      <Button
        type="button"
        variant="secondary"
        className="self-start"
        disabled={state.rooms.length >= 6}
        onClick={() => update((s) => ({ partyType: "group", rooms: [...s.rooms, newRoom()] }))}
      >
        <Plus aria-hidden="true" />
        Tambah bilik
      </Button>
    </div>
  );
}
