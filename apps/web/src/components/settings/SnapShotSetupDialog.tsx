import { translateUi } from "~/i18n/translate";
import { PermissionChecklist, PermissionContinueButton } from "../permissions/PermissionChecklist";
import { usePermissionStatus } from "../permissions/usePermissionStatus";
import {
  isModifierPairShortcut,
  type DesktopSnapShotSetupAction,
  type DesktopSnapShotState,
} from "@t3tools/contracts";
import { useState, type ReactNode } from "react";
import { MacAccessibilityIcon, MacScreenRecordingIcon } from "../Icons";
import { CaptureShortcutConfig } from "./CaptureShortcutConfig";
import { Button } from "../ui/button";
import { Dialog, DialogDescription } from "../ui/dialog";
import { WizardSteps, WizardPopup, WizardHeader, WizardPanel, WizardFooter } from "../ui/wizard";
import {
  captureSetupAccessReady,
  captureSetupBackend,
  captureSetupCheckMessage,
  captureSetupDesktopName,
  captureSetupInitialStep,
  captureSetupShortcutReady,
  type CaptureSetupStep,
} from "./SnapShotSetupDialog.logic";

const SETUP_STEPS = [
  { id: "access", label: "Access" },
  { id: "shortcut", label: "Shortcut" },
] as const;

const GNOME_ACCESS_COPY = {
  "not-installed": {
    title: translateUi("Install the extension"),
    description: translateUi(
      "The T3 Code GNOME extension lets you capture other windows and bring them into your draft. Sign out once after installing.",
    ),
  },
  "restart-required": {
    title: translateUi("Extension installed"),
    description: translateUi(
      "Save your work, then sign out and back in. Your setup will be waiting here.",
    ),
  },
  "update-required": {
    title: translateUi("Update the extension"),
    description: translateUi("Install the update, then sign out and back in."),
  },
  "extensions-disabled": {
    title: translateUi("Allow GNOME extensions"),
    description: translateUi("Open GNOME Extensions and turn on extensions, then check again."),
  },
  disabled: {
    title: translateUi("Enable the extension"),
    description: translateUi("Enable T3 Code SnapShots to start capturing windows."),
  },
  enabled: {
    title: translateUi("Capture is ready"),
    description: translateUi("Next, choose your shortcut."),
  },
  unsupported: {
    title: translateUi("Automatic capture isn't available"),
    description: translateUi("Use Take snapshot from the command palette to choose a window."),
  },
  error: {
    title: translateUi("Couldn't set up the extension"),
    description: translateUi("Check T3 Code SnapShots in GNOME Extensions, then try again."),
  },
};

