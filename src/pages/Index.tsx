import { useState, useEffect } from 'react';
import { LoginScreen } from '@/components/LoginScreen';
import { TimeRegistration } from '@/components/TimeRegistration';
import { EmployeeRegistration } from '@/components/EmployeeRegistration';
import { MetricsPanel } from '@/components/MetricsPanel';
import { ShoppingCart, BarChart3 } from 'lucide-react';
import mascotaAlkosto from '@/assets/mascota-alkosto.png';
const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'registro-horas' | 'registro-empleados' | 'metricas'>('registro-horas');
  useEffect(() => {
    const session = localStorage.getItem('bodega-session');
    if (session === 'active') {
      setIsLoggedIn(true);
    }
  }, []);
  const handleLogin = () => {
    localStorage.setItem('bodega-session', 'active');
    setIsLoggedIn(true);
  };
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }
  return <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-card rounded-2xl shadow-elevated p-6 md:p-8 animate-fade-in">
          {/* Logo y Mascota */}
          <div className="flex justify-center items-center gap-6 mb-6">
            <div className="w-40 h-auto p-2 bg-card rounded-xl shadow-card overflow-hidden">
              <img src="https://co.tubono.com/wp-content/uploads/sites/17/2023/12/ktronix-alkosto.png" alt="Alkosto Logo" className="w-full h-auto object-contain border-2 border-solid rounded-xl shadow-2xl opacity-95 border-accent" />
            </div>
            <div className="w-32 h-auto">
              
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <ShoppingCart className="w-7 h-7 text-accent animate-bounce-subtle" />
              <h1 className="text-2xl md:text-3xl font-bold text-primary">
                REGISTRO EMPLEADOS A BODEGA DIGITAL
              </h1>
              <ShoppingCart className="w-7 h-7 text-accent animate-bounce-subtle" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 mb-8 border-b border-border">
            <button onClick={() => setActiveTab('registro-horas')} className={`px-6 py-3 font-semibold transition-all rounded-t-lg ${activeTab === 'registro-horas' ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground hover:text-card-foreground hover:bg-muted/50'}`}>
              REGISTRO DE HORAS
            </button>
            <button onClick={() => setActiveTab('registro-empleados')} className={`px-6 py-3 font-semibold transition-all rounded-t-lg ${activeTab === 'registro-empleados' ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground hover:text-card-foreground hover:bg-muted/50'}`}>
              REGISTRO DE EMPLEADOS
            </button>
            <button onClick={() => setActiveTab('metricas')} className={`px-6 py-3 font-semibold transition-all rounded-t-lg flex items-center gap-2 ${activeTab === 'metricas' ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground hover:text-card-foreground hover:bg-muted/50'}`}>
              <BarChart3 className="w-4 h-4" />
              MÉTRICAS
            </button>
          </div>

          {/* Content */}
          {activeTab === 'registro-horas' && <TimeRegistration />}
          {activeTab === 'registro-empleados' && <EmployeeRegistration />}
          {activeTab === 'metricas' && <MetricsPanel />}
        </div>
      </div>
    </div>;
};
export default Index;