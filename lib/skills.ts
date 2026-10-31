import type { SkillCategory } from "./types";
import { normalizeSkill } from "./utils";

export interface SkillDefinition {
  name: string;
  category: SkillCategory;
  aliases: string[];
}

export const SKILL_LIBRARY: SkillDefinition[] = [
  { name: "Python", category: "language", aliases: ["python"] },
  { name: "JavaScript", category: "language", aliases: ["javascript", "js"] },
  { name: "TypeScript", category: "language", aliases: ["typescript", "ts"] },
  { name: "Java", category: "language", aliases: ["java"] },
  { name: "C++", category: "language", aliases: ["c++", "cpp"] },
  { name: "C#", category: "language", aliases: ["c#", "csharp"] },
  { name: "C", category: "language", aliases: ["c language", "ansi c"] },
  { name: "Go", category: "language", aliases: ["golang", "go language"] },
  { name: "Rust", category: "language", aliases: ["rust"] },
  { name: "Ruby", category: "language", aliases: ["ruby"] },
  { name: "PHP", category: "language", aliases: ["php"] },
  { name: "Swift", category: "language", aliases: ["swift"] },
  { name: "Kotlin", category: "language", aliases: ["kotlin"] },
  { name: "R", category: "language", aliases: ["r programming", "r language"] },
  { name: "SQL", category: "language", aliases: ["sql"] },
  { name: "HTML", category: "language", aliases: ["html"] },
  { name: "CSS", category: "language", aliases: ["css"] },
  { name: "Scala", category: "language", aliases: ["scala"] },
  { name: "MATLAB", category: "language", aliases: ["matlab"] },
  { name: "Bash", category: "language", aliases: ["bash", "shell scripting"] },
  {
    name: "React",
    category: "framework",
    aliases: ["react", "react.js", "reactjs"],
  },
  {
    name: "Next.js",
    category: "framework",
    aliases: ["next.js", "nextjs", "next js"],
  },
  { name: "Vue.js", category: "framework", aliases: ["vue", "vue.js", "vuejs"] },
  {
    name: "Angular",
    category: "framework",
    aliases: ["angular", "angular.js", "angularjs"],
  },
  {
    name: "Node.js",
    category: "framework",
    aliases: ["node.js", "nodejs", "node js"],
  },
  {
    name: "Express.js",
    category: "framework",
    aliases: ["express", "express.js", "expressjs"],
  },
  { name: "Django", category: "framework", aliases: ["django"] },
  { name: "Flask", category: "framework", aliases: ["flask"] },
  { name: "FastAPI", category: "framework", aliases: ["fastapi"] },
  {
    name: "Spring Boot",
    category: "framework",
    aliases: ["spring boot", "springboot"],
  },
  {
    name: "TensorFlow",
    category: "framework",
    aliases: ["tensorflow", "tf"],
  },
  { name: "PyTorch", category: "framework", aliases: ["pytorch", "torch"] },
  {
    name: "scikit-learn",
    category: "framework",
    aliases: ["scikit-learn", "sklearn", "scikit learn"],
  },
  { name: "Pandas", category: "framework", aliases: ["pandas"] },
  { name: "NumPy", category: "framework", aliases: ["numpy"] },
  { name: "Keras", category: "framework", aliases: ["keras"] },
  { name: "LangChain", category: "framework", aliases: ["langchain"] },
  { name: "LlamaIndex", category: "framework", aliases: ["llamaindex"] },
  {
    name: "Hugging Face",
    category: "framework",
    aliases: ["hugging face", "huggingface"],
  },
  {
    name: "Tailwind CSS",
    category: "framework",
    aliases: ["tailwind", "tailwind css", "tailwindcss"],
  },
  { name: ".NET", category: "framework", aliases: [".net", "dotnet", "asp.net"] },
  { name: "Flutter", category: "framework", aliases: ["flutter"] },
  {
    name: "React Native",
    category: "framework",
    aliases: ["react native", "reactnative"],
  },
  { name: "GraphQL", category: "framework", aliases: ["graphql"] },
  { name: "Git", category: "tool", aliases: ["git"] },
  { name: "GitHub", category: "tool", aliases: ["github"] },
  { name: "Docker", category: "tool", aliases: ["docker"] },
  { name: "Kubernetes", category: "tool", aliases: ["kubernetes", "k8s"] },
  { name: "AWS", category: "tool", aliases: ["aws", "amazon web services"] },
  { name: "Azure", category: "tool", aliases: ["azure", "microsoft azure"] },
  {
    name: "Google Cloud",
    category: "tool",
    aliases: ["gcp", "google cloud", "google cloud platform"],
  },
  { name: "Firebase", category: "tool", aliases: ["firebase"] },
  { name: "MongoDB", category: "tool", aliases: ["mongodb", "mongo"] },
  {
    name: "PostgreSQL",
    category: "tool",
    aliases: ["postgresql", "postgres"],
  },
  { name: "MySQL", category: "tool", aliases: ["mysql"] },
  { name: "Redis", category: "tool", aliases: ["redis"] },
  { name: "Linux", category: "tool", aliases: ["linux"] },
  { name: "Jenkins", category: "tool", aliases: ["jenkins"] },
  { name: "Terraform", category: "tool", aliases: ["terraform"] },
  {
    name: "GitHub Actions",
    category: "tool",
    aliases: ["github actions"],
  },
  { name: "Vercel", category: "tool", aliases: ["vercel"] },
  { name: "Jira", category: "tool", aliases: ["jira"] },
  { name: "Figma", category: "tool", aliases: ["figma"] },
  { name: "Postman", category: "tool", aliases: ["postman"] },
  { name: "Kafka", category: "tool", aliases: ["kafka", "apache kafka"] },
  { name: "Airflow", category: "tool", aliases: ["airflow", "apache airflow"] },
  { name: "Spark", category: "tool", aliases: ["spark", "apache spark"] },
  { name: "Tableau", category: "tool", aliases: ["tableau"] },
  { name: "Power BI", category: "tool", aliases: ["power bi", "powerbi"] },
  {
    name: "Machine Learning",
    category: "technical",
    aliases: ["machine learning", "ml"],
  },
  {
    name: "Deep Learning",
    category: "technical",
    aliases: ["deep learning"],
  },
  { name: "NLP", category: "technical", aliases: ["nlp", "natural language processing"] },
  {
    name: "Computer Vision",
    category: "technical",
    aliases: ["computer vision", "cv"],
  },
  { name: "LLMs", category: "technical", aliases: ["llm", "llms", "large language models"] },
  {
    name: "RAG",
    category: "technical",
    aliases: ["rag", "retrieval augmented generation", "retrieval-augmented generation"],
  },
  {
    name: "Prompt Engineering",
    category: "technical",
    aliases: ["prompt engineering", "prompt design"],
  },
  {
    name: "Data Structures",
    category: "technical",
    aliases: ["data structures", "data structure"],
  },
  { name: "Algorithms", category: "technical", aliases: ["algorithms", "algorithm"] },
  {
    name: "System Design",
    category: "technical",
    aliases: ["system design", "systems design"],
  },
  {
    name: "REST APIs",
    category: "technical",
    aliases: ["rest api", "rest apis", "restful api", "restful services"],
  },
  {
    name: "Microservices",
    category: "technical",
    aliases: ["microservices", "microservice architecture"],
  },
  { name: "CI/CD", category: "technical", aliases: ["ci/cd", "cicd"] },
  {
    name: "Object-Oriented Programming",
    category: "technical",
    aliases: ["object-oriented programming", "oop"],
  },
  { name: "Databases", category: "technical", aliases: ["databases", "database design"] },
  {
    name: "Cloud Computing",
    category: "technical",
    aliases: ["cloud computing", "cloud infrastructure"],
  },
  { name: "MLOps", category: "technical", aliases: ["mlops", "ml ops"] },
  { name: "Statistics", category: "technical", aliases: ["statistics", "statistical"] },
  {
    name: "Data Analysis",
    category: "technical",
    aliases: ["data analysis", "data analytics", "analytics"],
  },
  { name: "ETL", category: "technical", aliases: ["etl", "data pipelines"] },
  { name: "Testing", category: "technical", aliases: ["unit testing", "software testing"] },
  { name: "Agile", category: "technical", aliases: ["agile", "scrum"] },
  {
    name: "Generative AI",
    category: "technical",
    aliases: ["generative ai", "genai", "gen ai"],
  },
  {
    name: "Vector Databases",
    category: "technical",
    aliases: ["vector database", "vector databases", "vector db"],
  },
  {
    name: "Problem Solving",
    category: "soft",
    aliases: ["problem solving", "problem-solving"],
  },
  { name: "Communication", category: "soft", aliases: ["communication"] },
  { name: "Leadership", category: "soft", aliases: ["leadership"] },
  { name: "Teamwork", category: "soft", aliases: ["teamwork", "collaboration"] },
];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const normalizedIndex = new Map<string, SkillDefinition>();
for (const skill of SKILL_LIBRARY) {
  normalizedIndex.set(normalizeSkill(skill.name), skill);
  for (const alias of skill.aliases) normalizedIndex.set(normalizeSkill(alias), skill);
}

