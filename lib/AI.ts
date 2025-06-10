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

    sendMessage(message: string, sys_prompt?: string, onChunk?: (chunk: string, thinking?: string) => void): Promise<string> {
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
                    let thinkingContent = '';
                    let actualContent = '';
                    let inThinking = false;
                    let thinkingComplete = false;
                    
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
                                    
                                    // Check for thinking tags
                                    if (!thinkingComplete) {
                                        if (fullResponse.startsWith('<think>')) {
                                            inThinking = true;
                                        }
                                        
                                        if (inThinking) {
                                            const thinkEndIndex = fullResponse.indexOf('</think>');
                                            if (thinkEndIndex !== -1) {
                                                // Extract thinking content (without tags)
                                                thinkingContent = fullResponse.substring(7, thinkEndIndex); // Skip '<think>'
                                                actualContent = fullResponse.substring(thinkEndIndex + 8); // Skip '</think>'
                                                thinkingComplete = true;
                                                inThinking = false;
                                                
                                                // Call callback with the new actual content chunk and thinking
                                                if (onChunk && actualContent) {
                                                    onChunk(actualContent, thinkingContent);
                                                }
                                            } else {
                                                // Still in thinking mode, don't send content yet
                                                if (onChunk) {
                                                    onChunk('', thinkingContent); // Send empty content but current thinking
                                                }
                                            }
                                        } else {
                                            // No thinking tags detected, send content normally
                                            if (onChunk) {
                                                onChunk(data.response);
                                            }
                                        }
                                    } else {
                                        // Thinking is complete, send just the new chunk
                                        if (onChunk) {
                                            onChunk(data.response, thinkingContent);
                                        }
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
                    
                    // Create a thinking response for some providers to demonstrate the feature
                    const shouldIncludeThinking = providerName === 'OpenAI' && message.toLowerCase().includes('think');
                    
                    const fullResponse = shouldIncludeThinking 
                        ? `<think>
The user is asking me to think about something. Since this is a demonstration of thinking models, I should show my reasoning process.

Let me analyze their message: "${message}"

This appears to be a request that would benefit from showing my thought process. I should:
1. Acknowledge their request
2. Show that I'm processing the information
3. Provide a thoughtful response

Since this is a placeholder implementation, I'll demonstrate how thinking models work by showing this internal reasoning, then provide a helpful response.
</think>

Hello! I'm responding as **${modelName}** from **${providerName}**.

I can see you mentioned "think" in your message, so I've demonstrated the thinking model feature. You should see a "Show thinking" button above that reveals my internal reasoning process.

**Your message:** *"${message}"*

This thinking model feature allows AI systems to show their reasoning process before arriving at a final answer, similar to how OpenAI's o1 models work.

**Note:** This is currently a placeholder response. The actual ${providerName} API integration is not yet implemented. Currently, only Ollama is fully functional.`
                        : `Hello! I'm responding as **${modelName}** from **${providerName}**.

I understand you said: *"${message}"*

**Note:** This is currently a placeholder response. The actual ${providerName} API integration is not yet implemented. Currently, only Ollama is fully functional.

To test the thinking feature, try asking OpenAI to "think about" something.

To test the system:
1. Install and run Ollama locally
2. Select an Ollama model from the dropdown
3. Try sending a message

The system will automatically use the real AI provider once their APIs are properly integrated.`;

                    // Simulate streaming by sending chunks with small delays
                    if (onChunk) {
                        // Check if response has thinking tags
                        if (fullResponse.includes('<think>') && fullResponse.includes('</think>')) {
                            const thinkStart = fullResponse.indexOf('<think>');
                            const thinkEnd = fullResponse.indexOf('</think>');
                            const thinkingContent = fullResponse.substring(thinkStart + 7, thinkEnd);
                            const actualContent = fullResponse.substring(thinkEnd + 8);
                            
                            // First, send empty content with thinking
                            setTimeout(() => onChunk('', thinkingContent), 100);
                            
                            // Then simulate thinking time, then stream actual content
                            setTimeout(() => {
                                const words = actualContent.split(' ');
                                
                                for (let i = 0; i < words.length; i++) {
                                    // Send chunks of 2-3 words at a time
                                    if (i % 3 === 0 || i === words.length - 1) {
                                        const chunkWords = words.slice(Math.max(0, i-2), i+1).join(' ') + (i === words.length - 1 ? '' : ' ');
                                        setTimeout(() => onChunk(chunkWords, thinkingContent), i * 25);
                                    }
                                }
                            }, 1000); // 1 second thinking delay
                        } else {
                            // Normal streaming without thinking
                            const words = fullResponse.split(' ');
                            
                            for (let i = 0; i < words.length; i++) {
                                const word = words[i] + (i < words.length - 1 ? ' ' : '');
                                
                                // Send chunks of 2-3 words at a time for faster streaming
                                if (i % 3 === 0 || i === words.length - 1) {
                                    const chunkWords = words.slice(Math.max(0, i-2), i+1).join(' ');
                                    setTimeout(() => onChunk(chunkWords), i * 25); // Send word chunks
                                }
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