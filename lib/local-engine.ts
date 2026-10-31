import type {
  ApplicationInsight,
  ApplicationStatus,
  InterviewCategory,
  InterviewEvaluation,
  InterviewSummary,
  JobApplication,
  JobTarget,
  PortfolioProject,
  ResumeExtraction,
  Roadmap,
  RoadmapTask,
  RoadmapWeek,
  Skill,
  SkillGap,
  SkillGapAnalysis,
  UserProfile,
  VoiceOperation,
  VoiceIntent,
} from "./types";
import {
  canonicalSkill,
  EVALUATION_KEYWORDS,
  extractSkillsFromText,
  findSkillCatalog,
  inferSkillCategory,
  QUESTIONS_BY_CATEGORY,
  roleFamily,
  skillKey,
} from "./skills";
import {
  clamp,
  createId,
  dedupeStrings,
  normalizeSkill,
  parseDate,
  todayInputValue,
} from "./utils";
import type { VoiceAgentResult as VoiceResult } from "./types";

function articleFor(value: string) {
  return /^[aeiou]/i.test(value.trim()) ? "an" : "a";
}

function applyRoleToQuestion(question: string, role: string) {
  const article = articleFor(role);
  return question
    .replace(/\ba \{role\}/g, `${article} ${role}`)
    .replace(/\ban \{role\}/g, `${article} ${role}`)
    .replace(/\{role\}/g, role);
}

const SECTION_PATTERNS: { key: string; pattern: RegExp }[] = [
  { key: "education", pattern: /^(education|academic background|academics)\b/i },
  { key: "skills", pattern: /^(skills|technical skills|core skills|technologies)\b/i },
  {
    key: "experience",
    pattern: /^(experience|work experience|professional experience|employment)\b/i,
  },
  { key: "projects", pattern: /^(projects|personal projects|selected projects)\b/i },
  {
    key: "certifications",
    pattern: /^(certifications?|licenses?|courses?)\b/i,
  },
  {
    key: "additional",
    pattern:
      /^(leadership|activities|awards|honors|honours|achievements|volunteer|publications|interests)\b/i,
  },
  {
    key: "preferred",
    pattern: /^(preferred|nice to have|bonus|good to have)\b/i,
  },
  {
    key: "responsibilities",
    pattern: /^(responsibilities|what you.?ll do|the role|role)\b/i,
  },
  {
    key: "qualifications",
    pattern: /^(requirements|qualifications|what we.?re looking for|who you are)\b/i,
  },
];

function cleanLine(line: string) {
  return line
    .replace(/^[\s•●▪◦*\-–—\u2022]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSections(text: string) {
  const sections: Record<string, string[]> = { general: [] };
  let current = "general";
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      sections[current]?.push("");
      continue;
    }
    const heading = SECTION_PATTERNS.find(
      (entry) => entry.pattern.test(line) && line.length < 70,
    );
    if (heading) {
      current = heading.key;
      sections[current] = sections[current] ?? [];
      continue;
    }
    sections[current] = sections[current] ?? [];
    sections[current].push(line);
  }
  return sections;
}

function sectionLines(sections: Record<string, string[]>, key: string) {
  return (sections[key] ?? []).map(cleanLine).filter(Boolean);
}

function sectionBlockLines(sections: Record<string, string[]>, key: string) {
  return (sections[key] ?? []).map((line) => (line.trim() ? cleanLine(line) : ""));
}

function sectionBlocks(lines: string[]) {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (current.length) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);
  return blocks;
}

function extractExplicitSkillItems(lines: string[]) {
  const labels = new Set([
    "languages",
    "frameworks",
    "libraries",
    "tools",
    "programming languages",
    "frameworks and libraries",
    "technical skills",
    "skills",
  ]);
  const items = new Set<string>();
  for (const line of lines) {
    const withoutLabel = cleanLine(line).replace(/^[^:]{2,40}:\s*/, "");
    for (const chunk of withoutLabel.split(/[,;|•]/)) {
      const item = chunk.trim().replace(/\.$/, "");
      if (!item || item.length < 2 || item.length > 36) continue;
      if (labels.has(item.toLowerCase())) continue;
      if (item.split(/\s+/).length > 4) continue;
      items.add(item);
    }
  }
  return Array.from(items);
}

export function localResumeAnalysis(resumeText: string): ResumeExtraction {
  const sections = splitSections(resumeText);
  const foundSkills = extractSkillsFromText(resumeText);
  const explicitSkills = extractExplicitSkillItems(sectionLines(sections, "skills"));
  const allSkillNames = dedupeStrings([
    ...foundSkills.map((skill) => skill.name),
    ...explicitSkills,
  ]);
  const programmingLanguages = allSkillNames.filter(
    (name) => inferSkillCategory(name) === "language",
  );
  const frameworks = allSkillNames.filter(
    (name) => inferSkillCategory(name) === "framework",
  );
  const tools = allSkillNames.filter((name) => inferSkillCategory(name) === "tool");
  const technicalSkills = allSkillNames.filter((name) => {
    const category = inferSkillCategory(name);
    return category === "technical" || category === "soft";
  });

  const education = sectionLines(sections, "education")
    .filter((line) => line.split(/\s+/).length > 2)
    .slice(0, 4);
  const experience = sectionBlocks(
    sectionBlockLines(sections, "experience").filter(
      (line) => line !== "experience" && line !== "work experience",
    ),
  )
    .slice(0, 5)
    .map((block) => block.join(" ").slice(0, 500));

  const projectBlocks = sectionBlocks(sectionBlockLines(sections, "projects"));
  const projects = projectBlocks.slice(0, 5).map((block, index) => {
    const title = block[0] ?? `Project ${index + 1}`;
    const description = block.slice(1).join(" ") || title;
    const technologies = extractSkillsFromText(block.join(" ")).map(
      (skill) => skill.name,
    );
    return {
      title: title.slice(0, 100),
      description: description.slice(0, 600),
      technologies,
    };
  });

  const certifications = sectionLines(sections, "certifications")
    .filter((line) => line.length > 4)
    .slice(0, 8);
  const potentialGaps: string[] = [];
  if (!projects.length) {
    potentialGaps.push(
      "No project section was detected. Add 2–3 projects with the problem, approach, and outcome.",
    );
  }
  if (!/\d/.test(resumeText)) {
    potentialGaps.push(
      "The resume text contains no measurable outcomes. Add metrics or concrete impact where accurate.",
    );
  }
  if (!experience.length) {
    potentialGaps.push(
      "No experience section was detected. Add internships, freelance work, or substantive academic work.",
    );
  }
  if (resumeText.length < 700) {
    potentialGaps.push(
      "The resume is quite short. Expand project detail and evidence without adding unsupported claims.",
    );
  }

  return {
    summary: `Local resume scan identified ${allSkillNames.length} skill terms across ${
      education.length ? "education, " : ""
    }${experience.length ? "experience, " : ""}${projects.length ? "projects, " : ""}${
      certifications.length ? "certifications" : "and supporting detail"
    }. Local parsing is heuristic; review every extracted field before applying it.`,
    education,
    technicalSkills,
    programmingLanguages,
    frameworks,
    tools,
    projects,
    certifications,
    experience,
    potentialGaps,
  };
}

