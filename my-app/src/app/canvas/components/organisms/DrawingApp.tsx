"use client"

import { useRef, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Undo, Redo, Trash2 } from 'lucide-react'
import { useCanvasIndexedDB, DrawAction } from '../../hooks/useCanvasIndexedDB'

export default function DrawingApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawHistory, setDrawHistory] = useState<DrawAction>({ answers: { canvas: { paths: [] } } })
  const [redoHistory, setRedoHistory] = useState<Array<{ points: Array<{ x: number; y: number }> }>>([])
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([])

  const searchParams = useSearchParams()
  const deliveryId = searchParams.get('deliveryId') || 'default'
  const userId = searchParams.get('userId') || 'default'

  const { savePath, getAllPaths, clearAllPaths, updatePaths } = useCanvasIndexedDB(deliveryId, userId)

  useEffect(() => {
    const loadPaths = async () => {
      const storedPaths = await getAllPaths()
      setDrawHistory(storedPaths.answers && storedPaths.answers.canvas && Array.isArray(storedPaths.answers.canvas.paths)
        ? storedPaths
        : { answers: { canvas: { paths: [] } } })
    }
    loadPaths()
  }, [getAllPaths, deliveryId, userId])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, canvas.width, canvas.height)

    context.strokeStyle = 'black'
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 2

    const paths = drawHistory.answers.canvas.paths
    if (Array.isArray(paths)) {
      paths.forEach(path => {
        if (path && path.points) {
          context.beginPath()
          path.points.forEach((point, index) => {
            if (index === 0) {
              context.moveTo(point.x, point.y)
            } else {
              context.lineTo(point.x, point.y)
            }
          })
          context.stroke()
        }
      })
    }
  }, [drawHistory])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCurrentPath([{ x, y }])
    setIsDrawing(true)
  }

  const draw = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCurrentPath(prev => {
      const newPath = [...prev, { x, y }]
      
      context.strokeStyle = 'black'
      context.beginPath()
      context.moveTo(prev[prev.length - 1].x, prev[prev.length - 1].y)
      context.lineTo(x, y)
      context.stroke()

      return newPath
    })
  }

  const stopDrawing = async () => {
    if (currentPath.length > 1) {
      const newPath = { points: currentPath }
      setDrawHistory(prev => ({
        ...prev,
        answers: {
          ...prev.answers,
          canvas: {
            ...prev.answers.canvas,
            paths: [...prev.answers.canvas.paths, newPath]
          }
        }
      }))
      setRedoHistory([])
      await savePath(newPath)
    }
    setCurrentPath([])
    setIsDrawing(false)
  }

  const clearCanvas = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
    setDrawHistory({ answers: { canvas: { paths: [] } } })
    setRedoHistory([])
    await clearAllPaths()
  }

  const undo = async () => {
    if (drawHistory.answers.canvas.paths.length === 0) return

    const lastPath = drawHistory.answers.canvas.paths[drawHistory.answers.canvas.paths.length - 1]
    setRedoHistory(prev => [...prev, lastPath])
    setDrawHistory(prev => {
      const newPaths = prev.answers.canvas.paths.slice(0, -1)
      const newHistory = {
        ...prev,
        answers: {
          ...prev.answers,
          canvas: {
            ...prev.answers.canvas,
            paths: newPaths
          }
        }
      }
      updatePaths(newPaths)
      return newHistory
    })
  }

  const redo = async () => {
    if (redoHistory.length === 0) return
    
    const nextPath = redoHistory[redoHistory.length - 1]
    setDrawHistory(prev => {
      const newPaths = [...prev.answers.canvas.paths, nextPath]
      const newHistory = {
        ...prev,
        answers: {
          ...prev.answers,
          canvas: {
            ...prev.answers.canvas,
            paths: newPaths
          }
        }
      }
      updatePaths(newPaths)
      return newHistory
    })
    setRedoHistory(prev => prev.slice(0, -1))
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="border border-gray-300"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />
      <div className="flex items-center justify-between w-full max-w-md">
        <div className="flex items-center space-x-2">
          <Button onClick={undo} disabled={drawHistory.answers.canvas.paths.length === 0}>
            <Undo className="w-4 h-4 mr-2" />
            元に戻す
          </Button>
          <Button onClick={redo} disabled={redoHistory.length === 0}>
            <Redo className="w-4 h-4 mr-2" />
            やり直す
          </Button>
        </div>
        <Button onClick={clearCanvas}>
          <Trash2 className="w-4 h-4 mr-2" />
          全て消す
        </Button>
      </div>
    </div>
  )
}