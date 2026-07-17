"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { formatDateBR, parseDateOnly, toDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DatePickerProps = {
  /** Data como "YYYY-MM-DD" (formato do banco) ou "" quando vazia. */
  value: string;
  onValueChange: (iso: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function DatePicker({
  value,
  onValueChange,
  placeholder = "Escolha uma data",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? parseDateOnly(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4" />
          {value ? formatDateBR(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (date) {
              onValueChange(toDateOnly(date));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
