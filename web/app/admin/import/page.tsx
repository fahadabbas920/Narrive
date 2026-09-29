"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  WandSparkles,
  Download,
  FileJson,
  FileUp,
  Info,
  Loader2,
  PenLine,
  RotateCcw,
  Sparkles,
  Undo2,
  Upload,
  XCircle,
} from "lucide-react"
import {
  errorText,
  useCommitImport,
  useImports,
  useUndoImport,
  useValidateImport,
} from "@/hooks/use-admin"
import type { ImportReport, ImportResult, ImportStoryReport } from "@/lib/api/admin"
import {
  AdminPage,
  DataTable,
  FilterChips,
  Panel,
  formatDate,
  td,
  th,
} from "@/components/admin/admin-ui"
import { FORMAT_RULES, IMPORT_TEMPLATE, buildAiPrompt } from "@/components/admin/import-template"
import { useTaxonomy } from "@/hooks/use-taxonomy"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { showToast } from "@/lib/toast"
import { cn } from "@/lib/utils"

const MAX_BYTES = 2 * 1024 * 1024

type Source = "file" | "paste"
type Parsed = { ok: true; value: unknown } | { ok: false; message: string }

/** JSON.parse with a line/column for syntax errors, so they can be found without the server. */
function parseJson(text: string): Parsed {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid JSON"
    const lineCol = msg.match(/line (\d+) column (\d+)/)
    if (lineCol) return { ok: false, message: msg }
    const pos = Number(msg.match(/position (\d+)/)?.[1])
    if (Number.isFinite(pos)) {
      const before = text.slice(0, pos)
      const line = before.split("\n").length
      const col = pos - before.lastIndexOf("\n")
      return {
        ok: false,
        message: `${msg.replace(/ in JSON at position \d+.*/, "")} (line ${line}, column ${col})`,
      }
    }
    return { ok: false, message: msg }
  }
}

function downloadTemplate() {
  const blob = new Blob([EXAMPLE_JSON], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "narrive-import-template.json"
  a.click()
  URL.revokeObjectURL(url)
}

const EXAMPLE_JSON = JSON.stringify(IMPORT_TEMPLATE, null, 2)

function CopyButton({
  getText,
  label,
  icon: Icon = Copy,
  primary = false,
  className,
}: {
  getText: () => string | null
  label: string
  icon?: React.ComponentType<{ className?: string }>
  primary?: boolean
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  async function copy() {
    const text = getText()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      showToast.error("Couldn't copy to the clipboard.")
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
        primary
          ? "bg-lavender text-lavender-ink hover:opacity-90"
          : "border-border text-foreground hover:bg-muted border",
        className,
      )}
    >
      {copied ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      {copied ? "Copied" : label}
    </button>
  )
}

function Problems({
  items,
  level,
}: {
  items: { path: string; message: string }[]
  level: "error" | "warning"
}) {
  if (!items.length) return null
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((p, i) => (
        <li key={`${p.path}-${i}`} className="flex items-start gap-2 text-sm">
          {level === "error" ? (
            <XCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" aria-label="Error" />
          ) : (
            <AlertTriangle
              className="text-butter-ink mt-0.5 h-4 w-4 shrink-0"
              aria-label="Warning"
            />
          )}
          <span className="min-w-0">
            <code className="bg-muted text-foreground mr-1.5 rounded px-1.5 py-0.5 font-mono text-[11px] break-all">
              {p.path}
            </code>
            <span className="text-foreground">{p.message}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function StoryReportCard({ story }: { story: ImportStoryReport }) {
  const failed = story.errors.length > 0
  return (
    <div
      className={cn(
        "bg-card rounded-2xl border p-4 shadow-sm",
        failed ? "border-destructive/40" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-foreground flex min-w-0 items-center gap-2 font-bold">
          {failed ? (
            <XCircle className="text-destructive h-4 w-4 shrink-0" aria-label="Has errors" />
          ) : (
            <CheckCircle2 className="text-mint-ink h-4 w-4 shrink-0" aria-label="Ready" />
          )}
          <span className="text-muted-foreground font-mono text-xs">#{story.index + 1}</span>
          <span className="truncate">{story.title}</span>
        </p>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
            story.status === "published" ? "bg-mint text-mint-ink" : "bg-butter text-butter-ink",
          )}
        >
          {story.status === "published" ? "Will publish" : "Draft"}
        </span>
      </div>
      <p className="text-muted-foreground mt-1.5 text-xs tabular-nums">
        {story.scenes} scenes · {story.choices} choices · {story.endings} ending
        {story.endings === 1 ? "" : "s"} · {story.words.toLocaleString()} words
      </p>
      <Problems items={story.errors} level="error" />
      <Problems items={story.warnings} level="warning" />
    </div>
  )
}

function ReportView({ report }: { report: ImportReport }) {
  const withErrors = report.stories.filter((s) => s.errors.length).length
  const warnings = report.stories.reduce((n, s) => n + s.warnings.length, 0)
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl p-4",
          report.valid ? "bg-mint text-mint-ink" : "bg-destructive/10 text-destructive",
        )}
      >
        {report.valid ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
        )}
        <div className="text-sm">
          <p className="font-bold">
            {report.valid
              ? `Ready to import ${report.story_count} ${report.story_count === 1 ? "story" : "stories"}`
              : report.errors.length
                ? "The file can't be imported"
                : `${withErrors} of ${report.story_count} ${report.story_count === 1 ? "story has" : "stories have"} errors`}
          </p>
          <p className="opacity-90">
            {report.scene_count.toLocaleString()} scenes · {report.choice_count.toLocaleString()}{" "}
            choices
            {warnings > 0 &&
              ` · ${warnings} warning${warnings === 1 ? "" : "s"} (import still allowed)`}
            {!report.valid && " · Nothing is imported until every error is fixed."}
          </p>
        </div>
      </div>
      {report.errors.length > 0 && (
        <div className="bg-card border-destructive/40 rounded-2xl border p-4">
          <p className="text-foreground text-sm font-bold">File</p>
          <Problems items={report.errors} level="error" />
        </div>
      )}
      {report.stories.map((s) => (
        <StoryReportCard key={s.index} story={s} />
      ))}
    </div>
  )
}

