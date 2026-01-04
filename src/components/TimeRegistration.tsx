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

    // Professional pastel color palette
    const colors = {
      headerBlue: "A8D5E5",      // Pastel blue
      headerText: "2C3E50",       // Dark blue-gray text
      titleBg: "7FB3D5",          // Soft blue
      sectionOrange: "FAD7A0",    // Pastel orange/peach
      sectionGreen: "ABEBC6",     // Pastel green
      sectionPurple: "D7BDE2",    // Pastel purple
      sectionPink: "F5B7B1",      // Pastel pink
      lightGray: "F8F9FA",        // Very light gray
      accentBlue: "85C1E9",       // Light accent blue
      chartBar: "5DADE2",         // Chart blue
      chartBarAlt: "48C9B0"       // Chart teal
    };

    // Helper function to apply header styles with pastel colors
    const applyHeaderStyles = (ws: XLSX.WorkSheet, headerCells: string[], bgColor: string = colors.headerBlue) => {
      headerCells.forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true, color: { rgb: colors.headerText }, sz: 11 },
            fill: { fgColor: { rgb: bgColor } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "BDC3C7" } },
              bottom: { style: "thin", color: { rgb: "BDC3C7" } },
              left: { style: "thin", color: { rgb: "BDC3C7" } },
              right: { style: "thin", color: { rgb: "BDC3C7" } }
            }
          };
        }
      });
    };

    // Helper to style title cells
    const applyTitleStyle = (ws: XLSX.WorkSheet, cell: string, bgColor: string) => {
      if (ws[cell]) {
        ws[cell].s = {
          font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: bgColor } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
    };

    // Helper to style data cells
    const applyDataRowStyles = (ws: XLSX.WorkSheet, startRow: number, endRow: number, cols: string[]) => {
      for (let row = startRow; row <= endRow; row++) {
        cols.forEach((col, idx) => {
          const cell = `${col}${row}`;
          if (ws[cell]) {
            ws[cell].s = {
              fill: { fgColor: { rgb: row % 2 === 0 ? "FFFFFF" : colors.lightGray } },
              alignment: { horizontal: idx === 0 ? "left" : "center", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "E5E7E9" } },
                bottom: { style: "thin", color: { rgb: "E5E7E9" } },
                left: { style: "thin", color: { rgb: "E5E7E9" } },
                right: { style: "thin", color: { rgb: "E5E7E9" } }
              }
            };
          }
        });
      }
    };

    // Add monthly data sheets with improved styling
    Object.entries(dataByMonth).forEach(([month, data]) => {
      const ws = XLSX.utils.json_to_sheet(data);
      
      applyHeaderStyles(ws, ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1']);
      applyDataRowStyles(ws, 2, data.length + 1, ['A', 'B', 'C', 'D', 'E', 'F', 'G']);

      ws['!cols'] = [
        { wch: 15 }, // CÉDULA
        { wch: 30 }, // NOMBRE
        { wch: 20 }, // ÁREA
        { wch: 12 }, // TIPO
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
        'ENTRADAS': emp.entradas,
        'SALIDAS': emp.salidas,
        'TOTAL MOV.': emp.totalMovimientos,
        'DÍAS REG.': emp.fechas.length,
        'PROM/DÍA': emp.fechas.length > 0 ? (emp.totalMovimientos / emp.fechas.length).toFixed(1) : '0'
      }));

    // Create professional report sheet
    const wsReport = XLSX.utils.aoa_to_sheet([]);
    
    // ===== HEADER SECTION =====
    XLSX.utils.sheet_add_aoa(wsReport, [
      [''],
      ['REPORTE DE MOVIMIENTOS'],
      ['BODEGA DIGITAL - ALKOSTO'],
      [`Fecha de generación: ${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`],
      ['']
    ], { origin: 'A1' });
    
    // Style main title
    applyTitleStyle(wsReport, 'A2', colors.titleBg);
    wsReport['!merges'] = [
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } }
    ];
    wsReport['A3'].s = { font: { bold: true, sz: 12, color: { rgb: colors.headerText } }, alignment: { horizontal: "center" } };
    wsReport['A4'].s = { font: { italic: true, sz: 10, color: { rgb: "7F8C8D" } }, alignment: { horizontal: "center" } };

    // ===== SUMMARY CARDS SECTION =====
    const totalEmpleados = Object.keys(employeeStats).length;
    const totalEntradas = Object.values(employeeStats).reduce((sum, emp) => sum + emp.entradas, 0);
    const totalSalidas = Object.values(employeeStats).reduce((sum, emp) => sum + emp.salidas, 0);
    const empleadosMultiples = Object.values(employeeStats).filter(emp => emp.totalMovimientos > 2);

    XLSX.utils.sheet_add_aoa(wsReport, [
      ['📊 RESUMEN EJECUTIVO', '', '', '', '', '', '', ''],
      [''],
      ['EMPLEADOS', 'ENTRADAS', 'SALIDAS', 'TOTAL MOV.', 'MÚLTIPLES MOV.', '', '', ''],
      [totalEmpleados, totalEntradas, totalSalidas, totalEntradas + totalSalidas, empleadosMultiples.length, '', '', ''],
      ['']
    ], { origin: 'A6' });

    // Style summary section
    wsReport['A6'].s = { font: { bold: true, sz: 12, color: { rgb: colors.headerText } }, fill: { fgColor: { rgb: colors.sectionGreen } } };
    applyHeaderStyles(wsReport, ['A8', 'B8', 'C8', 'D8', 'E8'], colors.accentBlue);
    
    // Style summary values
    ['A9', 'B9', 'C9', 'D9', 'E9'].forEach(cell => {
      if (wsReport[cell]) {
        wsReport[cell].s = {
          font: { bold: true, sz: 16, color: { rgb: colors.titleBg } },
          alignment: { horizontal: "center" },
          fill: { fgColor: { rgb: "FFFFFF" } },
          border: {
            bottom: { style: "medium", color: { rgb: colors.titleBg } }
          }
        };
      }
    });

    // ===== DETAILED STATISTICS TABLE =====
    XLSX.utils.sheet_add_aoa(wsReport, [
      ['📋 ESTADÍSTICAS DETALLADAS POR EMPLEADO', '', '', '', '', '', '', ''],
      ['']
    ], { origin: 'A11' });
    wsReport['A11'].s = { font: { bold: true, sz: 12, color: { rgb: colors.headerText } }, fill: { fgColor: { rgb: colors.sectionOrange } } };

    if (reportData.length > 0) {
      XLSX.utils.sheet_add_json(wsReport, reportData, { origin: 'A13' });
      applyHeaderStyles(wsReport, ['A13', 'B13', 'C13', 'D13', 'E13', 'F13', 'G13', 'H13'], colors.headerBlue);
      applyDataRowStyles(wsReport, 14, 13 + reportData.length, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    }

    // ===== VISUAL CHART - TOP 10 EMPLOYEES =====
    const chartStartRow = 15 + reportData.length;
    XLSX.utils.sheet_add_aoa(wsReport, [
      [''],
      ['📈 TOP 10 - EMPLEADOS CON MÁS MOVIMIENTOS', '', '', '', '', '', '', ''],
      [''],
      ['EMPLEADO', 'GRÁFICA ENTRADAS', 'ENT.', 'GRÁFICA SALIDAS', 'SAL.', 'TOTAL', '', '']
    ], { origin: `A${chartStartRow}` });
    
    wsReport[`A${chartStartRow + 1}`].s = { font: { bold: true, sz: 12, color: { rgb: colors.headerText } }, fill: { fgColor: { rgb: colors.sectionPurple } } };
    applyHeaderStyles(wsReport, [
      `A${chartStartRow + 3}`, `B${chartStartRow + 3}`, `C${chartStartRow + 3}`,
      `D${chartStartRow + 3}`, `E${chartStartRow + 3}`, `F${chartStartRow + 3}`
    ], colors.accentBlue);

    // Create visual bar chart with colored bars
    const maxMovimientos = Math.max(...Object.values(employeeStats).map(e => e.totalMovimientos), 1);
    const chartData = Object.values(employeeStats)
      .sort((a, b) => b.totalMovimientos - a.totalMovimientos)
      .slice(0, 10)
      .map(emp => {
        const entradaBarLength = Math.max(1, Math.round((emp.entradas / maxMovimientos) * 15));
        const salidaBarLength = Math.max(1, Math.round((emp.salidas / maxMovimientos) * 15));
        return [
          emp.nombre.substring(0, 25),
          '▓'.repeat(entradaBarLength) + '░'.repeat(15 - entradaBarLength),
          emp.entradas,
          '▓'.repeat(salidaBarLength) + '░'.repeat(15 - salidaBarLength),
          emp.salidas,
          emp.totalMovimientos
        ];
      });

    XLSX.utils.sheet_add_aoa(wsReport, chartData, { origin: `A${chartStartRow + 4}` });
    
    // Style chart rows with alternating colors
    for (let i = 0; i < chartData.length; i++) {
      const row = chartStartRow + 4 + i;
      const bgColor = i % 2 === 0 ? "FFFFFF" : colors.lightGray;
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col, idx) => {
        const cell = `${col}${row}`;
        if (wsReport[cell]) {
          wsReport[cell].s = {
            font: { 
              color: { rgb: col === 'B' ? colors.chartBar : col === 'D' ? colors.chartBarAlt : colors.headerText },
              bold: col === 'F'
            },
            fill: { fgColor: { rgb: bgColor } },
            alignment: { horizontal: idx === 0 ? "left" : "center" }
          };
        }
      });
    }

    // ===== AREA SUMMARY =====
    const areaStats: Record<string, { entradas: number; salidas: number; empleados: Set<string> }> = {};
    records.forEach((record: any) => {
      const area = record.employees?.area || 'N/A';
      const cedula = record.employees?.cedula || 'N/A';
      if (!areaStats[area]) {
        areaStats[area] = { entradas: 0, salidas: 0, empleados: new Set() };
      }
      if (record.tipo === 'ENTRADA') {
        areaStats[area].entradas++;
      } else {
        areaStats[area].salidas++;
      }
      areaStats[area].empleados.add(cedula);
    });

    const areaSummaryRow = chartStartRow + 5 + chartData.length + 2;
    XLSX.utils.sheet_add_aoa(wsReport, [
      [''],
      ['🏢 RESUMEN POR ÁREA', '', '', '', '', '', '', ''],
      [''],
      ['ÁREA', 'EMPLEADOS', 'ENTRADAS', 'SALIDAS', 'TOTAL', 'DISTRIBUCIÓN', '', '']
    ], { origin: `A${areaSummaryRow}` });
    
    wsReport[`A${areaSummaryRow + 1}`].s = { font: { bold: true, sz: 12, color: { rgb: colors.headerText } }, fill: { fgColor: { rgb: colors.sectionPink } } };
    applyHeaderStyles(wsReport, [
      `A${areaSummaryRow + 3}`, `B${areaSummaryRow + 3}`, `C${areaSummaryRow + 3}`,
      `D${areaSummaryRow + 3}`, `E${areaSummaryRow + 3}`, `F${areaSummaryRow + 3}`
    ], colors.headerBlue);

    const maxAreaTotal = Math.max(...Object.values(areaStats).map(s => s.entradas + s.salidas), 1);
    const areaData = Object.entries(areaStats)
      .sort((a, b) => (b[1].entradas + b[1].salidas) - (a[1].entradas + a[1].salidas))
      .map(([area, stats]) => {
        const total = stats.entradas + stats.salidas;
        const barLength = Math.max(1, Math.round((total / maxAreaTotal) * 20));
        return [
          area,
          stats.empleados.size,
          stats.entradas,
          stats.salidas,
          total,
          '█'.repeat(barLength) + '░'.repeat(20 - barLength)
        ];
      });

    XLSX.utils.sheet_add_aoa(wsReport, areaData, { origin: `A${areaSummaryRow + 4}` });
    applyDataRowStyles(wsReport, areaSummaryRow + 4, areaSummaryRow + 3 + areaData.length, ['A', 'B', 'C', 'D', 'E', 'F']);

    // ===== ALERTS SECTION - Multiple movements =====
    if (empleadosMultiples.length > 0) {
      const alertRow = areaSummaryRow + 6 + areaData.length;
      XLSX.utils.sheet_add_aoa(wsReport, [
        [''],
        ['⚠️ EMPLEADOS CON MÚLTIPLES MOVIMIENTOS (>2)', '', '', '', '', '', '', ''],
        [''],
        ['CÉDULA', 'NOMBRE', 'ÁREA', 'ENTRADAS', 'SALIDAS', 'TOTAL', '', '']
      ], { origin: `A${alertRow}` });
      
      wsReport[`A${alertRow + 1}`].s = { font: { bold: true, sz: 12, color: { rgb: "D35400" } }, fill: { fgColor: { rgb: "FDEBD0" } } };
      applyHeaderStyles(wsReport, [
        `A${alertRow + 3}`, `B${alertRow + 3}`, `C${alertRow + 3}`,
        `D${alertRow + 3}`, `E${alertRow + 3}`, `F${alertRow + 3}`
      ], colors.sectionOrange);

      const alertData = empleadosMultiples
        .sort((a, b) => b.totalMovimientos - a.totalMovimientos)
        .map(emp => [emp.cedula, emp.nombre, emp.area, emp.entradas, emp.salidas, emp.totalMovimientos]);
      
      XLSX.utils.sheet_add_aoa(wsReport, alertData, { origin: `A${alertRow + 4}` });
      applyDataRowStyles(wsReport, alertRow + 4, alertRow + 3 + alertData.length, ['A', 'B', 'C', 'D', 'E', 'F']);
    }

    // Set column widths for report
    wsReport['!cols'] = [
      { wch: 28 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 12 }, 
      { wch: 25 }, { wch: 15 }, { wch: 12 }
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
