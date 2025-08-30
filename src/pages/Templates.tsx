import { TemplateLibrary } from '@/components/TemplateLibrary';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Templates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSelectTemplate = (template: any) => {
    // Store selected template and navigate to create page
    sessionStorage.setItem('selectedTemplate', JSON.stringify(template));
    navigate('/dashboard/create');
    
    toast({
      title: "Template Selected",
      description: `${template.name} template is ready to customize`
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <TemplateLibrary 
        onSelectTemplate={handleSelectTemplate}
        showCreateButton={true}
      />
    </div>
  );
};

export default Templates;