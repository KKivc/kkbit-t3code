import { translateUi } from "~/i18n/translate";
import { MICROPHONE_PERMISSION_ERROR } from "@t3tools/client-runtime/voice-input";
import { useNavigate } from "@tanstack/react-router";
import { CircleAlertIcon, XIcon } from "lucide-react";

import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { VoiceInputPill } from "./VoiceInputPill";

const VOICE_ERROR_LABELS: Record<string, string> = {
  [MICROPHONE_PERMISSION_ERROR]: translateUi("Mic blocked"),
  "Microphone access is required for voice input.": translateUi("Mic blocked"),
  "This draft is no longer available.": translateUi("Draft unavailable"),
  "Another voice recording is already active.": translateUi("Already recording"),
  "Voice transcription is not available.": translateUi("Voice input unavailable"),
  "Voice transcription is still finishing. Try again shortly.": translateUi("Still transcribing"),
  "Voice transcription is not available for this language.": translateUi("Language unsupported"),
  "Could not prepare voice transcription.": "Couldn’t start",
  "Could not start voice recording.": "Couldn’t start",
  "Voice recording was interrupted.": translateUi("Recording interrupted"),
  "Could not finish voice recording.": "Couldn’t finish",
  "Could not transcribe this recording.": translateUi("Transcription failed"),
  "Voice transcription on this environment failed.": translateUi("Transcription failed"),
  "The draft changed while voice input was running. The transcript was not added.":
    translateUi("Draft changed"),
  "No speech was detected.": translateUi("No speech heard"),
  "Microphone processing failed.": translateUi("Mic failed"),
  "The microphone disconnected.": translateUi("Mic disconnected"),
};

const RETRYABLE_TRANSCRIPTIONS = new Set([
  translateUi("Could not transcribe this recording."),
  translateUi("Voice transcription on this environment failed."),
]);

export function VoiceInputErrorPill(props: {
  error: string | null;
  errorAction: "retry" | "settings" | null;
  disabled?: boolean;
  cancelShortcutLabel?: string | null;
  size?: "default" | "compact" | undefined;
  onRetry(): void;
  onDismiss(): void;
}) {
  const navigate = useNavigate();
  const message = props.error ?? translateUi("Voice input failed");
  const openSettings = props.errorAction === "settings";
  const compact = props.size === "compact";
  const action = openSettings
    ? { label: translateUi("Open voice settings"), text: translateUi("Settings") }
    : props.error && RETRYABLE_TRANSCRIPTIONS.has(props.error)
      ? { label: translateUi("Retry transcription"), text: translateUi("Retry") }
      : { label: translateUi("Record again"), text: translateUi("Record again") };
  return (
    <VoiceInputPill tone="error" size={props.size}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              size={compact ? "icon-xs" : "icon-sm-pill"}
              variant="ghost"
              aria-label={translateUi("Dismiss voice input error")}
              onPointerDown={(event) => event.preventDefault()}
              onClick={props.onDismiss}
              className="shrink-0"
            >
              <XIcon />
            </Button>
          }
        />
        <TooltipPopup side="top">
          {translateUi("Dismiss")}
          {props.cancelShortcutLabel ? ` (${props.cancelShortcutLabel})` : ""}
        </TooltipPopup>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              tabIndex={0}
              role="status"
              aria-label={message}
              className="flex min-w-0 items-center gap-1.5 rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            />
          }
        >
          <CircleAlertIcon aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">
            {(props.error && VOICE_ERROR_LABELS[props.error]) || translateUi("Voice input failed")}
          </span>
        </TooltipTrigger>
        <TooltipPopup side="top">{message}</TooltipPopup>
      </Tooltip>
      {props.errorAction ? (
        <Button
          type="button"
          size={compact ? "xs" : "sm-pill"}
          variant="outline"
          aria-label={action.label}
          disabled={props.disabled}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            if (openSettings) {
              props.onDismiss();
              void navigate({ to: "/settings/voice" });
            } else {
              props.onRetry();
            }
          }}
          className="ms-auto shrink-0"
        >
          {action.text}
        </Button>
      ) : (
        <span aria-hidden className="w-1.5 shrink-0" />
      )}
    </VoiceInputPill>
  );
}