export function localJobDescriptionAnalysis(
  description: string,
  companyHint?: string,
): Omit<JobTarget, "id" | "createdAt" | "source"> & { extractionNote: string } {
  const sections = splitSections(description);
  const allSkills = extractSkillsFromText(description).filter(
    (skill) => skill.category !== "soft",
  );
  const preferredSectionText = [
    ...sectionLines(sections, "preferred"),
    ...sectionLines(sections, "general")
      .filter((line) => /preferred|nice to have|bonus|good to have/i.test(line))
      .slice(0, 2),
  ].join(" ");
  const preferredFound = new Set(
    extractSkillsFromText(preferredSectionText).map((skill) => skill.name),
  );
  const requiredSkills = allSkills
    .filter((skill) => !preferredFound.has(skill.name))
    .map((skill) => skill.name);
  const preferredSkills = allSkills
    .filter((skill) => preferredFound.has(skill.name))
    .map((skill) => skill.name);

  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let title = "";
  let company = companyHint?.trim() ?? "";
  const titleMatch = description.match(
    /(?:job title|position|role)\s*[:\-–—]\s*([^\n]{2,80})/i,
  );
  if (titleMatch) title = cleanLine(titleMatch[1]);
  const firstLine = lines[0] ?? "";
  if (!title && firstLine.length <= 100) {
    const parts = firstLine.split(/\s+[—–|-]\s+/);
    title = parts[0].trim();
    if (!company && parts[1]) company = parts.slice(1).join(" ").trim();
  }
  if (!title) {
    const roleMatch = description.match(
      /\b(ai engineer|machine learning engineer|software engineer|frontend developer|front-end developer|backend developer|full stack developer|data scientist|data analyst|data engineer|devops engineer|product manager|product designer)\b/i,
    );
    title = roleMatch?.[0] ?? "";
  }
  if (!title) {
    title = firstLine.slice(0, 80) || "Role from supplied job description";
  }
  if (!company) {
    const companyMatch = description.match(
      /(?:company|employer)\s*[:\-]\s*([A-Za-z0-9&.\- ]{2,50})/i,
    );
    if (companyMatch) company = companyMatch[1].trim();
  }
  if (!company) {
    const atMatch = description.slice(0, 500).match(
      /\bat\s+([A-Z][A-Za-z0-9&.\- ]{1,40})(?:\s*[.,\n]|\s+is\b|\s+we\b)/,
    );
    if (atMatch) company = atMatch[1].trim();
  }

  const experienceMatch = description.match(
    /(\d+\s*(?:-|–|to)?\s*\d*\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+[a-z ]{0,30})?)|(?:entry[- ]level|new grad|graduate|internship)/i,
  );
  const responsibilities = sectionLines(sections, "responsibilities")
    .filter((line) => line.split(/\s+/).length > 2)
    .slice(0, 8);
  const qualifications = sectionLines(sections, "qualifications")
    .filter((line) => line.split(/\s+/).length > 2)
    .slice(0, 8);
  const generalBullets = lines
    .map(cleanLine)
    .filter((line) => line.split(/\s+/).length > 3)
    .slice(0, 6);
  const toolsAndTechnologies = allSkills
    .filter((skill) => ["language", "framework", "tool"].includes(skill.category))
    .map((skill) => skill.name);

  return {
    title: title.replace(/[.,;:]$/, ""),
    company,
    description,
    requiredSkills: dedupeStrings(requiredSkills),
    preferredSkills: dedupeStrings(preferredSkills),
    experienceRequirement:
      experienceMatch?.[0]?.trim() ??
      "Experience requirement was not explicitly extracted. Review the original description.",
    responsibilities: responsibilities.length ? responsibilities : generalBullets.slice(0, 5),
    qualifications: qualifications.length ? qualifications : generalBullets,
    toolsAndTechnologies: dedupeStrings(toolsAndTechnologies),
    extractionNote:
      "Extracted locally from the job description you supplied. No live listing was fetched. Review the extracted requirements before analysis.",
  };
}

function learningActionFor(skill: string, category: string) {
  if (category === "language") {
    return `Complete a focused ${skill} module, then solve 3 small problems without copying a solution.`;
  }
  if (category === "framework") {
    return `Build one small feature with ${skill} and write down the core API, data flow, and failure modes.`;
  }
  if (category === "tool") {
    return `Set up ${skill} in a throwaway project and document the exact commands and configuration you used.`;
  }
  return `Study one applied ${skill} example, explain it in your own words, and apply it to a small project task.`;
}

export function localSkillGapAnalysis(
  profile: UserProfile,
  jobTarget: JobTarget,
): SkillGapAnalysis {
  const profileByKey = new Map(
    profile.skills.map((skill) => [skillKey(skill.name), skill]),
  );
  const requiredKeys = new Set(jobTarget.requiredSkills.map(skillKey));
  const skillsToAssess = dedupeStrings([
    ...jobTarget.requiredSkills,
    ...jobTarget.preferredSkills,
  ]);
  const gaps: SkillGap[] = skillsToAssess.map((rawSkill) => {
    const skillName = canonicalSkill(rawSkill);
    const catalog = findSkillCatalog(skillName);
    const key = skillKey(skillName);
    const profileSkill = profileByKey.get(key);
    const isPreferred = !requiredKeys.has(key);
    const requiredLevel = isPreferred ? 60 : catalog?.category === "soft" ? 70 : 75;
    const currentLevel = profileSkill ? Math.round(profileSkill.proficiency) : 0;
    const gapScore = clamp(requiredLevel - currentLevel);
    let classification: SkillGap["classification"];
    if (!profileSkill) classification = "missing";
    else if (gapScore <= 5) classification = "strong";
    else if (gapScore <= 25) classification = "partial";
    else classification = "needs-improvement";
    const priority: SkillGap["priority"] =
      !profileSkill && !isPreferred
        ? "high"
        : gapScore >= 30 && !isPreferred
          ? "high"
          : gapScore >= 18 || (!isPreferred && gapScore >= 10)
            ? "medium"
            : "low";
    const reason = !profileSkill
      ? `The user-supplied job description lists ${skillName}${
          isPreferred ? " as a preferred skill" : ""
        }, but it does not appear in the profile you recorded.`
      : classification === "strong"
        ? `Your recorded ${skillName} proficiency (${currentLevel}%) is close to the estimated level this job description calls for (${requiredLevel}%).`
        : `Your recorded ${skillName} proficiency is ${currentLevel}%, while this job description calls for roughly ${requiredLevel}% for the work described.`;
    return {
      skill: skillName,
      currentLevel,
      requiredLevel,
      gapScore,
      classification,
      priority,
      reason,
      learningAction: learningActionFor(
        skillName,
        catalog?.category ?? "technical",
      ),
    };
  });

  const sorted = gaps.sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    return (
      priorityWeight[b.priority] - priorityWeight[a.priority] ||
      b.gapScore - a.gapScore
    );
  });
  const readinessScore = gaps.length
    ? Math.round(
        gaps.reduce(
          (total, gap) =>
            total + Math.min(1, gap.currentLevel / Math.max(1, gap.requiredLevel)),
          0,
        ) /
          gaps.length *
          100,
      )
    : 0;
  const missing = gaps.filter((gap) => gap.classification === "missing").length;
  const matched = gaps.filter(
    (gap) =>
      gap.classification === "strong" || gap.classification === "partial",
  ).length;

  return {
    id: createId("analysis"),
    targetRole: jobTarget.title,
    company: jobTarget.company,
    basis: "job-description",
    sourceNote:
      "Compared only against the job description you supplied and the skills recorded in this browser profile. No live job listings were fetched.",
    gaps: sorted,
    summary: `Local analysis assessed ${gaps.length} skills from this job description. ${matched} are matched or partially matched, ${missing} are not listed in your profile, and ${gaps.filter((gap) => gap.classification === "needs-improvement").length} need improvement. Review the extracted requirements and your self-reported proficiency before relying on these estimates.`,
    readinessScore,
    matchedCount: matched,
    missingCount: missing,
    createdAt: new Date().toISOString(),
    engine: "local",
    disclaimer:
      "Proficiency estimates are generated from the information you supplied, not verified certifications or live employer data.",
  };
}

function difficultyFor(level: number) {
  if (level < 25) return "Beginner" as const;
  if (level < 60) return "Intermediate" as const;
  return "Advanced" as const;
}

