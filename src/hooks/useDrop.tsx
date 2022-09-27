import { useEffect } from 'react'

export type progressCallback = (progress: number, total: number) => void;

export const useDrop = (
  container: React.RefObject<HTMLDivElement>,
  onDrop: (e: any, container: HTMLDivElement, onProgressCallback?: progressCallback) => void,
  onProgressCallback?: progressCallback
) => {

  function handleDragEnter(e: any) {
    if (!container.current) return
    e.preventDefault()
    e.stopPropagation()
    container.current.classList.add('dragOver')
  }

  function handleDragOver(e: any) {
    if (!container.current) return
    e.preventDefault()
    e.stopPropagation()
    container.current.classList.add('dragOver')
  }

  function handleDragLeave(e: any) {
    if (!container.current) return
    e.preventDefault()
    e.stopPropagation()
    container.current.classList.remove('dragOver')
  }

  // TODO: this is stupid that this logic is implmeneted here
  // should be in the client, handleDrop: () => void can be an arg
  function handleDrop(e: any) {
    if (!container.current) return

    onDrop(e, container.current, onProgressCallback)
    return
  }

  useEffect(() => {
    if (!container.current) return

    container.current.addEventListener('dragenter', handleDragEnter)
    container.current.addEventListener('dragleave', handleDragLeave)
    container.current.addEventListener('dragover', handleDragOver)
    container.current.addEventListener('drop', handleDrop)

  }, [])

  return {
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop
  }
} 