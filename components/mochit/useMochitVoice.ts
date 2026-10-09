"use client";

// モチット相談の音声（話しかける・読み上げる）。
//
// どちらもブラウザ標準の Web Speech API だけで動かす。サーバーや有料の音声 API は使わない。
// 未対応のブラウザ（Firefox の音声入力など）ではボタン自体を出さず、文字の相談はそのまま使える。

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const SPEAK_PREF_KEY = "fequest:mochitSpeak:v1";
const LANG = "ja-JP";

// ---- 型（lib.dom に SpeechRecognition が無い環境向けの最小限） ----

type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; length: number; [index: number]: RecognitionAlternative };
type RecognitionEvent = { resultIndex: number; results: { length: number; [index: number]: RecognitionResult } };
type RecognitionErrorEvent = { error: string };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function synthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return null;
  }
  return window.speechSynthesis;
}

// 対応可否はサーバー描画では常に false にし、ハイドレーション後に実際の値へ切り替える
const noopSubscribe = () => () => {};
function useClientValue(read: () => boolean): boolean {
  return useSyncExternalStore(noopSubscribe, read, () => false);
}

// ---- 話しかける（音声入力） ----

const RECOGNITION_ERRORS: Record<string, string> = {
  "not-allowed": "マイクの使用が許可されていないみたい。ブラウザの設定から許可してね。",
  // iPhone は「設定 > 一般 > キーボード > 音声入力」がオフだとこれになる。LINE などのアプリ内ブラウザでも出る
  "service-not-allowed":
    "この環境では音声入力が使えないみたい。iPhone は「設定 > 一般 > キーボード > 音声入力」をオンにして、Safari で開いてね。",
  "audio-capture": "マイクを使えなかったよ。ほかのアプリが使っていないか確認してね。",
  network: "音声の聞き取りに失敗したよ。通信を確認してね。",
};
const NOTHING_HEARD = "うまく聞き取れなかったよ。もう一度マイクを押して話してね。";

// 1回の聞き取りの上限。iPhone では終わりの合図（onend）が来ないまま止まることがあるので、必ずここで畳む
const MAX_LISTEN_MS = 15_000;
// stop() のあと終わりの合図を待つ時間。来なければこちらで終わらせる
const STOP_GRACE_MS = 1_500;

/**
 * 認識結果をつなぐ。iPhone の Safari は、途中までの文を含んだ結果を重ねて返すことがあるので
 * 「前の結果で始まる結果」は置き換えとして扱い、同じ言葉が二重にならないようにする。
 */
export function joinTranscripts(transcripts: string[]): string {
  let heard = "";
  for (const t of transcripts) {
    if (!t) continue;
    heard = heard && t.startsWith(heard) ? t : heard + t;
  }
  return heard;
}

/**
 * 話した内容を文字にして onText へ渡す。確定前の途中経過も渡すので、入力欄にそのまま流し込める。
 * 送信はしない（聞き間違いを直してから送れるようにする）。
 */
export function useSpeechInput(onText: (text: string) => void) {
  const supported = useClientValue(() => recognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<{
    recognition: Recognition;
    heard: boolean;
    failed: boolean;
    stoppedByUser: boolean;
    timers: number[];
  } | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  // 終わりの合図が来ても来なくても、ここを通って必ず「聞いていない」状態へ戻す
  const finish = useCallback((recognition: Recognition) => {
    const session = sessionRef.current;
    if (!session || session.recognition !== recognition) return;
    sessionRef.current = null;
    session.timers.forEach((timer) => window.clearTimeout(timer));
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    setListening(false);
    if (!session.heard && !session.failed && !session.stoppedByUser) setError(NOTHING_HEARD);
  }, []);

  const stop = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    session.stoppedByUser = true;
    try {
      session.recognition.stop();
    } catch {
      // すでに止まっている
    }
    session.timers.push(window.setTimeout(() => finish(session.recognition), STOP_GRACE_MS));
  }, [finish]);

  /** 聞き取り途中の内容も捨てて止める（シートを閉じたとき） */
  const abort = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    session.stoppedByUser = true;
    try {
      session.recognition.abort();
    } catch {
      // すでに止まっている
    }
    finish(session.recognition);
  }, [finish]);

  // タップの中で同期的に呼ぶこと（iPhone は操作の外で始めるとマイクを開かない）
  const start = useCallback(
    (prefix: string) => {
      const Ctor = recognitionCtor();
      if (!Ctor) return;
      // 前回の聞き取りが終わり切っていなければ捨ててから始める（固まって押せなくなるのを防ぐ）
      abort();
      // 自分の読み上げを聞き取らない・音声の出入りがぶつからないよう、話している途中なら止める
      synthesis()?.cancel();

      const recognition = new Ctor();
      recognition.lang = LANG;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      const session = { recognition, heard: false, failed: false, stoppedByUser: false, timers: [] as number[] };
      const base = prefix.trim() ? `${prefix.trimEnd()} ` : "";
      recognition.onresult = (event) => {
        const transcripts: string[] = [];
        for (let i = 0; i < event.results.length; i++) transcripts.push(event.results[i][0]?.transcript ?? "");
        const heard = joinTranscripts(transcripts);
        if (!heard) return;
        session.heard = true;
        onTextRef.current(base + heard);
      };
      recognition.onerror = (event) => {
        // 何も話さずに終わった・自分で止めた場合は onend 側で扱う
        if (event.error === "no-speech" || event.error === "aborted") return;
        session.failed = true;
        setError(RECOGNITION_ERRORS[event.error] ?? `うまく聞き取れなかったよ。もう一度試してね。（${event.error}）`);
      };
      recognition.onend = () => finish(recognition);

      setError(null);
      sessionRef.current = session;
      try {
        recognition.start();
      } catch {
        session.failed = true;
        finish(recognition);
        setError("音声入力を始められなかったよ。少し待ってからもう一度押してね。");
        return;
      }
      session.timers.push(window.setTimeout(() => stop(), MAX_LISTEN_MS));
      setListening(true);
    },
    [abort, finish, stop],
  );

  useEffect(() => () => sessionRef.current?.recognition.abort(), []);

  return { supported, listening, error, start, stop, abort, clearError: () => setError(null) };
}

