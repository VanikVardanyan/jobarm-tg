// Read a file (HEIC/JPG/PNG/WEBP) into a JPEG blob, scaled to <= maxSize.
export async function fileToJpeg(file: File, maxSize = 1024): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Cannot decode image'))
      i.src = url
    })

    const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No 2D context')
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    )
    if (!blob) throw new Error('Cannot encode JPEG')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}