export function findSkillCatalog(value: string): SkillDefinition | undefined {
  return normalizedIndex.get(normalizeSkill(value));
}

export function canonicalSkill(value: string) {
  return findSkillCatalog(value)?.name ?? value.trim();
}

export function skillKey(value: string) {
  return normalizeSkill(findSkillCatalog(value)?.name ?? value);
}

const aliasSearch = SKILL_LIBRARY.flatMap((skill) =>
  [skill.name, ...skill.aliases].map((alias) => ({
    skill,
    pattern: new RegExp(
      `(^|[^a-z0-9+#])${escapeRegex(alias.toLowerCase())}(?=$|[^a-z0-9+#])`,
      "i",
    ),
  })),
).sort((a, b) => b.pattern.source.length - a.pattern.source.length);

export function extractSkillsFromText(text: string): SkillDefinition[] {
  const found = new Map<string, SkillDefinition>();
  for (const { skill, pattern } of aliasSearch) {
    if (!found.has(skill.name) && pattern.test(text)) {
      found.set(skill.name, skill);
    }
  }
  return Array.from(found.values());
}

export function inferSkillCategory(value: string): SkillCategory {
  return findSkillCatalog(value)?.category ?? "technical";
}

export const ROLE_FAMILIES = [
  {
    label: "AI / ML",
    pattern:
      /\b(ai|a\.i\.|machine learning|ml|deep learning|data scientist|nlp|computer vision|mlops|research engineer|applied scientist)\b/i,
  },
  {
    label: "Frontend",
    pattern: /\b(frontend|front-end|ui engineer|react developer|web developer)\b/i,
  },
  {
    label: "Backend",
    pattern: /\b(backend|back-end|api engineer|server engineer|platform engineer)\b/i,
  },
  {
    label: "Full stack",
    pattern: /\b(full stack|full-stack|software engineer|software developer|sde|swe)\b/i,
  },
  {
    label: "Data",
    pattern: /\b(data engineer|data analyst|analytics engineer|business intelligence|bi developer)\b/i,
  },
  {
    label: "Cloud / DevOps",
    pattern: /\b(devops|sre|site reliability|cloud engineer|infrastructure engineer)\b/i,
  },
  {
    label: "Product / Design",
    pattern: /\b(product manager|product designer|ux|ui designer|designer)\b/i,
  },
];