// ---- 読み上げる ----

function readSpeakPref(): boolean {
  try {
    return window.localStorage.getItem(SPEAK_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

// 保存に失敗する環境（プライベートブラウズ等）でも画面の間は切り替えが効くよう、手元の値を正にする
let speakPrefOverride: boolean | null = null;
const speakPrefListeners = new Set<() => void>();

function getSpeakPref(): boolean {
  return speakPrefOverride ?? readSpeakPref();
}

function setSpeakPref(enabled: boolean) {
  speakPrefOverride = enabled;
  try {
    window.localStorage.setItem(SPEAK_PREF_KEY, enabled ? "1" : "0");
  } catch {
    // 保存できなくても、この画面の間はオンのまま使える
  }
  speakPrefListeners.forEach((listener) => listener());
}

function subscribeSpeakPref(listener: () => void) {
  speakPrefListeners.add(listener);
  return () => {
    speakPrefListeners.delete(listener);
  };
}

/** テスト用：モジュールに残る切り替え状態を消す */
export function resetMochitVoiceForTest() {
  speakPrefOverride = null;
}

/** 読み上げ用に、記号の装飾や絵文字を落とす */
export function toSpeakableText(text: string): string {
  return text
    .replace(/[*_#`>~]/g, "")
    .replace(/\p{Extended_Pictographic}️?/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickJapaneseVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices().filter((voice) => voice.lang.replace("_", "-").startsWith("ja"));
  return voices.find((voice) => voice.localService) ?? voices[0] ?? null;
}

/**
 * モチットの返事を読み上げる。オン/オフは端末ごとに覚える（既定はオフ。学習中に急に音を出さない）。
 */
export function useSpeechOutput() {
  const supported = useClientValue(() => synthesis() !== null);
  const pref = useSyncExternalStore(subscribeSpeakPref, getSpeakPref, () => false);
  const enabled = supported && pref;
  const [speaking, setSpeaking] = useState(false);

  const cancel = useCallback(() => {
    synthesis()?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    const synth = synthesis();
    const speakable = toSpeakableText(text);
    if (!synth || !speakable) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(speakable);
    utterance.lang = LANG;
    const voice = pickJapaneseVoice(synth);
    if (voice) utterance.voice = voice;
    utterance.rate = 1.05;
    utterance.pitch = 1.15;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
  }, []);

  /**
   * iOS Safari は「ユーザー操作の中で一度話す」まで非同期の読み上げを鳴らさない。
   * 送信ボタンなどの操作の中で呼び、返事が届いたときに読めるようにしておく。
   */
  const unlock = useCallback(() => {
    const synth = synthesis();
    if (!synth || synth.speaking) return;
    const silent = new SpeechSynthesisUtterance("");
    silent.volume = 0;
    synth.speak(silent);
  }, []);

  // ボタン操作の中で呼ぶ。オンにした瞬間に一言話して、音が出ることを確かめられるようにする
  const toggle = useCallback(() => {
    const next = !enabled;
    setSpeakPref(next);
    if (next) speak("返事を声で読み上げるね。");
    else cancel();
  }, [enabled, speak, cancel]);

  useEffect(() => () => synthesis()?.cancel(), []);

  return { supported, enabled, speaking, speak, cancel, unlock, toggle };
}
