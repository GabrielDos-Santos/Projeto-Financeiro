import type { LoanWithProgress } from "../types";
import { LoanCard } from "./loan-card";

export function LoansList({ loans }: { loans: LoanWithProgress[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {loans.map((loan) => (
        <LoanCard key={loan.id} loan={loan} />
      ))}
    </div>
  );
}
