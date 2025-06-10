type Provider = "Ollama" | "OpenAI" | "Google" | "Anthropic" | "OpenRouter" | string;
type Model = "gpt-4.1" | "o4-mini" | "gpt-4o-mini" | "claude-4-sonnet" | "claude-3.7-sonnet" | "gemini-2.5-pro" | string;

type ModelConfig = {
    model: Model;
    provider: Provider;
    name?: string;
    apiKey?: string;
    baseUrl?: string;
    customModel?: boolean;
}

export class AI {
    private model: Model = "gpt-4.1";
    private provider: Provider = "OpenAI";
    private customModel: boolean = false;
    private APIKey: string | null = null;
    private baseUrl: string | null = null;
    public instance: AI | null = null;


    constructor() {
        this.instance = this;
    }

    setModel(model: Model): void {
        this.model = model;
    }
    setProvider(provider: Provider): void {
        this.provider = provider;
        switch(provider) {
            case "Anthropic": this.baseUrl = "https://api.anthropic.com"; break;
            case "Google": this.baseUrl = "https://generativelanguage.googleapis.com"; break;
            case "OpenAI": this.baseUrl = "https://api.openai.com"; break;
            case "Ollama": this.baseUrl = "http://localhost:11434"; break;
            case "OpenRouter": this.baseUrl = "https://api.openrouter.ai/v1"; break;
            default: this.baseUrl = provider; break;
        }

    }
    getModelConfig(): ModelConfig {
        return  {
            model: this.model,
            provider: this.provider,
            name: this.nameFromModel() || "",
            apiKey: this.APIKey || "",
            baseUrl: this.baseUrl || "",
            customModel: this.customModel || false
        };
    }

    private nameFromModel(): string | undefined {
        // Split the model name by hyphens and dots
        const parts = this.model.split(/[-.]/);
        
        // Map each part to capitalize first letter and handle special cases
        const formattedParts = parts.map(part => {
            // Handle special cases
            if (part.toLowerCase() === 'gpt') return 'GPT';
            if (part.toLowerCase() === 'claude') return 'Claude';
            if (part.toLowerCase() === 'gemini') return 'Gemini';
            
            // Capitalize first letter of other parts
            return part.charAt(0).toUpperCase() + part.slice(1);
        });
        
        // Join parts back together with spaces
        return formattedParts.join(' ');
    }

    setAPIKey(apiKey: string): void {
        this.APIKey = apiKey;
    }
    setBaseUrl(baseUrl: string): void {
        this.baseUrl = baseUrl;
    }
    isCustomModel(customModel: boolean): void {
        this.customModel = customModel;
    }

    sendMessage(message: string, sys_prompt?: string, onChunk?: (chunk: string) => void): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.provider === "Ollama") {
                    const response = await fetch(`${this.baseUrl}/api/generate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: this.model,
                            prompt: message,
                            system: sys_prompt,
                            stream: true
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const reader = response.body?.getReader();
                    if (!reader) {
                        throw new Error('No reader available');
                    }

                    let fullResponse = '';
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        const chunk = new TextDecoder().decode(value);
                        const lines = chunk.split('\n').filter(line => line.trim());
                        
                        for (const line of lines) {
                            try {
                                const data = JSON.parse(line);
                                if (data.response) {
                                    fullResponse += data.response;
                                    // Call the streaming callback if provided
                                    if (onChunk) {
                                        onChunk(data.response);
                                    }
                                }
                            } catch (e) {
                                console.error('Error parsing JSON:', e);
                            }
                        }
                    }
                    
                    resolve(fullResponse);
                } else {
                    // For other providers, simulate streaming for better UX
                    const providerName = this.provider;
                    const modelName = this.nameFromModel() || this.model;
                    
                    const fullResponse = `Hello! I'm responding as **${modelName}** from **${providerName}**.

I understand you said: *"${message}"*

**Note:** This is currently a placeholder response. The actual ${providerName} API integration is not yet implemented. Currently, only Ollama is fully functional.

To test the system:
1. Install and run Ollama locally
2. Select an Ollama model from the dropdown
3. Try sending a message

The system will automatically use the real AI provider once their APIs are properly integrated.`;

                    // Simulate streaming by sending chunks with small delays
                    if (onChunk) {
                        const words = fullResponse.split(' ');
                        let accumulatedContent = '';
                        
                        for (let i = 0; i < words.length; i++) {
                            const word = words[i] + (i < words.length - 1 ? ' ' : '');
                            accumulatedContent += word;
                            
                            // Send chunks of 2-3 words at a time for faster streaming
                            if (i % 3 === 0 || i === words.length - 1) {
                                const contentToSend = accumulatedContent;
                                setTimeout(() => onChunk(contentToSend), i * 25); // Faster delays
                            }
                        }
                    }
                    
                    resolve(fullResponse);
                }
            } catch (error) {
                reject(error);
            }
        });
    }
}