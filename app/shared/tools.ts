import { IGrahpqlAIFetchProps } from './interface'
export const sleep = (sec: number) => new Promise(resolve => setTimeout(resolve, sec * 1000))

export const getGraphqlAIMashupBody = ({
    prompt,
    messages,
    maxTokens,
    name,
    isStream,
    queryQwen,
    qwenParams,
    queryGeminiPro,
    geminiProParams,
    queryMoonshot,
    moonshotParams,
    queryGroq,
    groqParams,
    queryClaude,
    claudeParams,
    queryErnie,
    ernieParams,
    queryOpenAI,
    openAIParams,
    queryWorkersAI,
    workersAIParams,
    queryLingyiwanwu,
    lingyiwanwuParams,
}: IGrahpqlAIFetchProps & { name?: string }) => {
    const queryName = name || 'GTAQuery'
    let paramsList = [`$params: ChatArgs`],
        queryList = [],
        variables: Record<string, any> = {
            params: {
                messages: messages
                    ? messages
                    : [
                          {
                              role: 'user',
                              content: prompt,
                          },
                      ],
                maxTokens: maxTokens || 2048,
            },
        }
    if (queryQwen) {
        let paramsQwen = '',
            hasQwenArgs = qwenParams
        if (hasQwenArgs) {
            paramsList.push(`$qwenParams: QwenArgs`)
            paramsQwen = '(params: $qwenParams)'
            variables.qwenParams = qwenParams
        }
        queryList.push(isStream ? `QwenStream${paramsQwen}@stream` : `Qwen ${paramsQwen} {text}`)
    }
    if (queryGeminiPro) {
        let paramsGeminiPro = '',
            hasGeminiProArgs = geminiProParams
        if (hasGeminiProArgs) {
            paramsList.push(`$geminiProParams: GeminiProArgs`)
            paramsGeminiPro = '(params: $geminiProParams)'
            variables.geminiProParams = geminiProParams
        }
        queryList.push(isStream ? `GeminiProStream${paramsGeminiPro}@stream` : `GeminiPro ${paramsGeminiPro} {text}`)
    }
    if (queryMoonshot) {
        let paramsMoonshot = '',
            hasMoonshotArgs = moonshotParams
        if (hasMoonshotArgs) {
            paramsList.push(`$moonshotParams: MoonshotArgs`)
            paramsMoonshot = '(params: $moonshotParams)'
            variables.moonshotParams = moonshotParams
        }
        queryList.push(isStream ? `MoonshotStream${paramsMoonshot}@stream` : `Moonshot ${paramsMoonshot} {text}`)
    }
    if (queryGroq) {
        let paramsGroq = '',
            hasGroqArgs = groqParams
        if (hasGroqArgs) {
            paramsList.push(`$groqParams: GroqArgs`)
            paramsGroq = '(params: $groqParams)'
            variables.groqParams = groqParams
        }
        queryList.push(isStream ? `GroqStream${paramsGroq}@stream` : `Groq ${paramsGroq} {text}`)
    }
    if (queryClaude) {
        let paramsClaude = '',
            hasClaudeArgs = claudeParams
        if (hasClaudeArgs) {
            paramsList.push(`$claudeParams: ClaudeArgs`)
            paramsClaude = '(params: $claudeParams)'
            variables.claudeParams = claudeParams
        }
        queryList.push(isStream ? `ClaudeStream${paramsClaude}@stream` : `Claude ${paramsClaude} {text}`)
    }
    if (queryErnie) {
        let paramsErnie = '',
            hasErnieArgs = ernieParams
        if (hasErnieArgs) {
            paramsList.push(`$ernieParams: ErnieArgs`)
            paramsErnie = '(params: $ernieParams)'
            variables.ernieParams = ernieParams
        }
        queryList.push(isStream ? `ErnieStream${paramsErnie}@stream` : `Ernie ${paramsErnie} {text}`)
    }
    if (queryOpenAI) {
        let paramsOpenAI = '',
            hasOpenAIArgs = openAIParams
        if (hasOpenAIArgs) {
            paramsList.push(`$openAIParams: OpenaiArgs`)
            paramsOpenAI = '(params: $openAIParams)'
            variables.openAIParams = openAIParams
        }
        queryList.push(isStream ? `OpenaiStream${paramsOpenAI}@stream` : `Openai ${paramsOpenAI} {text}`)
    }
    if (queryWorkersAI) {
        let paramsWorkersAI = '',
            hasWorkersAIArgs = workersAIParams
        if (hasWorkersAIArgs) {
            paramsList.push(`$workersAIParams: WorkersAIArgs`)
            paramsWorkersAI = '(params: $workersAIParams)'
            variables.workersAIParams = workersAIParams
        }
        queryList.push(isStream ? `WorkersAIStream${paramsWorkersAI}@stream` : `WorkersAI ${paramsWorkersAI} {text}`)
    }
    if (queryLingyiwanwu) {
        let paramsLingyiwanwu = '',
            hasLingyiwanwuArgs = lingyiwanwuParams
        if (hasLingyiwanwuArgs) {
            paramsList.push(`$lingyiwanwuParams: LingyiwanwuArgs`)
            paramsLingyiwanwu = '(params: $lingyiwanwuParams)'
            variables.lingyiwanwuParams = lingyiwanwuParams
        }
        queryList.push(
            isStream ? `LingyiwanwuStream${paramsLingyiwanwu}@stream` : `Lingyiwanwu ${paramsLingyiwanwu} {text}`
        )
    }
    const query = `query ${queryName}(${paramsList.join(', ')}) {
        chat(params: $params) {
            ${queryList.join('\n            ')}
        }
      }`
    return {
        operationName: queryName,
        query,
        variables,
    }
}
