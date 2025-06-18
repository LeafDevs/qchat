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

interface SettingsTab {
    title: string;
    description: string;
    settings: Setting[];
}

interface Setting {
    name: string;
    value: string | boolean | number;
    type: "text" | "number" | "boolean" | "select" | "boolean_group" | "text_group" | "number_group" | "select_group";
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
    const [customModels, setCustomModels] = useState<CustomModel[]>([])
    const [settings, setSettings] = useState<Settings>({
        models: {
            title: "Models",
            description: "Configure your AI model settings",
            settings: [
                {
                    name: "Default Model",
                    value: "gpt-4",
                    type: "select",
                    options: Models.map(m => m.model),
                    description: "Select your default AI model"
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
        }
    }, [userId])

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

    const addApiKey = async (key: Omit<APIKey, 'id'>) => {
        try {
            const response = await fetch('/api/settings/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...key, userId })
            })
            if (!response.ok) throw new Error('Failed to add API key')
            await fetchApiKeys()
            toast.success('API key added successfully')
        } catch (error) {
            console.error('Error adding API key:', error)
            toast.error('Failed to add API key')
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
                    Manage your API keys for different providers
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Existing API Keys */}
                <div className="space-y-4">
                    {apiKeys.map((key) => (
                        <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                                <div className="font-medium">
                                    {key.isCustom ? key.customName : key.provider}
                                </div>
                                {key.isCustom && (
                                    <div className="text-sm text-muted-foreground">
                                        Base URL: {key.customBaseUrl}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="password"
                                    value={key.key}
                                    readOnly
                                    className="w-[200px]"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeApiKey(key.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add API Key Dialog */}
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Add API Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add API Key</DialogTitle>
                            <DialogDescription>
                                Add an API key for an existing provider or create a custom provider
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Provider</Label>
                                <Select
                                    onValueChange={(value) => {
                                        setNewProvider(prev => ({ ...prev, name: value }))
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OpenAI">OpenAI</SelectItem>
                                        <SelectItem value="Anthropic">Anthropic</SelectItem>
                                        <SelectItem value="OpenRouter">OpenRouter</SelectItem>
                                        <SelectItem value="Google">Google (Gemini)</SelectItem>
                                        <SelectItem value="custom">Custom Provider</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {newProvider.name === "custom" && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Custom Provider Name</Label>
                                        <Input
                                            placeholder="Enter provider name"
                                            value={newProvider.customName || ""}
                                            onChange={(e) => setNewProvider(prev => ({ ...prev, customName: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Base URL</Label>
                                        <Input
                                            placeholder="Enter base URL"
                                            value={newProvider.baseUrl}
                                            onChange={(e) => setNewProvider(prev => ({ ...prev, baseUrl: e.target.value }))}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input
                                    type="password"
                                    placeholder="Enter API key"
                                    value={newProvider.apiKey}
                                    onChange={(e) => setNewProvider(prev => ({ ...prev, apiKey: e.target.value }))}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => {
                                if (newProvider.name === "custom") {
                                    if (!newProvider.customName || !newProvider.baseUrl || !newProvider.apiKey) {
                                        toast.error("Please fill in all fields for custom provider")
                                        return
                                    }
                                    addApiKey({
                                        provider: newProvider.customName,
                                        key: newProvider.apiKey,
                                        isCustom: true,
                                        customName: newProvider.customName,
                                        customBaseUrl: newProvider.baseUrl
                                    })
                                } else {
                                    if (!newProvider.name || !newProvider.apiKey) {
                                        toast.error("Please fill in all required fields")
                                        return
                                    }
                                    addApiKey({
                                        provider: newProvider.name,
                                        key: newProvider.apiKey
                                    })
                                }
                                setNewProvider({ name: "", baseUrl: "", apiKey: "", customName: "" })
                            }}>Add API Key</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
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
                        </CardContent>
                    </Card>

                    {/* API Keys and Custom Models Sections - Only show in Models tab */}
                    {activeTab === "models" && (
                        <>
                            {renderApiKeySection()}
                            {renderCustomModelsSection()}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
