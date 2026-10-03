import { CircleCheck, CircleHelp, CircleX, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ResultGroup, ReqStatus } from "@/lib/engine/types";

// Status sentiasa ikon + teks + warna (design-system MASTER.md).
const STATUS = {
  MEMENUHI: { variant: "ok", Icon: CircleCheck, text: "Memenuhi" },
  BERSYARAT: { variant: "cond", Icon: TriangleAlert, text: "Bersyarat" },
  PERLU_PENGESAHAN: { variant: "verify", Icon: CircleHelp, text: "Perlu pengesahan" },
  TIDAK_MEMENUHI: { variant: "fail", Icon: CircleX, text: "Tidak memenuhi" },
} as const satisfies Record<ReqStatus, unknown>;

const GROUP_STATUS: Record<ResultGroup, { status: ReqStatus; text: string }> = {
  full_match: { status: "MEMENUHI", text: "Memenuhi syarat wajib" },
  needs_verification: { status: "PERLU_PENGESAHAN", text: "Perlu pengesahan" },
  not_matching: { status: "TIDAK_MEMENUHI", text: "Tidak memenuhi" },
};

export function StatusBadge({
  status,
  children,
}: {
  status: ReqStatus;
  children?: React.ReactNode;
}) {
  const s = STATUS[status];
  return (
    <Badge variant={s.variant}>
      <s.Icon aria-hidden="true" />
      {children ?? s.text}
    </Badge>
  );
}

export function GroupBadge({ group }: { group: ResultGroup }) {
  const g = GROUP_STATUS[group];
  return <StatusBadge status={g.status}>{g.text}</StatusBadge>;
}
