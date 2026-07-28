import ReportListClient from "@/components/reports/ReportListClient";

export const metadata = {
  title: "Haftalık Faaliyetler | ORAN Rapor",
};

export default function HaftalikFaaliyetlerPage() {
  return <ReportListClient type="WEEKLY" />;
}