export function localRoadmap(
  profile: UserProfile,
  jobTarget: JobTarget,
  analysis: SkillGapAnalysis,
): Omit<Roadmap, "id" | "createdAt" | "updatedAt"> {
  const priorityGaps = analysis.gaps
    .filter((gap) => gap.classification !== "strong")
    .sort((a, b) => b.gapScore - a.gapScore)
    .slice(0, 6);
  const fallbackGaps = analysis.gaps.slice(0, 4);
  const focus = priorityGaps.length ? priorityGaps : fallbackGaps;
  const weeks: RoadmapWeek[] = [];
  const objectives = [
    "Close the highest-priority foundation gaps with deliberate practice.",
    "Move from isolated concepts to applied implementation.",
    "Integrate your new skills into one portfolio-sized deliverable.",
    "Harden the deliverable and convert it into interview evidence.",
  ];
  const themes = ["Foundations", "Applied practice", "Portfolio integration", "Evidence and polish"];
  const totalWeeks = 4;

  for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber += 1) {
    const weekGaps = focus.filter(
      (_, index) => index % totalWeeks === (weekNumber - 1) % totalWeeks,
    );
    const selected = weekGaps.length ? weekGaps : focus.slice(0, 2);
    const tasks: RoadmapTask[] = [];
    selected.forEach((gap) => {
      const primary = weekNumber <= 2;
      const estimatedHours = primary ? 4 : 5;
      const title = primary
        ? `Build ${articleFor(gap.skill)} ${gap.skill} learning sprint`
        : `Apply ${gap.skill} in a portfolio deliverable`;
      const description = primary
        ? `${gap.learningAction} Finish with a short note that explains the concept in your own words and one open question. This targets a recorded gap of ${gap.gapScore} points for ${jobTarget.title}.`
        : `${gap.learningAction} Add the result to a project that demonstrates ${gap.skill} in the context of ${jobTarget.title}. Track what worked, what failed, and the trade-off you made.`;
      tasks.push({
        id: createId("task"),
        title,
        description,
        skill: gap.skill,
        estimatedHours,
        difficulty: difficultyFor(gap.currentLevel),
        resourceSuggestions: [
          `Search: "${gap.skill} official documentation"`,
          `Search: "${gap.skill} ${jobTarget.title.toLowerCase()} project tutorial"`,
          `Search: "${gap.skill} interview questions ${analysis.targetRole.toLowerCase()}"`,
        ],
        completionCriteria:
          weekNumber <= 2
            ? `You can explain ${gap.skill} without notes and complete one small exercise that uses it correctly.`
            : `A working artifact, a short README, and a 2-minute explanation show how ${gap.skill} was applied.`,
        completed: false,
        week: weekNumber,
        origin: "ai",
        createdAt: new Date().toISOString(),
      });
    });
    if (weekNumber >= 3) {
      const top = selected[0]?.skill ?? focus[0]?.skill ?? jobTarget.title;
      tasks.push({
        id: createId("task"),
        title:
          weekNumber === 3
            ? `Assemble your ${top} portfolio evidence`
            : "Prepare interview evidence for this roadmap",
        description:
          weekNumber === 3
            ? `Connect your completed work into one coherent project for ${articleFor(jobTarget.title)} ${jobTarget.title} application. Write the problem, approach, evaluation, and limitations.`
            : `Revisit completed tasks, write three STAR-style stories, and rehearse explaining your ${top} decisions and trade-offs.`,
        skill: top,
        estimatedHours: weekNumber === 3 ? 6 : 3,
        difficulty: weekNumber === 3 ? "Advanced" : "Intermediate",
        resourceSuggestions: [
          `Search: "${jobTarget.title} portfolio project README examples"`,
          `Search: "${jobTarget.title} behavioral interview STAR examples"`,
        ],
        completionCriteria:
          weekNumber === 3
            ? "A reviewer can understand the problem, your contribution, and the outcome from the repository and README."
            : "You can answer three interview questions with specific evidence and measurable outcomes.",
        completed: false,
        week: weekNumber,
        origin: "ai",
        createdAt: new Date().toISOString(),
      });
    }
    weeks.push({
      week: weekNumber,
      objective: `${themes[weekNumber - 1]}: ${objectives[weekNumber - 1]}`,
      topics: dedupeStrings(
        selected.map((gap) => gap.skill).concat(weekNumber >= 3 ? ["Portfolio storytelling"] : []),
      ),
      tasks,
    });
  }

  return {
    targetRole: jobTarget.title,
    weeks,
    engine: "local",
  };
}

type ProjectBlueprint = {
  title: string;
  problem: string;
  description: string;
  features: string[];
  deliverables: string[];
  stackBase: string[];
  skills: string[];
  difficulty: "Intermediate" | "Advanced";
  weeks: number;
  employability: string;
};

function projectBlueprints(
  target: string,
  gaps: SkillGap[],
  strong: Skill[],
): ProjectBlueprint[] {
  const missing = gaps
    .filter((gap) => gap.classification !== "strong")
    .sort((a, b) => b.gapScore - a.gapScore)
    .map((gap) => gap.skill);
  const strongNames = strong.map((skill) => skill.name);
  const skillText = missing.slice(0, 4);
  const web = strongNames.find((name) =>
    ["React", "Next.js", "Vue.js", "Angular"].includes(name),
  );
  const backend = strongNames.find((name) =>
    ["FastAPI", "Flask", "Django", "Node.js", "Express.js"].includes(name),
  );
  const copilotSkills = dedupeStrings([
    ...skillText.slice(0, 3),
    ...["RAG", "LLMs", "Vector Databases", "Prompt Engineering"].filter((skill) =>
      missing.includes(skill),
    ),
  ]).slice(0, 5);
  const analyticsSkills = dedupeStrings([
    ...["Data Analysis", "SQL", "Data Visualization", "Pandas"].filter((skill) =>
      missing.includes(skill),
    ),
    ...strongNames.filter((name) =>
      ["Data Analysis", "SQL", "Pandas", "PostgreSQL", "Machine Learning"].includes(name),
    ),
  ]).slice(0, 4);
  const productionSkills = dedupeStrings([
    ...["Testing", "Docker", "CI/CD", "MLOps", "REST APIs", "AWS", "Kubernetes"].filter(
      (skill) => missing.includes(skill),
    ),
    ...skillText.slice(2, 5),
  ]).slice(0, 4);
  const article = articleFor(target);
  const productionFocus =
    productionSkills.slice(0, 3).join(", ") || "testing and deployment";
  const copilotStack = dedupeStrings([
    "Python",
    backend ?? "FastAPI",
    ...(missing.includes("Vector Databases") ? ["Chroma"] : []),
    ...(missing.includes("LangChain") ? ["LangChain"] : []),
    ...(missing.includes("LlamaIndex") ? ["LlamaIndex"] : []),
    ...(web ? [web] : []),
  ]);
  return [
    {
      title: "Grounded Knowledge Copilot",
      problem:
        "Teams need fast answers from internal documents without losing the source trail or confidently inventing facts.",
      description: `Build a retrieval-augmented assistant that answers questions over a small, user-provided document set with citations and an evaluation view. This project creates concrete evidence for ${skillText
        .slice(0, 3)
        .join(", ")} in ${article} ${target} context.`,
      features: [
        "Document ingestion with visible chunking and metadata",
        "Retrieval with citations on every generated answer",
        "A small evaluation set with groundedness and failure-case tracking",
        "Minimal chat interface and transparent error states",
      ],
      deliverables: [
        "Working local or deployed demo",
        "README with architecture, evaluation method, and limitations",
        "Sample evaluation results and one failure analysis",
      ],
      stackBase: copilotStack,
      skills: copilotSkills.length ? copilotSkills : [target],
      difficulty: "Advanced",
      weeks: 5,
      employability: `Demonstrates applied ${target} skills that appear in the supplied job description, including evidence of evaluation rather than a demo-only prototype.`,
    },
    {
      title: "Career Signal Analytics",
      problem:
        "Students collect job descriptions and applications but rarely see which skills and application stages deserve attention.",
      description: `Create an analytics app that turns a CSV of user-provided opportunities into skill-frequency, status-funnel, and preparation-priority views. It applies ${
        analyticsSkills.slice(0, 2).join(" and ") || "data analysis"
      } in a realistic workflow while reusing skills you already have.`,
      features: [
        "CSV import with validation and a clear data dictionary",
        "Skill demand and application funnel charts",
        "Priority scoring with visible methodology",
        "A shareable summary view with empty and error states",
      ],
      deliverables: [
        "Working dashboard with sample and imported data",
        "Documented metric definitions",
        "Three findings written from the actual imported dataset",
      ],
      stackBase: dedupeStrings([
        "Python",
        "Pandas",
        ...(strongNames.includes("SQL") ? ["SQL"] : []),
        ...(web ? [web] : []),
        ...(backend ? [backend] : []),
        ...(strongNames.includes("PostgreSQL") ? ["PostgreSQL"] : []),
      ]),
      skills: analyticsSkills.length
        ? analyticsSkills
        : ["Data Analysis", "SQL", "Communication"],
      difficulty: "Intermediate",
      weeks: 3,
      employability:
        "Shows data storytelling, validation, and product thinking with metrics that a hiring manager can inspect rather than take on trust.",
    },
    {
      title: "Production Readiness Lab",
      problem:
        "A working prototype is not enough; teams need repeatable tests, deployment, and observability before they trust a service.",
      description: `Take a small API or model service and make it production-ready with tests, containerization, CI checks, and basic monitoring. Focus on ${productionFocus} to close gaps that block ${article} ${target} offer.`,
      features: [
        "Containerized service with configuration via environment variables",
        "Automated tests and a CI workflow",
        "Health checks, structured logs, and a documented failure scenario",
        "Deployment notes with a rollback procedure",
      ],
      deliverables: [
        "Deployable repository with CI passing",
        "Incident-style postmortem for one simulated failure",
        "Architecture and operations README",
      ],
      stackBase: dedupeStrings([
        "Python",
        backend ?? "FastAPI",
        "Docker",
        "GitHub Actions",
        ...(missing.includes("AWS") ? ["AWS"] : []),
        ...(missing.includes("Kubernetes") ? ["Kubernetes"] : []),
      ]),
      skills: productionSkills.length
        ? productionSkills
        : ["Testing", "Docker", "CI/CD"],
      difficulty: "Intermediate",
      weeks: 3,
      employability:
        "Provides evidence of shipping discipline, testing, and deployment—signals that frequently separate a portfolio project from a production-ready engineer.",
    },
  ];
}

