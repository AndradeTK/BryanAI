import { describe, it, expect } from "vitest";
import { parseId, ErroDeUso } from "./api";

describe("parseId", () => {
  it("aceita inteiros positivos", () => {
    expect(parseId("1")).toBe(1);
    expect(parseId("42")).toBe(42);
    expect(parseId("999999")).toBe(999999);
  });

  /**
   * Regressão: `/api/jobs/triage-import` casava com a rota dinâmica
   * `/api/jobs/[id]`, `Number("triage-import")` virava NaN, o NaN chegava ao
   * Postgres e o 500 devolvia a query inteira — com nomes de tabela e coluna —
   * no corpo da resposta.
   */
  it("recusa o que não é número, em vez de deixar NaN chegar ao banco", () => {
    for (const ruim of ["abc", "triage-import", "", " ", "1abc", "NaN"]) {
      expect(() => parseId(ruim)).toThrow(ErroDeUso);
    }
  });

  it("recusa zero, negativos e fracionários", () => {
    for (const ruim of ["0", "-1", "-999", "1.5", "0.1"]) {
      expect(() => parseId(ruim)).toThrow(ErroDeUso);
    }
  });

  it("recusa notação que o Number() aceitaria por acidente", () => {
    // Number() aceita todos estes; nenhum aparece num link do sistema.
    for (const ruim of ["0x10", "1e3", " 1", "1 ", "+1", "1.0", "Infinity"]) {
      expect(() => parseId(ruim)).toThrow(ErroDeUso);
    }
  });

  it("recusa inteiro acima do seguro em vez de arredondar", () => {
    expect(() => parseId("9007199254740993")).toThrow(ErroDeUso);
  });

  it("responde 400, não 500", () => {
    try {
      parseId("abc");
      expect.unreachable("deveria ter lançado");
    } catch (e) {
      expect(e).toBeInstanceOf(ErroDeUso);
      expect((e as ErroDeUso).status).toBe(400);
    }
  });
});
