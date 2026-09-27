export type Lang = "ko" | "en";
export type Localized = { ko: string; en: string };
export type Role = "GUEST" | "MEMBER" | "TEACHER_PENDING" | "TEACHER" | "ADMIN";
export type Actor = {
  id: string;
  role: Role;
  nickname: string;
  course_id: string;
  teacher_id?: string;
  kind: "guest" | "user";
  account_status?: "pending" | "approved" | "rejected" | "suspended";
};
export type Week = {
  number: number;
  start: string;
  end: string;
  reference: Localized;
  title: Localized;
  sourcePage: number;
  pdfPage: number;
  sourceUrl: string;
  sourceNote: Localized | null;
  status: string;
};
export type Row = { id: string; [key: string]: unknown };
export type Note = {
  id: string;
  content: string;
  display_name: string;
  week: number;
  is_anonymous: boolean;
  is_pinned: boolean;
  status: string;
  mine: boolean;
};
export type Room = {
  id: string;
  week: number;
  title: string;
  mode: string;
  status: string;
  closes_at: string | null;
};
export type Post = {
  id: string;
  content: string;
  display_name: string;
  status: string;
  mine: boolean;
  parent_id?: string;
};
export type Submission = {
  id: string;
  week: number;
  answers: Record<string, string>;
  worksheet_snapshot?: { items: Localized[]; version: number };
  teacher_id: string;
  status: string;
  created_at: string;
  feedback?: { content: string }[];
};