export function localProjects(
  profile: UserProfile,
  jobTarget: JobTarget,
  analysis: SkillGapAnalysis,
): PortfolioProject[] {
  const strong = profile.skills
    .filter((skill) => skill.proficiency >= 60)
    .sort((a, b) => b.proficiency - a.proficiency);
  const blueprints = projectBlueprints(jobTarget.title, analysis.gaps, strong);
  return blueprints.map((blueprint) => ({
    id: createId("project"),
    title: blueprint.title,
    problemStatement: blueprint.problem,
    description: blueprint.description,
    skills: dedupeStrings(blueprint.skills),
    techStack: blueprint.stackBase.filter(Boolean),
    difficulty: blueprint.difficulty,
    durationWeeks: blueprint.weeks,
    features: blueprint.features,
    deliverables: blueprint.deliverables,
    employability: blueprint.employability,
    status: "recommended",
    createdAt: new Date().toISOString(),
    engine: "local",
  }));
}

function shuffle<T>(values: T[]) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function localInterviewQuestions(
  role: string,
  category: InterviewCategory,
  difficulty: "Easy" | "Medium" | "Hard",
  count: number,
  analysis: SkillGapAnalysis | null,
): string[] {
  const bank = QUESTIONS_BY_CATEGORY[category] ?? QUESTIONS_BY_CATEGORY.Technical;
  const tailored =
    category === "Technical" && analysis
      ? analysis.gaps
          .filter((gap) => gap.classification !== "strong")
          .slice(0, 3)
          .map(
            (gap) =>
              `For ${articleFor(role)} ${role} role, how would you use ${gap.skill} in a real project, and how would you verify that your approach works?`,
          )
      : [];
  const merged = dedupeStrings([...tailored, ...shuffle(bank)]);
  const levelPrefix =
    difficulty === "Easy"
      ? "Start with fundamentals: "
      : difficulty === "Hard"
        ? "Consider production constraints and trade-offs: "
        : "";
  return merged
    .slice(0, count)
    .map((question) => `${levelPrefix}${applyRoleToQuestion(question, role)}`);
}

export function localInterviewEvaluation(
  question: string,
  answer: string,
  category: InterviewCategory,
): InterviewEvaluation {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = answer.toLowerCase();
  const keywords = EVALUATION_KEYWORDS[category] ?? EVALUATION_KEYWORDS.Technical;
  const hit = keywords.filter((keyword) => lower.includes(keyword));
  const coverage = Math.min(1, hit.length / Math.min(6, keywords.length));
  const hasExample = /for example|in my project|i built|i worked|for instance/i.test(
    answer,
  );
  const hasStructure = /first|second|then|finally|because|trade-off|however|measure/i.test(
    answer,
  );
  const hasNumbers = /\d|%|percent|metric/i.test(answer);
  const isRunOn = wordCount > 320 && hasStructure === false;
  const specificity = Math.min(
    1,
    (hasExample ? 0.45 : 0) + (hasNumbers ? 0.3 : 0) + (hasStructure ? 0.25 : 0),
  );
  const lengthPenalty = isRunOn ? 12 : 0;
  const tooShort = wordCount < 20;
  const technicalCorrectness = clamp(
    Math.round(12 + coverage * 64 + specificity * 20 - lengthPenalty - (tooShort ? 25 : 0)),
  );
  const conceptualUnderstanding = clamp(
    Math.round(
      10 +
        coverage * 62 +
        (hasStructure ? 15 : 0) +
        (hasExample ? 10 : 0) -
        lengthPenalty,
    ),
  );
  const problemSolving = clamp(
    Math.round(
      12 +
        (hasStructure ? 38 : 0) +
        (hasExample ? 22 : 0) +
        (hasNumbers ? 14 : 0) +
        coverage * 18 -
        lengthPenalty,
    ),
  );
  const communication = clamp(
    Math.round(
      25 +
        (wordCount >= 45 && wordCount <= 240 ? 35 : 12) +
        (hasStructure ? 25 : 5) +
        (isRunOn ? 0 : 15) -
        (tooShort ? 20 : 0),
    ),
  );
  const overallScore = Math.round(
    technicalCorrectness * 0.4 +
      conceptualUnderstanding * 0.25 +
      problemSolving * 0.2 +
      communication * 0.15,
  );
  const strengths: string[] = [];
  if (hit.length)
    strengths.push(`Referenced relevant concepts: ${hit.slice(0, 4).join(", ")}.`);
  if (hasStructure) strengths.push("Used a clear, ordered explanation.");
  if (hasExample) strengths.push("Grounded the answer in a concrete example.");
  if (communication >= 70) strengths.push("Kept the answer focused and readable.");
  if (!strengths.length)
    strengths.push("Provided a starting answer that can be developed with more evidence.");
  const missingConcepts = keywords
    .filter((keyword) => !hit.includes(keyword))
    .slice(0, 4)
    .map((keyword) => `Consider addressing ${keyword} explicitly.`);
  if (!missingConcepts.length)
    missingConcepts.push("No major category-level concept gaps were detected in this answer.");
  const incorrectAssumptions: string[] = [];
  if (/\balways\b|\bnever\b|\bguarantee\b/i.test(answer)) {
    incorrectAssumptions.push(
      "The answer uses absolute language. Technical claims usually need trade-offs and conditions.",
    );
  }
  if (/no need to test|testing is optional|skip testing/i.test(answer)) {
    incorrectAssumptions.push(
      "The answer implies testing is optional, which is unsafe for production systems.",
    );
  }
  if (/bigger model is always|more data always fixes/i.test(answer)) {
    incorrectAssumptions.push(
      "The answer treats model size or more data as a universal fix instead of evaluating the actual failure mode.",
    );
  }
  const suggestions = [
    tooShort ? "Expand the answer with a concrete example and the result." : "State the trade-off, not only the chosen approach.",
    missingConcepts.length
      ? "Add one missing concept and explain how it changes your decision."
      : "Quantify the impact or evaluation method where possible.",
    "Finish with how you would verify the outcome and one limitation.",
  ];
  const strongerAnswer = `A stronger answer would open with a direct definition, connect it to a specific ${category.toLowerCase()} decision, walk through the trade-off, and finish with how it was measured. Include the concepts ${keywords
    .slice(0, 4)
    .join(", ")} where relevant, and avoid unsupported absolute claims. (Local coach: this is rubric guidance, not a model-generated exemplar.)`;

  return {
    overallScore,
    rubric: {
      technicalCorrectness,
      conceptualUnderstanding,
      problemSolving,
      communication,
    },
    strengths,
    missingConcepts,
    incorrectAssumptions,
    suggestions,
    strongerAnswer,
    wordCount,
  };
}

