"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ModelSelectorDropdown } from "@/components/ModelSelectorDropdown"
import { Models, ModelProviders } from "@/lib/AI"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useSession } from "@/lib/auth-client"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"

interface SettingsTab {
    title: string;
    description: string;
    settings: Setting[];
}

interface Setting {
    name: string;
    value: string | boolean | number;
    type: "text" | "number" | "boolean" | "select" | "boolean_group" | "text_group" | "number_group" | "select_group" | "textarea";
    options?: string[];
    group?: SettingGroup;
    description?: string;
}

interface SettingGroup {
    name: string;
    settings: Setting[];
    description?: string;
}

interface Settings {
    [key: string]: SettingsTab;
}

interface APIKey {
    id: string;
    provider: string;
    key: string;
    enabled?: boolean;
    isCustom?: boolean;
    customName?: string;
    customBaseUrl?: string;
}

interface CustomModel {
    id: string;
    name: string;
    provider: string;
    hasFileUpload: boolean;
    hasVision: boolean;
    hasThinking: boolean;
    hasPDFManipulation: boolean;
    hasSearch: boolean;
}

export default function SettingsPage() {
    const { data: session } = useSession()
    const userId = session?.user?.id
    const [activeTab, setActiveTab] = useState("models")
    const [apiKeys, setApiKeys] = useState<APIKey[]>([])
    const [tempKeyValues, setTempKeyValues] = useState<Record<string, string>>({})
    const [customModels, setCustomModels] = useState<CustomModel[]>([])
    const [requestLimit, setRequestLimit] = useState<{
        id: string;
        requestCount: number;
        maxRequests: number;
        resetAt: string;
    } | null>(null)
    
    // Add state for system prompt and default model
    const [systemPrompt, setSystemPrompt] = useState("")
    const [defaultModel, setDefaultModel] = useState("gpt-4.1")
    const [isSaving, setIsSaving] = useState(false)
    
    const [settings, setSettings] = useState<Settings>({
        models: {
            title: "Models",
            description: "Configure your AI model settings",
            settings: [
                {
                    name: "Default Model",
                    value: defaultModel,
                    type: "select",
                    options: Models.map(m => m.model),
                    description: "Select your default AI model"
                },
                {
                    name: "System Prompt",
                    value: systemPrompt,
                    type: "textarea",
                    description: "Enter your system prompt (optional)"
                }
            ]
        },
        general: {
            title: "General",
            description: "General application settings",
            settings: [
                {
                    name: "Dark Mode",
                    value: false,
                    type: "boolean",
                    description: "Enable dark mode"
                }
            ]
        },
        account: {
            title: "Account",
            description: "Manage your account settings",
            settings: [
                {
                    name: "Email Notifications",
                    value: true,
                    type: "boolean",
                    description: "Receive email notifications"
                }
            ]
        }
    })
    const [newProvider, setNewProvider] = useState<{
        name: string;
        baseUrl: string;
        apiKey: string;
        customName?: string;
    }>({
        name: "",
        baseUrl: "",
        apiKey: "",
        customName: ""
    })
    const [newModel, setNewModel] = useState({
        name: "",
        provider: "",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: false,
        hasPDFManipulation: false,
        hasSearch: false
    })

    // Fetch API keys and custom models on mount
    useEffect(() => {
        if (userId) {
            fetchApiKeys()
            fetchCustomModels()
            fetchRequestLimit()
            fetchUserPreferences()
        }
        
        // Load default model from localStorage
        const savedDefaultModel = localStorage.getItem('qchat-default-model')
        if (savedDefaultModel) {
            setDefaultModel(savedDefaultModel)
        }
        
        // Load system prompt from localStorage
        const savedSystemPrompt = localStorage.getItem('qchat-system-prompt')
        if (savedSystemPrompt) {
            setSystemPrompt(savedSystemPrompt)
        }
    }, [userId])

    // Update settings when state changes
    useEffect(() => {
        setSettings(prev => ({
            ...prev,
            models: {
                ...prev.models,
                settings: [
                    {
                        name: "Default Model",
                        value: defaultModel,
                        type: "select",
                        options: Models.map(m => m.model),
                        description: "Select your default AI model"
                    },
                    {
                        name: "System Prompt",
                        value: systemPrompt,
                        type: "textarea",
                        description: "Enter your system prompt (optional)"
                    }
                ]
            }
        }))
    }, [defaultModel, systemPrompt])

    const fetchApiKeys = async () => {
        try {
            const response = await fetch(`/api/settings/keys?userId=${userId}`)
            if (!response.ok) throw new Error('Failed to fetch API keys')
            const data = await response.json()
            setApiKeys(data)
        } catch (error) {
            console.error('Error fetching API keys:', error)
            toast.error('Failed to fetch API keys')
        }
    }

    const fetchCustomModels = async () => {
        try {
            const response = await fetch(`/api/settings/models?userId=${userId}`)
            if (!response.ok) throw new Error('Failed to fetch custom models')
            const data = await response.json()
            setCustomModels(data)
        } catch (error) {
            console.error('Error fetching custom models:', error)
            toast.error('Failed to fetch custom models')
        }
    }

    const fetchRequestLimit = async () => {
        try {
            const response = await fetch(`/api/settings/limits?userId=${userId}`)
            if (!response.ok) throw new Error('Failed to fetch request limit')
            const data = await response.json()
            setRequestLimit(data[0] || null)
        } catch (error) {
            console.error('Error fetching request limit:', error)
            toast.error('Failed to fetch request limit')
        }
    }

    const fetchUserPreferences = async () => {
        try {
            const response = await fetch(`/api/settings/preferences?userId=${userId}`)
            if (!response.ok) throw new Error('Failed to fetch preferences')
            const data = await response.json()
            if (data.systemPrompt) {
                setSystemPrompt(data.systemPrompt)
            }
            if (data.defaultModel) {
                setDefaultModel(data.defaultModel)
            }
        } catch (error) {
            console.error('Error fetching preferences:', error)
            // Don't show error toast for preferences as they're optional
        }
    }

    const updateRequestLimit = async (maxRequests: number) => {
        try {
            const response = await fetch('/api/settings/limits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, maxRequests })
            })
            if (!response.ok) throw new Error('Failed to update request limit')
            await fetchRequestLimit()
            toast.success('Request limit updated successfully')
        } catch (error) {
            console.error('Error updating request limit:', error)
            toast.error('Failed to update request limit')
        }
    }

    const resetRequestLimit = async () => {
        try {
            const response = await fetch('/api/settings/limits/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            })
            if (!response.ok) throw new Error('Failed to reset request limit')
            await fetchRequestLimit()
            toast.success('Request limit reset successfully')
        } catch (error) {
            console.error('Error resetting request limit:', error)
            toast.error('Failed to reset request limit')
        }
    }

    const resetRateLimit = async () => {
        try {
            const response = await fetch('/dev/rate-limit/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            if (!response.ok) throw new Error('Failed to reset rate limit')
            toast.success('Rate limit reset successfully')
        } catch (error) {
            console.error('Error resetting rate limit:', error)
            toast.error('Failed to reset rate limit')
        }
    }

    const addApiKey = async (key: Omit<APIKey, 'id'>) => {
        try {
            const response = await fetch('/api/settings/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...key, userId, enabled: true })
            })
            if (!response.ok) throw new Error('Failed to add API key')
            await fetchApiKeys()
            toast.success('API key added successfully')
        } catch (error) {
            console.error('Error adding API key:', error)
            toast.error('Failed to add API key')
        }
    }

    const saveApiKey = async (provider: string) => {
        const keyValue = tempKeyValues[provider] || ''
        if (!keyValue.trim()) {
            toast.error('Please enter an API key')
            return
        }

        try {
            const existingKey = apiKeys.find(k => k.provider === provider)
            if (existingKey) {
                // Update existing key
                const response = await fetch(`/api/settings/keys/${existingKey.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: keyValue, enabled: true })
                })
                if (!response.ok) throw new Error('Failed to update API key')
            } else {
                // Add new key
                await addApiKey({
                    provider,
                    key: keyValue,
                    enabled: true
                })
            }
            
            // Clear temp value
            setTempKeyValues(prev => ({ ...prev, [provider]: '' }))
            await fetchApiKeys()
            toast.success(`${provider} API key saved successfully`)
        } catch (error) {
            console.error('Error saving API key:', error)
            toast.error('Failed to save API key')
        }
    }

    const toggleApiKey = async (keyId: string, enabled: boolean) => {
        try {
            const response = await fetch(`/api/settings/keys/${keyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            })
            if (!response.ok) throw new Error('Failed to toggle API key')
            await fetchApiKeys()
            toast.success(`API key ${enabled ? 'enabled' : 'disabled'} successfully`)
        } catch (error) {
            console.error('Error toggling API key:', error)
            toast.error('Failed to toggle API key')
        }
    }

    const removeApiKey = async (id: string) => {
        try {
            const response = await fetch(`/api/settings/keys/${id}`, {
                method: 'DELETE'
            })
            if (!response.ok) throw new Error('Failed to remove API key')
            await fetchApiKeys()
            toast.success('API key removed successfully')
        } catch (error) {
            console.error('Error removing API key:', error)
            toast.error('Failed to remove API key')
        }
    }

    const addCustomModel = async (model: Omit<CustomModel, 'id'>) => {
        try {
            const response = await fetch('/api/settings/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...model, userId })
            })
            if (!response.ok) throw new Error('Failed to add custom model')
            await fetchCustomModels()
            toast.success('Custom model added successfully')
        } catch (error) {
            console.error('Error adding custom model:', error)
            toast.error('Failed to add custom model')
        }
    }

    const removeCustomModel = async (id: string) => {
        try {
            const response = await fetch(`/api/settings/models/${id}`, {
                method: 'DELETE'
            })
            if (!response.ok) throw new Error('Failed to remove custom model')
            await fetchCustomModels()
            toast.success('Custom model removed successfully')
        } catch (error) {
            console.error('Error removing custom model:', error)
            toast.error('Failed to remove custom model')
        }
    }

    const addCustomProvider = () => {
        if (newProvider.name && newProvider.baseUrl && newProvider.apiKey) {
            addApiKey({
                provider: newProvider.name,
                key: newProvider.apiKey,
                isCustom: true,
                customName: newProvider.name,
                customBaseUrl: newProvider.baseUrl
            })
            setNewProvider({ name: "", baseUrl: "", apiKey: "", customName: "" })
        }
    }

    const renderSetting = (setting: Setting) => {
        switch (setting.type) {
            case "select":
                return (
                    <Select
                        value={setting.value as string}
                        onValueChange={(value) => {
                            if (setting.name === "Default Model") {
                                setDefaultModel(value);
                            } else {
                                const updatedSettings = {
                                    ...settings,
                                    [activeTab]: {
                                        ...settings[activeTab],
                                        settings: settings[activeTab].settings.map((s: Setting) => 
                                            s.name === setting.name 
                                                ? { ...s, value }
                                                : s
                                        )
                                    }
                                };
                                setSettings(updatedSettings);
                            }
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                            {setting.options?.map(option => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            case "text":
                return (
                    <Input
                        type="text"
                        value={setting.value as string}
                        onChange={(e) => {
                            const updatedSettings = {
                                ...settings,
                                [activeTab]: {
                                    ...settings[activeTab],
                                    settings: settings[activeTab].settings.map((s: Setting) => 
                                        s.name === setting.name 
                                            ? { ...s, value: e.target.value }
                                            : s
                                    )
                                }
                            };
                            setSettings(updatedSettings);
                        }}
                    />
                );
            case "boolean":
                return (
                    <Switch
                        checked={setting.value as boolean}
                        onCheckedChange={(checked) => {
                            const updatedSettings = {
                                ...settings,
                                [activeTab]: {
                                    ...settings[activeTab],
                                    settings: settings[activeTab].settings.map((s: Setting) => 
                                        s.name === setting.name 
                                            ? { ...s, value: checked }
                                            : s
                                    )
                                }
                            };
                            setSettings(updatedSettings);
                        }}
                    />
                );
            case "textarea":
                return (
                    <Textarea
                        value={setting.value as string}
                        onChange={(e) => {
                            if (setting.name === "System Prompt") {
                                setSystemPrompt(e.target.value);
                            } else {
                                const updatedSettings = {
                                    ...settings,
                                    [activeTab]: {
                                        ...settings[activeTab],
                                        settings: settings[activeTab].settings.map((s: Setting) => 
                                            s.name === setting.name 
                                                ? { ...s, value: e.target.value }
                                                : s
                                        )
                                    }
                                };
                                setSettings(updatedSettings);
                            }
                        }}
                    />
                );
            case "boolean_group":
            case "text_group":
            case "number_group":
            case "select_group":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{setting.group?.name}</CardTitle>
                            {setting.group?.description && (
                                <CardDescription>{setting.group.description}</CardDescription>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {setting.group?.settings.map((groupSetting: Setting) => (
                                <div key={groupSetting.name} className="flex items-center justify-between space-x-2">
                                    <div className="space-y-0.5">
                                        <Label>{groupSetting.name}</Label>
                                        {groupSetting.description && (
                                            <p className="text-sm text-muted-foreground">{groupSetting.description}</p>
                                        )}
                                    </div>
                                    {groupSetting.type === "boolean" && (
                                        <Switch
                                            checked={groupSetting.value as boolean}
                                            onCheckedChange={(checked) => {
                                                const updatedSettings = {
                                                    ...settings,
                                                    [activeTab]: {
                                                        ...settings[activeTab],
                                                        settings: settings[activeTab].settings.map((s: Setting) => 
                                                            s.name === setting.name 
                                                                ? {
                                                                    ...s,
                                                                    group: {
                                                                        ...s.group!,
                                                                        settings: s.group!.settings.map((gs: Setting) =>
                                                                            gs.name === groupSetting.name
                                                                                ? { ...gs, value: checked }
                                                                                : gs
                                                                        )
                                                                    }
                                                                }
                                                                : s
                                                        )
                                                    }
                                                };
                                                setSettings(updatedSettings);
                                            }}
                                        />
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                );
            default:
                return null;
        }
    };

    const renderApiKeySection = () => (
        <Card>
            <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                    Manage your API keys for different providers. Use your own keys for free, or use ours for 1 request each.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    {/* OpenAI */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                            <div className="font-medium">OpenAI</div>
                            <div className="text-sm text-muted-foreground">GPT-4, GPT-3.5, and more</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                type="password"
                                placeholder="Enter OpenAI API key"
                                value={tempKeyValues["OpenAI"] ?? apiKeys.find(k => k.provider === "OpenAI")?.key ?? ""}
                                onChange={(e) => {
                                    setTempKeyValues(prev => ({ ...prev, "OpenAI": e.target.value }))
                                }}
                                className="w-[200px]"
                            />
                            <Button
                                size="sm"
                                onClick={() => saveApiKey("OpenAI")}
                                disabled={!tempKeyValues["OpenAI"]?.trim()}
                            >
                                Save
                            </Button>
                            {apiKeys.find(k => k.provider === "OpenAI") && (
                                <Switch
                                    checked={apiKeys.find(k => k.provider === "OpenAI")?.enabled ?? false}
                                    onCheckedChange={(enabled) => {
                                        const key = apiKeys.find(k => k.provider === "OpenAI")
                                        if (key) toggleApiKey(key.id, enabled)
                                    }}
                                />
                            )}
                            {apiKeys.find(k => k.provider === "OpenAI") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const key = apiKeys.find(k => k.provider === "OpenAI")
                                        if (key) removeApiKey(key.id)
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Anthropic */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                            <div className="font-medium">Anthropic</div>
                            <div className="text-sm text-muted-foreground">Claude 3.5, Claude 3.7, and more</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                type="password"
                                placeholder="Enter Anthropic API key"
                                value={tempKeyValues["Anthropic"] ?? apiKeys.find(k => k.provider === "Anthropic")?.key ?? ""}
                                onChange={(e) => {
                                    setTempKeyValues(prev => ({ ...prev, "Anthropic": e.target.value }))
                                }}
                                className="w-[200px]"
                            />
                            <Button
                                size="sm"
                                onClick={() => saveApiKey("Anthropic")}
                                disabled={!tempKeyValues["Anthropic"]?.trim()}
                            >
                                Save
                            </Button>
                            {apiKeys.find(k => k.provider === "Anthropic") && (
                                <Switch
                                    checked={apiKeys.find(k => k.provider === "Anthropic")?.enabled ?? false}
                                    onCheckedChange={(enabled) => {
                                        const key = apiKeys.find(k => k.provider === "Anthropic")
                                        if (key) toggleApiKey(key.id, enabled)
                                    }}
                                />
                            )}
                            {apiKeys.find(k => k.provider === "Anthropic") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const key = apiKeys.find(k => k.provider === "Anthropic")
                                        if (key) removeApiKey(key.id)
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* OpenRouter */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                            <div className="font-medium">OpenRouter</div>
                            <div className="text-sm text-muted-foreground">Access to 100+ models</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                type="password"
                                placeholder="Enter OpenRouter API key"
                                value={tempKeyValues["OpenRouter"] ?? apiKeys.find(k => k.provider === "OpenRouter")?.key ?? ""}
                                onChange={(e) => {
                                    setTempKeyValues(prev => ({ ...prev, "OpenRouter": e.target.value }))
                                }}
                                className="w-[200px]"
                            />
                            <Button
                                size="sm"
                                onClick={() => saveApiKey("OpenRouter")}
                                disabled={!tempKeyValues["OpenRouter"]?.trim()}
                            >
                                Save
                            </Button>
                            {apiKeys.find(k => k.provider === "OpenRouter") && (
                                <Switch
                                    checked={apiKeys.find(k => k.provider === "OpenRouter")?.enabled ?? false}
                                    onCheckedChange={(enabled) => {
                                        const key = apiKeys.find(k => k.provider === "OpenRouter")
                                        if (key) toggleApiKey(key.id, enabled)
                                    }}
                                />
                            )}
                            {apiKeys.find(k => k.provider === "OpenRouter") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const key = apiKeys.find(k => k.provider === "OpenRouter")
                                        if (key) removeApiKey(key.id)
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Google Gemini */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                            <div className="font-medium">Google (Gemini)</div>
                            <div className="text-sm text-muted-foreground">Gemini 2.0, Gemini 2.5, and more</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                type="password"
                                placeholder="Enter Google API key"
                                value={tempKeyValues["Google"] ?? apiKeys.find(k => k.provider === "Google")?.key ?? ""}
                                onChange={(e) => {
                                    setTempKeyValues(prev => ({ ...prev, "Google": e.target.value }))
                                }}
                                className="w-[200px]"
                            />
                            <Button
                                size="sm"
                                onClick={() => saveApiKey("Google")}
                                disabled={!tempKeyValues["Google"]?.trim()}
                            >
                                Save
                            </Button>
                            {apiKeys.find(k => k.provider === "Google") && (
                                <Switch
                                    checked={apiKeys.find(k => k.provider === "Google")?.enabled ?? false}
                                    onCheckedChange={(enabled) => {
                                        const key = apiKeys.find(k => k.provider === "Google")
                                        if (key) toggleApiKey(key.id, enabled)
                                    }}
                                />
                            )}
                            {apiKeys.find(k => k.provider === "Google") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const key = apiKeys.find(k => k.provider === "Google")
                                        if (key) removeApiKey(key.id)
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )

    const renderRequestLimitSection = () => (
        <div className="space-y-2">
            <div className="space-y-0.5">
                <Label>Request Limit</Label>
                <p className="text-sm text-muted-foreground">
                    Your monthly request limit for all AI models
                </p>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                            {requestLimit ? `${requestLimit.requestCount}/${requestLimit.maxRequests} requests` : '0/250 requests'}
                        </span>
                        {requestLimit && (
                            <span className="text-xs text-muted-foreground">
                                Resets on {new Date(requestLimit.resetAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ 
                                width: requestLimit 
                                    ? `${(requestLimit.requestCount / requestLimit.maxRequests) * 100}%` 
                                    : '0%' 
                            }}
                        />
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={resetRequestLimit}
                    className="shrink-0"
                >
                    Reset Limit
                </Button>
            </div>
        </div>
    )

    const renderCustomModelsSection = () => (
        <Card>
            <CardHeader>
                <CardTitle>Custom Models</CardTitle>
                <CardDescription>
                    Add and manage your custom models
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Existing Custom Models */}
                <div className="space-y-4">
                    {customModels.map((model) => (
                        <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                                <div className="font-medium">{model.name}</div>
                                <div className="text-sm text-muted-foreground">
                                    Provider: {model.provider}
                                </div>
                                <div className="flex gap-2 mt-2">
                                    {model.hasFileUpload && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">File Upload</span>}
                                    {model.hasVision && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Vision</span>}
                                    {model.hasThinking && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Thinking</span>}
                                    {model.hasPDFManipulation && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">PDF</span>}
                                    {model.hasSearch && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Search</span>}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCustomModel(model.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Add Custom Model Dialog */}
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Custom Model
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Custom Model</DialogTitle>
                            <DialogDescription>
                                Add a custom model with its capabilities
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Model Name</Label>
                                <Input
                                    placeholder="Enter model name"
                                    value={newModel.name}
                                    onChange={(e) => setNewModel(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Provider</Label>
                                <Select
                                    onValueChange={(value) => setNewModel(prev => ({ ...prev, provider: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {apiKeys.map(key => (
                                            <SelectItem key={key.id} value={key.isCustom ? key.customName! : key.provider}>
                                                {key.isCustom ? key.customName : key.provider}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-4">
                                <Label>Capabilities</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="fileUpload"
                                            checked={newModel.hasFileUpload}
                                            onCheckedChange={(checked) => setNewModel(prev => ({ ...prev, hasFileUpload: checked }))}
                                        />
                                        <Label htmlFor="fileUpload">File Upload</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="vision"
                                            checked={newModel.hasVision}
                                            onCheckedChange={(checked) => setNewModel(prev => ({ ...prev, hasVision: checked }))}
                                        />
                                        <Label htmlFor="vision">Vision</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="thinking"
                                            checked={newModel.hasThinking}
                                            onCheckedChange={(checked) => setNewModel(prev => ({ ...prev, hasThinking: checked }))}
                                        />
                                        <Label htmlFor="thinking">Thinking</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="pdfManipulation"
                                            checked={newModel.hasPDFManipulation}
                                            onCheckedChange={(checked) => setNewModel(prev => ({ ...prev, hasPDFManipulation: checked }))}
                                        />
                                        <Label htmlFor="pdfManipulation">PDF Manipulation</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="search"
                                            checked={newModel.hasSearch}
                                            onCheckedChange={(checked) => setNewModel(prev => ({ ...prev, hasSearch: checked }))}
                                        />
                                        <Label htmlFor="search">Search</Label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => addCustomModel(newModel)}>Add Model</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    )

    const saveSettings = async () => {
        setIsSaving(true)
        try {
            // Save to localStorage
            localStorage.setItem('qchat-default-model', defaultModel)
            localStorage.setItem('qchat-system-prompt', systemPrompt)
            
            // Save to database if needed (for system prompt)
            if (userId) {
                const response = await fetch('/api/settings/preferences', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        userId, 
                        systemPrompt,
                        defaultModel 
                    })
                })
                if (!response.ok) throw new Error('Failed to save preferences')
            }
            
            toast.success('Settings saved successfully')
        } catch (error) {
            console.error('Error saving settings:', error)
            toast.error('Failed to save settings')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="container max-w-5xl py-6 space-y-8 mx-auto">
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and preferences
                </p>
            </div>
            <Separator />
            
            <div className="flex gap-8">
                {/* Left Navigation - Fixed */}
                <nav className="w-[200px] shrink-0 sticky top-6 h-[calc(100vh-8rem)]">
                    <div className="space-y-1">
                        {Object.entries(settings).map(([key, tab]: [string, SettingsTab]) => (
                            <button 
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`w-full px-3 py-2 text-left rounded-md transition-colors ${
                                    activeTab === key 
                                        ? "bg-accent text-accent-foreground" 
                                        : "hover:bg-accent/50"
                                }`}
                            >
                                {tab.title}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Main Content - Scrollable */}
                <div className="flex-1 min-w-0 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{settings[activeTab].title}</CardTitle>
                            <CardDescription>
                                {settings[activeTab].description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {settings[activeTab].settings.map((setting: Setting) => (
                                <div key={setting.name} className="space-y-2">
                                    <div className="space-y-0.5">
                                        <Label>{setting.name}</Label>
                                        {setting.description && (
                                            <p className="text-sm text-muted-foreground">{setting.description}</p>
                                        )}
                                    </div>
                                    {renderSetting(setting)}
                                </div>
                            ))}
                            {activeTab === "models" && (
                                <div className="flex justify-end pt-4 border-t">
                                    <Button 
                                        onClick={saveSettings} 
                                        disabled={isSaving}
                                        className="w-fit"
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Settings'
                                        )}
                                    </Button>
                                </div>
                            )}
                            {activeTab === "account" && renderRequestLimitSection()}
                            {activeTab === "account" && (
                                <div className="space-y-2">
                                    <div className="space-y-0.5">
                                        <Label>Rate Limit (Development)</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Reset your API rate limit for development purposes
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={resetRateLimit}
                                        className="w-fit"
                                    >
                                        Reset Rate Limit
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* API Keys and Custom Models Sections - Only show in Models tab */}
                    {activeTab === "models" && (
                        <>
                            {renderApiKeySection()}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
