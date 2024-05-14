export interface SpeechToken {
    authToken?: string
    region?: string
}

export interface IGrahpqlAIFetchProps {
    prompt?: string
    messages?: {
        role: string
        content: string
    }[]
    maxTokens?: number
    isStream?: boolean
    queryQwen?: boolean
    qwenParams?: Record<string, any>
    queryGeminiPro?: boolean
    geminiProParams?: Record<string, any>
    queryMoonshot?: boolean
    moonshotParams?: Record<string, any>
    queryGroq?: boolean
    groqParams?: Record<string, any>
    queryClaude?: boolean
    claudeParams?: Record<string, any>
    queryErnie?: boolean
    ernieParams?: Record<string, any>
    queryOpenAI?: boolean
    openAIParams?: Record<string, any>
    queryWorkersAI?: boolean
    workersAIParams?: Record<string, any>
    queryLingyiwanwu?: boolean
    lingyiwanwuParams?: Record<string, any>
    streamHandler?: (data: any) => void
    completeHandler?: (data: any) => void
}
