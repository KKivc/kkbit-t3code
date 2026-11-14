import { translateUi } from "~/i18n/translate";
import type { ThreadTitleRegenerationOutcome } from "@t3tools/contracts";
import {
  type AtomCommandResult,
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";

import { stackedThreadToast } from "./ui/toast";

type TitleRegenerationResult = AtomCommandResult<ThreadTitleRegenerationOutcome | null, unknown>;

function failureMessage(result: TitleRegenerationResult): string | null {
  if (result._tag === "Failure") {
    if (isAtomCommandInterrupted(result)) return null;
    const error = squashAtomCommandFailure(result);
    return error instanceof Error ? error.message : translateUi("An error occurred.");
  }
  return result.value?.status === "failed"
    ? (result.value.message ?? translateUi("Title generation failed."))
    : null;
}

function isKept(result: TitleRegenerationResult): boolean {
  return result._tag === "Success" && result.value?.status === "unchanged";
}

export function titleRegenerationToast(results: ReadonlyArray<TitleRegenerationResult>) {
  const failures = results.flatMap((result) => {
    const message = failureMessage(result);
    return message === null ? [] : [message];
  });
  if (failures.length > 0) {
    return stackedThreadToast({
      type: "error",
      title:
        results.length === 1
          ? translateUi("Failed to regenerate thread title")
          : translateUi("Failed to regenerate {0} of {1} thread titles", [
              failures.length,
              results.length,
            ]),
      description: failures[0],
    });
  }
  const kept = results.filter(isKept).length;
  if (kept === 0) return null;
  if (results.length === 1) {
    return stackedThreadToast({
      type: "info",
      title: translateUi("Title kept"),
      description: translateUi("The current title already fits this thread."),
    });
  }
  return stackedThreadToast({
    type: "info",
    title:
      kept === results.length
        ? translateUi("Titles kept")
        : translateUi("Kept {0} of {1} titles", [kept, results.length]),
    description:
      kept === results.length
        ? translateUi("The current titles already fit these threads.")
        : translateUi("Those titles already fit their threads."),
  });
}
