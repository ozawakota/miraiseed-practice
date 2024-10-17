'use client'
import React, { useState, useCallback, useRef, useEffect } from 'react'

export default function KeyBoard() {
  const [value, setValue] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cursorPositionRef = useRef<number | null>(null)

  // 許可される文字のパターン
  const allowedPattern = /^[a-zA-Z0-9\s\.,!?@#$%^&*()_+\-=\[\]{};:'\"\\|<>\/]*$/

  const filterInput = useCallback((input: string) => {
    return input.split('').filter(char => allowedPattern.test(char)).join('')
  }, [])

  const handleBeforeInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    if (isComposing) return // IME入力中は処理をスキップ

    const inputElement = e.target as HTMLTextAreaElement
    const inputEvent = e.nativeEvent as InputEvent
    const newInput = inputElement.value + inputEvent.data
    const filteredInput = filterInput(newInput)
    
    if (filteredInput !== newInput) {
      e.preventDefault() // デフォルトの入力を防ぐ
    }
  }, [filterInput, isComposing])

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    if (isComposing) return // IME入力中は処理をスキップ

    const input = e.currentTarget.value
    const filteredInput = filterInput(input)
    
    // カーソル位置を取得
    cursorPositionRef.current = e.currentTarget.selectionStart

    // 値を更新
    setValue(filteredInput)
  }, [filterInput, isComposing])

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true)
  }, [])

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false)
    handleInput(e as React.FormEvent<HTMLTextAreaElement>)
  }, [handleInput])

  useEffect(() => {
    // カーソル位置の調整
    if (cursorPositionRef.current !== null && textareaRef.current) {
      const cursorPosition = cursorPositionRef.current
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(cursorPosition, cursorPosition)
        }
      })
    }
  }, [value])

  return (
    <section className="p-4 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 md:mb-10">キーボード制御</h1>
        <div className="mb-16">
          <h2 className="text-xl font-bold pb-4">実装要件</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>onBeforeInputイベントハンドラー</li>
            <li>onInputイベントハンドラー</li>
            <li>リアルタイムフィルタリング</li>
            <li>カーソル位置の調整</li>
            <li>iOS/iPhone/iPad対応</li>
            <li>IME入力対応</li>
          </ul>
        </div>
        
        <div className="mb-16">
          <h2 className="text-xl font-bold pb-4">制限付きテキストエリア</h2>
          <textarea
            ref={textareaRef}
            value={value}
            onBeforeInput={handleBeforeInput}
            onInput={handleInput}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder="英語のみ入力可能です"
            className="w-full p-2 border rounded resize-none bg-gray-700 text-white"
            rows={4}
            aria-label="英語と記号のみ入力可能なテキストエリア"
          />
          <p className="mt-2 text-sm text-gray-300">
            注意：このテキストエリアは英数字と一般的な記号のみ入力可能です。日本語文字は入力できません。
          </p>
        </div>
      </div>
    </section>
  )
}