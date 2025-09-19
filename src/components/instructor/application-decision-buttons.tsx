"use client";

import { useTransition } from "react";
import { updateEnrollmentStatusAction } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";

interface ApplicationDecisionButtonsProps {
  enrollmentId: string;
  currentStatus: "requested" | "approved" | "rejected";
}

export function ApplicationDecisionButtons({
  enrollmentId,
  currentStatus,
}: ApplicationDecisionButtonsProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        disabled={isPending || currentStatus === "approved"}
        onClick={() =>
          startTransition(async () => {
            await updateEnrollmentStatusAction({ enrollmentId, status: "approved" });
          })
        }
      >
        Onayla
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={isPending || currentStatus === "rejected"}
        onClick={() =>
          startTransition(async () => {
            await updateEnrollmentStatusAction({ enrollmentId, status: "rejected" });
          })
        }
      >
        Reddet
      </Button>
    </div>
  );
}
