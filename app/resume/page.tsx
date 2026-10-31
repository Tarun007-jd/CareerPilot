"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useCareerPilot } from "@/components/providers/career-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { AIEngineBadge } from "@/components/shared/ai-engine-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { parseResume, ClientApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { inferSkillCategory, skillKey } from "@/lib/skills";
import type { EngineKind, ResumeExtraction, SkillCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

function EditableTags({
  label,
  items,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  className?: string;
}) {
  const [value, setValue] = useState("");
  function add() {
    const clean = value.trim();
    if (!clean) return;
    if (items.some((item) => item.toLowerCase() === clean.toLowerCase())) {
      setValue("");
      return;
    }
    onChange([...items, clean]);
    setValue("");
  }
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <span className="text-[10px] text-muted-foreground">{items.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="gap-1 py-1">
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((entry) => entry !== item))}
              aria-label={`Remove ${item} from ${label}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {!items.length ? (
          <span className="text-xs text-muted-foreground">None detected.</span>
        ) : null}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="h-8 text-xs"
          aria-label={`Add to ${label}`}
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function ResumePage() {
  const { state, updateProfile, addSkills } = useCareerPilot();
  const { profile } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"upload" | "paste">(
    profile.resume?.text ? "paste" : "upload",
  );
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resumeText, setResumeText] = useState(profile.resume?.text ?? "");
  const [fileName, setFileName] = useState(
    profile.resume?.fileName ?? "pasted-resume.txt",
  );
  const [extraction, setExtraction] = useState<ResumeExtraction | null>(
    profile.resume?.extraction ?? null,
  );
  const [engine, setEngine] = useState<EngineKind | null>(null);
  const [processing, setProcessing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(
    profile.resume?.uploadedAt ?? null,
  );

  async function handleParse(input?: { file?: File; text?: string }) {
    const selectedFile = input?.file ?? (tab === "upload" ? file : undefined);
    const textToParse =
      input?.text ?? (tab === "paste" ? resumeText : resumeText);
    if (tab === "upload" && !selectedFile) {
      toast.error("Choose a PDF or text resume first.");
      return;
    }
    if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Resume PDFs must be 5 MB or smaller.");
      return;
    }
    if (!selectedFile && textToParse.trim().length < 40) {
      toast.error("Paste more resume text before parsing.");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const response = selectedFile
        ? await parseResume({ file: selectedFile })
        : await parseResume({ text: textToParse });
      setResumeText(response.text);
      setFileName(response.fileName);
      setExtraction(response.extraction);
      setEngine(response.engine);
      setSavedAt(null);
      toast.success(
        response.engine === "gemini"
          ? "Resume analyzed with Gemini"
          : "Resume analyzed with the local coach",
        {
          description: "Review every extracted field before applying it to your profile.",
        },
      );
    } catch (caught) {
      const message =
        caught instanceof ClientApiError
          ? caught.message
          : "The resume could not be analyzed. Nothing was saved.";
      setError(message);
      toast.error("Resume not analyzed", { description: message });
    } finally {
      setProcessing(false);
    }
  }

  function updateExtraction(patch: Partial<ResumeExtraction>) {
    setExtraction((current) => (current ? { ...current, ...patch } : current));
  }

  function applyToProfile() {
    if (!extraction) return;
    setApplying(true);
    const extractedSkills: {
      name: string;
      category: SkillCategory;
      proficiency: number;
    }[] = [];
    const seen = new Set<string>();
    function addCategory(names: string[], category?: SkillCategory) {
      for (const name of names) {
        const clean = name.trim();
        const key = skillKey(clean);
        if (!clean || seen.has(key)) continue;
        seen.add(key);
        extractedSkills.push({
          name: clean,
          category: category ?? inferSkillCategory(clean),
          proficiency: 55,
        });
      }
    }
    addCategory(extraction.programmingLanguages, "language");
    addCategory(extraction.frameworks, "framework");
    addCategory(extraction.tools, "tool");
    addCategory(extraction.technicalSkills);

    const mergedCertifications = Array.from(
      new Set([...profile.certifications, ...extraction.certifications]),
    );
    const extractedExperience = extraction.experience.join("\n\n").trim();
    updateProfile({
      resume: {
        fileName,
        text: resumeText,
        uploadedAt: new Date().toISOString(),
        extraction,
      },
      certifications: mergedCertifications,
      experience: profile.experience.trim() || extractedExperience,
    });
    addSkills(extractedSkills, "resume");
    setSavedAt(new Date().toISOString());
    setApplying(false);
    toast.success("Resume applied to your profile", {
      description:
        "The resume is saved. New skills were added at a conservative 55% starting level; adjust them in Career Profile.",
    });
  }

  const hasExistingResume = Boolean(profile.resume?.text);
  const visibleResumeText = resumeText || profile.resume?.text || "";

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Module 03 · Evidence extraction"
        title="Resume intelligence"
        description="Upload a text-based PDF or paste your resume. CareerPilot extracts evidence for review; it does not silently overwrite your profile."
        actions={<AIEngineBadge />}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 pt-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Add your resume</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    PDF, TXT, or Markdown · up to 5 MB
                  </p>
                </div>
                {hasExistingResume ? (
                  <Badge variant="success" className="gap-1">
                    <Check className="h-3 w-3" />
                    Saved resume
                  </Badge>
                ) : null}
              </div>
              <div className="mt-4 flex gap-1">
                {(["upload", "paste"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTab(value)}
                    className={cn(
                      "rounded-t-lg border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                      tab === value
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {value === "upload" ? "Upload PDF" : "Paste text"}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {tab === "upload" ? (
                <div>
                  <input
                    ref={fileInputRef}
                    id="resume-file"
                    type="file"
                    accept=".pdf,.txt,.md,application/pdf,text/plain"
                    className="sr-only"
                    onChange={(event) => {
                      const selected = event.target.files?.[0] ?? null;
                      setFile(selected);
                      if (selected) {
                        setFileName(selected.name);
                        setError(null);
                      }
                    }}
                  />
                  <label
                    htmlFor="resume-file"
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      const selected = event.dataTransfer.files?.[0];
                      if (selected) {
                        setFile(selected);
                        setFileName(selected.name);
                        setError(null);
                      }
                    }}
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
                      dragging
                        ? "border-primary bg-accent/60"
                        : "border-border bg-muted/20 hover:border-primary/30 hover:bg-accent/20",
                    )}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-sm">
                      <UploadCloud className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-medium">
                      {file ? file.name : "Drop your resume here or browse"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {file
                        ? `${(file.size / 1024).toFixed(0)} KB · ready to parse`
                        : "Text-based PDFs work best. Scanned image PDFs need OCR outside CareerPilot."}
                    </p>
                  </label>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] text-muted-foreground">
                      {fileName && file ? `Selected: ${fileName}` : "No file selected"}
                    </p>
                    <div className="flex gap-2">
                      {file ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                        >
                          Clear
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        onClick={() => void handleParse()}
                        disabled={processing}
                      >
                        {processing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {hasExistingResume && !file ? "Reparse saved resume" : "Parse resume"}
                      </Button>
                    </div>
                  </div>
                  {hasExistingResume && !file ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      You can reparse the saved resume without selecting a file again.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div>
                  <Label htmlFor="resume-text">Resume text</Label>
                  <Textarea
                    id="resume-text"
                    value={resumeText}
                    onChange={(event) => {
                      setResumeText(event.target.value);
                      setFileName("pasted-resume.txt");
                    }}
                    rows={13}
                    maxLength={120000}
                    placeholder="Paste the full text of your resume here…"
                    className="mt-1.5 font-mono text-xs leading-relaxed"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      {resumeText.length.toLocaleString()} characters · text stays in
                      this browser and is sent to the server only for analysis.
                    </p>
                    <Button
                      type="button"
                      onClick={() => void handleParse()}
                      disabled={processing || resumeText.trim().length < 40}
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Parse & review
                    </Button>
                  </div>
                </div>
              )}

              {error ? (
                <Alert
                  variant="error"
                  className="mt-4"
                  title="Resume analysis failed"
                  icon={<CircleAlert className="h-4 w-4" />}
                >
                  {error} Your previous saved resume and profile were not overwritten.
                </Alert>
              ) : null}

              {processing ? (
                <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Extracting evidence from your resume…
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="h-14 animate-pulse rounded-lg bg-muted" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This can take a moment. You can review every extracted field before
                    applying it.
                  </p>
                </div>
              ) : null}
            </div>
          </Card>

          {extraction ? (
            <Card className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">Review extracted information</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Correct anything that is wrong before applying. Extracted skill
                      levels are conservative starting values.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {engine ? (
                    <Badge variant={engine === "gemini" ? "success" : "warning"}>
                      {engine === "gemini" ? "Gemini extraction" : "Local extraction"}
                    </Badge>
                  ) : null}
                  {savedAt ? (
                    <Badge variant="secondary">Applied {formatDate(savedAt)}</Badge>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="extraction-summary">Summary</Label>
                  <Textarea
                    id="extraction-summary"
                    value={extraction.summary}
                    onChange={(event) => updateExtraction({ summary: event.target.value })}
                    rows={3}
                    className="text-xs leading-relaxed"
                  />
                </div>

                <EditableTags
                  label="Education"
                  items={extraction.education}
                  onChange={(items) => updateExtraction({ education: items })}
                  placeholder="Add an education line"
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <EditableTags
                    label="Programming languages"
                    items={extraction.programmingLanguages}
                    onChange={(items) =>
                      updateExtraction({ programmingLanguages: items })
                    }
                    placeholder="Add a language"
                  />
                  <EditableTags
                    label="Frameworks & libraries"
                    items={extraction.frameworks}
                    onChange={(items) => updateExtraction({ frameworks: items })}
                    placeholder="Add a framework"
                  />
                  <EditableTags
                    label="Tools & platforms"
                    items={extraction.tools}
                    onChange={(items) => updateExtraction({ tools: items })}
                    placeholder="Add a tool"
                  />
                  <EditableTags
                    label="Technical skills"
                    items={extraction.technicalSkills}
                    onChange={(items) => updateExtraction({ technicalSkills: items })}
                    placeholder="Add a technical skill"
                  />
                </div>

                <EditableTags
                  label="Certifications"
                  items={extraction.certifications}
                  onChange={(items) => updateExtraction({ certifications: items })}
                  placeholder="Add a certification"
                />

                <div className="space-y-1.5">
                  <Label htmlFor="extraction-experience">Experience</Label>
                  <Textarea
                    id="extraction-experience"
                    value={extraction.experience.join("\n\n")}
                    onChange={(event) =>
                      updateExtraction({
                        experience: event.target.value
                          .split(/\n\s*\n/)
                          .map((entry) => entry.trim())
                          .filter(Boolean),
                      })
                    }
                    rows={6}
                    className="text-xs leading-relaxed"
                    placeholder="Experience entries separated by a blank line"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">Projects</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateExtraction({
                          projects: [
                            ...extraction.projects,
                            { title: "New project", description: "", technologies: [] },
                          ],
                        })
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add project
                    </Button>
                  </div>
                  <div className="mt-2.5 space-y-2">
                    {extraction.projects.map((project, index) => (
                      <div
                        key={`${project.title}-${index}`}
                        className="rounded-xl border border-border bg-muted/20 p-3.5"
                      >
                        <div className="flex items-start gap-2">
                          <Input
                            value={project.title}
                            onChange={(event) =>
                              updateExtraction({
                                projects: extraction.projects.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, title: event.target.value }
                                    : entry,
                                ),
                              })
                            }
                            aria-label={`Project ${index + 1} title`}
                            className="h-8 text-xs font-medium"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              updateExtraction({
                                projects: extraction.projects.filter(
                                  (_, entryIndex) => entryIndex !== index,
                                ),
                              })
                            }
                            aria-label={`Remove project ${project.title}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Textarea
                          value={project.description}
                          onChange={(event) =>
                            updateExtraction({
                              projects: extraction.projects.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, description: event.target.value }
                                  : entry,
                              ),
                            })
                          }
                          rows={2}
                          aria-label={`Project ${index + 1} description`}
                          className="mt-2 text-xs leading-relaxed"
                          placeholder="What did you build and what was the outcome?"
                        />
                        <Input
                          value={project.technologies.join(", ")}
                          onChange={(event) =>
                            updateExtraction({
                              projects: extraction.projects.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? {
                                      ...entry,
                                      technologies: event.target.value
                                        .split(",")
                                        .map((technology) => technology.trim())
                                        .filter(Boolean),
                                    }
                                  : entry,
                              ),
                            })
                          }
                          className="mt-2 h-8 text-xs"
                          aria-label={`Project ${index + 1} technologies`}
                          placeholder="Technologies, comma-separated"
                        />
                      </div>
                    ))}
                    {!extraction.projects.length ? (
                      <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                        No projects detected. Add one so CareerPilot can see evidence of
                        applied work.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium">Potential evidence gaps</p>
                  <ul className="space-y-1.5">
                    {extraction.potentialGaps.map((gap) => (
                      <li
                        key={gap}
                        className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-xs leading-relaxed text-amber-950"
                      >
                        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                        {gap}
                      </li>
                    ))}
                    {!extraction.potentialGaps.length ? (
                      <li className="text-xs text-muted-foreground">
                        No resume-level evidence gaps were flagged.
                      </li>
                    ) : null}
                  </ul>
                </div>

                <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Applying saves the resume and merges extracted skills,
                    certifications, and experience if those profile fields are empty.
                  </p>
                  <Button type="button" onClick={applyToProfile} disabled={applying}>
                    {applying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Apply to profile
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-5 sm:p-6">
              <EmptyState
                icon={FileText}
                title="No extracted resume yet"
                description="Upload or paste a resume, then inspect the extraction before applying it. CareerPilot will not claim to have parsed a file it has not processed."
              />
            </Card>
          )}

          {visibleResumeText ? (
            <Card className="p-5 sm:p-6">
              <details>
                <summary className="cursor-pointer list-none text-sm font-semibold">
                  <span className="flex items-center justify-between gap-3">
                    View resume text
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {visibleResumeText.length.toLocaleString()} chars
                    </span>
                  </span>
                </summary>
                <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 font-sans text-xs leading-relaxed text-muted-foreground">
                  {visibleResumeText}
                </pre>
              </details>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4 xl:sticky xl:top-[88px] xl:self-start">
          {hasExistingResume ? (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FolderOpen className="h-4 w-4 text-primary" />
                Saved resume
              </div>
              <p className="mt-3 truncate text-xs font-medium">{profile.resume?.fileName}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {profile.resume?.uploadedAt
                  ? `Uploaded ${formatDate(profile.resume.uploadedAt)}`
                  : "Saved in your workspace"}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="outline">
                  {profile.resume?.extraction ? "Extraction saved" : "Not analyzed"}
                </Badge>
                <Badge variant="outline">
                  {Math.round((profile.resume?.text.length ?? 0) / 1000)}k chars
                </Badge>
              </div>
              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <Link href="/profile">
                  Edit profile details
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </Card>
          ) : null}

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              What gets extracted
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
              {[
                "Technical skills and languages",
                "Frameworks, libraries, and tools",
                "Education, projects, and certifications",
                "Experience evidence",
                "Resume-level evidence gaps",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
              Extracted skills are not verified. Review them, then set an honest
              proficiency in Career Profile.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Privacy and limits
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Resume text is stored in this browser and sent to the server only for
              parsing/analysis. The Gemini API key stays server-side. Scanned image
              PDFs without selectable text are rejected rather than guessed.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <RefreshCw className="h-4 w-4 text-primary" />
              Next step
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              After applying your resume, add a real job description in Skill Gap
              Analysis.
            </p>
            <Button asChild size="sm" className="mt-4 w-full">
              <Link href="/skill-gap">
                Analyze skill gaps
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
