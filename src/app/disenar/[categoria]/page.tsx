import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfiguratorApp } from "@/components/configurator/ConfiguratorApp";
import { CATEGORIES, getCategoryBySlug } from "@/lib/catalog";
import { STEPS, type StepId } from "@/lib/store/steps";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ categoria: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ categoria: string }> }): Promise<Metadata> {
  const cat = getCategoryBySlug((await params).categoria);
  if (!cat) return {};
  return {
    title: `Diseñá ${cat.article === "la" ? "tu" : "tu"} ${cat.singular} en 3D`,
    description: cat.description,
    alternates: { canonical: `/muebles/${cat.slug}` },
  };
}

export default async function DisenarPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoria: string }>;
  searchParams: Promise<{ plantilla?: string; paso?: string }>;
}) {
  const cat = getCategoryBySlug((await params).categoria);
  if (!cat) notFound();
  const sp = await searchParams;
  const template = cat.templates.some((t) => t.id === sp.plantilla) ? sp.plantilla : undefined;
  const step = STEPS.some((s) => s.id === sp.paso) ? (sp.paso as StepId) : undefined;
  return <ConfiguratorApp categoryId={cat.id} templateId={template} step={step} />;
}