function ResultView({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  const undo = useUndoImport()
  const [confirm, setConfirm] = useState<{ force: boolean; message: string } | null>(null)
  const [undone, setUndone] = useState(false)

  function runUndo(force: boolean) {
    undo.mutate(
      { id: result.import_id, force },
      {
        onSuccess: () => {
          setUndone(true)
          setConfirm(null)
        },
        onError: (e) => {
          if ((e as { status?: number }).status === 409 && !force) {
            setConfirm({ force: true, message: errorText(e) })
          } else {
            showToast.error(errorText(e, "Couldn't undo the import"))
            setConfirm(null)
          }
        },
      },
    )
  }

  return (
    <Panel>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            undone ? "bg-muted" : "bg-mint",
          )}
        >
          {undone ? (
            <Undo2 className="text-muted-foreground h-5 w-5" />
          ) : (
            <Sparkles className="text-mint-ink h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-lg font-extrabold">
            {undone
              ? "Import undone"
              : `Imported ${result.stories.length} ${result.stories.length === 1 ? "story" : "stories"}`}
          </p>
          <p className="text-muted-foreground text-sm">
            {undone
              ? "Every story from this import was deleted."
              : "They're Narrive Originals now. Drafts stay private until you publish them."}
          </p>
        </div>
      </div>
      {!undone && (
        <ul className="divide-border border-border mt-4 divide-y border-y">
          {result.stories.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <Link
                href={`/admin/stories/${s.id}`}
                className="text-foreground hover:text-primary min-w-0 flex-1 truncate text-sm font-semibold"
              >
                {s.title}
              </Link>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold",
                  s.status === "published" ? "bg-mint text-mint-ink" : "bg-butter text-butter-ink",
                )}
              >
                {s.status === "published" ? "Published" : "Draft"}
              </span>
              <Link
                href={`/admin/originals/${s.id}/canvas`}
                className="bg-lavender text-lavender-ink inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold hover:opacity-90"
              >
                <PenLine className="h-3.5 w-3.5" />
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReset}
          className="bg-primary text-primary-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90"
        >
          <FileUp className="h-4 w-4" />
          Import more
        </button>
        {!undone && (
          <button
            type="button"
            onClick={() => runUndo(false)}
            disabled={undo.isPending}
            className="border-border text-foreground hover:bg-muted inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {undo.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Undo2 className="h-4 w-4" />
            )}
            Undo this import
          </button>
        )}
      </div>
      <ConfirmDialog
        open={!!confirm}
        title="Undo anyway?"
        description={`${confirm?.message ?? ""} Readers will lose access to them.`}
        confirmLabel="Delete them"
        pending={undo.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => runUndo(true)}
      />
    </Panel>
  )
}

