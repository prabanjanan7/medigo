export function isSpeechRecognitionSupported() {
  return typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createSpeechCapture({ onInterim, onFinal, onError, onEnd } = {}) {
  const Recognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  let recognition = null;
  let stopping = false;

  function reportError(error) {
    const code = error?.error || "unknown";
    const messages = {
      "not-allowed": "Microphone permission was denied. Allow microphone access or continue with manual entry.",
      "service-not-allowed": "Speech recognition is not available in this browser. Continue with manual entry.",
      "no-speech": "No speech was detected. Try again and speak clearly.",
      network: "Speech recognition could not reach the browser's speech service. Try again or use manual entry.",
      aborted: "Voice capture was cancelled."
    };
    onError?.(messages[code] || "Voice capture failed unexpectedly. Continue with manual entry.");
  }

  function start() {
    if (!Recognition) {
      onError?.("Voice input is not supported by this browser. Continue with manual entry.");
      return false;
    }
    if (recognition) return false;
    stopping = false;
    recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = event => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += text;
        else interim += text;
      }
      if (interim) onInterim?.(interim.trim());
      if (finalText.trim()) onFinal?.(finalText.trim());
    };
    recognition.onerror = reportError;
    recognition.onend = () => {
      recognition = null;
      onEnd?.({ cancelled: stopping });
      stopping = false;
    };
    try {
      recognition.start();
      return true;
    } catch (error) {
      recognition = null;
      onError?.("Voice capture could not start. Continue with manual entry.");
      return false;
    }
  }

  function stop() {
    if (!recognition) return;
    stopping = true;
    recognition.stop();
  }

  function abort() {
    if (!recognition) return;
    stopping = true;
    recognition.abort();
  }

  return { start, stop, abort, supported: isSpeechRecognitionSupported };
}
