"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { track } from "@/lib/analytics";
import { interpretBasic } from "@/lib/assistant/basic";
import { MAX_MESSAGE_CHARS, MAX_TOOL_ROUNDS, type AssistantResponse, type ChatMessage, type ToolCall } from "@/lib/assistant/protocol";
import { useAssistant } from "@/lib/assistant/store";
import { parseToolCall } from "@/lib/assistant/tools";
import { getCategory } from "@/lib/catalog";
import type { Design } from "@/lib/design/design";
import { useConfigurator, type StepId } from "@/lib/store/configurator";

interface ExecResult {
  ok: boolean;
  label: string;
  content: string;
  navigate?: string;
}

/** Ejecuta una llamada de herramienta sobre el configurador y devuelve el resultado REAL. */
function executeCall(c: ToolCall): ExecResult {
  const store = useConfigurator.getState();
  const intent = parseToolCall(c.name, c.arguments);
  switch (intent.kind) {
    case "error":
      return { ok: false, label: intent.error, content: JSON.stringify({ ok: false, error: intent.error }) };
    case "undo": {
      const r = store.undo();
      return { ok: r.ok, label: r.summary, content: JSON.stringify(r.ok ? { ok: true, aplicado: r.summary } : { ok: false, error: r.summary }) };
    }
    case "note": {
      const current = store.active ? store.drafts[store.active]?.details.notas ?? "" : "";
      const notas = current ? `${current}\n${intent.text}` : intent.text;
      const r = store.dispatch({ type: "setDetails", patch: { notas } }, "asistente");
      return r.ok
        ? { ok: true, label: "Observación agregada", content: JSON.stringify({ ok: true, aplicado: "Observación agregada para el carpintero" }) }
        : { ok: false, label: r.error, content: JSON.stringify({ ok: false, error: r.error }) };
    }
    case "step": {
      if (intent.target === "revision") return { ok: true, label: "Abriendo la revisión", content: JSON.stringify({ ok: true, aplicado: "Se abrirá la revisión del diseño" }), navigate: "/disenar/revision" };
      if (intent.target === "cotizacion") return { ok: true, label: "Abriendo el formulario", content: JSON.stringify({ ok: true, aplicado: "Se abrirá el formulario de cotización" }), navigate: "/disenar/solicitud" };
      store.setStep(intent.target as StepId);
      return { ok: true, label: `Paso: ${intent.target}`, content: JSON.stringify({ ok: true, aplicado: `Paso abierto: ${intent.target}` }) };
    }
    case "action": {
      const r = store.dispatch(intent.action, "asistente");
      if (!r.ok) return { ok: false, label: r.error, content: JSON.stringify({ ok: false, error: r.error }) };
      if (intent.action.type === "setWood") track("madera_cambiada", { categoria: r.design.category, madera: r.design.wood, origen: "asistente" });
      return { ok: true, label: r.summary, content: JSON.stringify({ ok: true, aplicado: r.summary, advertencias: r.warnings }) };
    }
  }
}

function currentDesign(): Design | undefined {
  const s = useConfigurator.getState();
  return s.active ? s.drafts[s.active] : undefined;
}

