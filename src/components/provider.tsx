"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { api, RequestError } from "@/lib/client";
import type { Lang, Actor, Week, Localized } from "@/lib/types";
import { curriculum } from "@/lib/curriculum";
import { initialLang } from "@/lib/lang";
import { baseLang, localeOf, translate, type UiLang } from "@/lib/i18n";
type Boot = {
  actor: Actor;
  weeks: { data: Week }[];
  teachers: { id: string; nickname: string }[];
  notifications: { id: string; message: Localized }[];
  aiAvailable: boolean;
  authAvailable: boolean;
  persistent: boolean;
};
type Context = {
  /** ko/en language for server requests and ko/en-only data. */
  lang: Lang;
  /** The language the visitor chose: ko, en, es or fil. */
  uiLang: UiLang;
  setLang: (lang: UiLang) => void;
  locale: string;
  t: (ko: string, en: string) => string;
  tl: (text: Localized | null | undefined) => string;
  boot: Boot | null;
  weeks: Week[];
  reload: () => Promise<void>;
  message: string;
  notify: (message: string) => void;
  error: (e: unknown) => void;
  ready: boolean;
};
const C = createContext<Context | null>(null);
const phase2Errors: Record<string, Localized> = {
  rights_required: {
    ko: "본문을 게시할 권한이 있는지 확인란에 체크해 주세요.",
    en: "Please confirm you have permission to post this text.",
  },
};
const errors: Record<string, Localized> = {
  lesson_too_large: {
    ko: "수업 이미지 용량이 큽니다. 이미지를 줄이거나 여러 주차로 나눠 저장해 주세요(총 3.5MB 미만).",
    en: "Lesson images are too large. Reduce images or split across weeks (under 3.5MB total).",
  },
  too_large: {
    ko: "자료 용량이 큽니다. 이미지나 내용을 줄인 뒤 다시 저장해 주세요.",
    en: "The content is too large. Reduce images or text and save again.",
  },
  email_domain_invalid: {
    ko: "메일을 받을 수 없는 이메일 도메인입니다. 주소를 확인해 주세요.",
    en: "This email domain cannot receive mail. Check the address.",
  },
  email_check_unavailable: {
    ko: "이메일 도메인을 확인하지 못했습니다. 잠시 후 다시 신청해 주세요.",
    en: "We could not check the email domain. Please try again shortly.",
  },
  teacher_request_required: {
    ko: "교사 신청 화면에서 신청해 주세요.",
    en: "Please use the teacher application form.",
  },
  teacher_request_failed: {
    ko: "교사 신청을 완료하지 못했습니다. 이미 사용 중인 아이디인지 확인해 주세요.",
    en: "Application could not be completed. Check whether the ID is already in use.",
  },
  admin_reset_required: {
    ko: "비밀번호 초기화는 관리자에게 요청해 주세요.",
    en: "Ask the administrator to reset your password.",
  },
  ai_key_invalid: {
    ko: "AI 키 인증에 실패했습니다. 관리자에게 키와 최신 배포를 확인해 달라고 요청해 주세요.",
    en: "AI key authentication failed. Ask the administrator to check the key and deployment.",
  },
  ai_quota_exceeded: {
    ko: "OpenAI API 사용 한도 또는 잔액이 부족합니다. 관리자가 API 결제 설정을 확인해야 합니다.",
    en: "OpenAI API quota or credits are exhausted. The administrator needs to check billing.",
  },
  ai_rate_limited: {
    ko: "AI 요청이 몰렸습니다. 잠시 후 다시 시도해 주세요.",
    en: "AI is receiving too many requests. Please retry shortly.",
  },
  ai_access_denied: {
    ko: "현재 API 키에 이 모델을 사용할 권한이 없습니다.",
    en: "The API key does not have access to this model.",
  },
  ai_model_invalid: {
    ko: "설정된 AI 모델을 찾을 수 없습니다. 관리자가 OPENAI_MODEL 값을 확인해야 합니다.",
    en: "The configured model was not found. Check OPENAI_MODEL.",
  },
  ai_timeout: {
    ko: "AI 응답 시간이 초과됐습니다. 입력 내용은 유지되니 다시 시도해 주세요.",
    en: "The AI request timed out. Your input is retained; please retry.",
  },
  ai_connection_failed: {
    ko: "AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    en: "Could not connect to the AI service. Please retry.",
  },
  ai_provider_unavailable: {
    ko: "AI 서비스가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.",
    en: "The AI service is temporarily unavailable. Please retry.",
  },
  ai_request_invalid: {
    ko: "AI 요청 설정이 현재 모델과 맞지 않습니다. 관리자에게 모델 설정 확인을 요청해 주세요.",
    en: "The AI request is incompatible with the configured model. Ask the administrator to check its settings.",
  },
  invalid_time: {
    ko: "날짜와 시간을 확인해 주세요. 끝나는 시간은 시작 시간보다 늦어야 합니다.",
    en: "Check the date and time. The end must be after the start.",
  },
  invalid_file: {
    ko: "PNG·JPG·WebP 사진만 올릴 수 있습니다.",
    en: "Only PNG, JPG or WebP images can be uploaded.",
  },
  storage_unavailable: {
    ko: "사진 저장소가 아직 연결되지 않았습니다. 포스터 없이 저장할 수 있습니다.",
    en: "Image storage is not connected yet. You can save without a poster.",
  },
  conflict: {
    ko: "이미 처리된 요청입니다. 새로고침해 주세요.",
    en: "This was already handled. Please refresh.",
  },
  not_found: {
    ko: "찾을 수 없거나 아직 공개되지 않았습니다.",
    en: "Not found or not published yet.",
  },
  nickname_required: {
    ko: "먼저 닉네임을 입력해 주세요.",
    en: "Please choose a nickname first.",
  },
  approval_required: {
    ko: "기록 관리에는 로그인과 관리자 승인이 필요합니다.",
    en: "Record management requires sign-in and administrator approval.",
  },
  account_exists: {
    ko: "이미 신청한 계정이 있습니다. 해당 이메일로 로그인해 주세요.",
    en: "An account request already exists. Sign in with that email.",
  },
  quiz_generating: {
    ko: "퀴즈를 준비 중입니다. 잠시 후 시작 버튼을 다시 눌러 주세요.",
    en: "The quiz is being prepared. Try the start button shortly.",
  },
  source_unavailable: {
    ko: "공식 경전 원문을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    en: "The official scripture source could not be loaded. Please retry later.",
  },
  quiz_expired: {
    ko: "한국 시간 기준 학습 기간이 바뀌었습니다. 새 퀴즈를 시작해 주세요.",
    en: "The study period has changed in Korean time. Start a new quiz.",
  },
  ai_failed: {
    ko: "AI 생성에 실패했습니다. API 키·사용 한도·결제를 관리자에게 확인해 주세요.",
    en: "AI generation failed. Ask the administrator to check the API key, limits and billing.",
  },
  account_request_failed: {
    ko: "계정 신청에 실패했습니다. 이메일 형식, 비밀번호 조건 또는 기존 가입 여부를 확인해 주세요.",
    en: "Account request failed. Check the email, password requirements or an existing account.",
  },
  reset_email_failed: {
    ko: "재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요. 계속 실패하면 관리자가 Supabase 이메일 발송 설정과 한도를 확인해야 합니다.",
    en: "Reset email could not be sent. Retry later; the administrator may need to check Supabase email settings and limits.",
  },
  recovery_expired: {
    ko: "재설정 링크가 만료되었거나 로그인 확인이 필요합니다. 새 재설정 메일을 요청해 주세요.",
    en: "The reset link expired or sign-in is required. Request a new reset email.",
  },
  password_update_failed: {
    ko: "비밀번호를 변경하지 못했습니다. 이전과 다른 10자 이상의 비밀번호를 사용하고, 링크가 만료됐다면 새 메일을 요청하세요.",
    en: "Password update failed. Use a different password with at least 10 characters, or request a fresh reset link.",
  },
  ai_invalid_response: {
    ko: "AI 응답 형식을 읽지 못했습니다. 잠시 후 다시 생성해 주세요.",
    en: "The AI response could not be read. Please generate it again.",
  },
  ai_invalid_content: {
    ko: "초안 형식이 맞지 않습니다. 질문 목록 등의 항목을 유지해서 편집해 주세요.",
    en: "The draft format is invalid. Keep the required fields when editing.",
  },
  session_required: {
    ko: "학습 연결을 다시 시도해 주세요.",
    en: "Please reconnect to your learning session.",
  },
  forbidden: {
    ko: "접근 권한이 없거나 처리할 수 없는 요청입니다.",
    en: "You do not have permission for this action.",
  },
  auth_unavailable: {
    ko: "교사 로그인 연결이 아직 설정되지 않았습니다.",
    en: "Teacher sign-in has not been configured yet.",
  },
  admin_auth_unavailable: {
    ko: "교사 계정 생성용 Supabase 비밀 키가 아직 설정되지 않았습니다.",
    en: "The Supabase secret key for creating teacher accounts is not configured.",
  },
  teacher_creation_failed: {
    ko: "교사 계정을 만들지 못했습니다. 이미 사용 중인 아이디인지 확인해 주세요.",
    en: "The teacher account could not be created. Check whether the ID is already in use.",
  },
  ai_unavailable: {
    ko: "AI 기능 연결이 아직 설정되지 않았습니다.",
    en: "AI features have not been configured yet.",
  },
  auth_failed: {
    ko: "아이디 또는 비밀번호가 올바르지 않습니다. 다시 확인해 주세요.",
    en: "The ID or password is incorrect. Please try again.",
  },
  no_records: {
    ko: "먼저 이번 주의 생각을 기록해 주세요.",
    en: "Write a reflection for this week first.",
  },
  rate_limited: {
    ko: "잠시 쉬었다가 다시 시도해 주세요.",
    en: "Please wait before trying again.",
  },
  worksheet_changed: {
    ko: "학습지가 변경되었습니다. 입력 내용은 이 기기에 보존됩니다. 새로고침 후 새 버전을 확인하세요.",
    en: "The worksheet has changed. Your input remains on this device. Reload to review the new version.",
  },
  empty_answers: {
    ko: "활동지에 생각을 먼저 적어 주세요.",
    en: "Please write an answer before submitting.",
  },
  invalid_input: {
    ko: "입력 내용을 확인해 주세요.",
    en: "Please check your input.",
  },
  invalid_teacher: {
    ko: "승인된 담당 교사를 선택해 주세요.",
    en: "Please select an approved teacher.",
  },
  invalid_transition: {
    ko: "편집 → 승인 → 게시 순서로 진행해 주세요.",
    en: "Please edit, approve, and then publish.",
  },
  curriculum_manual_review: {
    ko: "주차별 편집 화면에서 원문과 날짜를 확인한 후 게시해 주세요.",
    en: "Review source details and dates in the week editor before publishing.",
  },
};
export function Provider({ children }: { children: ReactNode }) {
  const [uiLang, setLanguage] = useState<UiLang>("ko");
  const lang = baseLang(uiLang);
  const [boot, setBoot] = useState<Boot | null>(null);
  const [message, notify] = useState("");
  const [ready, setReady] = useState(false);
  const t = useCallback(
    (ko: string, en: string) => translate(uiLang, ko, en),
    [uiLang],
  );
  const error = useCallback(
    (e: unknown) => {
      const key = e instanceof RequestError ? e.code : "server_error";
      notify(
        ((errors[key] || phase2Errors[key]) &&
          t(
            (errors[key] || phase2Errors[key]).ko,
            (errors[key] || phase2Errors[key]).en,
          )) ||
          t(
            "잠시 문제가 발생했습니다. 작성한 내용은 이 기기에 보관됩니다.",
            "Something went wrong. Your draft is kept on this device.",
          ),
      );
    },
    [t],
  );
  const reload = useCallback(async () => {
    await api("session", {});
    setBoot(await api<Boot>("bootstrap"));
  }, []);
  useEffect(() => {
    // First visit follows the device language; a saved choice wins.
    const initial = initialLang(
      localStorage.getItem("ggc_lang"),
      navigator.languages?.length ? navigator.languages : [navigator.language],
    );
    if (initial !== "ko") setLanguage(initial);
    reload()
      .catch(error)
      .finally(() => setReady(true));
  }, [reload]);
  useEffect(() => {
    document.documentElement.lang = uiLang;
  }, [uiLang]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => notify(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  const setLang = (value: UiLang) => {
    setLanguage(value);
    localStorage.setItem("ggc_lang", value);
  };
  return (
    <C.Provider
      value={{
        lang,
        uiLang,
        setLang,
        locale: localeOf(uiLang),
        t,
        tl: (text: Localized | null | undefined) =>
          text ? t(text.ko, text.en) : "",
        boot,
        weeks: boot?.weeks.map((w) => w.data) || curriculum,
        reload,
        message,
        notify,
        error,
        ready,
      }}
    >
      {children}
      <div
        role="status"
        aria-live="polite"
        className={message ? "toast" : "sr-only"}
      >
        {message}
      </div>
    </C.Provider>
  );
}
export function useApp() {
  const c = useContext(C);
  if (!c) throw new Error("Provider required");
  return c;
}