export function SnapShotSetupDialog({
  state,
  initialStep,
  wasEnabled,
  includeAccessibility,
  busy: actionBusy,
  error,
  shortcutInput,
  shortcutStatus,
  shortcutChanged,
  canSaveShortcut,
  onSaveShortcut,
  onEnable,
  onAction,
  onRefresh,
  onClose,
  onLeaveStep,
}: {
  state: DesktopSnapShotState;
  initialStep: CaptureSetupStep;
  wasEnabled: boolean;
  includeAccessibility: boolean;
  busy: boolean;
  error: string | null;
  shortcutInput: ReactNode;
  shortcutStatus: string | null | undefined;
  shortcutChanged: boolean;
  canSaveShortcut: boolean;
  onSaveShortcut: () => Promise<boolean>;
  onEnable: () => Promise<boolean>;
  onAction: (action: DesktopSnapShotSetupAction) => Promise<void>;
  onRefresh: () => Promise<DesktopSnapShotState | undefined>;
  onClose: (completed: boolean) => Promise<void>;
  onLeaveStep: () => void;
}) {
  const [step, setStep] = useState(() => captureSetupInitialStep(state, initialStep));
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [configBusy, setConfigBusy] = useState(false);
  const busy = actionBusy || checking || configBusy;
  const backend = captureSetupBackend(state);
  const configShortcut = backend === "niri" || backend === "hyprland";
  const desktop = captureSetupDesktopName(state);
  const extension = state.gnomeExtension;
  const helper = backend === "hyprland" ? state.hyprlandHelper : state.kdeHelper;
  const helperBackend = backend === "kde" || backend === "hyprland";
  const installHelper = backend === "hyprland" ? "install-hyprland-helper" : "install-kde-helper";
  const removeHelper = backend === "hyprland" ? "remove-hyprland-helper" : "remove-kde-helper";
  const accessReady = captureSetupAccessReady(state);
  const permissionStatus = usePermissionStatus(
    async () => {
      const refreshed = await onRefresh();
      if (!refreshed?.macPermissions) throw new Error(translateUi("Permission status unavailable"));
      return refreshed.macPermissions;
    },
    state.macPermissions ?? { screenRecording: false, accessibility: false },
    Boolean(state.macPermissions) && step === "access" && !busy,
  );
  const macPermissions = state.macPermissions ? permissionStatus.status : undefined;
  const macPermissionsReady =
    !macPermissions ||
    permissionStatus.isReady(
      includeAccessibility ? ["screenRecording", "accessibility"] : ["screenRecording"],
    );
  const shortcutReady = captureSetupShortcutReady(state, shortcutChanged);
  const install = extension?.status === "not-installed" || extension?.status === "update-required";
  const enable = extension?.status === "disabled";
  const changeStep = (next: CaptureSetupStep) => {
    onLeaveStep();
    setChecked(false);
    setStep(next);
  };
  const checkAgain = async () => {
    if (busy) return;
    setChecking(true);
    setChecked(false);
    const refreshed = await onRefresh().finally(() => setChecking(false));
    setChecked(refreshed !== undefined);
  };
  const accessCopy =
    state.message && !macPermissions
      ? {
          title: translateUi("Let's try that again"),
          description: translateUi("Couldn't check snapshots. Try again to continue."),
        }
      : backend === "gnome" && extension
        ? extension.status === "enabled" && !accessReady
          ? {
              title: translateUi("Check capture access"),
              description: translateUi("The extension isn't ready yet. Try again in a moment."),
            }
          : GNOME_ACCESS_COPY[extension.status]
        : helperBackend
          ? helper?.status === "ready"
            ? {
                title: translateUi("Capture is ready"),
                description: translateUi("Next, choose your shortcut."),
              }
            : helper?.status === "error"
              ? {
                  title: translateUi("Let's fix capture access"),
                  description: translateUi(
                    "Try reinstalling the capture helper, then check again.",
                  ),
                }
              : {
                  title:
                    helper?.status === "update-required"
                      ? translateUi("Update the capture helper")
                      : translateUi("Allow snapshots"),
                  description: translateUi(
                    "T3 Code's capture helper lets you capture other apps and return to your draft. It's included with T3 Code.",
                  ),
                }
          : backend === "niri"
            ? {
                title: translateUi("Capture is ready"),
                description: translateUi("Next, choose your shortcut."),
              }
            : backend === "picker"
              ? {
                  title: translateUi("Choose a window each time"),
                  description: translateUi(
                    "Your desktop doesn't support automatic capture. You'll choose the window to capture instead.",
                  ),
                }
              : {
                  title: translateUi("Allow snapshots"),
                  description:
                    backend === "portal"
                      ? translateUi("Your desktop may ask for permission when you first capture.")
                      : macPermissions
                        ? macPermissionsReady
                          ? translateUi(
                              "Test a snapshot of the current window. If macOS asks to bypass its window picker, choose Allow. The test image is discarded.",
                            )
                          : translateUi("Allow each permission, then continue.")
                        : translateUi("Allow access when prompted to start capturing windows."),
                };
  const title = step === "access" ? accessCopy.title : translateUi("Choose your shortcut");
  const description =
    step === "access"
      ? accessCopy.description
      : configShortcut
        ? translateUi("Click the shortcut, then press the keys you want.")
        : state.mode === "portal"
          ? translateUi("Choose your keys, then approve the permission prompt if asked.")
          : translateUi("Use both Shift keys, or record a different shortcut.");
  const stepIndex = SETUP_STEPS.findIndex(({ id }) => id === step);
  const details = [
    ...new Set(
      [
        error,
        ...(step === "access"
          ? [
              state.message,
              backend === "gnome" &&
              (extension?.status === "error" || extension?.status === "unsupported")
                ? extension.message
                : null,
              helperBackend && helper?.status === "error" ? helper.message : null,
            ]
          : []),
      ].filter((detail) => detail !== null),
    ),
  ];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) void onClose(false);
      }}
    >
      <WizardPopup showCloseButton={!busy}>
        <WizardHeader
          title={desktop ? `Set up snapshots for ${desktop}` : translateUi("Set up snapshots")}
        >
          <WizardSteps
            steps={SETUP_STEPS.map((item) => item.label)}
            currentStep={stepIndex}
            isStepDisabled={(index) => busy || index > stepIndex}
            onStepChange={(index) => {
              const next = SETUP_STEPS[index];
              if (next && next.id !== step) changeStep(next.id);
            }}
          />
        </WizardHeader>
        <WizardPanel>
          <div className="space-y-4 text-sm">
            <div className="space-y-2" aria-live="polite">
              <h3 className="flex items-center gap-2 font-medium">{title}</h3>
              <DialogDescription>{description}</DialogDescription>
            </div>
            {step === "access" ? (
              <>
                <p
                  role="status"
                  aria-atomic="true"
                  className={
                    checked && !busy && !error ? "text-xs text-muted-foreground" : "sr-only"
                  }
                >
                  {checked && !busy && !error ? captureSetupCheckMessage(state) : null}
                </p>
                {macPermissions ? (
                  <PermissionChecklist
                    busy={busy}
                    permissions={[
                      {
                        id: "screenRecording",
                        icon: <MacScreenRecordingIcon className="size-8 shrink-0 drop-shadow-sm" />,
                        title: translateUi("Screen Recording"),
                        description: translateUi("Capture the window you're using."),
                        granted: macPermissions.screenRecording,
                        onAllow: () => void onAction("allow-screen-recording"),
                      },
                      {
                        id: "accessibility",
                        icon: <MacAccessibilityIcon className="size-8 shrink-0 drop-shadow-sm" />,
                        title: translateUi("Accessibility"),
                        description: includeAccessibility
                          ? translateUi("Include text and controls from the captured app.")
                          : translateUi(
                              "Optional. Include text and controls from the captured app.",
                            ),
                        granted: macPermissions.accessibility,
                        onAllow: () => void onAction("allow-accessibility"),
                      },
                    ]}
                  />
                ) : null}
                {permissionStatus.error && macPermissions ? (
                  <p role="status" className="text-xs text-muted-foreground">
                    {permissionStatus.error}
                  </p>
                ) : null}
                {helperBackend && helper?.status === "error" ? (
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void onAction(installHelper)}
                  >
                    {translateUi("Reinstall helper")}
                  </Button>
                ) : null}
              </>
            ) : configShortcut ? (
              <CaptureShortcutConfig
                state={state}
                disabled={actionBusy || checking || !accessReady}
                onBusyChange={setConfigBusy}
                onSaved={onRefresh}
                onComplete={() => onClose(true)}
              />
            ) : (
              <div className="space-y-3">
                {shortcutInput}
                {shortcutStatus ? (
                  <p className="text-xs text-muted-foreground" role="status">
                    {shortcutStatus}
                  </p>
                ) : null}
                {!shortcutChanged &&
                !state.shortcutRegistered &&
                !state.shortcutPending &&
                state.shortcutCanRetry !== false &&
                !isModifierPairShortcut(state.shortcut) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void onAction("retry-shortcut")}
                  >
                    {state.mode === "portal"
                      ? translateUi("Shortcut permissions")
                      : translateUi("Try again")}
                  </Button>
                ) : null}
              </div>
            )}
            {step === "shortcut" && !accessReady ? (
              <p role="alert" className="text-destructive">
                {translateUi("Capture needs attention. Go back to check access.")}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-destructive">
                {translateUi("Couldn't finish this step. Try again or check Advanced for help.")}
              </p>
            ) : null}
            {details.length > 0 || (step === "access" && (backend === "gnome" || helperBackend)) ? (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">{translateUi("Advanced")}</summary>
                <div className="mt-3 space-y-3">
                  {details.map((detail) => (
                    <p key={detail} className="break-words">
                      {detail}
                    </p>
                  ))}
                  {step === "access" && (backend === "gnome" || helperBackend) ? (
                    <p>{translateUi("Included with T3 Code. No download needed.")}</p>
                  ) : null}
                  {step === "access" && backend === "gnome" && extension?.status === "enabled" ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void onAction("disable-extension")}
                    >
                      {translateUi("Disable extension")}
                    </Button>
                  ) : null}
                  {step === "access" && helperBackend && helper?.status !== "not-installed" ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void onAction(removeHelper)}
                    >
                      {translateUi("Remove capture helper")}
                    </Button>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        </WizardPanel>
        <WizardFooter>
          {step !== "access" ? (
            <Button variant="ghost" disabled={busy} onClick={() => changeStep("access")}>
              {translateUi("Back")}
            </Button>
          ) : null}
          <Button variant="ghost" disabled={busy} onClick={() => void onClose(false)}>
            {wasEnabled ? translateUi("Close") : translateUi("Finish later")}
          </Button>
          {step === "access" ? (
            helperBackend && !accessReady && helper?.status !== "ready" ? (
              <Button
                disabled={busy}
                aria-busy={busy}
                onClick={() =>
                  void (helper?.status === "error" ? checkAgain() : onAction(installHelper))
                }
              >
                {checking
                  ? "Checking…"
                  : busy
                    ? "Installing…"
                    : helper?.status === "error"
                      ? translateUi("Check again")
                      : helper?.status === "update-required"
                        ? translateUi("Update helper")
                        : translateUi("Install helper")}
              </Button>
            ) : backend === "gnome" && !accessReady && extension?.status !== "enabled" ? (
              <Button
                disabled={busy}
                aria-busy={checking}
                onClick={() =>
                  void (install
                    ? onAction("install-extension")
                    : enable
                      ? onAction("enable-extension")
                      : checkAgain())
                }
              >
                {checking
                  ? "Checking…"
                  : busy
                    ? install
                      ? "Installing…"
                      : enable
                        ? "Enabling…"
                        : "Working…"
                    : install
                      ? extension?.status === "update-required"
                        ? translateUi("Update extension")
                        : translateUi("Install extension")
                      : enable
                        ? translateUi("Enable extension")
                        : translateUi("Check again")}
              </Button>
            ) : (
              <PermissionContinueButton
                ready={macPermissionsReady}
                busy={busy}
                onClick={async () => {
                  if (await onEnable()) changeStep("shortcut");
                }}
              >
                {busy
                  ? "Working…"
                  : macPermissions
                    ? translateUi("Test capture and continue")
                    : backend === "direct"
                      ? translateUi("Allow capture")
                      : !accessReady && !macPermissions
                        ? translateUi("Try again")
                        : translateUi("Continue")}
              </PermissionContinueButton>
            )
          ) : !configShortcut ? (
            <Button
              disabled={
                busy || !accessReady || (shortcutChanged ? !canSaveShortcut : !shortcutReady)
              }
              onClick={async () => {
                if (!shortcutChanged || (await onSaveShortcut())) await onClose(true);
              }}
            >
              {busy
                ? "Saving…"
                : shortcutChanged
                  ? translateUi("Save and finish")
                  : translateUi("Done")}
            </Button>
          ) : null}
        </WizardFooter>
      </WizardPopup>
    </Dialog>
  );
}
