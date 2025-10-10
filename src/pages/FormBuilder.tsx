import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Code, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "textarea" | "select" | "checkbox" | "number" | "tel";
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface FormConfig {
  formName: string;
  description: string;
  fields: FormField[];
  submitButtonText: string;
  successMessage: string;
  integrationType: "supabase" | "webhook" | "email";
  webhookUrl?: string;
  emailTo?: string;
  tableName?: string;
}

const FormBuilder = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<FormConfig>({
    formName: "",
    description: "",
    fields: [],
    submitButtonText: "Submit",
    successMessage: "Thank you for your submission!",
    integrationType: "supabase",
  });

  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [endpointUrl, setEndpointUrl] = useState<string>("");

  const addField = () => {
    setConfig({
      ...config,
      fields: [
        ...config.fields,
        {
          name: "",
          label: "",
          type: "text",
          required: false,
          placeholder: "",
        },
      ],
    });
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...config.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setConfig({ ...config, fields: newFields });
  };

  const removeField = (index: number) => {
    setConfig({
      ...config,
      fields: config.fields.filter((_, i) => i !== index),
    });
  };

  const generateForm = async () => {
    if (!config.formName || config.fields.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a form name and at least one field",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-form-endpoint", {
        body: { 
          formConfig: {
            ...config,
            formFields: config.fields // Map 'fields' to 'formFields' for edge function
          }
        },
      });

      if (error) throw error;

      setGeneratedCode(data.componentCode);
      setEndpointUrl(data.endpointUrl);

      toast({
        title: "Form Generated Successfully",
        description: "Your form component and API endpoint are ready",
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.formName.replace(/\s+/g, "-").toLowerCase()}-form.tsx`;
    a.click();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Auto Form Builder</h1>
          <p className="text-muted-foreground mt-2">
            Create forms with API-ready endpoints and automatic validation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Form Configuration</CardTitle>
              <CardDescription>Define your form structure and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="formName">Form Name</Label>
                <Input
                  id="formName"
                  value={config.formName}
                  onChange={(e) => setConfig({ ...config, formName: e.target.value })}
                  placeholder="Contact Form"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  placeholder="A simple contact form..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="integrationType">Integration Type</Label>
                <Select
                  value={config.integrationType}
                  onValueChange={(value: any) => setConfig({ ...config, integrationType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supabase">Supabase Database</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="email">Email Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.integrationType === "webhook" && (
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={config.webhookUrl || ""}
                    onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                    placeholder="https://api.example.com/webhook"
                  />
                </div>
              )}

              {config.integrationType === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="emailTo">Email Recipient</Label>
                  <Input
                    id="emailTo"
                    type="email"
                    value={config.emailTo || ""}
                    onChange={(e) => setConfig({ ...config, emailTo: e.target.value })}
                    placeholder="admin@example.com"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="submitText">Submit Button Text</Label>
                <Input
                  id="submitText"
                  value={config.submitButtonText}
                  onChange={(e) => setConfig({ ...config, submitButtonText: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="successMsg">Success Message</Label>
                <Input
                  id="successMsg"
                  value={config.successMessage}
                  onChange={(e) => setConfig({ ...config, successMessage: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Form Fields</CardTitle>
              <CardDescription>Add and configure form fields</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.fields.map((field, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Field {index + 1}</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Field name"
                        value={field.name}
                        onChange={(e) => updateField(index, { name: e.target.value })}
                      />
                      <Input
                        placeholder="Label"
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                      />
                    </div>

                    <Select
                      value={field.type}
                      onValueChange={(value: any) => updateField(index, { type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="tel">Phone</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Placeholder text"
                      value={field.placeholder || ""}
                      onChange={(e) => updateField(index, { placeholder: e.target.value })}
                    />

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => updateField(index, { required: checked })}
                      />
                      <Label>Required</Label>
                    </div>
                  </div>
                </Card>
              ))}

              <Button onClick={addField} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>

              <Button onClick={generateForm} disabled={loading} className="w-full">
                <Code className="h-4 w-4 mr-2" />
                {loading ? "Generating..." : "Generate Form"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Generated Output */}
        {generatedCode && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Form Component</CardTitle>
              <CardDescription>
                API Endpoint: <code className="text-sm bg-muted px-2 py-1 rounded">{endpointUrl}</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto max-h-96">
                  <code>{generatedCode}</code>
                </pre>
                <Button onClick={downloadCode}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Component
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

export default FormBuilder;
