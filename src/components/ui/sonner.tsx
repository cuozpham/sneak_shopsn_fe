"use client"

import { Toaster as SonnerToaster } from "sonner"

type ToasterProps = React.ComponentProps<typeof SonnerToaster>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      duration={7000}
      toastOptions={{
        classNames: {
          closeButton: "!left-auto !right-1 !top-1 !translate-x-0 !translate-y-0",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
