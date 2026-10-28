"use client";
import type { Design } from "@/lib/design/design";
import { Viewer } from "./Viewer";

export function RenderStage({ design }: { design: Design }) {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Viewer design={design} toolbar={false} hint={false} />
    </div>
  );
}
