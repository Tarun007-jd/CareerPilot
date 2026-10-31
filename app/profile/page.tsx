"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  CircleAlert,
  FileText,
  GraduationCap,
  Plus,
  Save,
  Sparkles,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useCareerPilot } from "@/components/providers/career-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/shared/empty-state";
import { createId } from "@/lib/utils";
import { skillKey } from "@/lib/skills";
import type { Skill, SkillCategory, UserProfile } from "@/lib/types";

const roleSuggestions = [
  "AI Engineer",
  "Machine Learning Engineer",
  "Data Scientist",
  "Data Analyst",
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Developer",
  "Cloud Engineer",
  "DevOps Engineer",
  "Product Manager",
  "Product Designer",
];

const skillCategories: { value: SkillCategory; label: string }[] = [
  { value: "language", label: "Language" },
  { value: "framework", label: "Framework / library" },
  { value: "tool", label: "Tool / platform" },
  { value: "technical", label: "Technical concept" },
  { value: "soft", label: "Soft skill" },
];

const proficiencyLabels = [
  { max: 25, label: "Beginner" },
  { max: 50, label: "Learning" },
  { max: 70, label: "Intermediate" },
  { max: 85, label: "Advanced" },
  { max: 100, label: "Strong" },
];

function proficiencyLabel(value: number) {
  return proficiencyLabels.find((entry) => value <= entry.max)?.label ?? "Strong";
}

type Draft = Pick<
  UserProfile,
  | "name"
  | "email"
  | "headline"
  | "location"
  | "college"
  | "degree"
  | "graduationYear"
  | "experience"
  | "certifications"
  | "careerInterests"
  | "targetRole"
> & { skills: Skill[] };

function toDraft(profile: UserProfile): Draft {
  return {
    name: profile.name,
    email: profile.email,
    headline: profile.headline,
    location: profile.location,
    college: profile.college,
    degree: profile.degree,
    graduationYear: profile.graduationYear,
    experience: profile.experience,
    certifications: [...profile.certifications],
    careerInterests: [...profile.careerInterests],
    targetRole: profile.targetRole,
    skills: profile.skills.map((skill) => ({ ...skill })),
  };
}

