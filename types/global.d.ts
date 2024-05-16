// global.d.ts

declare type TBaseContext = Record<string, any>;

declare type TParent = Record<string, any>;

interface Window {
    SpeechRecognition: SpeechRecognition
    webkitSpeechRecognition: SpeechRecognition
    SpeechGrammarList: any
    webkitSpeechGrammarList: any
    SpeechRecognitionEvent: any
    webkitSpeechRecognitionEvent: any
}

interface SpeechRecognition {
    new (): SpeechRecognition;
    // 根据实际情况，添加 SpeechRecognition 接口所需的属性和方法
    // 例如：
    start: () => void;
    stop: () => void;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    lang: string;
    onresult: (event: any) => void; // 这里应使用更具体的类型，但为了简化示例，使用 'any'
  }