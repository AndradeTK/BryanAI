import { SkillsGapClient } from "./SkillsGapClient";

export default function SkillsGapPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-content mb-1">Skills Gap</h1>
      <p className="text-content-subtle mb-6">
        Descubra o que falta para chegar ao cargo que você quer, com um roadmap de
        desenvolvimento.
      </p>
      <SkillsGapClient />
    </div>
  );
}
