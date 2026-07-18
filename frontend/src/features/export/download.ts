/**
 * Browser file download — the one place the app touches the DOM to
 * produce a file, kept apart from the payload builders it serves.
 */

export function downloadTextFile(filename: string, mimeType: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Revoking synchronously can cancel the download in some browsers.
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}
