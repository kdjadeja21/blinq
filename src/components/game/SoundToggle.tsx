"use client";

import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playCue, setFeedbackEnabled, useFeedbackEnabled } from "@/lib/feedback";

export function SoundToggle() {
  const enabled = useFeedbackEnabled();
  return (
    <Button
      variant="ghost"
      className="size-11"
      aria-label={enabled ? "Mute sound and haptics" : "Enable sound and haptics"}
      aria-pressed={enabled}
      onClick={() => {
        setFeedbackEnabled(!enabled);
        if (!enabled) playCue("tap");
      }}
    >
      {enabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
    </Button>
  );
}
