"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type SaveOnExitDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirming?: boolean
}

export function SaveOnExitDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Bạn có muốn lưu thông tin này không",
  description = "Nhấn Có để lưu thay đổi hiện tại. Nhấn Huỷ để quay lại chỉnh sửa.",
  confirmLabel = "Có",
  cancelLabel = "Huỷ",
  confirming = false,
}: SaveOnExitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button type="button" onClick={() => void onConfirm()} disabled={confirming} className="w-full sm:w-auto">
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
