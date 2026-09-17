import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Excalidraw,
  convertToExcalidrawElements,
  CaptureUpdateAction,
  exportToBlob,
  exportToSvg
} from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { convertMermaidToExcalidraw, DEFAULT_MERMAID_CONFIG } from './utils/mermaidConverter'
import { cleanElementForExcalidraw, prepareServerScene, assertScenePreserved } from './utils/scene'
import type { ServerElement } from './utils/scene'
import type { MermaidConfig } from '@excalidraw/mermaid-to-excalidraw'

// Tutor Additions
import './styles/tutor.css'
import { Header, TutorLevel } from './components/header/Header'
import { SettingsModal, TutorUserSettings, ProviderSettings } from './components/settings/SettingsModal'
import { ChatPanel, ChatMessage } from './components/chat/ChatPanel'
import { useVoice } from './hooks/useVoice'

// Type definitions
type ExcalidrawAPIRefValue = ExcalidrawImperativeAPI;

interface WebSocketMessage {
  type: string;
  format?: 'png' | 'svg';
  background?: boolean;
  element?: ServerElement;
  elements?: ServerElement[];
  elementId?: string;
  count?: number;
  timestamp?: string;
  source?: string;
  mermaidDiagram?: string;
  config?: MermaidConfig;
  requestId?: string;
  scrollToContent?: boolean;
  scrollToElementId?: string;
  scrollToElementIds?: string[];
  viewportZoomFactor?: number;
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
}

