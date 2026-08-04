import { describe, it, expect } from "vitest";
import {
  workAuthVerdict,
  languageVerdict,
  regulatedProfessionGap,
} from "./rules";
import { cefrToClb } from "./clb";

describe("workAuthVerdict — o blocker de vaga impossível", () => {
  const jobNoSponsor =
    "Great role. Must be legally authorized to work in Canada. No sponsorship available.";

  it("bloqueia quando a vaga proíbe sponsorship e o candidato precisa dele", () => {
    for (const auth of ["needs_lmia", "needs_sponsorship", "study_permit"] as const) {
      expect(workAuthVerdict({ work_authorization: auth }, jobNoSponsor)).toBe(
        "needs_sponsorship_blocker",
      );
    }
  });

  it("NÃO bloqueia PR/cidadão/PGWP mesmo com a frase proibitiva", () => {
    for (const auth of ["citizen", "pr", "pgwp", "owp"] as const) {
      expect(workAuthVerdict({ work_authorization: auth }, jobNoSponsor)).toBe("ok");
    }
  });

  it("NÃO bloqueia se a vaga não menciona autorização", () => {
    expect(
      workAuthVerdict(
        { work_authorization: "needs_sponsorship" },
        "Dev role with Node.js and React.",
      ),
    ).toBe("ok");
  });
});

describe("languageVerdict — Quebec + francês", () => {
  it("penaliza Quebec + francês exigido + NCLC baixo", () => {
    expect(
      languageVerdict(
        { nclc_french: 4 },
        { text: "Poste à Montréal. Maîtrise du français requise." },
      ),
    ).toBe("below_requirement");
  });

  it("ok se o candidato tem NCLC suficiente", () => {
    expect(
      languageVerdict(
        { nclc_french: 8 },
        { text: "Poste à Montréal. Français requis." },
      ),
    ).toBe("ok");
  });

  it("ok fora de Quebec / sem francês exigido", () => {
    expect(
      languageVerdict({ nclc_french: null }, { text: "Toronto role, English." }),
    ).toBe("ok");
  });
});

describe("regulatedProfessionGap", () => {
  it("aponta gap quando a vaga menciona a profissão e não está licenciado", () => {
    const gap = regulatedProfessionGap(
      { regulated_profession: "P.Eng", license_status: "not_started" },
      "Looking for a P.Eng certified engineer.",
    );
    expect(gap).toContain("P.Eng");
    expect(gap).toContain("eligible for licensure");
  });

  it("null se já licenciado", () => {
    expect(
      regulatedProfessionGap(
        { regulated_profession: "P.Eng", license_status: "licensed" },
        "Looking for a P.Eng.",
      ),
    ).toBeNull();
  });

  it("null se não tem profissão regulada", () => {
    expect(
      regulatedProfessionGap(
        { regulated_profession: null, license_status: "na" },
        "Any job",
      ),
    ).toBeNull();
  });
});

describe("cefrToClb — conversão conservadora (mínimo da faixa)", () => {
  it("mapeia CEFR para o mínimo do CLB", () => {
    expect(cefrToClb("C1")).toBe(9);
    expect(cefrToClb("B2")).toBe(7);
    expect(cefrToClb("C2")).toBe(11);
  });

  it("extrai o CEFR de texto livre", () => {
    expect(cefrToClb("B2 - Intermediário Avançado / Advanced")).toBe(7);
  });

  it("null quando não há CEFR reconhecível", () => {
    expect(cefrToClb("Nativo")).toBeNull();
    expect(cefrToClb(null)).toBeNull();
  });
});
