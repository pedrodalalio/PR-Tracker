import { useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

const DRAFT_PREFIX = "pr-tracker:draft:";
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface DraftEnvelope<T> {
  values: T;
  savedAt: number;
}

export interface FormDraftState {
  restoredAt: Date | null;
  discard: () => void;
}

function storageKey(key: string) {
  return `${DRAFT_PREFIX}${key}`;
}

export function clearFormDraft(key: string) {
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    // ignore
  }
}

export function useFormDraft<T extends FieldValues>(
  form: UseFormReturn<T>,
  key: string | null,
): FormDraftState {
  const [restoredAt, setRestoredAt] = useState<Date | null>(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!key || restoredRef.current) return;
    const fullKey = storageKey(key);
    let raw: string | null;
    try {
      raw = localStorage.getItem(fullKey);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as DraftEnvelope<T>;
      const age = Date.now() - parsed.savedAt;
      if (!parsed.values || age > DRAFT_TTL_MS) {
        localStorage.removeItem(fullKey);
        return;
      }
      // form.reset replaces every field, including ones missing from the draft
      // (gets defaultValues semantics for free).
      form.reset(parsed.values);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRestoredAt(new Date(parsed.savedAt));
      restoredRef.current = true;
    } catch {
      localStorage.removeItem(fullKey);
    }
  }, [key, form]);

  useEffect(() => {
    if (!key) return;
    const fullKey = storageKey(key);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const sub = form.watch((values) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const payload: DraftEnvelope<T> = {
            values: values as T,
            savedAt: Date.now(),
          };
          localStorage.setItem(fullKey, JSON.stringify(payload));
        } catch {
          // storage cheio / privacy mode — não trava o form.
        }
      }, 400);
    });
    return () => {
      if (timer) clearTimeout(timer);
      sub.unsubscribe();
    };
  }, [key, form]);

  const discard = () => {
    if (!key) return;
    clearFormDraft(key);
    setRestoredAt(null);
    restoredRef.current = false;
  };

  return { restoredAt, discard };
}
