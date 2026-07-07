import { useCallback, useRef, useState } from "react";

// Record the running show to a downloadable video. Since the engine is DOM
// (framer-motion words, not a single canvas), we capture the tab's pixels via
// getDisplayMedia and mux in the song audio (a MediaStream tapped off the Web
// Audio graph). Real-time: the song plays once from the top and is captured.
export interface RecorderIO {
  getAudioStream: () => MediaStream | null;
  seek: (t: number) => void;
  play: () => void;
  duration: number;
}

export function useRecorder(io: RecorderIO) {
  const [recording, setRecording] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const dispRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const stop = useCallback(() => {
    try { if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop(); } catch { /* noop */ }
    dispRef.current?.getTracks().forEach((t) => t.stop());
    window.clearTimeout(timerRef.current);
    setRecording(false);
  }, []);

  const start = useCallback(async (cropEl?: HTMLElement | null) => {
    setError(null); setDownloadUrl(null);
    try {
      const disp = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 } as MediaTrackConstraints, audio: false });
      dispRef.current = disp;
      // Region Capture (Chromium): when the show runs in an aspect frame
      // (9:16 / 1:1), crop the recording to that element so the export is a
      // real vertical/square video, not a letterboxed tab. Only applies when
      // the user shares THIS tab; anything else silently stays full-frame.
      if (cropEl) {
        try {
          const CT = (window as unknown as { CropTarget?: { fromElement(el: Element): Promise<unknown> } }).CropTarget;
          const track = disp.getVideoTracks()[0] as MediaStreamTrack & { cropTo?: (t: unknown) => Promise<void> };
          if (CT && track?.cropTo) await track.cropTo(await CT.fromElement(cropEl));
        } catch { /* unsupported browser / non-tab surface — full capture */ }
      }
      const audio = io.getAudioStream();
      const stream = new MediaStream([...disp.getVideoTracks(), ...(audio?.getAudioTracks() ?? [])]);
      const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => setDownloadUrl(URL.createObjectURL(new Blob(chunks, { type: mime })));
      recRef.current = rec;
      // User clicking the browser's "Stop sharing" ends the capture cleanly.
      disp.getVideoTracks()[0]?.addEventListener("ended", stop);
      rec.start(250);
      setRecording(true);
      io.seek(0); io.play();
      if (io.duration > 0) timerRef.current = window.setTimeout(stop, io.duration * 1000 + 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRecording(false);
    }
  }, [io, stop]);

  return { recording, downloadUrl, error, start, stop };
}
