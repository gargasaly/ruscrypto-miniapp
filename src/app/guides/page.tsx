import { Disclaimer } from "@/components/disclaimer";
import { GuideBrowser } from "@/components/guide-browser";
import { SectionHeader } from "@/components/section-header";
import { guideSections, pageHeaders } from "@/lib/content";

type GuidesPageProps = {
  searchParams?: Promise<{
    tab?: string | string[];
  }>;
};

const guideTabIds = new Set(guideSections.map((section) => section.id));

export default async function GuidesPage({ searchParams }: GuidesPageProps) {
  const params = await searchParams;
  const requestedTab = Array.isArray(params?.tab) ? params?.tab[0] : params?.tab;
  const activeTab = requestedTab && guideTabIds.has(requestedTab)
    ? requestedTab
    : "education";

  return (
    <div className="space-y-6">
      <SectionHeader
        description={pageHeaders.guides.description}
        eyebrow={pageHeaders.guides.eyebrow}
        title={pageHeaders.guides.title}
      />
      <GuideBrowser activeTab={activeTab} sections={guideSections} />
      <Disclaimer />
    </div>
  );
}
