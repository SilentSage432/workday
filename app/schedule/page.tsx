import Link from "next/link";
import { WorkSchedule } from "@/components/WorkSchedule";

export default function SchedulePage() {
  return (
    <>
      <p>
        <Link href="/">Return to the field</Link>
      </p>
      <WorkSchedule />
    </>
  );
}
