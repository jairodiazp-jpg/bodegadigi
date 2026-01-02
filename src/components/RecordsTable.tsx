import { Button } from '@/components/ui/button';
import { EmployeeWithRecords } from '@/hooks/useEmployees';
import { LogOut } from 'lucide-react';

interface RecordsTableProps {
  employees: EmployeeWithRecords[];
  onGenerarSalida: (employee: EmployeeWithRecords) => void;
  showAllRecords: boolean;
}

export function RecordsTable({ employees, onGenerarSalida, showAllRecords }: RecordsTableProps) {
  const today = new Date().toDateString();

  const getDisplayRecords = (employee: EmployeeWithRecords) => {
    if (showAllRecords) {
      return employee.records;
    }
    return employee.records.filter(r => 
      new Date(r.hora_registro).toDateString() === today
    );
  };

  const canGenerateExit = (employee: EmployeeWithRecords) => {
    const todayRecords = employee.records.filter(r => 
      new Date(r.hora_registro).toDateString() === today
    );
    return todayRecords.length > 0 && todayRecords[0].tipo === 'ENTRADA';
  };

  const filteredEmployees = employees.filter(emp => {
    const displayRecords = getDisplayRecords(emp);
    return displayRecords.length > 0;
  });

  if (filteredEmployees.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay registros para mostrar
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full">
        <thead>
          <tr className="gradient-primary">
            <th className="text-left p-4 text-primary-foreground font-semibold">NOMBRE</th>
            <th className="text-left p-4 text-primary-foreground font-semibold">CÉDULA</th>
            <th className="text-left p-4 text-primary-foreground font-semibold">ÁREA</th>
            <th className="text-left p-4 text-primary-foreground font-semibold">REGISTROS</th>
            <th className="text-left p-4 text-primary-foreground font-semibold">ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.map((employee, idx) => {
            const displayRecords = getDisplayRecords(employee);
            
            return (
              <tr 
                key={employee.id} 
                className={`${idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'} hover:bg-muted/50 transition-colors`}
              >
                <td className="p-4 text-card-foreground font-medium">{employee.nombre}</td>
                <td className="p-4 text-card-foreground">{employee.cedula}</td>
                <td className="p-4 text-card-foreground">{employee.area}</td>
                <td className="p-4">
                  <div className="space-y-2">
                    {displayRecords.slice(0, 5).map((record) => (
                      <div key={record.id} className="text-sm">
                        <span className={`font-medium ${record.tipo === 'ENTRADA' ? 'text-secondary' : 'text-accent'}`}>
                          {record.tipo}:
                        </span>
                        <span className="text-card-foreground ml-2">
                          {new Date(record.hora_registro).toLocaleString('es-CO')}
                        </span>
                        {record.objetos_personales && record.objetos_personales.length > 0 && (
                          <div className="text-muted-foreground text-xs mt-0.5">
                            Objetos: {record.objetos_personales.join(', ')}
                          </div>
                        )}
                        {record.tarea && (
                          <div className="text-muted-foreground text-xs">
                            Tarea: {record.tarea}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  {canGenerateExit(employee) && (
                    <Button
                      onClick={() => onGenerarSalida(employee)}
                      variant="accent"
                      size="sm"
                      className="gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      GENERAR SALIDA
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
