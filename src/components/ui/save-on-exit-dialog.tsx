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
  onSave: () => void | Promise<void>
  onDiscard: () => void
  title?: string
  description?: string
  saving?: boolean
}

export function SaveOnExitDialog({
  open,
  onSave,
  onDiscard,
  title = "Bạn có thay đổi chưa lưu",
  description = "Bạn muốn làm gì với thay đổi hiện tại?",
  saving = false,
}: SaveOnExitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onDiscard(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="outline" onClick={onDiscard} className="w-full sm:w-auto">
            Thoát
          </Button>
          <Button type="button" onClick={() => void onSave()} disabled={saving} className="w-full sm:w-auto">
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
