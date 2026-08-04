import { CoverLetterClient } from "./CoverLetterClient";

export default function CoverLetterPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-content mb-1">Cover Letter</h1>
      <p className="text-content-subtle mb-6">
        Gere uma carta de apresentação personalizada para a vaga.
      </p>
      <CoverLetterClient />
    </div>
  );
}
