import type { AuditEntry } from "@/lib/api/admin"

const str = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "")

export function describeAction(a: AuditEntry): string {
  const d = a.details ?? {}
  const title = str(d.title) ? `"${str(d.title)}"` : "a story"
  const email = str(d.email) || "a user"
  switch (a.action) {
    case "user.suspend":
      return `Suspended ${email}`
    case "user.reactivate":
      return `Reactivated ${email}`
    case "user.revoke_writer":
      return `Removed writer access from ${email}`
    case "user.restore_writer":
      return `Restored writer access for ${email}`
    case "story.publish":
      return `Published ${title}`
    case "story.unpublish":
      return `Unpublished ${title}`
    case "story.archive":
      return `Archived ${title}`
    case "story.feature":
      return `Featured ${title}`
    case "story.unfeature":
      return `Removed ${title} from Featured`
    case "story.rank":
      return d.rank == null
        ? "Cleared a featured position"
        : `Moved a story to featured #${str(d.rank)}`
    case "story.delete":
      return `Deleted ${title}${str(d.author) ? ` by ${str(d.author)}` : ""}`
    case "original.create":
      return `Created the Original ${title}`
    case "import.commit":
      return `Imported ${str(d.stories)} ${d.stories === 1 ? "story" : "stories"} (${str(d.scenes)} scenes)`
    case "import.undo":
      return `Undid an import (${str(d.deleted)} ${d.deleted === 1 ? "story" : "stories"} deleted)`
    default:
      return a.action
  }
}

export const ACTION_GROUPS = [
  { value: "", label: "All" },
  { value: "user.", label: "Users" },
  { value: "story.", label: "Stories" },
  { value: "original.", label: "Originals" },
  { value: "import.", label: "Imports" },
] as const
