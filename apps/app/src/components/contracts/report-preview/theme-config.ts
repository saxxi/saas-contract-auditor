import type { PropositionType } from "../types";

export interface ReportTheme {
  primary: string;       // Tailwind color class base (e.g. "red-600")
  accent: string;        // Accent color for borders/highlights
  muted: string;         // Muted background tint
  bannerGradient: string;
  sectionOrder: string[];
  heroChart: "bar-comparison" | "capacity-radial" | "usage-trend" | "stat-cards";
  actionCallout: {
    label: string;
    color: string;       // bg class
    borderColor: string;
    textColor: string;
    icon: "alert" | "revenue" | "trend" | "capacity" | "check";
  } | null;
}

export const reportThemes: Record<PropositionType, ReportTheme> = {
  "requires negotiation": {
    primary: "red-600",
    accent: "red-500",
    muted: "red-50",
    bannerGradient: "from-red-600 to-red-700",
    sectionOrder: ["executive-summary", "risks", "action-callout", "resolution", "metrics", "evidence", "next-steps", "key-question", "sales-script-divider", "opening-hook", "discovery-questions", "value-framing", "objection-handlers", "closing-framework"],
    heroChart: "bar-comparison",
    actionCallout: {
      label: "Immediate Intervention Required",
      color: "bg-red-50 dark:bg-red-950/30",
      borderColor: "border-red-500 dark:border-red-400",
      textColor: "text-red-700 dark:text-red-300",
      icon: "alert",
    },
  },
  "upsell proposition": {
    primary: "blue-600",
    accent: "blue-500",
    muted: "blue-50",
    bannerGradient: "from-blue-600 to-blue-700",
    sectionOrder: ["executive-summary", "action-callout", "resolution", "metrics", "evidence", "risks", "next-steps", "key-question", "sales-script-divider", "opening-hook", "discovery-questions", "value-framing", "objection-handlers", "closing-framework"],
    heroChart: "bar-comparison",
    actionCallout: {
      label: "Revenue Opportunity",
      color: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-500 dark:border-blue-400",
      textColor: "text-blue-700 dark:text-blue-300",
      icon: "revenue",
    },
  },
  "poor usage": {
    primary: "amber-500",
    accent: "amber-500",
    muted: "amber-50",
    bannerGradient: "from-amber-500 to-amber-600",
    sectionOrder: ["executive-summary", "action-callout", "metrics", "resolution", "evidence", "risks", "next-steps", "key-question", "sales-script-divider", "opening-hook", "discovery-questions", "value-framing", "objection-handlers", "closing-framework"],
    heroChart: "usage-trend",
    actionCallout: {
      label: "Engagement At Risk",
      color: "bg-amber-50 dark:bg-amber-950/30",
      borderColor: "border-amber-500 dark:border-amber-400",
      textColor: "text-amber-700 dark:text-amber-300",
      icon: "trend",
    },
  },
  "at capacity": {
    primary: "orange-500",
    accent: "orange-500",
    muted: "orange-50",
    bannerGradient: "from-orange-500 to-orange-600",
    sectionOrder: ["executive-summary", "action-callout", "metrics", "resolution", "evidence", "risks", "next-steps", "key-question", "sales-script-divider", "opening-hook", "discovery-questions", "value-framing", "objection-handlers", "closing-framework"],
    heroChart: "capacity-radial",
    actionCallout: {
      label: "Capacity Threshold Approaching",
      color: "bg-orange-50 dark:bg-orange-950/30",
      borderColor: "border-orange-500 dark:border-orange-400",
      textColor: "text-orange-700 dark:text-orange-300",
      icon: "capacity",
    },
  },
  healthy: {
    primary: "emerald-600",
    accent: "emerald-500",
    muted: "emerald-50",
    bannerGradient: "from-emerald-600 to-emerald-700",
    sectionOrder: ["executive-summary", "resolution", "metrics", "evidence", "risks", "next-steps", "key-question", "sales-script-divider", "opening-hook", "discovery-questions", "value-framing", "objection-handlers", "closing-framework"],
    heroChart: "stat-cards",
    actionCallout: null,
  },
};
