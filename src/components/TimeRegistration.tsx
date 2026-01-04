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

    const dataByMonth: Record<string, any[]> = {};

    records.forEach((record: any) => {
      const date = new Date(record.hora_registro);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!dataByMonth[monthKey]) {
        dataByMonth[monthKey] = [];
      }

      dataByMonth[monthKey].push({
        'CÉDULA': record.employees?.cedula || '',
        'NOMBRE': record.employees?.nombre || '',
        'ÁREA': record.employees?.area || '',
        'TIPO': record.tipo,
        'HORA': new Date(record.hora_registro).toLocaleString('es-CO'),
        'OBJETOS PERSONALES': (record.objetos_personales || []).join(', '),
        'TAREA': record.tarea || ''
      });
    });

    const wb = XLSX.utils.book_new();

    // Helper function to apply header styles
    const applyHeaderStyles = (ws: XLSX.WorkSheet, headerCells: string[]) => {
      headerCells.forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4A90D9" } },
            alignment: { horizontal: "center" }
          };
        }
      });
    };

    // Add monthly data sheets
    Object.entries(dataByMonth).forEach(([month, data]) => {
      const ws = XLSX.utils.json_to_sheet(data);
      
      applyHeaderStyles(ws, ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1']);

      ws['!cols'] = [
        { wch: 15 }, // CÉDULA
        { wch: 30 }, // NOMBRE
        { wch: 20 }, // ÁREA
        { wch: 10 }, // TIPO
        { wch: 22 }, // HORA
        { wch: 35 }, // OBJETOS PERSONALES
        { wch: 25 }  // TAREA
      ];

      XLSX.utils.book_append_sheet(wb, ws, month);
    });

    // Generate Report Sheet with statistics
    const employeeStats: Record<string, { 
      cedula: string; 
      nombre: string; 
      area: string; 
      entradas: number; 
      salidas: number; 
      totalMovimientos: number;
      fechas: string[];
    }> = {};

    records.forEach((record: any) => {
      const cedula = record.employees?.cedula || 'N/A';
      const nombre = record.employees?.nombre || 'N/A';
      const area = record.employees?.area || 'N/A';
      const fecha = new Date(record.hora_registro).toLocaleDateString('es-CO');

      if (!employeeStats[cedula]) {
        employeeStats[cedula] = {
          cedula,
          nombre,
          area,
          entradas: 0,
          salidas: 0,
          totalMovimientos: 0,
          fechas: []
        };
      }

      if (record.tipo === 'ENTRADA') {
        employeeStats[cedula].entradas++;
      } else {
        employeeStats[cedula].salidas++;
      }
      employeeStats[cedula].totalMovimientos++;
      
      if (!employeeStats[cedula].fechas.includes(fecha)) {
        employeeStats[cedula].fechas.push(fecha);
      }
    });

    // Create report data sorted by total movements (descending)
    const reportData = Object.values(employeeStats)
      .sort((a, b) => b.totalMovimientos - a.totalMovimientos)
      .map(emp => ({
        'CÉDULA': emp.cedula,
        'NOMBRE': emp.nombre,
        'ÁREA': emp.area,
        'TOTAL ENTRADAS': emp.entradas,
        'TOTAL SALIDAS': emp.salidas,
        'TOTAL MOVIMIENTOS': emp.totalMovimientos,
        'DÍAS CON REGISTRO': emp.fechas.length,
        'PROMEDIO POR DÍA': emp.fechas.length > 0 ? (emp.totalMovimientos / emp.fechas.length).toFixed(1) : '0'
      }));

    // Create report sheet
    const wsReport = XLSX.utils.aoa_to_sheet([]);
    
    // Title
    XLSX.utils.sheet_add_aoa(wsReport, [['REPORTE DE MOVIMIENTOS - BODEGA DIGITAL']], { origin: 'A1' });
    wsReport['A1'].s = { 
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, 
      fill: { fgColor: { rgb: "2E5A7C" } },
      alignment: { horizontal: "center" }
    };
    wsReport['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

    // Summary section
    const totalEmpleados = Object.keys(employeeStats).length;
    const totalEntradas = Object.values(employeeStats).reduce((sum, emp) => sum + emp.entradas, 0);
    const totalSalidas = Object.values(employeeStats).reduce((sum, emp) => sum + emp.salidas, 0);
    const empleadosMultiples = Object.values(employeeStats).filter(emp => emp.totalMovimientos > 2);

    XLSX.utils.sheet_add_aoa(wsReport, [
      [''],
      ['RESUMEN GENERAL'],
      ['Total Empleados Registrados:', totalEmpleados, '', 'Total Entradas:', totalEntradas],
      ['Total Salidas:', totalSalidas, '', 'Empleados con múltiples movimientos:', empleadosMultiples.length],
      ['']
    ], { origin: 'A2' });

    // Style summary headers
    ['A3', 'A4', 'A5', 'D4', 'D5'].forEach(cell => {
      if (wsReport[cell]) {
        wsReport[cell].s = { font: { bold: true, color: { rgb: "2E5A7C" } } };
      }
    });

    // Employees with multiple movements section
    XLSX.utils.sheet_add_aoa(wsReport, [
      ['EMPLEADOS CON MÚLTIPLES ENTRADAS/SALIDAS (Más de 2 movimientos)']
    ], { origin: 'A7' });
    wsReport['A7'].s = { 
      font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, 
      fill: { fgColor: { rgb: "E67E22" } }
    };

    // Add report data starting at row 9
    if (reportData.length > 0) {
      XLSX.utils.sheet_add_json(wsReport, reportData, { origin: 'A9' });
      
      // Style data headers
      applyHeaderStyles(wsReport, ['A9', 'B9', 'C9', 'D9', 'E9', 'F9', 'G9', 'H9']);
    }

    // Visual chart representation using ASCII-style bars
    const chartStartRow = 10 + reportData.length + 2;
    XLSX.utils.sheet_add_aoa(wsReport, [
      [''],
      ['GRÁFICA DE MOVIMIENTOS POR EMPLEADO']
    ], { origin: `A${chartStartRow}` });
    wsReport[`A${chartStartRow + 1}`].s = { 
      font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, 
      fill: { fgColor: { rgb: "27AE60" } }
    };

    // Create bar chart representation
    const maxMovimientos = Math.max(...Object.values(employeeStats).map(e => e.totalMovimientos));
    const chartData = Object.values(employeeStats)
      .sort((a, b) => b.totalMovimientos - a.totalMovimientos)
      .slice(0, 10) // Top 10
      .map(emp => {
        const barLength = Math.round((emp.totalMovimientos / maxMovimientos) * 20);
        const entradaBar = '█'.repeat(Math.round((emp.entradas / maxMovimientos) * 20));
        const salidaBar = '▒'.repeat(Math.round((emp.salidas / maxMovimientos) * 20));
        return [
          emp.nombre.substring(0, 20),
          entradaBar,
          `(${emp.entradas} entradas)`,
          salidaBar,
          `(${emp.salidas} salidas)`,
          `Total: ${emp.totalMovimientos}`
        ];
      });

    XLSX.utils.sheet_add_aoa(wsReport, [
      ['NOMBRE', 'ENTRADAS', '', 'SALIDAS', '', 'TOTAL']
    ], { origin: `A${chartStartRow + 3}` });
    applyHeaderStyles(wsReport, [
      `A${chartStartRow + 3}`, `B${chartStartRow + 3}`, `C${chartStartRow + 3}`,
      `D${chartStartRow + 3}`, `E${chartStartRow + 3}`, `F${chartStartRow + 3}`
    ]);

    XLSX.utils.sheet_add_aoa(wsReport, chartData, { origin: `A${chartStartRow + 4}` });

    // Area summary
    const areaStats: Record<string, { entradas: number; salidas: number }> = {};
    records.forEach((record: any) => {
      const area = record.employees?.area || 'N/A';
      if (!areaStats[area]) {
        areaStats[area] = { entradas: 0, salidas: 0 };
      }
      if (record.tipo === 'ENTRADA') {
        areaStats[area].entradas++;
      } else {
        areaStats[area].salidas++;
      }
    });

    const areaSummaryRow = chartStartRow + 5 + chartData.length + 2;
    XLSX.utils.sheet_add_aoa(wsReport, [
      [''],
      ['RESUMEN POR ÁREA']
    ], { origin: `A${areaSummaryRow}` });
    wsReport[`A${areaSummaryRow + 1}`].s = { 
      font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, 
      fill: { fgColor: { rgb: "9B59B6" } }
    };

    const areaData = Object.entries(areaStats).map(([area, stats]) => ({
      'ÁREA': area,
      'ENTRADAS': stats.entradas,
      'SALIDAS': stats.salidas,
      'TOTAL': stats.entradas + stats.salidas,
      'GRÁFICA': '█'.repeat(Math.min(Math.round((stats.entradas + stats.salidas) / 2), 30))
    }));

    XLSX.utils.sheet_add_json(wsReport, areaData, { origin: `A${areaSummaryRow + 3}` });
    applyHeaderStyles(wsReport, [
      `A${areaSummaryRow + 3}`, `B${areaSummaryRow + 3}`, `C${areaSummaryRow + 3}`,
      `D${areaSummaryRow + 3}`, `E${areaSummaryRow + 3}`
    ]);

    // Set column widths for report
    wsReport['!cols'] = [
      { wch: 25 }, { wch: 22 }, { wch: 15 }, { wch: 22 }, { wch: 15 }, 
      { wch: 18 }, { wch: 18 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, wsReport, 'REPORTE');

    XLSX.writeFile(wb, 'registros_empleados.xlsx');

    // Ask before clearing
    if (window.confirm('¿Desea borrar todos los registros después de exportar?')) {
      await clearAllRecords();
      toast({
        title: "Éxito",
        description: "Excel generado y registros borrados"
      });
    } else {
      toast({
        title: "Éxito",
        description: "Excel generado correctamente"
      });
    }
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
