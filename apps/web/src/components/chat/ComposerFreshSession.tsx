import { translateUi } from "~/i18n/translate";
import { EraserIcon } from "lucide-react";

import type { ComposerBannerStackItem } from "./ComposerBannerStack";

/** Shown while `/clear` is armed; dismissing it keeps the current conversation. */
export function freshSessionBannerItem(onUndo: () => void): ComposerBannerStackItem {
  return {
    id: "fresh-session",
    variant: "info",
    icon: <EraserIcon />,
    title: translateUi("Your next message starts a fresh session"),
    description: translateUi("The agent won't see earlier messages in this thread."),
    dismissLabel: translateUi("Keep the current session"),
    onDismiss: onUndo,
  };
}
