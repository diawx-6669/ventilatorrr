"use client";
import { useDict } from "@/components/providers";
import { ideaSchema } from "@/lib/schemas";
import { CATEGORIES, type Category } from "@/lib/types";
import { Choice, TextArea, TextField, useErrorText } from "./fields";
import { FormFrame, useDraft, useSubmit } from "./engine";

const initial = { idea: "", category: "" as Category | "", name: "" };

export function IdeaForm() {
  const t = useDict();
  const f = t.forms.idea;
  const err = useErrorText();
  const [v, setV, clear] = useDraft("vent:draft:idea", initial);
  const s = useSubmit("ideas", ideaSchema);
  const set = <K extends keyof typeof initial>(k: K, val: (typeof initial)[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    s.clearError(k);
  };

  return (
    <FormFrame
      accent="blue"
      state={s}
      onSubmit={async () => {
        if (await s.submit(v)) clear();
      }}
      onAgain={s.reset}
    >
      <Choice name="category" label={f.category} accent="blue" options={CATEGORIES.map((c) => ({ value: c, label: t.categories[c] }))} value={v.category} onChange={(x) => set("category", x)} error={err(s.errors.category)} />
      <TextArea name="idea" label={f.idea} placeholder={f.ideaPh} accent="blue" value={v.idea} onChange={(x) => set("idea", x)} error={err(s.errors.idea)} max={500} />
      <TextField name="name" label={f.name} placeholder={f.namePh} optional accent="blue" value={v.name} onChange={(x) => set("name", x)} error={err(s.errors.name)} maxLength={40} autoComplete="given-name" />
    </FormFrame>
  );
}
