import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionary";
import { alternates, type Locale } from "@/i18n/config";
import { FormPage } from "@/components/forms/form-page";
import { NewsForm } from "@/components/forms/news-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/news">): Promise<Metadata> {
  const { lang } = await params;
  const t = getDictionary(lang as Locale);
  return { title: t.forms.news.title, description: t.forms.news.lead, alternates: alternates(lang as Locale, "/news") };
}

export default async function Page({ params }: PageProps<"/[lang]/news">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const t = getDictionary(locale);
  return (
    <FormPage locale={locale} accent="pink" title={t.forms.news.title} lead={t.forms.news.lead}>
      <NewsForm />
    </FormPage>
  );
}