export function AssistantPanel({ design }: { design: Design }) {
  const router = useRouter();
  const { display, mode, busy, push, pushHistory, set } = useAssistant();
  const [text, setText] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const cat = getCategory(design.category)!;

  useEffect(() => {
    if (useAssistant.getState().display.length === 0) {
      const greeting = `¡Hola! Soy el asistente de diseño de Kamura. Puedo ayudarte con las medidas, la madera y los detalles, y aplicar los cambios por vos. ¿Qué te gustaría ajustar de tu ${cat.singular}?`;
      push({ kind: "assistant", text: greeting });
      pushHistory({ role: "assistant", content: greeting });
    }
    if (useAssistant.getState().mode === "unknown") {
      fetch("/api/assistant")
        .then((r) => r.json())
        .then((d) => set({ mode: d.available ? "ai" : "basic" }))
        .catch(() => set({ mode: "basic" }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [display.length, busy]);

  const runBasic = (message: string) => {
    const d = currentDesign();
    if (!d) return;
    const r = interpretBasic(message, d);
    if (r.reply) {
      push({ kind: "assistant", text: r.reply });
      pushHistory({ role: "assistant", content: r.reply });
      return;
    }
    const results = r.calls.map(executeCall);
    results.forEach((x) => push({ kind: "applied", text: x.label, ok: x.ok }));
    const okCount = results.filter((x) => x.ok).length;
    const reply =
      okCount === results.length
        ? "Listo, ya lo ves en el modelo. ¿Querés ajustar algo más?"
        : okCount > 0
          ? "Apliqué parte de lo que pediste; lo que no se pudo está marcado arriba."
          : "No pude aplicar ese cambio. Podés probar con otro valor o usar los controles del panel.";
    push({ kind: "assistant", text: reply });
    pushHistory({ role: "assistant", content: reply });
    const nav = results.find((x) => x.navigate)?.navigate;
    if (nav) router.push(nav);
  };

  const send = async (raw: string) => {
    const message = raw.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!message || busy) return;
    setText("");
    push({ kind: "user", text: message });
    pushHistory({ role: "user", content: message });
    track("asistente_usado", { categoria: design.category }, { once: true });

    if (useAssistant.getState().mode !== "ai") {
      runBasic(message);
      return;
    }

    set({ busy: true });
    let navigate: string | undefined;
    try {
      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: useAssistant.getState().history, design: currentDesign(), toolRound: round }),
        });
        const data = (await res.json().catch(() => ({ type: "error", error: "Respuesta inválida.", code: "upstream" }))) as AssistantResponse;
        if (data.type === "message") {
          push({ kind: "assistant", text: data.content });
          pushHistory({ role: "assistant", content: data.content });
          break;
        }
        if (data.type === "error") {
          if (data.code === "unavailable") {
            set({ mode: "basic" });
            push({ kind: "assistant", text: "El asistente inteligente no está disponible ahora. Sigo en modo básico: entiendo pedidos simples." });
            runBasic(message);
          } else if (data.code === "upstream") {
            push({ kind: "assistant", text: `${data.error} Mientras tanto, intento interpretar tu pedido en modo básico.` });
            runBasic(message);
          } else {
            push({ kind: "assistant", text: data.error });
          }
          break;
        }
        // La IA pidió cambios: se ejecutan acá y se le devuelve el resultado real.
        pushHistory(data.message as ChatMessage);
        for (const c of data.message.tool_calls) {
          const r = executeCall(c);
          if (r.navigate) navigate = r.navigate;
          push({ kind: "applied", text: r.label, ok: r.ok });
          pushHistory({ role: "tool", tool_call_id: c.id, name: c.name, content: r.content });
        }
      }
    } catch {
      push({ kind: "assistant", text: "No me pude conectar. Revisá tu conexión e intentá de nuevo; tu diseño no se perdió." });
    } finally {
      set({ busy: false });
    }
    if (navigate) router.push(navigate);
  };

  const suggestions = [
    "¿Qué madera me recomendás para un ambiente luminoso?",
    "Ayudame a definir las medidas",
    "Quiero verlo en paraíso",
    "¿Qué pasa después de pedir la cotización?",
  ];

  return (
    <div className="chat">
      {mode === "basic" && (
        <p className="chat-mode">
          <Icon name="alert" size={13} /> Modo básico: el asistente con IA no está disponible y solo entiendo pedidos simples.
        </p>
      )}
      <div className="chat-log" ref={logRef} aria-live="polite" aria-label="Conversación con el asistente">
        {display.map((m, i) =>
          m.kind === "applied" ? (
            <span key={i} className={`msg-applied ${m.ok ? "" : "failed"}`}>
              <Icon name={m.ok ? "check" : "alert"} size={13} />
              {m.ok ? m.text : `No se aplicó: ${m.text}`}
            </span>
          ) : (
            <div key={i} className={`msg-bubble ${m.kind}`}>
              {m.text}
            </div>
          ),
        )}
        {busy && (
          <div className="msg-bubble assistant" aria-label="El asistente está escribiendo">
            <span className="typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>
      {display.length <= 1 && (
        <div className="chat-suggestions">
          {suggestions.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <label htmlFor="chat-input" className="visually-hidden">
          Escribí tu consulta
        </label>
        <textarea
          id="chat-input"
          rows={1}
          value={text}
          maxLength={MAX_MESSAGE_CHARS}
          placeholder="Escribí tu consulta o pedido…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(text);
            }
          }}
        />
        <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()} aria-label="Enviar">
          <Icon name="send" size={17} />
        </button>
      </form>
    </div>
  );
}
