import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useEmployees, EmployeeWithRecords } from '@/hooks/useEmployees';
import { RecordsTable } from './RecordsTable';
import { Clock, UserCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

const OBJETOS_PERSONALES = [
  { id: 'BANDA-RELOJ-INTELIGENTE', label: 'BANDA/RELOJ INTELIGENTE' },
  { id: 'CELULAR-CORPORATIVO', label: 'CELULAR CORPORATIVO' },
  { id: 'COMPUTADOR-PORTATIL', label: 'COMPUTADOR PORTÁTIL' },
  { id: 'NO-INGRESA-NADA', label: 'NO INGRESA NADA' },
];

const TAREAS = [
  'TAREAS DIARIAS DIGI',
  'APOYO TAREAS DIGI',
  'INVENTARIO',
  'INVENTARIO SELECTIVO',
  'SISTEMAS',
  'REVISIÓN DE PROCESOS',
  'SUPERVISOR / ADMIN',
  'MANTENIMIENTO',
  'PERSONAL EXTERNO',
  'COORDINADOR',
  'JEFE DE TIENDA',
  'PERSONAL SST',
  'SEGURIDAD',
  'CAJEROS',
];

export function TimeRegistration() {
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [area, setArea] = useState('');
  const [horaRegistro, setHoraRegistro] = useState('');
  const [objetosSeleccionados, setObjetosSeleccionados] = useState<string[]>([]);
  const [tareaSeleccionada, setTareaSeleccionada] = useState('');
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [foundEmployee, setFoundEmployee] = useState<EmployeeWithRecords | null>(null);

  const { employees, findEmployeeByCedula, registerTimeEntry, getRecordsForExport, clearAllRecords, loading } = useEmployees();
  const { toast } = useToast();

  const updateTime = useCallback(() => {
    const now = new Date();
    const formatted = now.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-');
    setHoraRegistro(formatted);
  }, []);

  useEffect(() => {
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [updateTime]);

  const handleCedulaChange = (value: string) => {
    const upper = value.toUpperCase();
    setCedula(upper);
    
    const employee = findEmployeeByCedula(upper);
    if (employee) {
      setNombre(employee.nombre);
      setArea(employee.area);
      setFoundEmployee(employee);
    } else {
      setNombre('');
      setArea('');
      setFoundEmployee(null);
    }
  };

  const handleObjetoChange = (objetoId: string, checked: boolean) => {
    if (checked) {
      setObjetosSeleccionados([...objetosSeleccionados, objetoId]);
    } else {
      setObjetosSeleccionados(objetosSeleccionados.filter(o => o !== objetoId));
    }
  };

  const handleRegistrarEntrada = async () => {
    if (!foundEmployee) {
      toast({
        title: "Error",
        description: "Empleado no encontrado. Por favor, registre al empleado primero.",
        variant: "destructive"
      });
      return;
    }

    if (objetosSeleccionados.length === 0) {
      toast({
        title: "Error",
        description: "Seleccione al menos un objeto personal",
        variant: "destructive"
      });
      return;
    }

    if (!tareaSeleccionada) {
      toast({
        title: "Error",
        description: "Seleccione una tarea a realizar",
        variant: "destructive"
      });
      return;
    }

    // Check if there's already an entry without exit
    const todayRecords = foundEmployee.records.filter(r => {
      const recordDate = new Date(r.hora_registro).toDateString();
      const today = new Date().toDateString();
      return recordDate === today;
    });

    const lastRecord = todayRecords[0];
    if (lastRecord && lastRecord.tipo === 'ENTRADA') {
      toast({
        title: "Error",
        description: "Ya existe un registro de entrada sin salida para este empleado.",
        variant: "destructive"
      });
      return;
    }

    const success = await registerTimeEntry(
      foundEmployee.id,
      'ENTRADA',
      objetosSeleccionados,
      tareaSeleccionada
    );

    if (success) {
      limpiarFormulario();
    }
  };

  const handleGenerarSalida = async (employee: EmployeeWithRecords) => {
    const todayRecords = employee.records.filter(r => {
      const recordDate = new Date(r.hora_registro).toDateString();
      const today = new Date().toDateString();
      return recordDate === today;
    });

    const lastRecord = todayRecords[0];
    if (!lastRecord || lastRecord.tipo !== 'ENTRADA') {
      toast({
        title: "Error",
        description: "No hay un registro de entrada previo para este empleado.",
        variant: "destructive"
      });
      return;
    }

    await registerTimeEntry(
      employee.id,
      'SALIDA',
      lastRecord.objetos_personales || [],
      lastRecord.tarea
    );
  };

  const limpiarFormulario = () => {
    setCedula('');
    setNombre('');
    setArea('');
    setObjetosSeleccionados([]);
    setTareaSeleccionada('');
    setFoundEmployee(null);
  };

  const handleGenerarExcel = async () => {
    const records = await getRecordsForExport();
    if (!records || records.length === 0) {
      toast({
        title: "Información",
        description: "No hay registros para exportar",
      });
      return;
    }

    // Create simple report data with all records
    const reportData = records.map((record: any) => {
      const fecha = new Date(record.hora_registro);
      return {
        'CÉDULA': record.employees?.cedula || '',
        'NOMBRE': record.employees?.nombre || '',
        'ÁREA': record.employees?.area || '',
        'TIPO': record.tipo,
        'FECHA': fecha.toLocaleDateString('es-CO'),
        'HORA': fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        'TAREA': record.tarea || '',
        'OBJETOS PERSONALES': (record.objetos_personales || []).join(', ')
      };
    });

    // Sort by date and time (most recent first)
    reportData.sort((a, b) => {
      const dateA = new Date(`${a['FECHA']} ${a['HORA']}`);
      const dateB = new Date(`${b['FECHA']} ${b['HORA']}`);
      return dateB.getTime() - dateA.getTime();
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // CÉDULA
      { wch: 30 }, // NOMBRE
      { wch: 20 }, // ÁREA
      { wch: 12 }, // TIPO
      { wch: 15 }, // FECHA
      { wch: 12 }, // HORA
      { wch: 25 }, // TAREA
      { wch: 35 }  // OBJETOS PERSONALES
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Registros');

    const fechaActual = new Date().toLocaleDateString('es-CO').replace(/\//g, '-');
    XLSX.writeFile(wb, `Reporte_Bodega_${fechaActual}.xlsx`);

    // Clear all records after export
    await clearAllRecords();

    toast({
      title: "Éxito",
      description: "Reporte Excel generado y registros borrados"
    });
  };

  const getTodayRecords = () => {
    const today = new Date().toDateString();
    return employees.filter(emp => 
      emp.records.some(r => new Date(r.hora_registro).toDateString() === today)
    );
  };

  const displayedEmployees = showAllRecords ? employees : getTodayRecords();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold text-card-foreground">REGISTRO DE HORAS</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-card-foreground font-medium">CÉDULA</Label>
          <Input
            value={cedula}
            onChange={(e) => handleCedulaChange(e.target.value)}
            placeholder="Ingrese cédula"
            className="h-11 bg-muted/50 border-border text-card-foreground uppercase"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-card-foreground font-medium">NOMBRE</Label>
          <Input
            value={nombre}
            disabled
            className="h-11 bg-muted/30 border-border text-card-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-card-foreground font-medium">ÁREA</Label>
          <Input
            value={area}
            disabled
            className="h-11 bg-muted/30 border-border text-card-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-card-foreground font-medium">HORA DE REGISTRO</Label>
          <Input
            value={horaRegistro}
            disabled
            className="h-11 bg-muted/30 border-border text-card-foreground font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        <div className="space-y-3">
          <Label className="text-card-foreground font-medium">OBJETOS PERSONALES</Label>
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            {OBJETOS_PERSONALES.map((objeto) => (
              <div key={objeto.id} className="flex items-center space-x-3">
                <Checkbox
                  id={objeto.id}
                  checked={objetosSeleccionados.includes(objeto.id)}
                  onCheckedChange={(checked) => handleObjetoChange(objeto.id, checked as boolean)}
                  className="border-primary data-[state=checked]:bg-primary"
                />
                <label
                  htmlFor={objeto.id}
                  className="text-sm text-card-foreground cursor-pointer"
                >
                  {objeto.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-card-foreground font-medium">TAREAS A REALIZAR</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-muted/30 rounded-lg">
            {TAREAS.map((tarea) => (
              <label
                key={tarea}
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
                  tareaSeleccionada === tarea
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card hover:bg-muted/50 text-card-foreground'
                }`}
              >
                <input
                  type="radio"
                  name="tarea"
                  value={tarea}
                  checked={tareaSeleccionada === tarea}
                  onChange={(e) => setTareaSeleccionada(e.target.value)}
                  className="sr-only"
                />
                <span className="truncate">{tarea}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4">
        <Button 
          onClick={handleRegistrarEntrada}
          disabled={loading}
          size="lg"
          className="gap-2"
        >
          <UserCheck className="w-5 h-5" />
          REGISTRAR ENTRADA
        </Button>
      </div>

      <div className="pt-6 border-t border-border">
        <RecordsTable 
          employees={displayedEmployees}
          onGenerarSalida={handleGenerarSalida}
          showAllRecords={showAllRecords}
        />

        <div className="flex flex-wrap gap-3 mt-6">
          <Button onClick={handleGenerarExcel} variant="accent">
            GENERAR EXCEL
          </Button>
          <Button 
            onClick={() => setShowAllRecords(!showAllRecords)} 
            variant="secondary"
          >
            {showAllRecords ? 'MOSTRAR SOLO HOY' : 'MOSTRAR TODOS LOS REGISTROS'}
          </Button>
        </div>
      </div>
    </div>
  );
}