function ListEditor({
  label,
  description,
  items,
  placeholder,
  onChange,
  suggestions,
}: {
  label: string;
  description?: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
  suggestions?: string[];
}) {
  const [value, setValue] = useState("");
  const id = label.toLowerCase().replace(/\s+/g, "-");

  function add(nextValue = value) {
    const clean = nextValue.trim();
    if (!clean) return;
    if (items.some((item) => item.toLowerCase() === clean.toLowerCase())) {
      toast.message("Already added", { description: `“${clean}” is already in this list.` });
      setValue("");
      return;
    }
    onChange([...items, clean]);
    setValue("");
  }

  return (
    <div className="space-y-2.5">
      <div>
        <Label htmlFor={id}>{label}</Label>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={() => add()}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      {suggestions?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions
            .filter(
              (suggestion) =>
                !items.some(
                  (item) => item.toLowerCase() === suggestion.toLowerCase(),
                ),
            )
            .map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => add(suggestion)}
                className="rounded-full border border-dashed border-border px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent/50 hover:text-primary"
              >
                + {suggestion}
              </button>
            ))}
        </div>
      ) : null}
      {items.length ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 py-1">
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onChange(items.filter((entry) => entry !== item))}
                className="rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProfileEditor() {
  const { state, updateProfile, replaceSkills } = useCareerPilot();
  const { profile, analysis } = state;
  const [draft, setDraft] = useState<Draft>(() => toDraft(profile));
  const [dirty, setDirty] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [skillCategory, setSkillCategory] = useState<SkillCategory>("language");
  const [skillProficiency, setSkillProficiency] = useState(65);
  const [saving, setSaving] = useState(false);

  const targetChanged = Boolean(
    analysis &&
      draft.targetRole.trim() &&
      draft.targetRole.trim() !== profile.targetRole &&
      analysis.targetRole !== draft.targetRole.trim(),
  );

  const completeness = useMemo(() => {
    const checks = [
      Boolean(draft.name.trim()),
      Boolean(draft.college.trim() && draft.degree.trim()),
      Boolean(draft.targetRole.trim()),
      draft.skills.length >= 3,
      Boolean(profile.resume?.text),
      Boolean(draft.experience.trim()),
    ];
    return {
      percent: Math.round((checks.filter(Boolean).length / checks.length) * 100),
      checks,
    };
  }, [draft, profile.resume]);

  function setField<K extends keyof Omit<Draft, "skills">>(
    key: K,
    value: Draft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function addSkill() {
    const name = skillName.trim();
    if (!name) {
      toast.error("Skill name is required");
      return;
    }
    if (
      draft.skills.some(
        (skill) => skillKey(skill.name) === skillKey(name),
      )
    ) {
      toast.error("Skill already added", {
        description: `${name} is already in your profile.`,
      });
      return;
    }
    const newSkill: Skill = {
      id: createId("skill"),
      name,
      category: skillCategory,
      proficiency: skillProficiency,
      source: "manual",
    };
    setDraft((current) => ({
      ...current,
      skills: [...current.skills, newSkill],
    }));
    setSkillName("");
    setDirty(true);
  }

  function updateSkillDraft(id: string, patch: Partial<Skill>) {
    setDraft((current) => ({
      ...current,
      skills: current.skills.map((skill) =>
        skill.id === id ? { ...skill, ...patch } : skill,
      ),
    }));
    setDirty(true);
  }

  function removeSkillDraft(id: string) {
    setDraft((current) => ({
      ...current,
      skills: current.skills.filter((skill) => skill.id !== id),
    }));
    setDirty(true);
  }

  function saveProfile() {
    if (!draft.name.trim()) {
      toast.error("Add your name before saving.");
      return;
    }
    if (!draft.targetRole.trim()) {
      toast.error("Select a target role before saving.");
      return;
    }
    if (draft.graduationYear && !/^\d{4}$/.test(draft.graduationYear)) {
      toast.error("Graduation year must be a four-digit year.");
      return;
    }
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
      toast.error("Enter a valid email address or leave it blank.");
      return;
    }
    setSaving(true);
    updateProfile({
      name: draft.name.trim(),
      email: draft.email.trim(),
      headline: draft.headline.trim(),
      location: draft.location.trim(),
      college: draft.college.trim(),
      degree: draft.degree.trim(),
      graduationYear: draft.graduationYear.trim(),
      experience: draft.experience.trim(),
      certifications: draft.certifications,
      careerInterests: draft.careerInterests,
      targetRole: draft.targetRole.trim(),
    });
    replaceSkills(
      draft.skills.map((skill) => ({
        ...skill,
        name: skill.name.trim(),
        proficiency: Math.round(skill.proficiency),
      })),
    );
    setDirty(false);
    setSaving(false);
    toast.success("Career profile saved", {
      description: targetChanged
        ? "Your target changed. Rerun the skill-gap analysis so the plan reflects the new role."
        : "Skills and profile details are now available to CareerPilot.",
    });
  }

  const groupedSkills = skillCategories
    .map((category) => ({
      ...category,
      skills: draft.skills.filter((skill) => skill.category === category.value),
    }))
    .filter((group) => group.skills.length);

  const profileEmpty = !profile.name && !profile.targetRole && !profile.resume;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Module 02 · Career foundation"
        title="Career profile"
        description="This is the context CareerPilot uses for every analysis, roadmap, project, and voice command. Keep it honest and current."
        actions={
          <>
            {dirty ? (
              <Badge variant="warning" className="hidden sm:inline-flex">
                Unsaved changes
              </Badge>
            ) : null}
            <Button type="button" onClick={saveProfile} disabled={saving || !dirty}>
              <Save className="h-4 w-4" />
              Save profile
            </Button>
          </>
        }
      />

      {profileEmpty ? (
        <Alert variant="info" className="mt-5" title="Start with the essentials">
          Add your name and target role, then build out education, skills, and
          experience. A resume can populate many of these fields automatically.
        </Alert>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                <UserRound className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Personal details</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  How CareerPilot addresses you and frames your job search.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">
                  Full name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="profile-name"
                  value={draft.name}
                  onChange={(event) => setField("name", event.target.value)}
                  placeholder="Aarav Mehta"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={draft.email}
                  onChange={(event) => setField("email", event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="profile-headline">Headline</Label>
                <Input
                  id="profile-headline"
                  value={draft.headline}
                  onChange={(event) => setField("headline", event.target.value)}
                  placeholder="Final-year CS student building practical AI products"
                  maxLength={140}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="profile-location">Location</Label>
                <Input
                  id="profile-location"
                  value={draft.location}
                  onChange={(event) => setField("location", event.target.value)}
                  placeholder="Bengaluru, India"
                  autoComplete="address-level2"
                />
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                <GraduationCap className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Education</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Keep degree naming close to what appears on your resume.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="profile-college">College / university</Label>
                <Input
                  id="profile-college"
                  value={draft.college}
                  onChange={(event) => setField("college", event.target.value)}
                  placeholder="VIT Vellore"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-degree">Degree</Label>
                <Input
                  id="profile-degree"
                  value={draft.degree}
                  onChange={(event) => setField("degree", event.target.value)}
                  placeholder="B.Tech Computer Science"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-graduation">Graduation year</Label>
                <Input
                  id="profile-graduation"
                  inputMode="numeric"
                  maxLength={4}
                  value={draft.graduationYear}
                  onChange={(event) =>
                    setField("graduationYear", event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="2026"
                />
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                <Target className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Career direction</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your target role guides analysis. Interests provide extra context
                  for coaching.
                </p>
              </div>
            </div>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="profile-target">
                  Target role <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="profile-target"
                  list="target-role-suggestions"
                  value={draft.targetRole}
                  onChange={(event) => setField("targetRole", event.target.value)}
                  placeholder="AI Engineer"
                />
                <datalist id="target-role-suggestions">
                  {roleSuggestions.map((role) => (
                    <option key={role} value={role} />
                  ))}
                </datalist>
                <p className="text-[11px] text-muted-foreground">
                  Type any role. Use a title that matches the jobs you actually
                  plan to apply for.
                </p>
              </div>
              {targetChanged ? (
                <Alert
                  variant="warning"
                  icon={<CircleAlert className="h-4 w-4" />}
                  title="The saved analysis targets a different role"
                >
                  Saving will update your target to “{draft.targetRole}”. Your
                  previous {analysis?.targetRole} analysis and roadmap remain saved
                  but will be flagged as stale. Rerun analysis after saving.
                </Alert>
              ) : null}
              <ListEditor
                label="Career interests"
                description="Focus areas, industries, or problems you want to work on."
                items={draft.careerInterests}
                placeholder="Applied AI"
                suggestions={["Applied AI", "Developer tools", "Fintech", "Healthcare", "Open source"]}
                onChange={(items) => setField("careerInterests", items)}
              />
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">Skills & proficiency</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Add languages, frameworks, tools, technical concepts, and soft
                    skills. Levels are self-reported starting evidence.
                  </p>
                </div>
              </div>
              <Badge variant="outline">{draft.skills.length} skills</Badge>
            </div>

            <div className="rounded-xl border border-border bg-muted/25 p-3.5">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px_100px_auto]">
                <Input
                  value={skillName}
                  onChange={(event) => setSkillName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="e.g. PyTorch, SQL, Docker"
                  aria-label="New skill name"
                />
                <Select
                  value={skillCategory}
                  onChange={(event) =>
                    setSkillCategory(event.target.value as SkillCategory)
                  }
                  aria-label="Skill category"
                >
                  {skillCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </Select>
                <Select
                  value={skillProficiency}
                  onChange={(event) =>
                    setSkillProficiency(Number(event.target.value))
                  }
                  aria-label="Skill proficiency"
                >
                  {[20, 35, 50, 65, 80, 90].map((level) => (
                    <option key={level} value={level}>
                      {proficiencyLabel(level)}
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="outline" onClick={addSkill}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            {groupedSkills.length ? (
              <div className="mt-4 space-y-4">
                {groupedSkills.map((group) => (
                  <div key={group.value}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {group.label} · {group.skills.length}
                    </p>
                    <div className="space-y-1.5">
                      {group.skills.map((skill) => (
                        <div
                          key={skill.id}
                          className="grid items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(150px,220px)_120px_auto]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{skill.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {skill.source === "resume"
                                ? "From resume"
                                : skill.source === "ai"
                                  ? "Updated by CareerPilot"
                                  : "Added manually"}
                            </p>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={skill.proficiency}
                            onChange={(event) =>
                              updateSkillDraft(skill.id, {
                                proficiency: Number(event.target.value),
                              })
                            }
                            className="h-1.5 w-full cursor-pointer accent-indigo-600"
                            aria-label={`${skill.name} proficiency`}
                          />
                          <span className="text-right text-[11px] text-muted-foreground">
                            {proficiencyLabel(skill.proficiency)} · {skill.proficiency}%
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeSkillDraft(skill.id)}
                            aria-label={`Remove ${skill.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  compact
                  icon={Sparkles}
                  title="No skills yet"
                  description="Add at least three relevant skills for useful career analysis. You can also extract them from a resume."
                  action={
                    <Button asChild size="sm" variant="outline">
                      <Link href="/resume">Parse resume</Link>
                    </Button>
                  }
                />
              </div>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                <BriefcaseBusiness className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Experience & proof</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Internships, freelance work, research, or substantive academic
                  projects. Add outcomes, not just responsibilities.
                </p>
              </div>
            </div>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="profile-experience">Experience</Label>
                <Textarea
                  id="profile-experience"
                  rows={7}
                  value={draft.experience}
                  onChange={(event) => setField("experience", event.target.value)}
                  placeholder={"Machine Learning Intern — Company (May–Jul 2025)\n• Built ...\n• Improved ..."}
                />
              </div>
              <ListEditor
                label="Certifications"
                description="Only add certifications you actually hold."
                items={draft.certifications}
                placeholder="AWS Cloud Practitioner"
                onChange={(items) => setField("certifications", items)}
              />
            </div>
          </Card>

          <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {dirty
                ? "You have unsaved changes. Save to update CareerPilot’s context."
                : "All profile changes are saved to this browser."}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!dirty}
                onClick={() => {
                  setDraft(toDraft(profile));
                  setDirty(false);
                }}
              >
                Discard
              </Button>
              <Button type="button" onClick={saveProfile} disabled={saving || !dirty}>
                <Save className="h-4 w-4" />
                Save profile
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-[88px] xl:self-start">
          <Card className="p-5">
            <p className="text-sm font-semibold">Profile strength</p>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{completeness.percent}% complete</span>
              <span>{completeness.checks.filter(Boolean).length}/6</span>
            </div>
            <Progress value={completeness.percent} className="mt-2 h-1.5" />
            <ul className="mt-4 space-y-2">
              {[
                { label: "Name added", done: completeness.checks[0] },
                { label: "Education added", done: completeness.checks[1] },
                { label: "Target role set", done: completeness.checks[2] },
                { label: "3+ skills recorded", done: completeness.checks[3] },
                { label: "Resume available", done: completeness.checks[4] },
                { label: "Experience or project evidence", done: completeness.checks[5] },
              ].map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <span
                    className={
                      item.done
                        ? "flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                        : "h-4 w-4 rounded-full border border-border"
                    }
                  >
                    {item.done ? <Check className="h-2.5 w-2.5" /> : null}
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-primary" />
              Resume intelligence
            </div>
            {profile.resume?.text ? (
              <>
                <p className="mt-3 truncate text-xs text-muted-foreground">
                  {profile.resume.fileName}
                </p>
                <Badge variant="success" className="mt-2">
                  Resume saved
                </Badge>
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <Link href="/resume">
                    Review resume
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Upload a text-based PDF to extract skills, education, projects,
                  certifications, and experience.
                </p>
                <Button asChild size="sm" className="mt-4 w-full">
                  <Link href="/resume">
                    Upload resume
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </Card>

          <Card className="p-5">
            <p className="text-sm font-semibold">Where this is used</p>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                Skill-gap analysis against user-supplied job descriptions.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                Roadmap and portfolio project personalization.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                Context for Wispr Flow voice commands.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                Interview question relevance and answer expectations.
              </li>
            </ul>
            <div className="mt-4 rounded-lg bg-muted/40 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
              CareerPilot never sends API keys to the browser and never uses your
              profile to contact employers.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { state } = useCareerPilot();
  return <ProfileEditor key={state.profile.id} />;
}
