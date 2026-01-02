import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, UserMinus } from 'lucide-react';

const AREAS = [
  { value: 'ADMINISTRACION', label: 'ADMINISTRACIÓN' },
  { value: 'PUNTO_DE_VENTA', label: 'PUNTO DE VENTA' },
  { value: 'EXTERNO', label: 'EXTERNO' },
];

export function EmployeeRegistration() {
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [area, setArea] = useState('');
  
  const { registerEmployee, deleteEmployee, loading } = useEmployees();
  const { toast } = useToast();

  const handleRegistrar = async () => {
    if (!cedula || !nombre || !area) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive"
      });
      return;
    }

    const success = await registerEmployee(cedula, nombre, area);
    if (success) {
      setCedula('');
      setNombre('');
      setArea('');
    }
  };

  const handleBorrar = async () => {
    if (!cedula) {
      toast({
        title: "Error",
        description: "Ingrese la cédula del empleado a borrar",
        variant: "destructive"
      });
      return;
    }

    if (window.confirm(`¿Está seguro que desea borrar al empleado con cédula ${cedula}?`)) {
      const success = await deleteEmployee(cedula);
      if (success) {
        setCedula('');
        setNombre('');
        setArea('');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold text-card-foreground">REGISTRO DE EMPLEADOS</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-card-foreground font-medium">CÉDULA</Label>
          <Input
            value={cedula}
            onChange={(e) => setCedula(e.target.value.toUpperCase())}
            placeholder="Ingrese cédula"
            className="h-11 bg-muted/50 border-border text-card-foreground uppercase"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-card-foreground font-medium">NOMBRE</Label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value.toUpperCase())}
            placeholder="Ingrese nombre completo"
            className="h-11 bg-muted/50 border-border text-card-foreground uppercase"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-card-foreground font-medium">ÁREA</Label>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="h-11 bg-muted/50 border-border text-card-foreground">
              <SelectValue placeholder="Seleccione un área" />
            </SelectTrigger>
            <SelectContent>
              {AREAS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-4">
        <Button 
          onClick={handleRegistrar}
          disabled={loading}
          size="lg"
          className="gap-2"
        >
          <UserPlus className="w-5 h-5" />
          REGISTRAR EMPLEADO
        </Button>

        <Button 
          onClick={handleBorrar}
          disabled={loading}
          variant="destructive"
          size="lg"
          className="gap-2"
        >
          <UserMinus className="w-5 h-5" />
          BORRAR EMPLEADO
        </Button>
      </div>
    </div>
  );
}
