import { afterEach, describe, expect, it, vi } from "vitest";
import { interpretBasic } from "@/lib/assistant/basic";
import { buildSystemPrompt } from "@/lib/assistant/context";
import { trimHistory } from "@/lib/assistant/history";
import type { ChatMessage } from "@/lib/assistant/protocol";
import { parseToolCall } from "@/lib/assistant/tools";
import { applyAction } from "@/lib/design/actions";
import { createDesign } from "@/lib/design/design";
import { chatCompletion } from "@/lib/server/ai";

const names = (text: string, d = createDesign("mesa")) => interpretBasic(text, d).calls.map((c) => [c.name, JSON.parse(c.arguments)]);

describe("herramientas del asistente", () => {
  it("traduce llamadas a acciones validadas", () => {
    const i = parseToolCall("cambiar_medida", JSON.stringify({ medida: "largo", valor_cm: 210 }));
    expect(i.kind).toBe("action");
    if (i.kind === "action") {
      const r = applyAction(createDesign("mesa"), i.action);
      expect(r.ok && r.design.dimensions.largo).toBe(210);
    }
  });
  it("rechaza herramientas desconocidas y JSON inválido", () => {
    expect(parseToolCall("ejecutar_codigo", "{}").kind).toBe("error");
    expect(parseToolCall("cambiar_medida", "{no json").kind).toBe("error");
  });
});

describe("modo básico", () => {
  it("entiende cambios de madera", () => {
    expect(names("Quiero ver cómo queda en paraíso")).toEqual([["cambiar_madera", { madera: "paraiso" }]]);
  });
  it("entiende 'un poco más larga'", () => {
    const [[name, args]] = names("Quiero que la mesa sea un poco más larga");
    expect(name).toBe("cambiar_medida");
    expect(args.medida).toBe("largo");
    expect(args.valor_cm).toBeGreaterThan(180);
  });
  it("entiende cantidades en palabras", () => {
    expect(names("me gustaría que tenga tres cajones", createDesign("escritorio", "con-cajonera"))).toEqual([["cambiar_opcion", { opcion: "cajones", valor: "3" }]]);
    expect(names("prefiero una biblioteca con más estantes", createDesign("biblioteca"))).toContainEqual(["cambiar_opcion", { opcion: "estantes", valor: "5" }]);
  });
  it("entiende 'volvamos al diseño anterior'", () => {
    expect(names("Volvamos al diseño anterior")).toEqual([["deshacer", {}]]);
  });
  it("no da precios", () => {
    const r = interpretBasic("¿cuánto cuesta?", createDesign("mesa"));
    expect(r.calls).toEqual([]);
    expect(r.reply).toMatch(/cotización/);
  });
});

describe("contexto de la IA", () => {
  it("incluye el estado actual, las claves válidas y las reglas", () => {
    const p = buildSystemPrompt(createDesign("rack"));
    expect(p).toContain("ancho");
    expect(p).toContain("modulos");
    expect(p).toMatch(/NUNCA digas que hiciste un cambio/);
    expect(p).toMatch(/No des precios/);
  });
  it("recorta el historial sin cortar una ronda de herramientas", () => {
    const msgs: ChatMessage[] = [];
    for (let i = 0; i < 20; i++) {
      msgs.push({ role: "user", content: `m${i}` });
      msgs.push({ role: "assistant", content: "", tool_calls: [{ id: `c${i}`, name: "deshacer", arguments: "{}" }] });
      msgs.push({ role: "tool", tool_call_id: `c${i}`, name: "deshacer", content: "{}" });
    }
    const t = trimHistory(msgs, 10);
    expect(t[0].role).toBe("user");
    expect(t.length).toBeLessThanOrEqual(10);
  });
});

describe("proveedor de IA", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("envía herramientas y devuelve las llamadas del modelo", async () => {
    vi.stubEnv("AI_API_KEY", "test");
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.tools.length).toBeGreaterThan(5);
      expect(body.messages[0].role).toBe("system");
      return new Response(
        JSON.stringify({ choices: [{ message: { content: null, tool_calls: [{ id: "x1", function: { name: "cambiar_madera", arguments: '{"madera":"lapacho"}' } }] } }] }),
      );
    });
    const r = await chatCompletion("sys", [{ role: "user", content: "en lapacho" }], { allowTools: true, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.toolCalls).toEqual([{ id: "x1", name: "cambiar_madera", arguments: '{"madera":"lapacho"}' }]);
  });
  it("informa errores del proveedor", async () => {
    vi.stubEnv("AI_API_KEY", "test");
    const fetchImpl = async () => new Response("cuota", { status: 429 });
    await expect(chatCompletion("s", [{ role: "user", content: "hola" }], { allowTools: true, fetchImpl })).rejects.toMatchObject({ status: 429 });
  });
});
