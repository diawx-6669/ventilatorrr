import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionary";
import { alternates, type Locale } from "@/i18n/config";
import { FormPage } from "@/components/forms/form-page";
import { IdeaForm } from "@/components/forms/idea-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/idea">): Promise<Metadata> {
  const { lang } = await params;
  const t = getDictionary(lang as Locale);
  return { title: t.forms.idea.title, description: t.forms.idea.lead, alternates: alternates(lang as Locale, "/idea") };
}

export default async function Page({ params }: PageProps<"/[lang]/idea">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const t = getDictionary(locale);
  return (
    <FormPage locale={locale} accent="blue" title={t.forms.idea.title} lead={t.forms.idea.lead}>
      <IdeaForm />
    </FormPage>
  );
}