function RecentImports() {
  const { data } = useImports()
  const undo = useUndoImport()
  const [target, setTarget] = useState<{ id: string; force: boolean; message: string } | null>(null)
  if (!data?.length) return null

  function start(id: string, published: number) {
    setTarget({
      id,
      force: published > 0,
      message:
        published > 0
          ? `${published} of its stories ${published === 1 ? "is" : "are"} published and will be removed from the catalogue.`
          : "Every story from this import that still exists will be deleted.",
    })
  }

  return (
    <div className="mt-10">
      <h2 className="text-foreground mb-3 text-sm font-bold">Recent imports</h2>
      <DataTable>
        <thead>
          <tr>
            <th className={th}>When</th>
            <th className={th}>By</th>
            <th className={`${th} text-right`}>Stories</th>
            <th className={`${th} text-right`}>Still there</th>
            <th className={th}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <td className={`${td} whitespace-nowrap`}>{formatDate(row.created_at, true)}</td>
              <td className={`${td} text-muted-foreground`}>{row.actor_email}</td>
              <td className={`${td} text-right tabular-nums`}>{row.story_count}</td>
              <td className={`${td} text-right tabular-nums`}>
                {row.remaining}
                {row.published > 0 && (
                  <span className="text-muted-foreground"> ({row.published} live)</span>
                )}
              </td>
              <td className={`${td} text-right`}>
                {row.remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => start(row.id, row.published)}
                    className="text-destructive hover:bg-destructive/10 inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Undo
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <ConfirmDialog
        open={!!target}
        title="Undo this import?"
        description={target?.message ?? ""}
        confirmLabel="Undo import"
        pending={undo.isPending}
        onCancel={() => setTarget(null)}
        onConfirm={() =>
          target &&
          undo.mutate(
            { id: target.id, force: target.force },
            {
              onError: (e) => showToast.error(errorText(e, "Couldn't undo the import")),
              onSettled: () => setTarget(null),
            },
          )
        }
      />
    </div>
  )
}

