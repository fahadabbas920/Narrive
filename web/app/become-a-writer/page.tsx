import { BecomeWriterFlow } from "@/components/onboarding/become-writer-flow"

export default async function BecomeAWriterPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>
}) {
  const { start } = await searchParams
  return <BecomeWriterFlow initialStep={start === "profile" ? 2 : 0} />
}
