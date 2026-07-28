import ReportListClient from "@/components/reports/ReportListClient";

export const metadata = {
  title: "Yıllık Faaliyetler | ORAN Rapor",
};

export default function YillikFaaliyetlerPage() {
  return <ReportListClient type="ANNUAL" />;
}
