import type { CareerState, Skill, UserProfile } from "./types";

export const DEMO_RESUME = `AARAV MEHTA
Final-year Computer Science student | Vellore, India
aarav.mehta@example.com | github.com/aaravmehta | linkedin.com/in/aaravmehta

EDUCATION
VIT Vellore — B.Tech in Computer Science and Engineering
Expected graduation: 2026 | CGPA: 8.7/10
Relevant coursework: Data Structures, Algorithms, Machine Learning, Databases, Operating Systems

SKILLS
Languages: Python, JavaScript, SQL, HTML, CSS
Frameworks and libraries: React, Pandas, NumPy, scikit-learn, Flask
Tools: Git, GitHub, Jupyter Notebook, VS Code, PostgreSQL, Postman

EXPERIENCE
Machine Learning Intern — CivicData Lab (Remote), May 2025 – July 2025
- Built a text classification pipeline for municipal complaint data using Python and scikit-learn.
- Improved macro F1 from 0.71 to 0.79 through preprocessing and class weighting.
- Packaged the model behind a Flask API and documented evaluation results for the team.

Teaching Assistant — VIT Vellore, Jan 2025 – Apr 2025
- Supported weekly Python labs for 60 first-year students and reviewed debugging exercises.

PROJECTS
Campus Lost & Found — React, Flask, PostgreSQL
Built a reporting and claim workflow with image uploads, search filters, and an admin review queue.

Air Quality Explorer — Python, Pandas, scikit-learn
Analyzed public sensor data and compared regression models to estimate next-day PM2.5 levels.

CERTIFICATIONS
- Google Data Analytics Professional Certificate
- AWS Cloud Practitioner Essentials

LEADERSHIP
Core member, AI & Data Science Club. Organized three technical workshops for 120+ students.`;

export const DEMO_JOB_DESCRIPTION = `AI Engineer — Nimbus Labs

About the role
Nimbus Labs builds retrieval-augmented AI assistants for enterprise knowledge teams. We are looking for an early-career AI Engineer to help design, evaluate, and ship reliable LLM-powered features.

What you'll do
- Build retrieval-augmented generation pipelines using Python and modern LLM APIs.
- Design evaluations and monitor groundedness, latency, and failure cases.
- Work with vector databases and backend APIs to serve AI features at production scale.
- Collaborate with product and design to turn prototypes into reliable user experiences.
- Write clear technical documentation and participate in code reviews.

What we're looking for
- Strong Python programming and software engineering fundamentals.
- Hands-on experience with LLMs, prompt engineering, and RAG.
- Working knowledge of PyTorch or TensorFlow and vector databases.
- Experience with FastAPI or another backend framework and REST APIs.
- Familiarity with Docker, Git, and cloud platforms such as AWS.
- Understanding of data structures, algorithms, and testing.
- Strong communication and problem-solving skills.

Preferred qualifications
- Experience with LangChain or LlamaIndex.
- Familiarity with MLOps and CI/CD workflows.
- Computer vision or NLP project experience.

Details
Entry level. 0–2 years of professional experience. This is a sample job description for demo purposes; it is user-supplied content, not a live listing.`;

function demoSkill(
  name: string,
  category: Skill["category"],
  proficiency: number,
): Skill {
  return {
    id: `demo_skill_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    name,
    category,
    proficiency,
    source: "manual",
  };
}

export function createDemoState(): CareerState {
  const now = new Date().toISOString();
  const profile: UserProfile = {
    id: "demo_aarav_mehta",
    name: "Aarav Mehta",
    email: "aarav.mehta@example.com",
    headline: "Final-year CS student building practical AI products",
    location: "Vellore, India",
    college: "VIT Vellore",
    degree: "B.Tech Computer Science and Engineering",
    graduationYear: "2026",
    skills: [
      demoSkill("Python", "language", 72),
      demoSkill("JavaScript", "language", 58),
      demoSkill("SQL", "language", 64),
      demoSkill("React", "framework", 60),
      demoSkill("Pandas", "framework", 68),
      demoSkill("scikit-learn", "framework", 62),
      demoSkill("Flask", "framework", 55),
      demoSkill("Git", "tool", 70),
      demoSkill("GitHub", "tool", 72),
      demoSkill("PostgreSQL", "tool", 58),
      demoSkill("Machine Learning", "technical", 60),
      demoSkill("Data Analysis", "technical", 66),
    ],
    experience:
      "Machine Learning Intern at CivicData Lab (May–Jul 2025): built a text classification pipeline and Flask API; improved macro F1 from 0.71 to 0.79.\nTeaching Assistant at VIT Vellore (Jan–Apr 2025): supported Python labs for 60 students.",
    certifications: [
      "Google Data Analytics Professional Certificate",
      "AWS Cloud Practitioner Essentials",
    ],
    careerInterests: ["Applied AI", "Machine Learning", "Developer tools"],
    targetRole: "AI Engineer",
    resume: {
      fileName: "aarav-mehta-resume.txt",
      text: DEMO_RESUME,
      uploadedAt: now,
      extraction: null,
    },
    createdAt: now,
    updatedAt: now,
  };

  return {
    version: 1,
    profile,
    jobTarget: {
      id: "demo_target_nimbus",
      title: "AI Engineer",
      company: "Nimbus Labs",
      description: DEMO_JOB_DESCRIPTION,
      requiredSkills: [],
      preferredSkills: [],
      experienceRequirement: "",
      responsibilities: [],
      qualifications: [],
      toolsAndTechnologies: [],
      source: "user-provided",
      createdAt: now,
    },
    analysis: null,
    roadmap: null,
    projects: [],
    interviews: [],
    applications: [],
    assistantMessages: [],
    savedAt: now,
  };
}
