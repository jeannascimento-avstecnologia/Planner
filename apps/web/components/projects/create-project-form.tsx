"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBoard } from "@/app/(app)/boards/actions";
import { inputClass, btnPrimary } from "@/lib/ui-classes";
import { appToast } from "@/lib/toast";
import { IconPicker } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";

export function CreateProjectForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      await createBoard(formData);
      appToast.success("Projeto criado");
      router.refresh();
    });
  }

  return (
    <form
      action={submit}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-aurora-border bg-aurora-surface p-3"
    >
      <input name="name" placeholder="Nome do projeto" required className={inputClass + " min-w-40 flex-1"} />
      <input
        name="description"
        placeholder="Descricao (opcional)"
        className={inputClass + " min-w-40 flex-1"}
      />
      <IconPicker name="icon" />
      <ColorPicker name="color" />
      <button type="submit" disabled={pending} className={btnPrimary + " shrink-0"}>
        {pending ? "Criando..." : "Novo projeto"}
      </button>
    </form>
  );
}
