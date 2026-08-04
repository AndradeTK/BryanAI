import { applicationRepo } from "@/server/db/repositories";
import { JobsBoard } from "./JobsBoard";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const board = await applicationRepo.getBoard();

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-content mb-1">Vagas</h1>
      <p className="text-content-subtle mb-6">
        Suas candidaturas. Capture vagas pela extensão ou adicione manualmente;
        arraste os cards entre as colunas conforme avança.
      </p>
      <JobsBoard initialBoard={board} />
    </div>
  );
}
