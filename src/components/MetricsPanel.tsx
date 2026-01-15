import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { Lock, BarChart3, TrendingUp, TrendingDown, Users, ArrowUpDown, Eye, EyeOff } from 'lucide-react';

interface EmployeeMetric {
  cedula: string;
  nombre: string;
  area: string;
  entradas: number;
  salidas: number;
  totalMovimientos: number;
  ultimoMovimiento: string;
}

export function MetricsPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [metrics, setMetrics] = useState<EmployeeMetric[]>([]);
  const [sortBy, setSortBy] = useState<'entradas' | 'salidas' | 'total'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const { employees, getRecordsForExport, loading } = useEmployees();
  const { toast } = useToast();

  const handleLogin = () => {
    if (password === 'admin') {
      setIsAuthenticated(true);
      toast({
        title: "Acceso concedido",
        description: "Bienvenido al panel de métricas"
      });
    } else {
      toast({
        title: "Error",
        description: "Contraseña incorrecta",
        variant: "destructive"
      });
    }
    setPassword('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadMetrics();
    }
  }, [isAuthenticated]);

  const loadMetrics = async () => {
    const records = await getRecordsForExport();
    if (!records) return;

    const employeeStats: Record<string, EmployeeMetric> = {};

    records.forEach((record: any) => {
      const cedula = record.employees?.cedula || 'N/A';
      const nombre = record.employees?.nombre || 'N/A';
      const area = record.employees?.area || 'N/A';

      if (!employeeStats[cedula]) {
        employeeStats[cedula] = {
          cedula,
          nombre,
          area,
          entradas: 0,
          salidas: 0,
          totalMovimientos: 0,
          ultimoMovimiento: record.hora_registro
        };
      }

      if (record.tipo === 'ENTRADA') {
        employeeStats[cedula].entradas++;
      } else {
        employeeStats[cedula].salidas++;
      }
      employeeStats[cedula].totalMovimientos++;

      // Update last movement if this is more recent
      if (new Date(record.hora_registro) > new Date(employeeStats[cedula].ultimoMovimiento)) {
        employeeStats[cedula].ultimoMovimiento = record.hora_registro;
      }
    });

    setMetrics(Object.values(employeeStats));
  };

  const sortedMetrics = [...metrics].sort((a, b) => {
    let valueA: number, valueB: number;
    
    switch (sortBy) {
      case 'entradas':
        valueA = a.entradas;
        valueB = b.entradas;
        break;
      case 'salidas':
        valueA = a.salidas;
        valueB = b.salidas;
        break;
      default:
        valueA = a.totalMovimientos;
        valueB = b.totalMovimientos;
    }
    
    return sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
  });

  const toggleSort = (field: 'entradas' | 'salidas' | 'total') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const totalEntradas = metrics.reduce((sum, m) => sum + m.entradas, 0);
  const totalSalidas = metrics.reduce((sum, m) => sum + m.salidas, 0);
  const totalEmpleados = metrics.length;
  const promedioMovimientos = totalEmpleados > 0 ? ((totalEntradas + totalSalidas) / totalEmpleados).toFixed(1) : '0';

  // Get top 5 with most entries and exits
  const top5Entradas = [...metrics].sort((a, b) => b.entradas - a.entradas).slice(0, 5);
  const top5Salidas = [...metrics].sort((a, b) => b.salidas - a.salidas).slice(0, 5);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-elevated max-w-md w-full">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-card-foreground">Acceso Restringido</h2>
            <p className="text-muted-foreground text-sm text-center mt-2">
              Este panel solo está disponible para administradores
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-password" className="text-sm font-medium">
                Contraseña de Administrador
              </Label>
              <div className="relative mt-1">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ingrese la contraseña"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button onClick={handleLogin} className="w-full gradient-primary">
              <Lock className="w-4 h-4 mr-2" />
              Acceder a Métricas
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{totalEmpleados}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Entradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-900 dark:text-green-100">{totalEntradas}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Total Salidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{totalSalidas}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Promedio Mov./Empleado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{promedioMovimientos}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="bg-green-50 dark:bg-green-950/30 rounded-t-lg">
            <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top 5 - Más Entradas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {top5Entradas.map((emp, index) => (
                <div key={emp.cedula} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-orange-400 text-orange-900' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{emp.nombre}</p>
                      <p className="text-xs text-muted-foreground">{emp.area}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">{emp.entradas}</span>
                </div>
              ))}
              {top5Entradas.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No hay datos disponibles</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-orange-50 dark:bg-orange-950/30 rounded-t-lg">
            <CardTitle className="text-orange-700 dark:text-orange-300 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Top 5 - Más Salidas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {top5Salidas.map((emp, index) => (
                <div key={emp.cedula} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-orange-400 text-orange-900' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{emp.nombre}</p>
                      <p className="text-xs text-muted-foreground">{emp.area}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{emp.salidas}</span>
                </div>
              ))}
              {top5Salidas.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No hay datos disponibles</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Detalle de Movimientos por Empleado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Cédula</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => toggleSort('entradas')}
                  >
                    <div className="flex items-center gap-1">
                      Entradas
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => toggleSort('salidas')}
                  >
                    <div className="flex items-center gap-1">
                      Salidas
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => toggleSort('total')}
                  >
                    <div className="flex items-center gap-1">
                      Total
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </TableHead>
                  <TableHead>Último Movimiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMetrics.map((emp) => (
                  <TableRow key={emp.cedula} className="hover:bg-muted/30">
                    <TableCell className="font-mono">{emp.cedula}</TableCell>
                    <TableCell className="font-medium">{emp.nombre}</TableCell>
                    <TableCell>{emp.area}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
                        {emp.entradas}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium">
                        {emp.salidas}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold">
                        {emp.totalMovimientos}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(emp.ultimoMovimiento).toLocaleString('es-CO')}
                    </TableCell>
                  </TableRow>
                ))}
                {sortedMetrics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay registros de movimientos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Logout button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          onClick={() => setIsAuthenticated(false)}
          className="text-muted-foreground"
        >
          <Lock className="w-4 h-4 mr-2" />
          Cerrar sesión de métricas
        </Button>
      </div>
    </div>
  );
}