export function localInterviewSummary(
  evaluations: InterviewEvaluation[],
  role: string,
): InterviewSummary {
  const average = evaluations.reduce((total, evaluation) => {
    return {
      overall: total.overall + evaluation.overallScore,
      technical:
        total.technical + evaluation.rubric.technicalCorrectness,
      conceptual:
        total.conceptual + evaluation.rubric.conceptualUnderstanding,
      problem:
        total.problem + evaluation.rubric.problemSolving,
      communication:
        total.communication + evaluation.rubric.communication,
    };
  }, {
    overall: 0,
    technical: 0,
    conceptual: 0,
    problem: 0,
    communication: 0,
  });
  const size = Math.max(1, evaluations.length);
  const overall = Math.round(average.overall / size);
  const strengths = dedupeStrings(
    evaluations.flatMap((evaluation) => evaluation.strengths),
  ).slice(0, 4);
  const improvements = dedupeStrings(
    evaluations.flatMap((evaluation) => evaluation.suggestions),
  ).slice(0, 4);
  const verdict =
    overall >= 80
      ? `Strong ${role} interview signal in this recorded session. Keep validating depth with harder follow-ups.`
      : overall >= 60
        ? `Promising ${role} interview signal. The next step is adding depth and concrete evidence.`
        : `This recorded ${role} session exposed clear coaching priorities. Revisit the missing concepts and retry.`;
  return {
    overallScore: overall,
    rubric: {
      technicalCorrectness: Math.round(average.technical / size),
      conceptualUnderstanding: Math.round(average.conceptual / size),
      problemSolving: Math.round(average.problem / size),
      communication: Math.round(average.communication / size),
    },
    strengths,
    improvements,
    verdict,
  };
}

function sourceResponseRate(applications: JobApplication[]) {
  const applied = applications.filter((app) => app.status !== "Interested");
  const responded = applied.filter((app) =>
    ["Assessment", "Interview", "Rejected", "Offer"].includes(app.status),
  );
  return {
    total: applied.length,
    responses: responded.length,
    rate: applied.length ? Math.round((responded.length / applied.length) * 100) : 0,
  };
}

export function localApplicationInsights(
  applications: JobApplication[],
): { insights: ApplicationInsight[]; enoughData: boolean } {
  if (applications.length < 3) {
    return { insights: [], enoughData: false };
  }
  const applied = applications.filter((app) => app.status !== "Interested");
  const insights: ApplicationInsight[] = [];
  const responses = applied.filter((app) =>
    ["Assessment", "Interview", "Rejected", "Offer"].includes(app.status),
  ).length;
  const interviews = applications.filter(
    (app) =>
      ["Interview", "Offer"].includes(app.status) || app.interviewDates.length > 0,
  ).length;
  const offers = applications.filter((app) => app.status === "Offer").length;

  if (applied.length) {
    insights.push({
      id: createId("insight"),
      text: `${responses} of ${applied.length} submitted applications have a recorded response. That is a recorded response rate of ${Math.round((responses / applied.length) * 100)}%.`,
      evidence: `Based on ${applied.length} applications with a status beyond Interested.`,
      tone: "neutral",
    });
  }
  if (interviews > 0) {
    insights.push({
      id: createId("insight"),
      text: `${interviews} application${interviews === 1 ? " has" : "s have"} reached an interview stage or recorded an interview date.`,
      evidence: `Derived from the ${applications.length} applications you recorded.`,
      tone: "positive",
    });
  }
  if (offers > 0) {
    insights.push({
      id: createId("insight"),
      text: `${offers} offer${offers === 1 ? " is" : "s are"} recorded. Keep documenting which sources and role families produced them.`,
      evidence: "Offer statuses recorded in this workspace.",
      tone: "positive",
    });
  }

  const groupedByFamily = new Map<string, JobApplication[]>();
  for (const application of applications) {
    const family = roleFamily(application.title);
    groupedByFamily.set(family, [...(groupedByFamily.get(family) ?? []), application]);
  }
  const families = Array.from(groupedByFamily.entries()).filter(
    ([, apps]) => apps.filter((app) => app.status !== "Interested").length >= 2,
  );
  if (families.length >= 2) {
    const ranked = families
      .map(([family, apps]) => ({
        family,
        ...sourceResponseRate(apps),
      }))
      .sort((a, b) => b.rate - a.rate);
    if (ranked[0].rate - ranked[1].rate >= 15) {
      insights.push({
        id: createId("insight"),
        text: `Your recorded ${ranked[0].family} applications show a higher response rate (${ranked[0].rate}%) than your recorded ${ranked[1].family} applications (${ranked[1].rate}%).`,
        evidence: `Comparison includes ${ranked[0].total} ${ranked[0].family} and ${ranked[1].total} ${ranked[1].family} submitted applications.`,
        tone: "positive",
      });
    }
  }

  const groupedBySource = new Map<string, JobApplication[]>();
  for (const application of applications) {
    const source = application.source.trim() || "Unspecified source";
    groupedBySource.set(source, [...(groupedBySource.get(source) ?? []), application]);
  }
  const sources = Array.from(groupedBySource.entries()).filter(
    ([, apps]) => apps.filter((app) => app.status !== "Interested").length >= 2,
  );
  if (sources.length >= 2) {
    const ranked = sources
      .map(([source, apps]) => ({ source, ...sourceResponseRate(apps) }))
      .sort((a, b) => b.rate - a.rate);
    if (ranked[0].rate - ranked[1].rate >= 20) {
      insights.push({
        id: createId("insight"),
        text: `Applications recorded through ${ranked[0].source} have a ${ranked[0].rate}% recorded response rate versus ${ranked[1].rate}% through ${ranked[1].source}.`,
        evidence: `Each compared source has at least 2 submitted applications. This is a small recorded sample, not a market benchmark.`,
        tone: "neutral",
      });
    }
  }

  if (!applied.length) {
    insights.push({
      id: createId("insight"),
      text: "You have saved applications, but none have been submitted yet. Add a status of Applied or later once you submit.",
      evidence: "Generated only from your recorded application statuses.",
      tone: "attention",
    });
  }

  return { insights: insights.slice(0, 5), enoughData: true };
}

function parseRelativeDate(command: string, today: string) {
  const base = parseDate(today);
  if (!base || Number.isNaN(base.getTime())) return today;
  if (/\byesterday\b/i.test(command)) {
    base.setDate(base.getDate() - 1);
    return todayInputValue(base);
  }
  if (/\b(today|just now|this morning)\b/i.test(command)) return today;
  return today;
}

