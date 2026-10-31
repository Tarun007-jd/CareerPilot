"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ApplicationStatus,
  InterviewSession,
  SkillGap,
} from "@/lib/types";
import { calculateApplicationStats, formatDate } from "@/lib/utils";

const chartTooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(226 25% 91%)",
  background: "hsl(0 0% 100% / 0.96)",
  boxShadow: "0 12px 32px -12px rgba(15, 23, 42, 0.18)",
  fontSize: 12,
  padding: "8px 12px",
};

export function SkillReadinessChart({ gaps }: { gaps: SkillGap[] }) {
  const data = [...gaps]
    .sort((a, b) => b.gapScore - a.gapScore)
    .slice(0, 6)
    .map((gap) => ({
      name: gap.skill,
      Current: gap.currentLevel,
      Target: gap.requiredLevel,
    }));
  return (
    <div className="h-[264px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 10, bottom: 4, left: 0 }}
          barGap={3}
        >
          <CartesianGrid
            horizontal={false}
            stroke="hsl(226 25% 94%)"
            strokeDasharray="3 3"
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
            ticks={[0, 25, 50, 75, 100]}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={108}
            tick={{ fontSize: 11, fill: "#475569" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            cursor={{ fill: "rgba(99, 102, 241, 0.04)" }}
            formatter={(value: number, name: string) => [`${value}%`, name]}
          />
          <Bar
            dataKey="Target"
            fill="#e2e5fb"
            radius={[0, 4, 4, 0]}
            barSize={7}
            isAnimationActive
          />
          <Bar
            dataKey="Current"
            fill="#6366f1"
            radius={[0, 4, 4, 0]}
            barSize={7}
            isAnimationActive
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const statusColors: Record<ApplicationStatus, string> = {
  Interested: "#cbd5e1",
  Applied: "#60a5fa",
  Assessment: "#a78bfa",
  Interview: "#6366f1",
  Rejected: "#fda4af",
  Offer: "#34d399",
};

export function ApplicationPipelineChart({
  applications,
}: {
  applications: Parameters<typeof calculateApplicationStats>[0];
}) {
  const chartStats = calculateApplicationStats(applications);
  const data = (
    ["Interested", "Applied", "Assessment", "Interview", "Rejected", "Offer"] as ApplicationStatus[]
  )
    .map((status) => ({
      status,
      count: chartStats.statusCounts[status] ?? 0,
    }))
    .filter((entry) => entry.count > 0);
  return (
    <div className="h-[224px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="hsl(226 25% 94%)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="status"
            tick={{ fontSize: 9, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            cursor={{ fill: "rgba(99, 102, 241, 0.04)" }}
            formatter={(value: number) => [`${value} application${value === 1 ? "" : "s"}`, "Recorded"]}
          />
          <Bar dataKey="count" radius={[5, 5, 0, 0]} barSize={24}>
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={statusColors[entry.status]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InterviewTrendChart({
  interviews,
}: {
  interviews: InterviewSession[];
}) {
  const data = [...interviews]
    .filter((interview) => interview.status === "completed" && interview.overallScore !== null)
    .sort(
      (a, b) =>
        new Date(a.completedAt ?? a.createdAt).getTime() -
        new Date(b.completedAt ?? b.createdAt).getTime(),
    )
    .slice(-8)
    .map((interview) => ({
      date: formatDate(interview.completedAt ?? interview.createdAt, {
        month: "short",
        day: "numeric",
      }),
      score: interview.overallScore,
      role: interview.role,
    }));
  return (
    <div className="h-[190px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 14, bottom: 0, left: -24 }}>
          <CartesianGrid
            vertical={false}
            stroke="hsl(226 25% 94%)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tick={{ fontSize: 10, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value: number) => [`${value}/100`, "Interview score"]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 5 }}
            isAnimationActive
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
