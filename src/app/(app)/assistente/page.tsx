import type { Metadata } from "next";
import { ChatClient } from "./ChatClient";

export const metadata: Metadata = { title: "Assistente — BryanAI" };
export const dynamic = "force-dynamic";

export default function AssistentePage() {
  return (
    <div className="max-w-3xl mx-auto h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-medium text-content tracking-tight">
          Assistente
        </h1>
        <p className="text-content-muted mt-2 text-[15px] leading-relaxed">
          Converse sobre seu currículo em vez de preencher formulários. O
          assistente lê seus dados e propõe alterações — cada uma passa por você
          antes de ser salva.
        </p>
      </div>
      <ChatClient />
    </div>
  );
}
