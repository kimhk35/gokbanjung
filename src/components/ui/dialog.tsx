"use client";
import * as Dialog from "@radix-ui/react-dialog";
import * as Alert from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import { useApp } from "../provider";
import type { ReactNode } from "react";
export function Modal({
  title,
  description,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: ReactNode;
}) {
  const { t } = useApp();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title className="modal-title">{title}</Dialog.Title>
          <Dialog.Description>
            {description ||
              t(
                "내용을 확인한 후 진행해 주세요.",
                "Review the details before continuing.",
              )}
          </Dialog.Description>
          {children}
          <Dialog.Close className="close" aria-label={t("닫기", "Close")}>
            <X size={22} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Confirm({
  trigger,
  title,
  description,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  const { t } = useApp();
  return (
    <Alert.Root>
      <Alert.Trigger asChild>{trigger}</Alert.Trigger>
      <Alert.Portal>
        <Alert.Overlay className="overlay" />
        <Alert.Content className="modal">
          <Alert.Title className="modal-title">{title}</Alert.Title>
          <Alert.Description>{description}</Alert.Description>
          <div className="actions">
            <Alert.Cancel className="button secondary">
              {t("취소", "Cancel")}
            </Alert.Cancel>
            <Alert.Action className="button danger" onClick={onConfirm}>
              {t("확인", "Confirm")}
            </Alert.Action>
          </div>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  );
}