function extractLocationOrInterest(command: string) {
  const focus = command.match(
    /(?:focus on|learn more about|interested in|switch to)\s+([a-z0-9+#.& /-]{2,50})/i,
  );
  return focus?.[1]
    ?.replace(/\b(please|now|next|this week)\b/gi, "")
    .replace(/[.,!?;:]+$/, "")
    .trim();
}

function extractKnownSkillText(command: string) {
  const patterns = [
    /(?:actually,?\s*)?(?:i\s+)?already\s+know(?:s)?\s+([^.;]+)/i,
    /(?:actually,?\s*)?i\s+know\s+([^.;]+)/i,
    /(?:actually,?\s*)?i\s+do\s+know\s+([^.;]+)/i,
    /(?:i have used|i've used|i worked with|i've worked with)\s+([^.;]+)/i,
    /(?:i learned|i've learned|i studied)\s+([^.;]+)/i,
  ];
  return patterns
    .map((pattern) => command.match(pattern)?.[1]?.trim())
    .filter(Boolean)
    .join(", ");
}

function extractRoleTarget(command: string) {
  const patterns = [
    /(?:want to become|become an?|target(?:ing)?(?: role)?(?: of)?|transition into|switch to)\s+(?:an? )?([a-z0-9+#& /.-]{2,60})/i,
    /(?:my target role is|i am targeting)\s+(?:an? )?([a-z0-9+#& /.-]{2,60})/i,
  ];
  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match?.[1]) {
      return match[1]
        .replace(
          /\b(role|position|job|career|engineer role|engineering role|please|now)\b/gi,
          "",
        )
        .replace(/\s+/g, " ")
        .trim();
    }
  }
  return "";
}

function taskMatches(
  roadmap: { tasks: { title: string; skill: string; week: number; completed: boolean }[] } | null,
  query: string,
) {
  if (!roadmap) return [];
  const key = skillKey(query);
  return roadmap.tasks.filter((task) => {
    if (task.completed) return false;
    return (
      skillKey(task.skill) === key ||
      normalizeSkill(task.title).includes(normalizeSkill(query)) ||
      normalizeSkill(query).includes(normalizeSkill(task.skill))
    );
  });
}

function inferIntent(command: string): VoiceIntent {
  const lower = command.toLowerCase();
  if (
    /\b(application (performance|insights|stats|statistics)|response rate|how am i doing with (applications|jobs))\b/.test(
      lower,
    )
  )
    return "VIEW_APPLICATION_INSIGHTS";
  if (/\b(applied|submitted an application|application for)\b/.test(lower))
    return "ADD_APPLICATION";
  if (/\b(mock interview|practice interview|start .*interview|interview me)\b/.test(lower))
    return "START_INTERVIEW";
  if (/\b(reschedule|move|postpone|push)\b/.test(lower) && /\bweek\b/.test(lower))
    return "RESCHEDULE_TASK";
  if (/\b(completed|finished|done with|mark .* (done|complete)|remove .*pending)\b/.test(lower))
    return "UPDATE_PROGRESS";
  if (/\b(learning plan|learning roadmap|study plan|roadmap|four-week|4-week)\b/.test(lower))
    return "GENERATE_ROADMAP";
  if (/\b(portfolio project|project idea|suggest .*project|recommend .*project|projects using)\b/.test(lower))
    return "RECOMMEND_PROJECTS";
  if (/\b(skill gaps?|missing skills?|what skills am i missing|analy[sz]e .*skills?)\b/.test(lower))
    return "ANALYZE_SKILLS";
  if (/\b(i want to become|become an?|target role|transition into|switch to)\b/.test(lower))
    return "SET_CAREER_TARGET";
  if (
    /\b(i know|i already know|i learned|add .* skill|focus on|interested in|my name is|i study at|i graduated)\b/.test(
      lower,
    )
  )
    return "UPDATE_PROFILE";
  return "UPDATE_PROFILE";
}

export function localVoiceAgent(
  command: string,
  context: {
    today: string;
    profile: {
      name: string;
      targetRole: string;
      skills: string[];
      college: string;
      degree: string;
      graduationYear: string;
      careerInterests: string[];
    };
    jobTarget: {
      title: string;
      company: string;
      requiredSkills: string[];
      hasDescription: boolean;
    } | null;
    analysis: {
      targetRole: string;
      missingSkills: string[];
      readinessScore: number;
    } | null;
    roadmap: {
      tasks: { title: string; skill: string; week: number; completed: boolean }[];
    } | null;
    applications: {
      company: string;
      title: string;
      status: ApplicationStatus;
      appliedDate: string;
    }[];
    interviews: { role: string; score: number | null; date: string }[];
  },
): VoiceResult {
  const intent = inferIntent(command);
  const lower = command.toLowerCase();
  const entities: Record<string, unknown> = {};
  const requiredInformation: string[] = [];
  const operations: VoiceOperation[] = [];
  const preview: { label: string; value: string }[] = [];
  let responseMessage = "";
  let targetModule = "AI Assistant";
  let requiresConfirmation = true;
  let summary = "";
  const foundSkills = extractSkillsFromText(command).filter(
    (skill) => skill.category !== "soft",
  );
  const correctedKnown = /already know|actually,? i know|i do know|i have used/i.test(
    command,
  );
  const focus = extractLocationOrInterest(command);
  const knownSkillText = extractKnownSkillText(command);
  const knownSkillsFromClause = extractSkillsFromText(knownSkillText).filter(
    (skill) => skill.category !== "soft",
  );
  const explicitSkillAdd =
    /\b(add|record|save)\b[^.]{0,40}\b(skill|skills|profile)\b/i.test(command);
  const sourceSkills =
    explicitSkillAdd && !knownSkillsFromClause.length
      ? foundSkills
      : knownSkillsFromClause;
  const existingSkillKeys = new Set(
    context.profile.skills.map((skill) => normalizeSkill(skill)),
  );
  const newKnownSkills = sourceSkills.filter(
    (skill) => !existingSkillKeys.has(normalizeSkill(skill.name)),
  );
  const focusIsNew = Boolean(
    focus &&
      !context.profile.careerInterests.some(
        (interest) => normalizeSkill(interest) === normalizeSkill(focus),
      ),
  );

  switch (intent) {
    case "SET_CAREER_TARGET": {
      const role = extractRoleTarget(command) || focus || "";
      if (!role) {
        requiredInformation.push("The target job role you want to pursue.");
        responseMessage =
          "I can set a new career target. Tell me the exact role, for example: “Set my target role to AI Engineer.”";
        break;
      }
      const normalizedRole = role.replace(/[.!?]$/, "").trim();
      entities.role = normalizedRole;
      operations.push({ type: "SET_CAREER_TARGET", role: normalizedRole });
      preview.push({ label: "New target role", value: normalizedRole });
      if (context.analysis) {
        preview.push({
          label: "Existing analysis",
          value: "Will be cleared because the target has changed.",
        });
      }
      responseMessage = `I’ll set your target career to ${normalizedRole}. Because job requirements are role-specific, any existing job-description analysis and roadmap will be cleared after you confirm.`;
      summary = `Set target role to ${normalizedRole}`;
      targetModule = "Career Profile";
      break;
    }
    case "ANALYZE_SKILLS": {
      const missing = context.analysis?.missingSkills ?? [];
      entities.skills = missing;
      if (!context.jobTarget?.hasDescription) {
        operations.push({ type: "NAVIGATE", module: "Skill Gap Analysis" });
        requiresConfirmation = false;
        requiredInformation.push(
          "A real job description for the target role, pasted into Skill Gap Analysis.",
        );
        responseMessage = context.jobTarget
          ? "I have the target role, but I need a job description to compare against. I’ll open Skill Gap Analysis so you can supply and analyze one."
          : "I need a target role and a real job description before I can identify gaps. I’ll open Skill Gap Analysis so you can add both.";
        targetModule = "Skill Gap Analysis";
        summary = "Open Skill Gap Analysis";
        break;
      }
      operations.push({
        type: "RUN_MODULE_ACTION",
        action: "ANALYZE_SKILLS",
      });
      preview.push({
        label: "Job target",
        value: `${context.jobTarget.title}${
          context.jobTarget.company ? ` at ${context.jobTarget.company}` : ""
        }`,
      });
      preview.push({
        label: "Inputs",
        value: "Your saved profile plus the job description you supplied.",
      });
      responseMessage = context.analysis
        ? `I’ll rerun the gap analysis using your current profile and the saved ${context.jobTarget.title} description. Last time, ${missing.length} skills were marked missing${
            missing.length ? `: ${missing.slice(0, 4).join(", ")}` : ""
          }.`
        : `I’ll analyze your saved profile against the ${context.jobTarget.title} description you supplied and save the gap results.`;
      summary = "Run job-description-based skill gap analysis";
      targetModule = "Skill Gap Analysis";
      break;
    }
    case "GENERATE_ROADMAP": {
      if (!context.analysis) {
        operations.push({ type: "NAVIGATE", module: "Learning Roadmap" });
        requiresConfirmation = false;
        requiredInformation.push("A completed skill-gap analysis.");
        responseMessage =
          "A roadmap should be built from a real skill gap analysis, not a generic list. I’ll open Learning Roadmap; run the gap analysis first, then ask me again.";
        targetModule = "Learning Roadmap";
        summary = "Open Learning Roadmap";
        break;
      }
      operations.push({
        type: "RUN_MODULE_ACTION",
        action: "GENERATE_ROADMAP",
      });
      preview.push({ label: "Basis", value: context.analysis.targetRole });
      preview.push({
        label: "Readiness",
        value: `${context.analysis.readinessScore}% estimated skill readiness`,
      });
      responseMessage = `I’ll generate a four-week roadmap focused on your recorded gaps for ${context.analysis.targetRole}, then save it to this workspace.`;
      summary = "Generate a four-week personalized roadmap";
      targetModule = "Learning Roadmap";
      break;
    }
    case "RECOMMEND_PROJECTS": {
      if (!context.analysis) {
        operations.push({ type: "NAVIGATE", module: "Portfolio Projects" });
        requiresConfirmation = false;
        requiredInformation.push("A completed skill-gap analysis.");
        responseMessage =
          "Project recommendations are stronger when tied to your gaps. Run the job-description analysis first; I’ll open Portfolio Projects.";
        targetModule = "Portfolio Projects";
        summary = "Open Portfolio Projects";
        break;
      }
      operations.push({
        type: "RUN_MODULE_ACTION",
        action: "RECOMMEND_PROJECTS",
        params: foundSkills.length
          ? { technologies: foundSkills.map((skill) => skill.name).join(", ") }
          : undefined,
      });
      preview.push({
        label: "Focus skills",
        value: foundSkills.length
          ? foundSkills.map((skill) => skill.name).join(", ")
          : context.analysis.missingSkills.slice(0, 4).join(", ") || "Top recorded gaps",
      });
      responseMessage = `I’ll recommend three portfolio projects tied to your ${context.analysis.targetRole} gaps${
        foundSkills.length
          ? `, using ${foundSkills.map((skill) => skill.name).join(", ")} where relevant`
          : ""
      }.`;
      summary = "Generate three portfolio project recommendations";
      targetModule = "Portfolio Projects";
      break;
    }
    case "UPDATE_PROGRESS": {
      if (!context.roadmap?.tasks.length) {
        requiredInformation.push("A generated learning roadmap.");
        responseMessage =
          "There is no saved roadmap yet. Generate a four-week plan first, then tell me which task you completed or want to remove.";
        break;
      }
      const isRemove = /\b(remove|delete|drop|clear)\b/.test(lower);
      const phraseAfter =
        command.match(
          /(?:completed|finished|done with|remove|delete|drop|clear)\s+(?:the\s+)?(.+?)(?:\s+(?:this|last)\s+week|\s+task|\s+from\s+my|\s+pending|\.|$)/i,
        )?.[1] ?? "";
      const candidates = foundSkills.length
        ? foundSkills.map((skill) => skill.name)
        : phraseAfter
          ? [phraseAfter.trim()]
          : [];
      const matchKey = candidates[0] ?? "";
      const matching = taskMatches(context.roadmap, matchKey);
      if (!matchKey) {
        requiredInformation.push("The skill or task title you updated.");
        responseMessage =
          "Which roadmap task do you mean? Name the skill or task title, for example: “I completed the Python learning sprint.”";
        break;
      }
      if (!matching.length) {
        operations.push({ type: "NAVIGATE", module: "Learning Roadmap" });
        requiresConfirmation = false;
        requiredInformation.push(`A pending task matching “${matchKey}”.`);
        responseMessage = `I couldn’t find a pending roadmap task matching “${matchKey}”. I’ll open Learning Roadmap so you can review the saved tasks.`;
        summary = "Open Learning Roadmap";
        targetModule = "Learning Roadmap";
        break;
      }
      operations.push(
        isRemove
          ? { type: "DELETE_TASKS", match: matchKey }
          : { type: "COMPLETE_TASKS", match: matchKey },
      );
      matching.forEach((task) =>
        preview.push({
          label: isRemove ? "Remove" : "Mark complete",
          value: `Week ${task.week}: ${task.title}`,
        }),
      );
      if (correctedKnown && /not|only|actually/i.test(command)) {
        preview.push({
          label: "Self-correction detected",
          value: "Using the final instruction, not the earlier phrasing.",
        });
      }
      responseMessage = `${isRemove ? "I’ll remove" : "I’ll mark completed"} ${
        matching.length
      } matching pending task${matching.length === 1 ? "" : "s"}. ${
        matching.length > 1
          ? "Because more than one task matched, review the preview before confirming. "
          : ""
      }This is a proposed change; nothing is saved until you confirm.`;
      summary = `${isRemove ? "Remove" : "Complete"} roadmap tasks matching ${matchKey}`;
      targetModule = "Learning Roadmap";
      break;
    }
    case "RESCHEDULE_TASK": {
      if (!context.roadmap?.tasks.length) {
        requiredInformation.push("A generated learning roadmap.");
        responseMessage =
          "There is no saved roadmap to reschedule yet. Generate a learning plan first.";
        break;
      }
      const weekMatch = command.match(/(?:to|week)\s*(?:week\s*)?([1-4])\b/i);
      const targetWeek = weekMatch ? Number(weekMatch[1]) : 2;
      const query =
        foundSkills[0]?.name ??
        command.match(/(?:move|reschedule|postpone|push)\s+(.+?)\s+to\s+(?:next\s+week|week)/i)?.[1]?.trim() ??
        "";
      const matching = taskMatches(context.roadmap, query);
      if (!query || !matching.length) {
        requiredInformation.push(
          "The pending task to move and the destination week (1–4).",
        );
        responseMessage = query
          ? `I couldn’t find a pending task matching “${query}”. Open Learning Roadmap to review the exact task names.`
          : "Which task should move, and to which week? For example: “Move the machine learning task to week 2.”";
        break;
      }
      operations.push({
        type: "RESCHEDULE_TASK",
        match: query,
        targetWeek,
      });
      matching.forEach((task) =>
        preview.push({
          label: `Week ${task.week} → Week ${targetWeek}`,
          value: task.title,
        }),
      );
      responseMessage = `I’ll move ${matching.length} matching task${
        matching.length === 1 ? "" : "s"
      } to week ${targetWeek}. This changes saved roadmap data only after you confirm.`;
      summary = `Reschedule ${query} to week ${targetWeek}`;
      targetModule = "Learning Roadmap";
      break;
    }
    case "START_INTERVIEW": {
      let category: InterviewCategory = "Technical";
      if (/behavioral|star/i.test(command)) category = "Behavioral";
      else if (/\bhr\b|human resources/i.test(command)) category = "HR";
      else if (/computer science|cs fundamentals/i.test(command)) category = "Computer Science";
      else if (/programming|coding/i.test(command)) category = "Programming";
      else if (/problem solving|case/i.test(command)) category = "Problem Solving";
      const difficulty = /hard/i.test(command)
        ? "Hard"
        : /easy/i.test(command)
          ? "Easy"
          : "Medium";
      const countMatch = command.match(/\b([1-9]|10)\s+(questions|question)\b/i);
      const questionCount = countMatch ? Number(countMatch[1]) : 3;
      const role = context.profile.targetRole || context.jobTarget?.title || "";
      if (!role) {
        requiredInformation.push("A target job role.");
        responseMessage =
          "I need a target role before starting an interview. Set one in Career Profile or tell me the role.";
        break;
      }
      entities.category = category;
      entities.difficulty = difficulty;
      entities.questionCount = questionCount;
      operations.push({
        type: "START_INTERVIEW",
        role,
        category,
        difficulty,
        questionCount,
      });
      preview.push({ label: "Role", value: role });
      preview.push({ label: "Category", value: category });
      preview.push({ label: "Difficulty", value: difficulty });
      preview.push({ label: "Questions", value: String(questionCount) });
      responseMessage = `I’ll open ${articleFor(difficulty)} ${difficulty.toLowerCase()} ${category.toLowerCase()} mock interview for ${role} with ${questionCount} question${
        questionCount === 1 ? "" : "s"
      }. The session is not generated until you confirm and the module creates the questions.`;
      summary = `Start ${category} mock interview`;
      targetModule = "Mock Interview";
      break;
    }
    case "ADD_APPLICATION": {
      const appliedToFor = command.match(
        /\bapplied\s+to\s+(.{1,60}?)\s+for\s+(?:an?\s+)?(.+?)(?:\s+(?:role|position|opening))?(?:\s+(?:yesterday|today|last|at|with)\b|[.,!?]|$)/i,
      );
      const atMatch = command.match(
        /\b(?:at|with)\s+([A-Z][A-Za-z0-9&.'\- ]{1,40}?)(?:\s+(?:yesterday|today|last|for|as|in)\b|[.,!?]|$)/,
      );
      const titleMatch = command.match(
        /\b(?:applied (?:for|to)|application for|applying for)\s+(?:an?\s+)?(.+?)(?:\s+(?:role|position))?(?:\s+(?:at|with)\b|\.|,|$)/i,
      );
      const company = (appliedToFor?.[1] ?? atMatch?.[1] ?? "").trim();
      const rawTitle = appliedToFor?.[2] ?? titleMatch?.[1] ?? "";
      const title = rawTitle
        .replace(/\b(yesterday|today|just now)\b/gi, "")
        .replace(/\s+(?:role|position|opening)$/i, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!company || !title) {
        requiredInformation.push(
          "The company and job title, for example: “I applied for a Software Engineer role at Microsoft yesterday.”",
        );
        responseMessage =
          "I need both the company and the job title to add an application. Dictate the full sentence and I’ll extract them.";
        break;
      }
      const appliedDate = parseRelativeDate(command, context.today);
      entities.company = company;
      entities.title = title;
      entities.appliedDate = appliedDate;
      operations.push({
        type: "ADD_APPLICATION",
        company,
        title,
        appliedDate,
        status: "Applied",
        source: "Voice command",
      });
      preview.push({ label: "Company", value: company });
      preview.push({ label: "Role", value: title });
      preview.push({ label: "Applied", value: appliedDate });
      preview.push({ label: "Status", value: "Applied" });
      preview.push({
        label: "Source",
        value: "Voice command — no external application was submitted.",
      });
      responseMessage = `I’ll record your application to ${company} for ${title} as Applied on ${appliedDate}. CareerPilot never submits applications; this only saves your own record after confirmation.`;
      summary = `Add ${title} at ${company} to the tracker`;
      targetModule = "Application Tracker";
      break;
    }
    case "VIEW_APPLICATION_INSIGHTS": {
      requiresConfirmation = false;
      operations.push({
        type: "RUN_MODULE_ACTION",
        action: "VIEW_APPLICATION_INSIGHTS",
      });
      preview.push({
        label: "Recorded applications",
        value: String(context.applications.length),
      });
      responseMessage = context.applications.length
        ? `You have ${context.applications.length} recorded application${
            context.applications.length === 1 ? "" : "s"
          }. I’ll open Application Tracker and generate insights from that recorded data only.`
        : "You have no recorded applications yet. I’ll open Application Tracker so you can add real application history first.";
      summary = "Open recorded application insights";
      targetModule = "Application Tracker";
      break;
    }
    case "UPDATE_PROFILE":
    default: {
      const wantsToLearn = command.match(
        /(?:want to learn|plan to learn|interested in learning)\s+([^.;]+)/i,
      );
      if (knownSkillText || correctedKnown || explicitSkillAdd || focus) {
        if (newKnownSkills.length) {
          operations.push({
            type: "ADD_SKILLS",
            skills: newKnownSkills.map((skill) => ({
              name: skill.name,
              category: skill.category,
            })),
          });
          newKnownSkills.forEach((skill) =>
            preview.push({
              label: "Known skill",
              value: `${skill.name} — added as existing knowledge, not a pending learning task.`,
            }),
          );
        }
        if (focus && focusIsNew) {
          operations.push({
            type: "UPDATE_PROFILE",
            changes: {
              careerInterests: dedupeStrings([
                ...context.profile.careerInterests,
                focus,
              ]),
            },
          });
          preview.push({ label: "Career focus", value: focus });
        }
        if (correctedKnown) {
          preview.push({
            label: "Self-correction handling",
            value:
              "The earlier “want to learn” wording was superseded. Nothing will be added as a learning gap solely from this command.",
          });
          const skillMessage = newKnownSkills.length
            ? `I'll record ${newKnownSkills
                .map((skill) => skill.name)
                .join(", ")} as existing knowledge, not a new learning requirement.`
            : "The skills you mentioned are already recorded in your profile.";
          const focusMessage = focus
            ? focusIsNew
              ? ` I'll also add ${focus} as a career focus.`
              : ` ${focus} is already one of your career interests.`
            : "";
          responseMessage = `I caught the correction. ${skillMessage}${focusMessage}${
            newKnownSkills.length || focusIsNew
              ? " Confirm before this updates your profile."
              : " No profile changes are needed."
          }`;
          summary = focusIsNew
            ? `Record existing skills and focus on ${focus}`
            : "Record existing skills from the corrected command";
          targetModule = "Career Profile";
        } else {
          const additions: string[] = [];
          if (newKnownSkills.length) {
            additions.push(
              `add ${newKnownSkills.map((skill) => skill.name).join(", ")} to your known skills`,
            );
          }
          if (focusIsNew) additions.push(`note ${focus} as a focus area`);
          responseMessage = additions.length
            ? `I'll ${additions.join(" and ")}. Confirm before this updates your profile.`
            : "No profile changes are needed. That information is already recorded.";
          summary = focusIsNew
            ? `Add known skills and focus on ${focus}`
            : "Add known skills to profile";
          targetModule = "Career Profile";
        }
      } else {
        const nameMatch = command.match(/(?:my name is|call me)\s+([A-Za-z .'-]{2,50})/i);
        const collegeMatch = command.match(
          /(?:i study at|college is|university is)\s+([A-Za-z .&'-]{2,60})/i,
        );
        if (nameMatch || collegeMatch) {
          const changes: {
            name?: string;
            college?: string;
          } = {};
          if (nameMatch) changes.name = nameMatch[1].trim();
          if (collegeMatch) changes.college = collegeMatch[1].trim();
          operations.push({ type: "UPDATE_PROFILE", changes });
          Object.entries(changes).forEach(([label, value]) =>
            preview.push({ label, value }),
          );
          responseMessage = "I’ll update the profile fields shown in the preview. Confirm to save them.";
          summary = "Update profile details";
          targetModule = "Career Profile";
        } else if (wantsToLearn) {
          const learningSkills = extractSkillsFromText(wantsToLearn[1])
            .filter((skill) => skill.category !== "soft")
            .map((skill) => skill.name);
          responseMessage = learningSkills.length
            ? `I won't mark ${learningSkills.join(
                ", ",
              )} as a known skill because your message says you want to learn it. Run a skill-gap analysis against a target job, then generate a roadmap to make it a learning priority.`
            : "I can help turn that learning goal into a roadmap. Add a target job description in Skill Gap Analysis first.";
          summary = "Clarification needed";
          targetModule = "Skill Gap Analysis";
        } else {
          requiredInformation.push(
            "A clearer action: a career target, skill update, roadmap progress, application, or analysis request.",
          );
          responseMessage =
            "I’m not confident about the action you want yet. Try one of the example commands, such as “Analyze my skills,” “Create a four-week learning plan,” or “I applied for an ML Engineer role at Acme today.”";
          targetModule = "AI Assistant";
          summary = "Clarification needed";
        }
      }
      break;
    }
  }

  if (!responseMessage) {
    responseMessage =
      "I’ve prepared a proposed action based on the information in your command. Review it before confirming.";
  }
  if (!summary) summary = "No saved data change yet";
  const hasModifyingOperation = operations.some((operation) =>
    [
      "SET_CAREER_TARGET",
      "ADD_SKILLS",
      "UPDATE_PROFILE",
      "COMPLETE_TASKS",
      "DELETE_TASKS",
      "RESCHEDULE_TASK",
      "ADD_APPLICATION",
      "RUN_MODULE_ACTION",
      "START_INTERVIEW",
    ].includes(operation.type),
  );
  if (!hasModifyingOperation) requiresConfirmation = false;

  return {
    intent,
    entities,
    targetModule,
    proposedAction: {
      summary,
      operations,
      preview,
    },
    requiredInformation: dedupeStrings(requiredInformation),
    requiresConfirmation,
    responseMessage,
    engine: "local",
  };
}
