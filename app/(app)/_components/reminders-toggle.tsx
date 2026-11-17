"use client";

import { useEffect, useState } from "react";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
} from "@/app/actions/push";

type Status =
  | "loading"
  | "unsupported"
  | "ios-install"
  | "denied"
  | "off"
  | "on"
  | "busy";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function isIosBrowserTab() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return ios && !window.matchMedia("(display-mode: standalone)").matches;
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Opt this device in or out of push reminders for due and snoozed todos. */
export function RemindersToggle({ publicKey }: { publicKey: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: Status;
      if (!pushSupported()) next = isIosBrowserTab() ? "ios-install" : "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const sub = await currentSubscription();
        // Re-save so the server always knows this device (cheap upsert).
        if (sub) await savePushSubscription(sub.toJSON());
        next = sub ? "on" : "off";
      }
      if (!cancelled) setStatus(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn() {
    setStatus("busy");
    setNote(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const saved = await savePushSubscription(sub.toJSON());
      setStatus(saved ? "on" : "off");
      if (!saved) setNote("Couldn't save this device. Try again.");
    } catch {
      setStatus("off");
      setNote("Couldn't turn on reminders in this browser.");
    }
  }

  async function turnOff() {
    setStatus("busy");
    const sub = await currentSubscription();
    if (sub) {
      await removePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setStatus("off");
  }

  async function test() {
    setNote("Sending…");
    const n = await sendTestPush();
    setNote(n > 0 ? "Sent. It should pop up in a few seconds." : "Couldn't reach this device.");
    setTimeout(() => setNote(null), 4000);
  }

  if (status === "loading" || status === "unsupported") return null;

  const pill =
    "rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition hover:border-accent/50";

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
      {status === "ios-install" && (
        <span>🔔 To get reminders on iPhone, add BookmarkAI to your Home Screen first.</span>
      )}
      {status === "denied" && (
        <span>🔕 Notifications are blocked for this site in your browser settings.</span>
      )}
      {(status === "off" || status === "busy") && (
        <button type="button" onClick={turnOn} disabled={status === "busy"} className={`${pill} text-foreground disabled:opacity-60`}>
          🔔 Turn on due-date reminders
        </button>
      )}
      {status === "on" && (
        <>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">🔔 Reminders on</span>
          <button type="button" onClick={test} className={pill}>
            Send test
          </button>
          <button type="button" onClick={turnOff} className={pill}>
            Turn off
          </button>
        </>
      )}
      {note && <span>{note}</span>}
    </div>
  );
}