export default function AdminImportPage() {
  const [source, setSource] = useState<Source>("file")
  const [text, setText] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [syntaxError, setSyntaxError] = useState<string | null>(null)
  const [report, setReport] = useState<{ text: string; report: ImportReport } | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [confirming, setConfirming] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const validate = useValidateImport()
  const commit = useCommitImport()

  // A report only counts for the exact text it was made from.
  const current = report && report.text === text ? report.report : null

  function reset() {
    setText("")
    setFileName(null)
    setSyntaxError(null)
    setReport(null)
    setResult(null)
  }

  async function readFile(file: File) {
    if (file.size > MAX_BYTES) {
      showToast.error("That file is bigger than 2 MB. Split it into smaller imports.")
      return
    }
    setFileName(file.name)
    setSyntaxError(null)
    setReport(null)
    setText(await file.text())
  }

  function check() {
    const parsed = parseJson(text)
    if (!parsed.ok) {
      setSyntaxError(parsed.message)
      setReport(null)
      return
    }
    setSyntaxError(null)
    const checked = text
    validate.mutate(parsed.value, {
      onSuccess: (r) => setReport({ text: checked, report: r }),
      onError: (e) => showToast.error(errorText(e, "Couldn't check the file")),
    })
  }

  function runImport() {
    const parsed = parseJson(text)
    if (!parsed.ok) return
    commit.mutate(parsed.value, {
      onSuccess: (r) => {
        setConfirming(false)
        setResult(r)
      },
      onError: (e) => {
        setConfirming(false)
        const detail = (e as { detail?: unknown }).detail
        if (detail && typeof detail === "object" && "stories" in detail) {
          setReport({ text, report: detail as ImportReport })
          showToast.error("The server found new problems. Check the report.")
        } else {
          showToast.error(errorText(e, "The import failed. Nothing was saved."))
        }
      },
    })
  }

  const bytes = new Blob([text]).size
  const { data: taxonomy } = useTaxonomy()
  // The prompt embeds the live genre/mood/rating lists, so it's only ready once they've loaded.
  const aiPrompt = () => (taxonomy ? buildAiPrompt(taxonomy) : null)

  return (
    <AdminPage
      title="Import stories"
      description="Bring in stories from a JSON file. They're checked first and saved as Narrive Originals, all at once or not at all."
      actions={
        <>
          <CopyButton getText={aiPrompt} label="Copy AI prompt" icon={WandSparkles} primary />
          <CopyButton getText={() => EXAMPLE_JSON} label="Copy example" />
          <button
            type="button"
            onClick={downloadTemplate}
            className="border-border text-foreground hover:bg-muted inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
          >
            <Download className="h-4 w-4" />
            Download template
          </button>
        </>
      }
    >
      {result ? (
        <ResultView result={result} onReset={reset} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Panel>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <FilterChips
                  label="Source"
                  value={source}
                  onChange={setSource}
                  options={[
                    { value: "file", label: "Upload file" },
                    { value: "paste", label: "Paste JSON" },
                  ]}
                />
                {text && (
                  <button
                    type="button"
                    onClick={reset}
                    className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Start over
                  </button>
                )}
              </div>

              {source === "file" ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    const file = e.dataTransfer.files[0]
                    if (file) void readFile(file)
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
                    dragging ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <div className="bg-lavender flex h-12 w-12 items-center justify-center rounded-2xl">
                    {fileName ? (
                      <FileJson className="text-lavender-ink h-6 w-6" />
                    ) : (
                      <Upload className="text-lavender-ink h-6 w-6" />
                    )}
                  </div>
                  {fileName ? (
                    <p className="text-foreground text-sm font-semibold">
                      {fileName}{" "}
                      <span className="text-muted-foreground font-normal">
                        · {(bytes / 1024).toFixed(1)} KB
                      </span>
                    </p>
                  ) : (
                    <p className="text-foreground text-sm font-semibold">Drop a .json file here</p>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="text-primary cursor-pointer text-sm font-semibold hover:underline"
                  >
                    {fileName ? "Choose a different file" : "or browse your computer"}
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void readFile(file)
                      e.target.value = ""
                    }}
                  />
                </div>
              ) : (
                <div>
                  <textarea
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value)
                      setFileName(null)
                      setSyntaxError(null)
                    }}
                    spellCheck={false}
                    rows={16}
                    placeholder={
                      '{\n  "format": "narrive-story",\n  "version": 1,\n  "stories": [ … ]\n}'
                    }
                    aria-label="Import JSON"
                    className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-primary/15 w-full resize-y rounded-2xl border p-4 font-mono text-xs leading-relaxed outline-none focus-visible:ring-4"
                  />
                  <div className="text-muted-foreground mt-1.5 flex justify-between text-xs">
                    <span className="inline-flex items-center gap-1">
                      <ClipboardPaste className="h-3.5 w-3.5" />
                      Paste the whole file, including the outer braces
                    </span>
                    <span
                      className={cn(
                        "tabular-nums",
                        bytes > MAX_BYTES && "text-destructive font-bold",
                      )}
                    >
                      {(bytes / 1024).toFixed(1)} KB / 2 MB
                    </span>
                  </div>
                </div>
              )}

              {syntaxError && (
                <div className="bg-destructive/10 text-destructive mt-4 flex items-start gap-2 rounded-xl p-3 text-sm">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <span className="font-bold">Not valid JSON:</span> {syntaxError}
                  </span>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={check}
                  disabled={!text.trim() || bytes > MAX_BYTES || validate.isPending}
                  className="bg-foreground text-background inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
                >
                  {validate.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {current ? "Check again" : "Check file"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={!current?.valid}
                  title={
                    !current
                      ? "Check the file first"
                      : !current.valid
                        ? "Fix the errors first"
                        : undefined
                  }
                  className="bg-primary text-primary-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
                >
                  <FileUp className="h-4 w-4" />
                  {current?.valid
                    ? `Import ${current.story_count} ${current.story_count === 1 ? "story" : "stories"}`
                    : "Import"}
                </button>
                {report && !current && text && (
                  <span className="text-muted-foreground text-xs">
                    The text changed. Check it again.
                  </span>
                )}
              </div>
            </Panel>

            {current && <ReportView report={current} />}
          </div>

          <div className="space-y-4">
            <Panel title="Write stories with AI">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Copy the prompt, paste it into ChatGPT, Claude or any other AI, and replace the
                first section with the stories you want. It includes the format rules,
                Narrive&apos;s allowed genres, moods and ratings, and an example, so the reply can
                be pasted straight back here.
              </p>
              <CopyButton
                getText={aiPrompt}
                label={taxonomy ? "Copy AI prompt" : "Loading lists…"}
                icon={WandSparkles}
                primary
                className="mt-3"
              />
            </Panel>
            <Panel title="How the format works">
              <ul className="space-y-2.5">
                {FORMAT_RULES.map((rule) => (
                  <li
                    key={rule}
                    className="text-muted-foreground flex gap-2 text-sm leading-relaxed"
                  >
                    <Info className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <CopyButton
                  getText={() => EXAMPLE_JSON}
                  label="Copy example"
                  className="px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSource("paste")
                    setText(EXAMPLE_JSON)
                    setFileName(null)
                    setSyntaxError(null)
                  }}
                  className="text-primary cursor-pointer text-sm font-semibold hover:underline"
                >
                  Load it into the editor
                </button>
              </div>
            </Panel>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Import ${current?.story_count ?? 0} ${current?.story_count === 1 ? "story" : "stories"}?`}
        description={
          <>
            They&apos;ll be added as Narrive Originals.{" "}
            {current && current.stories.some((s) => s.status === "published")
              ? `${current.stories.filter((s) => s.status === "published").length} will be published straight away; the rest stay drafts.`
              : "They'll all be drafts until you publish them."}{" "}
            You can undo the whole import afterwards.
          </>
        }
        confirmLabel="Import"
        icon={FileUp}
        destructive={false}
        pending={commit.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={runImport}
      />

      <RecentImports />
    </AdminPage>
  )
}
