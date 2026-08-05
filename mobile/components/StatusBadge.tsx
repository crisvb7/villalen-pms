import { Badge } from "@/components/Badge";
import { statusLabels, statusTones } from "@/lib/theme";
import type { BookingStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge label={statusLabels[status] ?? status} tone={statusTones[status] ?? "gray"} />
  );
}
