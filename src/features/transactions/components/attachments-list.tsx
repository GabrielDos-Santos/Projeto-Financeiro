"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileText,
  ImageIcon,
  Loader2,
  Paperclip,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { createAttachment, deleteAttachment } from "../actions";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MIME_TYPES } from "../schemas";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function fileExtension(fileName: string, mimeType: string): string {
  const fromName = fileName.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  return mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[1]!;
}

const ACCEPT = ATTACHMENT_MIME_TYPES.join(",");

/** Anexos de um lançamento: upload direto ao bucket privado + metadados via action. */
export function AttachmentsList({ transactionId }: { transactionId: string }) {
  const queryClient = useQueryClient();
  const supabase = React.useMemo(() => createClient(), []);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{
    id: string;
    fileName: string;
  } | null>(null);
  const [isDeleting, startDelete] = React.useTransition();

  const attachmentsQuery = useQuery({
    queryKey: ["attachments", transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attachments")
        .select("id, file_name, storage_path, mime_type, size_bytes")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: true });
      if (error) throw new Error("Falha ao carregar os anexos.");
      return data;
    },
  });

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite reenviar o mesmo arquivo
    if (!file) return;

    if (!(ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
      toast.error(
        "Tipo não permitido. Use imagens (JPEG, PNG, WebP, GIF) ou PDF.",
      );
      return;
    }
    if (file.size === 0 || file.size > ATTACHMENT_MAX_BYTES) {
      toast.error("O arquivo precisa ter entre 1 byte e 10 MB.");
      return;
    }

    setIsUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessão expirada. Entre novamente.");
        return;
      }

      // Path exigido pela policy do bucket: user_id/transaction_id/uuid.ext
      const path = `${user.id}/${transactionId}/${crypto.randomUUID()}.${fileExtension(file.name, file.type)}`;
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file, { contentType: file.type });
      if (uploadError) {
        toast.error("Falha no upload. Tente novamente.");
        return;
      }

      const result = await createAttachment({
        transactionId,
        fileName: file.name,
        storagePath: path,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      if (!result.ok) {
        // Metadados falharam: remove o arquivo para não deixar órfão.
        await supabase.storage.from("attachments").remove([path]);
        toast.error(result.error);
        return;
      }

      toast.success("Anexo adicionado.");
      queryClient.invalidateQueries({
        queryKey: ["attachments", transactionId],
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(storagePath: string) {
    const { data, error } = await supabase.storage
      .from("attachments")
      .createSignedUrl(storagePath, 60);
    if (error || !data) {
      toast.error("Não foi possível gerar o link do arquivo.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await deleteAttachment(deleteTarget.id);
      if (!result.ok) {
        toast.error(result.error);
        setDeleteTarget(null);
        return;
      }
      toast.success("Anexo excluído.");
      queryClient.invalidateQueries({
        queryKey: ["attachments", transactionId],
      });
      setDeleteTarget(null);
    });
  }

  const attachments = attachmentsQuery.data ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          <Paperclip className="size-4" aria-hidden /> Anexos
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? <Loader2 className="animate-spin" /> : null}
          Adicionar
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleUpload}
          className="hidden"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Imagens ou PDF, até 10 MB (comprovantes, notas fiscais…).
      </p>

      {attachmentsQuery.isPending ? (
        <Skeleton className="h-9 w-full" />
      ) : attachments.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">Nenhum anexo.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-2 px-3 py-2"
            >
              {attachment.mime_type === "application/pdf" ? (
                <FileText className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm">
                {attachment.file_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatBytes(attachment.size_bytes)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                aria-label={`Baixar ${attachment.file_name}`}
                onClick={() => handleDownload(attachment.storage_path)}
              >
                <Download />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                aria-label={`Excluir ${attachment.file_name}`}
                onClick={() =>
                  setDeleteTarget({
                    id: attachment.id,
                    fileName: attachment.file_name,
                  })
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir anexo"
        description={`"${deleteTarget?.fileName ?? ""}" será excluído de forma permanente.`}
        confirmLabel="Excluir"
        destructive
        isPending={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
