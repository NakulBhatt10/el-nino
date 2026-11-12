import {
  Activity, AlertTriangle, BarChart3, Bell, Boxes, BrainCircuit, BookOpen, ClipboardList, Database,
  Droplets, FileText, Gauge, GitCompare, History, LayoutDashboard, Lightbulb, Map, Network, ScanSearch,
  SlidersHorizontal, Thermometer, Waves, type LucideIcon,
} from "lucide-react";

export interface NavItem { title: string; url: string; icon: LucideIcon }
export interface NavSection { label: string; items: NavItem[] }

export const NAV: NavSection[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Ward heatmap", url: "/heatmap", icon: Map },
      { title: "3D Mumbai", url: "/mumbai-3d", icon: Boxes },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { title: "Climate", url: "/climate", icon: Thermometer },
      { title: "Water quality", url: "/water-quality", icon: Droplets },
      { title: "Disease surveillance", url: "/surveillance", icon: Activity },
    ],
  },
  {
    label: "AI models",
    items: [
      { title: "Risk prediction", url: "/predictions", icon: Gauge },
      { title: "STGNN model", url: "/stgnn", icon: Network },
      { title: "Spatio-temporal transformer", url: "/transformer", icon: BrainCircuit },
      { title: "Explainable AI", url: "/explainable-ai", icon: ScanSearch },
      { title: "Model performance", url: "/model-performance", icon: BarChart3 },
    ],
  },
  {
    label: "Early warning",
    items: [
      { title: "Notifications", url: "/notifications", icon: Bell },
      { title: "Alert management", url: "/alerts", icon: AlertTriangle },
      { title: "Health recommendations", url: "/recommendations", icon: ClipboardList },
    ],
  },
  {
    label: "Analysis",
    items: [
      { title: "What-if simulator", url: "/simulator", icon: SlidersHorizontal },
      { title: "Historical playback", url: "/playback", icon: History },
      { title: "Ward comparison", url: "/compare", icon: GitCompare },
    ],
  },
  {
    label: "Learn",
    items: [
      { title: "El Niño explainer", url: "/el-nino", icon: Waves },
      { title: "Water-borne diseases", url: "/disease-education", icon: BookOpen },
    ],
  },
  {
    label: "Data & reports",
    items: [
      { title: "Data explorer", url: "/data-explorer", icon: Database },
      { title: "Data source registry", url: "/data-sources", icon: Lightbulb },
      { title: "Reports & analytics", url: "/reports", icon: FileText },
    ],
  },
];
