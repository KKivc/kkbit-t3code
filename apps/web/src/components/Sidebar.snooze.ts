import { translateUi } from "~/i18n/translate";
import type { EnvironmentId } from "@t3tools/contracts";
import type { TimestampFormat } from "@t3tools/contracts/settings";
import {
  pickSnoozePreset as pickSharedSnoozePreset,
  resolveSnoozePresets as resolveSharedSnoozePresets,
  snoozeWakeLabel,
  type SnoozePreset,
} from "@t3tools/client-runtime/state/thread-settled";

import { appAtomRegistry } from "../rpc/atomRegistry";
import { serverEnvironment } from "../state/server";
import { formatShortTimestamp } from "../timestampFormat";
import { toastManager } from "./ui/toast";

export { snoozeWakeLabel, type SnoozePreset };

export function localizeSnoozePreset(preset: SnoozePreset): SnoozePreset {
  if (!preset.id.startsWith("after:")) return { ...preset, label: translateUi(preset.label) };
  const minutes = Number(preset.id.slice("after:".length));
  const divisor = minutes % 1440 === 0 ? 1440 : minutes % 60 === 0 ? 60 : 1;
  const amount = minutes / divisor;
  const unit = divisor === 1440 ? "day" : divisor === 60 ? "hour" : "minute";
  return { ...preset, label: translateUi(`In {0} ${unit}${amount === 1 ? "" : "s"}`, [amount]) };
}

/** The snooze menu for a thread, from its environment's presets, read when the menu opens. */
export function resolveSnoozePresets(
  now: Date,
  timestampFormat: TimestampFormat,
  environmentId: EnvironmentId,
): ReadonlyArray<SnoozePreset> {
  return resolveSharedSnoozePresets(now, snoozeOptions(timestampFormat, environmentId)).map(
    localizeSnoozePreset,
  );
}

/** A shown menu choice as picked; see the shared `pickSnoozePreset`. */
export function pickSnoozePreset(
  shown: ReadonlyArray<SnoozePreset>,
  id: string,
  timestampFormat: TimestampFormat,
  environmentId: EnvironmentId,
): SnoozePreset | undefined {
  const picked = pickSharedSnoozePreset({
    shown,
    id,
    now: new Date(),
    ...snoozeOptions(timestampFormat, environmentId),
  });
  if (!picked) {
    toastManager.add({
      type: "warning",
      title: translateUi("Could not snooze thread"),
      description: translateUi("That snooze time has passed. Choose another time."),
    });
  }
  return picked ? localizeSnoozePreset(picked) : undefined;
}

function snoozeOptions(timestampFormat: TimestampFormat, environmentId: EnvironmentId) {
  const presets = appAtomRegistry.get(
    serverEnvironment.settingsValueAtom(environmentId),
  )?.snoozePresets;
  return {
    ...(presets ? { presets } : {}),
    formatTime: (date: Date) => formatShortTimestamp(date.toISOString(), timestampFormat),
  };
}
