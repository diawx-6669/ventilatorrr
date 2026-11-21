import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionary";
import { alternates, type Locale } from "@/i18n/config";
import { FormPage } from "@/components/forms/form-page";
import { JoinForm } from "@/components/forms/join-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/join">): Promise<Metadata> {
  const { lang } = await params;
  const t = getDictionary(lang as Locale);
  return { title: t.forms.join.title, description: t.forms.join.lead, alternates: alternates(lang as Locale, "/join") };
}

export default async function Page({ params }: PageProps<"/[lang]/join">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const t = getDictionary(locale);
  return (
    <FormPage locale={locale} accent="lime" title={t.forms.join.title} lead={t.forms.join.lead}>
      <JoinForm />
    </FormPage>
  );
}
