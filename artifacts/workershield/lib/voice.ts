import { Platform } from "react-native";

type SpeechRecognitionInstance = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getCtor(): SpeechRecognitionCtor | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  const w = window as any;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | SpeechRecognitionCtor
    | null;
}

export function isVoiceDictationAvailable(): boolean {
  return getCtor() !== null;
}

export interface VoiceSession {
  stop: () => void;
}

export function startVoiceDictation(handlers: {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): VoiceSession | null {
  const Ctor = getCtor();
  if (!Ctor) {
    handlers.onError("Voice input not supported on this device.");
    return null;
  }
  let rec: SpeechRecognitionInstance;
  try {
    rec = new Ctor();
  } catch {
    handlers.onError("Could not start voice input.");
    return null;
  }
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = "en-CA";

  rec.onresult = (event: any) => {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? "";
      if (result.isFinal) final += transcript;
      else interim += transcript;
    }
    if (final) handlers.onFinal(final);
    if (interim) handlers.onPartial(interim);
  };
  rec.onerror = (e: any) => {
    const code = e?.error ?? "unknown";
    if (code === "no-speech") return;
    handlers.onError(`Voice error: ${code}`);
  };
  rec.onend = () => handlers.onEnd();

  try {
    rec.start();
  } catch (e) {
    handlers.onError(e instanceof Error ? e.message : "Mic start failed");
    return null;
  }

  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
  };
}
