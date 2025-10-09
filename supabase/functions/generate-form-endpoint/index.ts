import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FormField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  validation?: any;
  placeholder?: string;
  options?: string[];
}

interface FormConfig {
  formFields: FormField[];
  submitButtonText: string;
  successMessage: string;
  errorMessage: string;
  redirectUrl?: string;
  sendEmail?: boolean;
  emailTo?: string;
  integrationType?: 'supabase' | 'webhook' | 'email';
  webhookUrl?: string;
  tableName?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating form endpoint and component');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { formConfig, pageId } = await req.json() as { 
      formConfig: FormConfig; 
      pageId: string 
    };

    // Generate Zod validation schema
    const zodSchema = generateZodSchema(formConfig.formFields);
    
    // Generate React Hook Form component
    const formComponent = generateFormComponent(formConfig, zodSchema);
    
    // Generate submission handler edge function
    const submissionHandler = generateSubmissionHandler(formConfig);
    
    // Create table schema if using Supabase integration
    let tableSql = '';
    if (formConfig.integrationType === 'supabase' && formConfig.tableName) {
      tableSql = generateTableSchema(formConfig.tableName, formConfig.formFields);
    }

    // Save to database
    const { data, error } = await supabaseClient
      .from('component_exports')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        page_id: pageId,
        component_name: 'FormComponent',
        component_type: 'form',
        react_code: formComponent,
        export_format: 'react_tsx',
        json_schema: {
          formFields: formConfig.formFields,
          validationSchema: zodSchema,
          submissionHandler: 'handle-form-submission',
          tableSql: tableSql
        },
        sitecore_manifest: generateSitecoreFormManifest(formConfig)
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true,
        component: data,
        formComponent,
        submissionHandler,
        tableSql,
        endpointUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/handle-form-submission`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating form endpoint:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateZodSchema(fields: FormField[]): string {
  const schemaFields = fields.map(field => {
    let zodType = 'z.string()';
    
    switch (field.type) {
      case 'email':
        zodType = 'z.string().email({ message: "Invalid email address" })';
        break;
      case 'number':
        zodType = 'z.number()';
        break;
      case 'tel':
        zodType = 'z.string().regex(/^[0-9+\\-\\s()]+$/, { message: "Invalid phone number" })';
        break;
      case 'url':
        zodType = 'z.string().url({ message: "Invalid URL" })';
        break;
      case 'checkbox':
        zodType = 'z.boolean()';
        break;
      case 'select':
        if (field.options && field.options.length > 0) {
          zodType = `z.enum([${field.options.map(opt => `"${opt}"`).join(', ')}])`;
        }
        break;
      default:
        zodType = 'z.string()';
    }

    if (field.required) {
      if (field.type === 'string' || field.type === 'text' || field.type === 'textarea') {
        zodType += '.min(1, { message: "This field is required" })';
      }
    } else {
      zodType += '.optional()';
    }

    if (field.validation) {
      if (field.validation.minLength) {
        zodType += `.min(${field.validation.minLength}, { message: "Minimum ${field.validation.minLength} characters required" })`;
      }
      if (field.validation.maxLength) {
        zodType += `.max(${field.validation.maxLength}, { message: "Maximum ${field.validation.maxLength} characters allowed" })`;
      }
    }

    return `  ${field.name}: ${zodType}`;
  });

  return `const formSchema = z.object({
${schemaFields.join(',\n')}
});`;
}

function generateFormComponent(config: FormConfig, zodSchema: string): string {
  const formFieldsCode = config.formFields.map(field => {
    const fieldType = field.type === 'textarea' ? 'Textarea' : 
                      field.type === 'select' ? 'Select' : 'Input';
    
    if (field.type === 'select') {
      return `
      <FormField
        control={form.control}
        name="${field.name}"
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>${field.label}${field.required ? ' *' : ''}</FormLabel>
            <Select onValueChange={formField.onChange} defaultValue={formField.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="${field.placeholder || 'Select an option'}" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                ${field.options?.map(opt => `<SelectItem value="${opt}">${opt}</SelectItem>`).join('\n                ')}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />`;
    } else if (field.type === 'checkbox') {
      return `
      <FormField
        control={form.control}
        name="${field.name}"
        render={({ field: formField }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={formField.value}
                onCheckedChange={formField.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>${field.label}</FormLabel>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />`;
    } else {
      return `
      <FormField
        control={form.control}
        name="${field.name}"
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>${field.label}${field.required ? ' *' : ''}</FormLabel>
            <FormControl>
              <${fieldType}
                placeholder="${field.placeholder || ''}"
                type="${field.type}"
                {...formField}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />`;
    }
  }).join('\n');

  return `import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

${zodSchema}

type FormValues = z.infer<typeof formSchema>;

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: ${JSON.stringify(
      config.formFields.reduce((acc, field) => {
        acc[field.name] = field.type === 'checkbox' ? false : '';
        return acc;
      }, {} as any),
      null,
      2
    )}
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('handle-form-submission', {
        body: { 
          formData: values,
          formType: 'contact',
          pageId: window.location.pathname
        }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "${config.successMessage || 'Your form has been submitted successfully.'}"
      });

      form.reset();
      ${config.redirectUrl ? `window.location.href = '${config.redirectUrl}';` : ''}
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: "${config.errorMessage || 'Failed to submit form. Please try again.'}",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        ${formFieldsCode}
        
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Submitting...' : '${config.submitButtonText || 'Submit'}'}
        </Button>
      </form>
    </Form>
  );
}`;
}

function generateSubmissionHandler(config: FormConfig): string {
  return `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formData, formType, pageId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    ${config.integrationType === 'supabase' && config.tableName ? `
    // Save to Supabase table
    const { data, error } = await supabaseClient
      .from('${config.tableName}')
      .insert({
        ...formData,
        page_id: pageId,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    ` : ''}

    ${config.integrationType === 'webhook' && config.webhookUrl ? `
    // Send to webhook
    const webhookResponse = await fetch('${config.webhookUrl}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!webhookResponse.ok) {
      throw new Error('Webhook submission failed');
    }
    ` : ''}

    ${config.sendEmail && config.emailTo ? `
    // Send email notification
    // Note: Requires RESEND_API_KEY in environment
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${resendKey}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'noreply@yourdomain.com',
          to: '${config.emailTo}',
          subject: 'New Form Submission',
          html: \`<pre>\${JSON.stringify(formData, null, 2)}</pre>\`
        })
      });
    }
    ` : ''}

    return new Response(
      JSON.stringify({ success: true, message: 'Form submitted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Form submission error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`;
}

function generateTableSchema(tableName: string, fields: FormField[]): string {
  const columns = fields.map(field => {
    let sqlType = 'TEXT';
    
    switch (field.type) {
      case 'email':
      case 'url':
      case 'tel':
        sqlType = 'TEXT';
        break;
      case 'number':
        sqlType = 'INTEGER';
        break;
      case 'checkbox':
        sqlType = 'BOOLEAN';
        break;
      case 'textarea':
        sqlType = 'TEXT';
        break;
      default:
        sqlType = 'TEXT';
    }

    const nullable = field.required ? 'NOT NULL' : 'NULL';
    return `  ${field.name} ${sqlType} ${nullable}`;
  });

  return `-- Create form submissions table
CREATE TABLE IF NOT EXISTS public.${tableName} (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id TEXT,
${columns.join(',\n')},
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (adjust based on your security needs)
CREATE POLICY "Allow public form submissions" 
ON public.${tableName}
FOR INSERT 
WITH CHECK (true);

-- Allow users to view their own submissions
CREATE POLICY "Users can view their submissions" 
ON public.${tableName}
FOR SELECT 
USING (auth.uid() IS NOT NULL);`;
}

function generateSitecoreFormManifest(config: FormConfig): any {
  return {
    name: 'ContactForm',
    displayName: 'Contact Form',
    category: 'Forms',
    description: 'Auto-generated contact form with validation',
    fields: config.formFields.map(field => ({
      name: field.name,
      type: field.type,
      displayName: field.label,
      required: field.required,
      validation: field.validation
    })),
    actions: {
      submit: {
        endpoint: 'handle-form-submission',
        method: 'POST'
      }
    }
  };
}
