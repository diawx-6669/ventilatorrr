"use client";
import { useDict } from "@/components/providers";
import { GRADES, participateSchema } from "@/lib/schemas";
import { ROLES, type ContactType, type Role } from "@/lib/types";
import { Choice, CheckRow, TextArea, TextField, useErrorText } from "./fields";
import { FormFrame, useDraft, useSubmit } from "./engine";

const initial = { name: "", grade: "" as (typeof GRADES)[number] | "", letter: "", role: "" as Role | "", pitch: "", contact_type: "telegram" as ContactType, contact: "", consent: false };

export function JoinForm() {
  const t = useDict();
  const f = t.forms.join;
  const err = useErrorText();
  const [v, setV, clear] = useDraft("vent:draft:join", initial);
  const s = useSubmit("participate", participateSchema);
  const set = <K extends keyof typeof initial>(k: K, val: (typeof initial)[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    s.clearError(k);
  };

  return (
    <FormFrame
      accent="lime"
      state={s}
      onSubmit={async () => {
        if (await s.submit(v)) clear();
      }}
      onAgain={s.reset}
    >
      <TextField name="name" label={f.name} placeholder={f.namePh} value={v.name} onChange={(x) => set("name", x)} error={err(s.errors.name)} maxLength={40} autoComplete="given-name" />

      <div className="grid gap-x-5 sm:grid-cols-[1fr_auto]">
        <Choice name="grade" label={f.grade} compact options={GRADES.map((g) => ({ value: g, label: g }))} value={v.grade} onChange={(x) => set("grade", x)} error={err(s.errors.grade)} />
        <div className="sm:w-28">
          <TextField name="letter" label={f.letter} placeholder={f.letterPh} optional value={v.letter} onChange={(x) => set("letter", x.toUpperCase().slice(0, 2))} error={err(s.errors.letter)} maxLength={2} />
        </div>
      </div>

      <Choice name="role" label={f.role} options={ROLES.map((r) => ({ value: r, label: t.roles[r] }))} value={v.role} onChange={(x) => set("role", x)} error={err(s.errors.role)} />

      <TextArea name="pitch" label={f.pitch} help={f.pitchHelp} value={v.pitch} onChange={(x) => set("pitch", x)} error={err(s.errors.pitch)} max={600} />

      <div className="flex flex-col gap-3">
        <Choice
          name="contact_type"
          label={f.contact}
          options={[
            { value: "telegram", label: "Telegram" },
            { value: "instagram", label: "Instagram" },
          ]}
          value={v.contact_type}
          onChange={(x) => set("contact_type", x)}
          error={err(s.errors.contact_type)}
        />
        <div className="-mt-4">
          <TextField
            name="contact"
            label={v.contact_type === "telegram" ? "Telegram" : "Instagram"}
            prefix="@"
            placeholder={f.contactPh}
            value={v.contact}
            onChange={(x) => set("contact", x.replace(/^@/, ""))}
            error={err(s.errors.contact)}
            maxLength={40}
            inputMode="text"
            autoComplete="username"
          />
        </div>
      </div>

      <CheckRow name="consent" checked={v.consent} onChange={(x) => set("consent", x)} error={err(s.errors.consent)}>
        {f.consent}
      </CheckRow>
    </FormFrame>
  );
}
