import { AdPlaceholder } from "@/components/AdPlaceholder";
import { FeaturedResourceSection } from "@/components/FeaturedResourceSection";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ToolsSection } from "@/components/ToolsSection";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <Header />
      <Hero />
      <AdPlaceholder />
      <ToolsSection />
      <FeaturedResourceSection />
    </main>
  );
}
