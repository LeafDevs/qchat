"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ModelSelectorDropdown } from "@/components/ModelSelectorDropdown"
import { Models } from "@/lib/AI"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface SettingsTab {
    title: string,
    description: string;
    settings: Setting[]
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
    [key: string]: SettingsTab
}

interface APIKey {
    provider: string;
    key: string;
    isCustom?: boolean;
    customName?: string;
    customBaseUrl?: string;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("models")
    const [apiKeys, setApiKeys] = useState<APIKey[]>([])
    const [newProvider, setNewProvider] = useState({
        name: "",
        baseUrl: "",
        apiKey: ""
    })
    const [settings, setSettings] = useState<Settings>({
        models: {
            title: "Models",
            description: "Configure your AI model settings and preferences",
            settings: [
                { 
                    name: "Default Model", 
                    value: Models[0].model, 
                    type: "select", 
                    options: Models.map(model => model.model),
                    description: "Select the default model to use for new conversations"
                },
                {
                    name: "Enabled Models",
                    value: true,
                    type: "boolean_group",
                    description: "Choose which models are available for use",
                    group: {
                        name: "Available Models",
                        description: "Toggle models on/off to control which ones are available",
                        settings: Models.map(model => ({
                            name: model.model,
                            value: true,
                            type: "boolean",
                            description: `Enable or disable the ${model.model} model`
                        }))
                    }
                }
            ]
        },
        general: {
            title: "General",
            description: "Configure your general application settings",
            settings: [
                { 
                    name: "Theme", 
                    value: "system", 
                    type: "select", 
                    options: ["light", "dark", "system"],
                    description: "Choose your preferred theme"
                },
                {
                    name: "Message Settings",
                    value: true,
                    type: "boolean_group",
                    description: "Configure how messages are displayed and handled",
                    group: {
                        name: "Message Options",
                        description: "Customize your message experience",
                        settings: [
                            {
                                name: "Show Timestamps",
                                value: true,
                                type: "boolean",
                                description: "Display timestamps on messages"
                            },
                            {
                                name: "Show Thinking",
                                value: true,
                                type: "boolean",
                                description: "Show model thinking process"
                            },
                            {
                                name: "Auto-scroll",
                                value: true,
                                type: "boolean",
                                description: "Automatically scroll to new messages"
                            }
                        ]
                    }
                }
            ]
        },
        account: {
            title: "Account",
            description: "Manage your account settings and preferences",
            settings: [
                { 
                    name: "Display Name", 
                    value: "", 
                    type: "text",
                    description: "Your display name in the application"
                },
                { 
                    name: "Email", 
                    value: "", 
                    type: "text",
                    description: "Your email address"
                }
            ]
        },
        billing: {
            title: "Billing",
            description: "Manage your billing and subscription settings",
            settings: [
                { 
                    name: "Current Plan", 
                    value: "free", 
                    type: "select", 
                    options: ["free", "pro", "enterprise"],
                    description: "Your current subscription plan"
                }
            ]
        }
    })

    const addApiKey = (key: APIKey) => {
        setApiKeys([...apiKeys, key])
    }

    const removeApiKey = (provider: string) => {
        setApiKeys(apiKeys.filter(k => k.provider !== provider))
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
            setNewProvider({ name: "", baseUrl: "", apiKey: "" })
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
                                    settings: settings[activeTab].settings.map(s => 
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
                                    settings: settings[activeTab].settings.map(s => 
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
                                    settings: settings[activeTab].settings.map(s => 
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
                            {setting.group?.settings.map((groupSetting) => (
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
                                                        settings: settings[activeTab].settings.map(s => 
                                                            s.name === setting.name 
                                                                ? {
                                                                    ...s,
                                                                    group: {
                                                                        ...s.group!,
                                                                        settings: s.group!.settings.map(gs =>
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
                        <div key={key.provider} className="flex items-center justify-between p-4 border rounded-lg">
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
                                    onClick={() => removeApiKey(key.provider)}
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
                                        if (value === "custom") {
                                            setNewProvider(prev => ({ ...prev, name: "" }))
                                        } else {
                                            setNewProvider(prev => ({ ...prev, name: value }))
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="custom">Custom Provider</SelectItem>
                                        {Models.map(model => (
                                            <SelectItem key={model.provider} value={model.provider}>
                                                {model.provider}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {newProvider.name === "" && (
                                <div className="space-y-2">
                                    <Label>Custom Provider Name</Label>
                                    <Input
                                        placeholder="Enter provider name"
                                        value={newProvider.name}
                                        onChange={(e) => setNewProvider(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                            )}

                            {newProvider.name === "" && (
                                <div className="space-y-2">
                                    <Label>Base URL</Label>
                                    <Input
                                        placeholder="Enter base URL"
                                        value={newProvider.baseUrl}
                                        onChange={(e) => setNewProvider(prev => ({ ...prev, baseUrl: e.target.value }))}
                                    />
                                </div>
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
                            <Button onClick={addCustomProvider}>Add API Key</Button>
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
                        {Object.entries(settings).map(([key, tab]) => (
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
                            {settings[activeTab].settings.map((setting) => (
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

                    {/* API Keys Section - Only show in Models tab */}
                    {activeTab === "models" && renderApiKeySection()}
                </div>
            </div>
        </div>
    )
}
