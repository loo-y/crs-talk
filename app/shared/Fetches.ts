import _ from 'lodash'
import Cookie from 'universal-cookie'
import { IGrahpqlAIFetchProps } from './interface'
import { getGraphqlAIMashupBody } from './tools'
import { fetchEventSource } from '@microsoft/fetch-event-source'

const graphqlUrl = '/graphql'

const commonOptions = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
}

export const fetchTokenOrRefresh = async (isOpenAI?: boolean) => {
    const cookie = new Cookie()
    const speechTokenCookieName = isOpenAI ? 'openai-speech-token' : 'speech-token'
    const speechToken = cookie.get(speechTokenCookieName)

    if (speechToken === undefined) {
        try {
            const response = await fetch(isOpenAI ? '/api/azureOpenAISpeechToken' : '/api/azureSpeechToken', {
                ...commonOptions,
                method: 'GET',
            })
            const result = await response.json()
            const { token, region } = result || {}
            cookie.set(speechTokenCookieName, region + ':' + token, { maxAge: 540, path: '/' })
            console.log('Token fetched from back-end: ' + token)
            return { status: true, authToken: token, region: region }
        } catch (err) {
            return { status: false, authToken: null, errorInfo: err }
        }
    } else {
        console.log(`Token fetched from cookie ${isOpenAI ? 'openai-speech-token' : 'speech-token'}: ` + speechToken)
        const idx = speechToken.indexOf(':')
        return { status: true, authToken: speechToken.slice(idx + 1), region: speechToken.slice(0, idx) }
    }
}

export const fetchAIGraphql = async (paramsForAIGraphql: IGrahpqlAIFetchProps) => {
    let data = null,
        status = false

    const body = getGraphqlAIMashupBody({
        ...paramsForAIGraphql,
        name: `GetAiGraphqlQuery`,
    })

    try {
        const response = await fetch(graphqlUrl, {
            ...commonOptions,
            method: 'POST',
            body: JSON.stringify(body),
        })
        if (!response.ok) {
            return {
                status,
                data,
            }
        }
        data = await response.json()
        status = true
    } catch (e) {
        console.log(`fetchAIGraphql`, e)
    }

    return {
        data,
        status,
    }
}

export const fetchAIGraphqlStream = async (paramsForAIGraphql: IGrahpqlAIFetchProps) => {
    const abortController = new AbortController()
    const { streamHandler, completeHandler, ...rest } = paramsForAIGraphql || {}
    const body = getGraphqlAIMashupBody({
        ...rest,
        name: `GetAiGraphqlQuery`,
    })
    try {
        await fetchEventSource(graphqlUrl, {
            ...commonOptions,
            method: 'POST',
            body: JSON.stringify(body),
            onmessage(ev) {
                console.log(ev.data)
                const data = ev?.data || {}
                if (streamHandler) {
                    streamHandler({
                        data,
                        status: true,
                    })
                }
            },
            onclose() {
                if (completeHandler) {
                    completeHandler({
                        data: null,
                        status: true,
                    })
                }
            },
            onerror(err) {
                if (completeHandler) {
                    completeHandler({
                        err,
                        status: false,
                    })
                }
            },
            signal: abortController.signal,
        })
    } catch (e) {
        console.log(`fetchAIGraphqlStream`, e)
    }
}
