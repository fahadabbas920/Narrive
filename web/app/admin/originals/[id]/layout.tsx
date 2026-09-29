import { OriginalsWorkspace } from "@/components/app/story-workspace"

// Originals reuse the writer's story pages; this points their links and wording at the admin console.
export default function OriginalLayout({ children }: { children: React.ReactNode }) {
  return <OriginalsWorkspace>{children}</OriginalsWorkspace>
}
