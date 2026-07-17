import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

/** Aplica os fieldErrors revalidados no servidor de volta ao formulário. */
export function applyFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldErrors?: Record<string, string[]>,
) {
  if (!fieldErrors) return;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages?.[0];
    if (message) {
      form.setError(field as Path<T>, { type: "server", message });
    }
  }
}