export function roleFamily(title: string) {
  return ROLE_FAMILIES.find((family) => family.pattern.test(title))?.label ?? "Other";
}

export const QUESTIONS_BY_CATEGORY: Record<string, string[]> = {
  Technical: [
    "Explain how you would evaluate and improve the performance of a {role} system in production.",
    "Walk me through the trade-offs between training a model from scratch and fine-tuning an existing model for a {role} use case.",
    "How would you design a reliable data pipeline for a {role} application that must handle failures?",
    "What is the difference between overfitting and underfitting, and how do you detect each in practice?",
    "Describe a technical decision you made in a project and explain why it was the right choice for a {role}.",
    "How would you monitor model quality after deployment as a {role}?",
    "Explain embeddings and how they can support retrieval in an AI application.",
    "What security and privacy risks matter when building an AI-powered product?",
  ],
  Programming: [
    "Write a function that finds the first non-repeating character in a string. Explain the time and space complexity.",
    "How would you design an API endpoint that handles pagination, filtering, and validation for a {role} product?",
    "Explain the difference between shallow and deep copies, with a practical example.",
    "How do you handle errors and retries when calling an unreliable external service?",
    "Given a list of intervals, explain an approach to merge overlapping intervals.",
    "What makes code maintainable? Describe conventions you apply in your projects.",
    "How would you test a feature that integrates a database, a backend API, and a frontend form?",
  ],
  "Computer Science": [
    "Explain the time and space complexity of common sorting algorithms and when you would choose each.",
    "How does the event loop work, and why does it matter for responsive applications?",
    "What is the difference between processes and threads? Give a practical example.",
    "Explain how an index improves database query performance and what the trade-off is.",
    "How would you avoid deadlocks in a concurrent system?",
    "What happens from entering a URL in the browser to receiving the response?",
    "Compare relational and document databases for a {role} application.",
  ],
  "Problem Solving": [
    "You have one week to deliver a {role} feature with incomplete requirements. How do you proceed?",
    "A model performs well in testing but poorly for real users. Describe how you would investigate.",
    "Your team's deployment frequency is low because tests are flaky. How would you improve the situation?",
    "You have two competing priorities and cannot finish both this sprint. How do you decide and communicate?",
    "Describe a time you diagnosed a bug under time pressure. What was your process?",
    "A dataset contains missing values and class imbalance. Walk through your approach.",
  ],
  Behavioral: [
    "Tell me about a project where you had to learn a new technology quickly. What did you do?",
    "Describe a disagreement with a teammate and how you resolved it.",
    "Tell me about a time you received critical feedback. What changed afterward?",
    "Describe a time you missed a deadline. What did you learn?",
    "Tell me about a project you are proud of. Explain your specific contribution and impact.",
    "Describe how you prioritize when you have too many tasks.",
  ],
  HR: [
    "Why are you interested in this {role} role, and why now?",
    "What kind of work environment helps you do your best work?",
    "Where do you want to grow professionally in the next two years?",
    "What are your strengths and one area you are actively improving?",
    "How do you decide whether a company and role are a good fit?",
    "What motivates you to keep learning difficult technical topics?",
  ],
};

export const EVALUATION_KEYWORDS: Record<string, string[]> = {
  Technical: [
    "trade-off",
    "data",
    "metric",
    "monitor",
    "test",
    "model",
    "latency",
    "accuracy",
    "failure",
    "deployment",
    "architecture",
  ],
  Programming: [
    "complexity",
    "error",
    "test",
    "edge case",
    "input",
    "function",
    "api",
    "database",
    "validation",
    "retry",
    "performance",
  ],
  "Computer Science": [
    "complexity",
    "memory",
    "thread",
    "process",
    "database",
    "index",
    "network",
    "cache",
    "concurrency",
    "algorithm",
    "time",
  ],
  "Problem Solving": [
    "first",
    "then",
    "measure",
    "verify",
    "hypothesis",
    "trade-off",
    "risk",
    "priority",
    "stakeholder",
    "data",
  ],
  Behavioral: [
    "situation",
    "task",
    "action",
    "result",
    "team",
    "learned",
    "impact",
    "feedback",
    "decision",
  ],
  HR: ["motivation", "growth", "role", "team", "learning", "fit", "impact", "career"],
};
