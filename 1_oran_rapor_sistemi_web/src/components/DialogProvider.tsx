"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react"
import { ConfirmModal } from "./ConfirmModal"

type DialogOptions = {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
}

type DialogContextType = {
  alert: (message: string, title?: string) => Promise<void>
  confirm: (message: string, title?: string) => Promise<boolean>
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<DialogOptions & { showCancel: boolean }>({ message: "", showCancel: true })
  
  // Store the promise resolvers
  const [resolveFn, setResolveFn] = useState<((val: boolean) => void) | null>(null)

  const alert = useCallback((message: string, title: string = "Bilgi") => {
    return new Promise<void>((resolve) => {
      setOptions({
        title,
        message,
        confirmText: "Tamam",
        showCancel: false
      })
      setIsOpen(true)
      setResolveFn(() => (val: boolean) => resolve())
    })
  }, [])

  const confirm = useCallback((message: string, title: string = "Onay") => {
    return new Promise<boolean>((resolve) => {
      setOptions({
        title,
        message,
        confirmText: "Evet",
        cancelText: "İptal",
        showCancel: true
      })
      setIsOpen(true)
      setResolveFn(() => resolve)
    })
  }, [])

  const handleConfirm = () => {
    setIsOpen(false)
    if (resolveFn) resolveFn(true)
  }

  const handleCancel = () => {
    setIsOpen(false)
    if (resolveFn) resolveFn(false)
  }

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      <ConfirmModal
        isOpen={isOpen}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        showCancel={options.showCancel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = useContext(DialogContext)
  if (context === undefined) {
    throw new Error("useDialog must be used within a DialogProvider")
  }
  return context
}
