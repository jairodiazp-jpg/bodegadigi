import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Employee {
  id: string;
  cedula: string;
  nombre: string;
  area: string;
  created_at: string;
}

export interface TimeRecord {
  id: string;
  employee_id: string;
  tipo: string;
  hora_registro: string;
  objetos_personales: string[];
  tarea: string | null;
  created_at: string;
}

export interface EmployeeWithRecords extends Employee {
  records: TimeRecord[];
}

export function useEmployees() {
  const [employees, setEmployees] = useState<EmployeeWithRecords[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEmployees = useCallback(async () => {
    try {
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('nombre');

      if (employeesError) throw employeesError;

      const { data: recordsData, error: recordsError } = await supabase
        .from('time_records')
        .select('*')
        .order('hora_registro', { ascending: false });

      if (recordsError) throw recordsError;

      const employeesWithRecords: EmployeeWithRecords[] = (employeesData || []).map(emp => ({
        ...emp,
        records: (recordsData || []).filter(rec => rec.employee_id === emp.id)
      }));

      setEmployees(employeesWithRecords);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const findEmployeeByCedula = useCallback((cedula: string) => {
    return employees.find(emp => emp.cedula.toUpperCase() === cedula.toUpperCase());
  }, [employees]);

  const registerEmployee = async (cedula: string, nombre: string, area: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .insert({ 
          cedula: cedula.toUpperCase(), 
          nombre: nombre.toUpperCase(), 
          area: area.toUpperCase() 
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Error",
            description: "Ya existe un empleado con esta cédula",
            variant: "destructive"
          });
          return false;
        }
        throw error;
      }

      toast({
        title: "Éxito",
        description: "Empleado registrado correctamente"
      });
      await fetchEmployees();
      return true;
    } catch (error) {
      console.error('Error registering employee:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar el empleado",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteEmployee = async (cedula: string) => {
    try {
      const employee = findEmployeeByCedula(cedula);
      if (!employee) {
        toast({
          title: "Error",
          description: "No se encontró el empleado",
          variant: "destructive"
        });
        return false;
      }

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employee.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Empleado eliminado correctamente"
      });
      await fetchEmployees();
      return true;
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el empleado",
        variant: "destructive"
      });
      return false;
    }
  };

  const registerTimeEntry = async (
    employeeId: string, 
    tipo: 'ENTRADA' | 'SALIDA',
    objetosPersonales: string[],
    tarea: string | null
  ) => {
    try {
      const { error } = await supabase
        .from('time_records')
        .insert({
          employee_id: employeeId,
          tipo,
          objetos_personales: objetosPersonales,
          tarea
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `${tipo} registrada correctamente`
      });
      await fetchEmployees();
      return true;
    } catch (error) {
      console.error('Error registering time entry:', error);
      toast({
        title: "Error",
        description: `No se pudo registrar la ${tipo.toLowerCase()}`,
        variant: "destructive"
      });
      return false;
    }
  };

  const getRecordsForExport = async () => {
    try {
      const { data, error } = await supabase
        .from('time_records')
        .select(`
          *,
          employees (cedula, nombre, area)
        `)
        .order('hora_registro', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching records for export:', error);
      return [];
    }
  };

  const clearAllRecords = async () => {
    try {
      const { error } = await supabase
        .from('time_records')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
      await fetchEmployees();
      return true;
    } catch (error) {
      console.error('Error clearing records:', error);
      return false;
    }
  };

  return {
    employees,
    loading,
    findEmployeeByCedula,
    registerEmployee,
    deleteEmployee,
    registerTimeEntry,
    getRecordsForExport,
    clearAllRecords,
    refetch: fetchEmployees
  };
}
