import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProject, projects } from "@/data/projects";
import ProjectCaseStudy from "@/components/ProjectCaseStudy";
export function generateStaticParams() { return projects.map(p => ({ slug: p.slug })); }
export async function generateMetadata({ params }: { params: Promise<{slug:string}> }): Promise<Metadata> {
  const { slug } = await params; const p = findProject(slug);
  return { title: p ? p.shortTitle : "Project", description: p?.summary };
}
export default async function ProjectPage({ params }: { params: Promise<{slug:string}> }) {
  const { slug } = await params; const p = findProject(slug);
  if (!p) notFound(); return <ProjectCaseStudy project={p} />;
}
