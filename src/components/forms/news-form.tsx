"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Camera, Trash, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { useDict } from "@/components/providers";
import { newsSchema } from "@/lib/schemas";
import type { WhenPreset } from "@/lib/types";
import { Choice, CheckRow, FieldError, TextArea, TextField, useErrorText } from "./fields";
import { FormFrame, useDraft, useSubmit } from "./engine";
import { preparePhoto } from "./photo";

const initial = { what: "", when: "today" as WhenPreset, date: "", source: "", signed: false, name: "" };

export function NewsForm() {
  const t = useDict();
  const f = t.forms.news;
  const err = useErrorText();
  const [v, setV, clear] = useDraft("vent:draft:news", initial);
  const s = useSubmit("news", newsSchema);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);
  const photoId = useId();

  const set = <K extends keyof typeof initial>(k: K, val: (typeof initial)[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    s.clearError(k);
  };

  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <FormFrame
      accent="pink"
      state={s}
      onSubmit={async () => {
        const payload = { ...v, name: v.signed ? v.name : "" };
        if (await s.submit(payload, photo)) {
          clear();
          setPhoto(null);
        }
      }}
      onAgain={s.reset}
    >
      <TextArea name="what" label={f.what} placeholder={f.whatPh} accent="pink" value={v.what} onChange={(x) => set("what", x)} error={err(s.errors.what)} max={1000} />

      <Choice
        name="when"
        label={f.when}
        accent="pink"
        options={[
          { value: "today", label: f.whenToday },
          { value: "yesterday", label: f.whenYesterday },
          { value: "week", label: f.whenWeek },
          { value: "date", label: f.whenDate },
        ]}
        value={v.when}
        onChange={(x) => set("when", x)}
        error={err(s.errors.when)}
      />
      <AnimatePresence initial={false}>
        {v.when === "date" && (
          <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="-mt-3 overflow-hidden">
            <label className="flex max-w-xs flex-col gap-2 pt-1">
              <span className="sr-only">{f.whenDate}</span>
              <input
                type="date"
                max={today}
                value={v.date}
                onChange={(e) => set("date", e.target.value)}
                aria-invalid={s.errors.date ? true : undefined}
                className="h-14 rounded-2xl bg-ink-2 px-4 text-[17px] text-paper outline-none ring-2 ring-white/15 [color-scheme:dark] focus:ring-4 focus:ring-pink aria-[invalid=true]:ring-[#ff8fbd]"
              />
            </label>
            <FieldError id="date-err" message={err(s.errors.date)} />
          </m.div>
        )}
      </AnimatePresence>

      <TextField name="source" label={f.source} placeholder={f.sourcePh} optional accent="pink" value={v.source} onChange={(x) => set("source", x)} error={err(s.errors.source)} maxLength={300} />

      <div className="flex flex-col gap-2">
        <span className="flex items-baseline gap-2 text-[17px] font-bold" id={`${photoId}-label`}>
          {f.photo}
          <span className="text-sm font-medium text-paper/70">{t.forms.optional}</span>
        </span>
        <input
          ref={fileRef}
          id={photoId}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-labelledby={`${photoId}-label`}
          aria-describedby={`${photoId}-privacy`}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setPhotoError(undefined);
            const ready = await preparePhoto(file);
            if (ready === "type") return setPhotoError(err("photoType"));
            if (ready === "size") return setPhotoError(err("photoSize"));
            setPhoto(ready);
          }}
        />
        {preview ? (
          <div className="flex items-center gap-4 rounded-2xl bg-ink-2 p-3 ring-2 ring-white/15">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="size-20 rounded-xl object-cover" />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="h-11 rounded-full bg-white/10 px-4 font-semibold ring-1 ring-white/20 hover:bg-white/20">
                {f.photoChange}
              </button>
              <button type="button" onClick={() => setPhoto(null)} className="flex h-11 items-center gap-1.5 rounded-full px-4 font-semibold text-[#ffc2da] hover:bg-white/10">
                <Trash className="size-5" aria-hidden />
                {f.photoRemove}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-16 items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-white/30 text-[17px] font-semibold transition-colors hover:border-pink hover:bg-pink/10"
          >
            <Camera weight="bold" className="size-6" aria-hidden />
            {f.photoAdd}
          </button>
        )}
        <p id={`${photoId}-privacy`} className="flex items-start gap-2 text-[15px] text-paper/75">
          <ShieldCheck weight="bold" className="mt-0.5 size-5 shrink-0 text-lime" aria-hidden />
          {f.photoPrivacy}
        </p>
        <FieldError id={`${photoId}-err`} message={photoError ?? err(s.errors.photo)} />
      </div>

      <CheckRow name="signed" accent="pink" checked={v.signed} onChange={(x) => set("signed", x)}>
        {f.signed}
        <span className="mt-1 block text-[15px] font-normal text-paper/75">{f.anonymousNote}</span>
      </CheckRow>
      <AnimatePresence initial={false}>
        {v.signed && (
          <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="-mt-3 overflow-hidden">
            <TextField name="name" label={f.name} accent="pink" value={v.name} onChange={(x) => set("name", x)} error={err(s.errors.name)} maxLength={40} autoComplete="given-name" />
          </m.div>
        )}
      </AnimatePresence>
    </FormFrame>
  );
}
