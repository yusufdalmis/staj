"use client"

import React, { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import imageCompression from "browser-image-compression"
import { X, Check } from "lucide-react"
import { useDialog } from "./DialogProvider"

interface ImageCropperModalProps {
  isOpen: boolean
  imageSrc: string | null
  onClose: () => void
  onCropComplete: (croppedBase64: string) => void
}

export default function ImageCropperModal({ isOpen, imageSrc, onClose, onCropComplete }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const dialog = useDialog()

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener("load", () => resolve(image))
      image.addEventListener("error", (error) => reject(error))
      image.setAttribute("crossOrigin", "anonymous")
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any
  ): Promise<string> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("No 2d context")
    }

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    // Convert canvas to base64
    return canvas.toDataURL("image/jpeg", 0.9)
  }

  const compressImage = async (base64Str: string) => {
    try {
      // Convert base64 to file
      const res = await fetch(base64Str)
      const blob = await res.blob()
      const file = new File([blob], "image.jpg", { type: "image/jpeg" })

      // Compress
      const options = {
        maxSizeMB: 0.5, // 500KB
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      }
      const compressedFile = await imageCompression(file, options)
      
      // Convert back to base64
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(compressedFile)
        reader.onloadend = () => {
          resolve(reader.result as string)
        }
        reader.onerror = reject
      })
    } catch (error) {
      console.error("Compression error:", error)
      return base64Str // fallback to uncompressed if it fails
    }
  }

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const croppedBase64 = await getCroppedImg(imageSrc, croppedAreaPixels)
      const compressedBase64 = await compressImage(croppedBase64)
      onCropComplete(compressedBase64)
    } catch (e) {
      console.error("Crop error", e)
      dialog.alert("Görsel işlenirken bir hata oluştu.")
    } finally {
      setIsProcessing(false)
      onClose()
    }
  }

  if (!isOpen || !imageSrc) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">Fotoğrafı Düzenle</h3>
          <button onClick={onClose} className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="relative flex-1 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={4 / 3}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
          />
        </div>
        
        <div className="p-6 bg-white flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Yakınlaştırma</label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-brand-primary"
            />
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button 
              onClick={handleSave}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-primary text-white font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary transition-colors disabled:opacity-70"
            >
              {isProcessing ? "İşleniyor..." : <><Check size={18} /> Kırp ve Kaydet</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