interface ApiResponse {
  success: boolean;
  elements?: ServerElement[];
  element?: ServerElement;
  files?: Record<string, unknown>;
  count?: number;
  error?: string;
  message?: string;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
type SceneLoadStatus = 'loading' | 'ready' | 'failed';
const AUTO_SYNC_DEBOUNCE_MS = 1200;
const SCENE_MUTATIONS = new Set([
  'element_created', 'element_updated', 'element_deleted', 'elements_batch_created'
]);

const DEFAULT_SETTINGS: TutorUserSettings = {
  providerConfig: {
    provider: 'openrouter',
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
  },
  autoSpeak: true,
  voiceRate: 1.0,
};

function App(): JSX.Element {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPIRefValue | null>(null)
  const excalidrawAPIRef = useRef<ExcalidrawAPIRefValue | null>(null)
  useEffect(() => {
    excalidrawAPIRef.current = excalidrawAPI
    if (excalidrawAPI && typeof (excalidrawAPI as any).updateLibrary === 'function') {
      fetch('/api/tutor/libraries')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.libraryItems) && data.libraryItems.length > 0) {
            (excalidrawAPI as any).updateLibrary({
              libraryItems: data.libraryItems,
              merge: true,
            });
            console.log('[Excalidraw Library] Synced', data.libraryItems.length, 'educational libraries to drawer');
          }
        })
        .catch((err) => {
          console.warn('[Excalidraw Library] Failed to load library items:', err);
        });
    }
  }, [excalidrawAPI])

  const [isConnected, setIsConnected] = useState<boolean>(false)
  const websocketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    try {
      const saved = window.localStorage?.getItem('excalidraw-canvas-theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error)
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  // Sync state management
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncInFlightRef = useRef<boolean>(false)
  const suppressAutoSyncCountRef = useRef<number>(0)
  const userInteractedRef = useRef<boolean>(false)
  const [sceneLoadStatus, setSceneLoadStatus] = useState<SceneLoadStatus>('loading')
  const sceneLoadStatusRef = useRef<SceneLoadStatus>('loading')
  const sceneGenerationRef = useRef(0)

  // ---------------------------------------------------------------------------
  // Tutor Pedagogical State
  // ---------------------------------------------------------------------------
  const [level, setLevel] = useState<TutorLevel>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tutor_level') as TutorLevel
      if (saved && ['beginner', 'intermediate', 'pro'].includes(saved)) return saved
    }
    return 'intermediate'
  })

  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tutor_audio_enabled')
      if (saved !== null) return saved === 'true'
    }
    return true
  })

  const [chatVisible, setChatVisible] = useState<boolean>(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false)
  const [currentTopic, setCurrentTopic] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const [settings, setSettings] = useState<TutorUserSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tutor_user_settings')
        if (saved) return JSON.parse(saved)
      } catch (e) {
        console.warn('Failed to load user settings from localStorage:', e)
      }
    }
    return DEFAULT_SETTINGS
  })

  // Save settings helper
  const handleSaveSettings = (newSettings: TutorUserSettings) => {
    setSettings(newSettings)
    try {
      localStorage.setItem('tutor_user_settings', JSON.stringify(newSettings))
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e)
    }
  }

  const handleLevelChange = (newLevel: TutorLevel) => {
    setLevel(newLevel)
    try {
      localStorage.setItem('tutor_level', newLevel)
    } catch (e) {
      console.warn('Failed to save level:', e)
    }
  }

  const handleToggleAudio = () => {
    setIsAudioEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem('tutor_audio_enabled', String(next))
      } catch (e) {
        console.warn('Failed to save audio pref:', e)
      }
      return next
    })
  }

  // ---------------------------------------------------------------------------
  // Voice Integration Hook
  // ---------------------------------------------------------------------------
  const handleSpeechInput = useCallback((spokenText: string) => {
    if (spokenText.trim()) {
      void handleSendMessage(spokenText.trim())
    }
  }, [])

  const voice = useVoice({
    autoSpeak: isAudioEnabled && settings.autoSpeak,
    voiceRate: settings.voiceRate,
    onSpeechInput: handleSpeechInput,
  })

  // ---------------------------------------------------------------------------
  // Canvas Synchronization Helpers
  // ---------------------------------------------------------------------------
  const pauseSceneSync = (status: SceneLoadStatus = 'loading'): number => {
    sceneGenerationRef.current += 1
    sceneLoadStatusRef.current = status
    setSceneLoadStatus(status)
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current)
      autoSyncTimerRef.current = null
    }
    return sceneGenerationRef.current
  }

  const failSceneLoad = (error: unknown, generation = sceneGenerationRef.current): void => {
    if (generation !== sceneGenerationRef.current) return
    console.error('Scene load failed; backend sync is paused:', error)
    pauseSceneSync('failed')
  }

  const canSyncScene = (): boolean =>
    sceneLoadStatusRef.current === 'ready' && websocketRef.current?.readyState === WebSocket.OPEN

  const applySceneUpdateWithoutAutoSync = (
    api: ExcalidrawImperativeAPI,
    scene: Parameters<ExcalidrawImperativeAPI['updateScene']>[0]
  ): void => {
    suppressAutoSyncCountRef.current += 1
    try {
      api.updateScene(scene)
    } finally {
      setTimeout(() => {
        suppressAutoSyncCountRef.current = Math.max(0, suppressAutoSyncCountRef.current - 1)
      }, 0)
    }
  }

  const applyServerScene = (
    incoming: readonly Partial<ExcalidrawElement>[],
    generation: number,
    files?: Record<string, unknown>
  ): void => {
    const api = excalidrawAPIRef.current
    if (!api || generation !== sceneGenerationRef.current) return
    const prepared = prepareServerScene(incoming)
    const previous = api.getSceneElementsIncludingDeleted()
    try {
      if (files) api.addFiles(Object.values(files) as Parameters<typeof api.addFiles>[0])
      applySceneUpdateWithoutAutoSync(api, { elements: prepared, captureUpdate: CaptureUpdateAction.NEVER })
      assertScenePreserved(prepared, api.getSceneElements())
    } catch (error) {
      applySceneUpdateWithoutAutoSync(api, { elements: previous, captureUpdate: CaptureUpdateAction.NEVER })
      throw error
    }
    sceneLoadStatusRef.current = 'ready'
    setSceneLoadStatus('ready')
  }

  useEffect(() => {
    return () => {
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current)
      }
    }
  }, [])

  // WebSocket connection
  useEffect(() => {
    connectWebSocket()
    return () => {
      sceneGenerationRef.current += 1
      sceneLoadStatusRef.current = 'loading'
      const socket = websocketRef.current
      websocketRef.current = null
      socket?.close()
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (excalidrawAPI) {
      if (sceneLoadStatusRef.current !== 'ready') void loadExistingElements()
    }
  }, [excalidrawAPI])

  const loadExistingElements = async (): Promise<void> => {
    if (!excalidrawAPIRef.current) return
    const generation = pauseSceneSync()
    try {
      const response = await fetch('/api/elements', { signal: AbortSignal.timeout(10000) })
      const result: ApiResponse = await response.json()
      if (generation !== sceneGenerationRef.current) return
      if (!response.ok || !result.success || !Array.isArray(result.elements)) {
        throw new Error(result.error || 'Invalid scene response')
      }
      const filesResponse = await fetch('/api/files', { signal: AbortSignal.timeout(10000) })
      const filesResult = await filesResponse.json() as ApiResponse
      if (generation !== sceneGenerationRef.current) return
      if (!filesResponse.ok || !filesResult.files) {
        throw new Error('Could not load scene files')
      }
      applyServerScene(result.elements.map(cleanElementForExcalidraw), generation, filesResult.files)
    } catch (error) {
      failSceneLoad(error, generation)
    }
  }

  const connectWebSocket = (): void => {
    if (websocketRef.current &&
      (websocketRef.current.readyState === WebSocket.CONNECTING ||
        websocketRef.current.readyState === WebSocket.OPEN)) {
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}`

    const socket = new WebSocket(wsUrl)
    websocketRef.current = socket

    socket.onopen = () => {
      if (websocketRef.current !== socket) return
      setIsConnected(true)
      void loadExistingElements()
    }

    socket.onmessage = (event: MessageEvent) => {
      if (websocketRef.current !== socket) return
      try {
        const data: WebSocketMessage = JSON.parse(event.data)
        void handleWebSocketMessage(data)
      } catch (error) {
        failSceneLoad(error)
      }
    }

    socket.onclose = (event: CloseEvent) => {
      if (websocketRef.current !== socket) return
      setIsConnected(false)
      pauseSceneSync()
      if (event.code !== 1000) {
        reconnectTimerRef.current = setTimeout(connectWebSocket, 3000)
      }
    }

    socket.onerror = (error: Event) => {
      if (websocketRef.current !== socket) return
      console.error('WebSocket error:', error)
      setIsConnected(false)
      pauseSceneSync()
    }
  }

  const handleWebSocketMessage = async (data: WebSocketMessage): Promise<void> => {
    const excalidrawAPI = excalidrawAPIRef.current
    if (!excalidrawAPI) {
      return
    }

    if (SCENE_MUTATIONS.has(data.type) && sceneLoadStatusRef.current !== 'ready') {
      void loadExistingElements()
      return
    }

    try {
      const currentElements = excalidrawAPI.getSceneElements()
      const mergeAndApplySceneElements = (incomingElements: Partial<ExcalidrawElement>[]): void => {
        if (incomingElements.length === 0) return

        const incomingById = new Map<string, Partial<ExcalidrawElement>>()
        incomingElements.forEach((element) => {
          if (element.id) {
            incomingById.set(element.id, element)
          }
        })

        const mergedElements: Partial<ExcalidrawElement>[] = currentElements.map((element) => {
          const incoming = incomingById.get(element.id)
          if (!incoming) return element
          incomingById.delete(element.id)
          return { ...element, ...incoming }
        })

        mergedElements.push(...incomingById.values())
        applyServerScene(mergedElements, pauseSceneSync())

        // Auto-center viewport to include newly added whiteboard elements
        setTimeout(() => {
          const allElems = excalidrawAPI.getSceneElements()
          if (allElems.length > 0) {
            excalidrawAPI.scrollToContent(allElems, { fitToViewport: true, animate: true, viewportZoomFactor: 0.9 })
          }
        }, 150)
      }

      switch (data.type) {
        case 'initial_elements':
          {
            const generation = pauseSceneSync()
            if (!Array.isArray(data.elements)) throw new Error('Invalid initial scene')
            applyServerScene(data.elements.map(cleanElementForExcalidraw), generation, (data as any).files)
          }
          break

        case 'files_added':
          if (Array.isArray((data as any).files)) {
            excalidrawAPI.addFiles((data as any).files)
          }
          break

        case 'element_created':
          if (data.element) {
            const cleanedNewElement = cleanElementForExcalidraw(data.element)
            mergeAndApplySceneElements([cleanedNewElement])
          }
          break

        case 'element_updated':
          if (data.element) {
            const cleanedUpdatedElement = cleanElementForExcalidraw(data.element)
            mergeAndApplySceneElements([cleanedUpdatedElement])
          }
          break

        case 'element_deleted':
          if (data.elementId) {
            const filteredElements = currentElements.filter(el => el.id !== data.elementId)
            applyServerScene(filteredElements, pauseSceneSync())
          }
          break

        case 'elements_batch_created':
          if (data.elements) {
            const cleanedBatchElements = data.elements.map(cleanElementForExcalidraw)
            mergeAndApplySceneElements(cleanedBatchElements)
          }
          break

        case 'canvas_cleared':
          applyServerScene([], pauseSceneSync())
          break

        case 'mermaid_convert':
          if ((data as any).mermaidDiagram) {
            try {
              const { parseMermaidToExcalidraw } = await import('@excalidraw/mermaid-to-excalidraw');
              const { elements: mermaidElements } = await parseMermaidToExcalidraw(
                (data as any).mermaidDiagram,
                (data as any).config
              );
              if (mermaidElements && mermaidElements.length > 0) {
                const cleaned = mermaidElements.map(cleanElementForExcalidraw);
                mergeAndApplySceneElements(cleaned);
              }
            } catch (mermaidErr) {
              console.error('Failed to parse Mermaid diagram:', mermaidErr);
            }
          }
          break

        case 'export_image_request':
          if (data.requestId) {
            try {
              if (!canSyncScene()) throw new Error('Scene is not fully loaded; export is paused')
              const elements = excalidrawAPI.getSceneElements()
              const appState = excalidrawAPI.getAppState()
              const files = excalidrawAPI.getFiles()

              if (data.format === 'svg') {
                const svg = await exportToSvg({
                  elements,
                  appState: { ...appState, exportBackground: data.background !== false },
                  files
                })
                const svgString = new XMLSerializer().serializeToString(svg)
                await fetch('/api/export/image/result', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ requestId: data.requestId, format: 'svg', data: svgString })
                })
              } else {
                const blob = await exportToBlob({
                  elements,
                  appState: { ...appState, exportBackground: data.background !== false },
                  files,
                  mimeType: 'image/png'
                })
                const reader = new FileReader()
                reader.onload = async () => {
                  const resultString = reader.result as string
                  const base64 = resultString?.split(',')[1]
                  if (base64) {
                    await fetch('/api/export/image/result', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ requestId: data.requestId, format: 'png', data: base64 })
                    })
                  }
                }
                reader.readAsDataURL(blob)
              }
            } catch (err: any) {
              console.error('Image export failed:', err)
            }
          }
          break

        case 'set_viewport':
          if (data.scrollToContent) {
            const allElements = excalidrawAPI.getSceneElements()
            if (allElements.length > 0) {
              excalidrawAPI.scrollToContent(allElements, { fitToViewport: true, animate: true })
            }
          }
          break

        default:
          break
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error, data)
    }
  }

  const convertToBackendFormat = (element: ExcalidrawElement): ServerElement => {
    return { ...element } as ServerElement
  }

  const syncToBackend = async (options: { silent?: boolean } = {}): Promise<void> => {
    const { silent = false } = options
    if (!canSyncScene()) return
    const api = excalidrawAPIRef.current
    if (!api || syncInFlightRef.current) return

    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current)
      autoSyncTimerRef.current = null
    }

    syncInFlightRef.current = true
    if (!silent) setSyncStatus('syncing')

    try {
      const currentElements = api.getSceneElements()
      const activeElements = currentElements.filter(el => !el.isDeleted)
      const backendElements = activeElements.map(convertToBackendFormat)

      const response = await fetch('/api/elements/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elements: backendElements,
          timestamp: new Date().toISOString()
        })
      })

      if (response.ok) {
        setLastSyncTime(new Date())
        if (!silent) {
          setSyncStatus('success')
          setTimeout(() => setSyncStatus('idle'), 2000)
        }
      } else {
        if (!silent) setSyncStatus('error')
      }
    } catch (error) {
      console.error('Sync error:', error)
      if (!silent) setSyncStatus('error')
    } finally {
      syncInFlightRef.current = false
    }
  }

  const scheduleAutoSync = (): void => {
    if (!canSyncScene() || !excalidrawAPI || !userInteractedRef.current || suppressAutoSyncCountRef.current > 0) {
      return
    }
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current)
    }
    autoSyncTimerRef.current = setTimeout(() => {
      autoSyncTimerRef.current = null
      if (suppressAutoSyncCountRef.current > 0 || syncInFlightRef.current) return
      void syncToBackend({ silent: true })
    }, AUTO_SYNC_DEBOUNCE_MS)
  }

  const clearCanvas = async (): Promise<void> => {
    if (!canSyncScene()) return
    const generation = pauseSceneSync()
    try {
      const response = await fetch('/api/elements/clear', {
        method: 'DELETE', signal: AbortSignal.timeout(10000)
      })
      if (!response.ok) throw new Error('Could not clear saved canvas')
      if (generation === sceneGenerationRef.current) await loadExistingElements()
    } catch (error) {
      failSceneLoad(error, generation)
    }
  }

  // ---------------------------------------------------------------------------
  // Tutor Chat Action Handlers
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isTutorLoading) return

    const studentMsg: ChatMessage = {
      id: 'student_' + Date.now(),
      sender: 'student',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString(),
    }

    setMessages((prev) => [...prev, studentMsg])
    setIsTutorLoading(true)

    try {
      // Gather brief canvas state summary if available
      let canvasSummary = ''
      if (excalidrawAPIRef.current) {
        const elems = excalidrawAPIRef.current.getSceneElements().filter((e) => !e.isDeleted)
        canvasSummary = `Whiteboard currently has ${elems.length} elements.`
      }

      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          level,
          providerConfig: settings.providerConfig,
          canvasStateSummary: canvasSummary,
          history: messages
            .filter((m) => m.sender === 'student' || m.sender === 'tutor')
            .slice(-10)
            .map((m) => ({
              role: m.sender === 'student' ? 'user' : 'assistant',
              content: m.text,
            })),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to get response from tutor')
      }

      // Server spreads TutorResponse fields at top level (answer, explanation, draw, etc.)
      // Ingest any educational image files returned by the tutor
      if (data.files && excalidrawAPIRef.current) {
        const fileList = Object.values(data.files)
        if (fileList.length > 0) {
          excalidrawAPIRef.current.addFiles(fileList as any)
        }
      }

      // Immediately import educational image elements onto the canvas whiteboard!
      if (data.visualEvidenceElements && Array.isArray(data.visualEvidenceElements) && excalidrawAPIRef.current) {
        const api = excalidrawAPIRef.current
        const currentElements = api.getSceneElements()
        const cleanedEvidence = data.visualEvidenceElements.map(cleanElementForExcalidraw)
        const existingIds = new Set(currentElements.map((e) => e.id))
        const merged = [...currentElements]
        cleanedEvidence.forEach((el: any) => {
          if (el.id && !existingIds.has(el.id)) {
            merged.push(el)
            existingIds.add(el.id)
          }
        })
        applySceneUpdateWithoutAutoSync(api, {
          elements: merged,
        })
        void syncToBackend({ silent: true })
      }

      // Update topic from lesson metadata if present
      const hasSteps = Array.isArray(data.steps) && data.steps.length > 0
      const drawingOps = data.draw || []

      const tutorMsg: ChatMessage = {
        id: 'tutor_' + Date.now(),
        sender: 'tutor',
        text: data.answer || data.explanation || '',
        steps: hasSteps ? data.steps : undefined,
        visualEvidence: data.visualEvidence,
        drawingCount: drawingOps.length,
        drawingDescription: drawingOps.length > 0 ? (data.boardNote || 'Concept Diagram') : undefined,
        keyConcepts: data.lesson ? [data.lesson.concept].filter(Boolean) as string[] : [],
        suggestedFollowups: data.quickCheck ? [data.quickCheck] : [],
        timestamp: new Date().toLocaleTimeString(),
      }

      setMessages((prev) => [...prev, tutorMsg])

      // If response does NOT contain steps, auto-speak answer directly
      // When steps are present, the StepPlayer coordinates oral delivery step-by-step
      if (!hasSteps && isAudioEnabled && data.speak !== false && data.answer) {
        voice.speak(data.answer)
      }
    } catch (err: any) {
      console.error('Tutor chat error:', err)
      const errorMsg: ChatMessage = {
        id: 'tutor_err_' + Date.now(),
        sender: 'tutor',
        text: `Error: ${err.message || 'Could not contact tutor.'} Please verify your AI Provider preferences in Settings.`,
        timestamp: new Date().toLocaleTimeString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsTutorLoading(false)
    }
  }

  const handleResetLesson = async () => {
    try {
      await fetch('/api/tutor/lesson/reset', { method: 'POST' })
      setMessages([])
      setCurrentTopic('')
    } catch (e) {
      console.warn('Could not reset lesson:', e)
    }
  }

  const handleStepChange = useCallback(async (_stepIndex: number, step: any) => {
    const api = excalidrawAPIRef.current
    if (!api || !step) return

    let elementsToAdd: any[] = []

    // Ingest any step binary files (e.g. imported educational images)
    if (step.files && typeof step.files === 'object') {
      const stepFiles = Object.values(step.files)
      if (stepFiles.length > 0) {
        api.addFiles(stepFiles as any)
      }
    }

    // 1. Pre-compiled Excalidraw elements for this step
    if (Array.isArray(step.compiledElements) && step.compiledElements.length > 0) {
      elementsToAdd = [...step.compiledElements]
    }

    // 2. Mermaid diagram syntax for this step
    if (step.mermaid && typeof step.mermaid === 'string' && step.mermaid.trim()) {
      try {
        const mResult = await convertMermaidToExcalidraw(step.mermaid)
        if (mResult.elements && mResult.elements.length > 0) {
          elementsToAdd = [...elementsToAdd, ...mResult.elements]
        }
      } catch (mErr) {
        console.warn('Failed to parse step Mermaid:', mErr)
      }
    }

    const currentSceneElements = api.getSceneElements()

    if (elementsToAdd.length > 0) {
      const existingMap = new Map<string, any>()
      currentSceneElements.forEach((el) => existingMap.set(el.id, el))

      // Clean incoming elements
      const cleanedToAdd = elementsToAdd.map((el) => cleanElementForExcalidraw(el))

      // Merge: update existing elements or append new ones
      const mergedList: any[] = currentSceneElements.map((el) => {
        const incoming = cleanedToAdd.find((inc) => inc.id === el.id)
        return incoming ? { ...el, ...incoming } : el
      })

      cleanedToAdd.forEach((inc) => {
        if (inc.id && !existingMap.has(inc.id)) {
          mergedList.push(inc)
          existingMap.set(inc.id, inc)
        }
      })

      // Determine element IDs to highlight
      const targetIds = new Set<string>()
      if (step.highlightElementIds && step.highlightElementIds.length > 0) {
        step.highlightElementIds.forEach((id: string) => { if (id) targetIds.add(id) })
      } else {
        cleanedToAdd.forEach((e: any) => { if (e.id) targetIds.add(e.id) })
      }

      const selectedMap: Record<string, true> = {}
      targetIds.forEach((id) => {
        selectedMap[id] = true
      })

      applySceneUpdateWithoutAutoSync(api, {
        elements: mergedList,
        appState: {
          selectedElementIds: selectedMap,
        } as any,
      })

      // Smoothly zoom and scroll to the newly drawn step elements
      const highlightNodes = mergedList.filter((el) => targetIds.has(el.id))
      if (highlightNodes.length > 0) {
        api.scrollToContent(highlightNodes, { fitToViewport: true, animate: true, viewportZoomFactor: 0.85 })
      }

      // Persist to backend
      void syncToBackend({ silent: true })
    } else if (step.highlightElementIds && step.highlightElementIds.length > 0) {
      // Just highlight existing elements if no new shapes to add
      const targetIds = new Set<string>()
      step.highlightElementIds.forEach((id: string) => { if (id) targetIds.add(id) })
      const highlighted = currentSceneElements.filter((el) => targetIds.has(el.id))
      if (highlighted.length > 0) {
        const selectedMap: Record<string, true> = {}
        targetIds.forEach((id) => {
          selectedMap[id] = true
        })
        api.updateScene({
          appState: {
            selectedElementIds: selectedMap,
          } as any,
        })
        api.scrollToContent(highlighted, { fitToViewport: true, animate: true, viewportZoomFactor: 0.85 })
      }
    }
  }, [])

  const handleFocusEvidenceImage = useCallback((elementId?: string) => {
    const api = excalidrawAPIRef.current
    if (!api) return
    const currentScene = api.getSceneElements()
    if (elementId) {
      const target = currentScene.find((e) => e.id === elementId)
      if (target) {
        api.scrollToContent([target], { fitToViewport: true, animate: true, viewportZoomFactor: 0.85 })
        api.updateScene({
          appState: {
            selectedElementIds: { [elementId]: true },
          } as any,
        })
        return
      }
    }
    const imgEl = currentScene.find((e) => e.type === 'image')
    if (imgEl) {
      api.scrollToContent([imgEl], { fitToViewport: true, animate: true, viewportZoomFactor: 0.85 })
      api.updateScene({
        appState: {
          selectedElementIds: { [imgEl.id]: true },
        } as any,
      })
    }
  }, [])

  return (
    <div className="tutor-app" data-theme={theme}>
      {/* Zone 1: Header */}
      <Header
        level={level}
        onLevelChange={handleLevelChange}
        isConnected={isConnected}
        isAudioEnabled={isAudioEnabled}
        onToggleAudio={handleToggleAudio}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onClearCanvas={clearCanvas}
        onSyncCanvas={() => void syncToBackend()}
        isSyncing={syncStatus === 'syncing'}
        chatVisible={chatVisible}
        onToggleChat={() => setChatVisible(!chatVisible)}
      />

      {/* Main Workspace Layout */}
      <div className="tutor-main-layout">
        {/* Zone 2: Native Excalidraw Whiteboard Canvas */}
        <main className="tutor-canvas-wrapper">
          <div
            onPointerDownCapture={() => {
              userInteractedRef.current = true
            }}
            onKeyDownCapture={() => {
              userInteractedRef.current = true
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <Excalidraw
              viewModeEnabled={sceneLoadStatus !== 'ready'}
              excalidrawAPI={(api: ExcalidrawAPIRefValue) => setExcalidrawAPI(api)}
              onChange={(_elements, appState) => {
                if (appState?.theme && appState.theme !== theme) {
                  setTheme(appState.theme)
                  try {
                    window.localStorage?.setItem('excalidraw-canvas-theme', appState.theme)
                  } catch (error) {
                    console.warn('Failed to save theme to localStorage:', error)
                  }
                }
                scheduleAutoSync()
              }}
              initialData={{
                elements: [],
                appState: {
                  theme
                }
              }}
            />
          </div>
        </main>

        {/* Zone 3: Pedagogical Chat & Voice Interaction Panel */}
        {chatVisible && (
          <ChatPanel
            messages={messages}
            level={level}
            currentTopic={currentTopic}
            isLoading={isTutorLoading}
            onSendMessage={handleSendMessage}
            onResetLesson={handleResetLesson}
            onReadAloud={(txt) => voice.speak(txt)}
            isListening={voice.isListening}
            onToggleListen={() => {
              if (voice.isListening) {
                voice.stopListening()
              } else {
                voice.startListening()
              }
            }}
            isSpeaking={voice.isSpeaking}
            selectedVoice={voice.selectedVoice}
            onVoiceChange={voice.setSelectedVoice}
            onStepChange={handleStepChange}
            onSpeakText={(txt, onEnded) => voice.speak(txt, onEnded)}
            onStopSpeaking={voice.stopSpeaking}
            isAudioEnabled={isAudioEnabled}
            onFocusEvidenceImage={handleFocusEvidenceImage}
          />
        )}
      </div>

      {/* BYOK & Configuration Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  )
}

export default App
