import Groq from 'groq-sdk'
import DataLoader from 'dataloader'
import { ICommonDalArgs, IMessage, Roles } from '../../types'
import _ from 'lodash'
import { generationConfig } from '../../utils/constants'

const DEFAULT_MODEL_NAME = `llama3-70b-8192` // 'mixtral-8x7b-32768'

const convertMessages = (messages: ICommonDalArgs['messages']) => {
    let history = _.map(messages, message => {
        return {
            role: message.role == Roles.model ? Roles.assistant : message.role,
            content: message.content,
        }
    })
    const currentMessage = messages?.at(-1)?.content
    return {
        history: history,
        currentMessage,
    }
}

const fetchGroq = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {
    const {
        messages,
        apiKey,
        model: modelName,
        isStream,
        maxOutputTokens,
        completeHandler,
        streamHandler,
    } = params || {}
    const env = (typeof process != 'undefined' && process?.env) || ({} as NodeJS.ProcessEnv)
    const API_KEY = apiKey || env?.GROQ_API_KEY || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    const max_tokens = maxOutputTokens || generationConfig.maxOutputTokens
    if (_.isEmpty(messages) || !API_KEY) {
        return 'there is no messages or api key of Groq'
    }
    let { history, currentMessage } = convertMessages(messages)
    const groq = new Groq({
        apiKey: API_KEY,
    })

    let attachedMessage = currentMessage

    console.log(`isStream`, isStream)

    if (history?.at(-1)?.content && attachedMessage) {
        history!.at(-1)!.content = attachedMessage
    }

    if (isStream) {
        try {
            const completion = await groq.chat.completions.create({
                model: modelUse,
                max_tokens,
                temperature: 0,
                // @ts-ignore
                messages: history,
                stream: true,
            })

            let content = ``
            for await (const chunk of completion) {
                const text = chunk.choices[0].delta.content
                console.log(`Groq text`, text)
                if (text) {
                    streamHandler({
                        token: text,
                        status: true,
                    })
                    content += text
                }
            }
            completeHandler({
                content: content,
                status: true,
            })
        } catch (e) {
            console.log(`Groq error`, e)

            completeHandler({
                content: '',
                status: false,
            })
        }
    } else {
        let msg = ''
        try {
            const result = await groq.chat.completions.create({
                model: modelUse,
                max_tokens,
                temperature: 0,
                // @ts-ignore
                messages: history,
            })
            msg = result?.choices?.[0]?.message?.content || ''
        } catch (e) {
            console.log(`groq error`, e)
            msg = String(e)
        }

        console.log(`Groq result`, msg)
        return msg
    }
}

const loaderGroq = async (ctx: TBaseContext, args: ICommonDalArgs, key: string) => {
    ctx.loaderGroqArgs = {
        ...ctx.loaderGroqArgs,
        [key]: args,
    }

    if (!ctx?.loaderGroq) {
        ctx.loaderGroq = new DataLoader<string, string>(async keys => {
            console.log(`loaderGroq-keys-🐹🐹🐹`, keys)
            try {
                const groqAnswerList = await Promise.all(
                    keys.map(key =>
                        fetchGroq(ctx, {
                            ...ctx.loaderGroqArgs[key],
                        })
                    )
                )
                return groqAnswerList
            } catch (e) {
                console.log(`[loaderGroq] error: ${e}`)
            }
            return new Array(keys.length || 1).fill({ status: false })
        })
    }
    return ctx.loaderGroq
}

export default { fetch: fetchGroq, loader: loaderGroq }
