import { translateUi } from "~/i18n/translate";
import { MICROPHONE_PERMISSION_ERROR } from "@t3tools/client-runtime/voice-input";
import { useNavigate } from "@tanstack/react-router";
import { RotateCcwIcon, SettingsIcon, XIcon } from "lucide-react";

import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { VoiceInputPill } from "./VoiceInputPill";

const VOICE_ERROR_LABELS: Record<string, string> = {
  [MICROPHONE_PERMISSION_ERROR]: translateUi("Microphone access needed"),
  "Microphone access is required for voice input.": translateUi("Microphone access needed"),
  "This draft is no longer available.": translateUi("Draft unavailable"),
  "Another voice recording is already active.": translateUi("Another recording active"),
  "Voice transcription is not available.": translateUi("Voice input unavailable"),
  "Voice transcription is still finishing. Try again shortly.": translateUi(
    "Transcription still busy",
  ),
  "Voice transcription is not available for this language.": translateUi("Language unsupported"),
  "Could not prepare voice transcription.": translateUi("Couldn’t prepare dictation"),
  "Could not start voice recording.": translateUi("Couldn’t start recording"),
  "Voice recording was interrupted.": translateUi("Recording interrupted"),
  "Could not finish voice recording.": translateUi("Couldn’t finish recording"),
  "Could not transcribe this recording.": translateUi("Transcription failed"),
  "Voice transcription on this environment failed.": translateUi("Transcription failed"),
  "The draft changed while voice input was running. The transcript was not added.":
    translateUi("Draft changed"),
  "No speech was detected.": translateUi("No speech detected"),
  "Microphone processing failed.": translateUi("Microphone processing failed"),
  "The microphone disconnected.": translateUi("Microphone disconnected"),
};

function voiceErrorLabel(error: string | null): string {
  return (error && VOICE_ERROR_LABELS[error]) || translateUi("Voice input failed");
}

export function VoiceInputErrorPill(props: {
  error: string | null;
  errorAction: "retry" | "settings" | null;
  disabled?: boolean;
  cancelShortcutLabel?: string | null;
  onRetry(): void;
  onDismiss(): void;
}) {
  const navigate = useNavigate();
  const openSettings = props.errorAction === "settings";
  const actionLabel = openSettings
    ? translateUi("Open voice settings")
    : props.error === translateUi("Could not transcribe this recording.") ||
        props.error === translateUi("Voice transcription on this environment failed.")
      ? translateUi("Retry transcription")
      : translateUi("Record again");
  return (
    <VoiceInputPill>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              size="icon-sm-pill"
              variant="ghost"
              aria-label={translateUi("Dismiss voice input error")}
              onPointerDown={(event) => event.preventDefault()}
              onClick={props.onDismiss}
            >
              <XIcon />
            </Button>
          }
        />
        <TooltipPopup side="top">
          {translateUi("Dismiss voice input error")}
          {props.cancelShortcutLabel ? ` (${props.cancelShortcutLabel})` : ""}
        </TooltipPopup>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              tabIndex={0}
              role="status"
              aria-label={props.error ?? translateUi("Voice input failed")}
              className="min-w-0 flex-1 truncate text-sm text-destructive"
            />
          }
        >
          {voiceErrorLabel(props.error)}
        </TooltipTrigger>
        <TooltipPopup side="top">{props.error ?? translateUi("Voice input failed")}</TooltipPopup>
      </Tooltip>
      {props.errorAction ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="icon-sm-pill"
                variant="ghost"
                aria-label={actionLabel}
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
              >
                {openSettings ? <SettingsIcon /> : <RotateCcwIcon />}
              </Button>
            }
          />
          <TooltipPopup side="top">{actionLabel}</TooltipPopup>
        </Tooltip>
      ) : null}
    </VoiceInputPill>
  );
}
