// Componente corregido: AnalysisHistoryModal.tsx

import React, { useMemo } from 'react';
// Asumo que estas importaciones existen en tu entorno:
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react'; 
import { toast } from 'react-hot-toast'; // si usas toasts

// Define tus tipos (necesarios para que TypeScript no arroje errores)
interface HistoricalImage {
  capture_date: string;
  vegetation_percentage: number | null;
  water_percentage: number | null;
}

interface AnalysisHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historicalImages: HistoricalImage[];
  ecosystemName: string;
}

const AnalysisHistoryModal: React.FC<AnalysisHistoryModalProps> = ({
  isOpen,
  onClose,
  historicalImages,
  ecosystemName,
}) => {
  // 1. CÁLCULO DE PROMEDIOS MENSUALES (monthlyAverages) - DEBE SER LO PRIMERO
  // Esto es la base de todos los demás cálculos y debe estar definido primero.
  const monthlyAverages = useMemo(() => {
    const groupByMonth = (images: HistoricalImage[]) => {
      const groups: { [key: string]: (HistoricalImage & { monthName: string })[] } = {};
      
      images.forEach(image => {
        const date = new Date(image.capture_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
        });
        
        if (!groups[monthKey]) {
          groups[monthKey] = [];
        }
        
        groups[monthKey].push({ ...image, monthName });
      });
      
      return groups;
    };

    const monthlyGroups = groupByMonth(historicalImages);
    const sortedMonths = Object.keys(monthlyGroups).sort().reverse(); 

    return sortedMonths.map(monthKey => {
      const monthData = monthlyGroups[monthKey];
      const avgVegetation = monthData.reduce((sum, img) => sum + (img.vegetation_percentage || 0), 0) / monthData.length;
      const avgWater = monthData.reduce((sum, img) => sum + (img.water_percentage || 0), 0) / monthData.length;
      
      return {
        monthKey,
        monthName: monthData[0].monthName,
        avgVegetation: Number(avgVegetation.toFixed(2)),
        avgWater: Number(avgWater.toFixed(2)),
        count: monthData.length,
      };
    });
  }, [historicalImages]);
// --------------------------------------------------------------------------------------------------
  
  // 2. TENDENCIAS (usa monthlyAverages)
  const trends = useMemo(() => {
    if (monthlyAverages.length < 2) {
      return { vegetation: 'stable', water: 'stable' };
    }
    
    const last = monthlyAverages[0];
    const first = monthlyAverages[monthlyAverages.length - 1]; 
    
    const vegTrend = last.avgVegetation > first.avgVegetation ? 'up' :
                       last.avgVegetation < first.avgVegetation ? 'down' : 'stable';
    
    const waterTrend = last.avgWater > first.avgWater ? 'up' :
                         last.avgWater < first.avgWater ? 'down' : 'stable';
    
    return { vegetation: vegTrend, water: waterTrend };
  }, [monthlyAverages]);

  // 3. DATOS PARA LA GRÁFICA (usa monthlyAverages)
  const chartData = useMemo(() => {
    return monthlyAverages.map(month => ({
      name: month.monthName.split(' ')[0], 
      lirio: month.avgVegetation,
      agua: month.avgWater,
    })).reverse(); 
  }, [monthlyAverages]);

  const maxValue = useMemo(() => {
    const maxLirio = Math.max(...monthlyAverages.map(m => m.avgVegetation));
    const maxAgua = Math.max(...monthlyAverages.map(m => m.avgWater));
    return Math.max(maxLirio, maxAgua) + 5; 
  }, [monthlyAverages]);

  // 4. FUNCIÓN DE EXPORTACIÓN (usa monthlyAverages y ecosystemName) - DEBE ESTAR DESPUÉS
  const exportToCSV = () => {
    // Si usas useCallback, deberías importar useCallBack y envolver la función:
    // const exportToCSV = useCallback(() => { ... }, [monthlyAverages, ecosystemName]);

    try {
      const headers = ['Mes', 'Promedio Lirio (%)', 'Promedio Agua (%)', 'Número de Análisis'];
      const csvData = monthlyAverages.map(month => [
        month.monthName,
        month.avgVegetation,
        month.avgWater,
        month.count,
      ]);
      
      const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historial-analisis-${ecosystemName}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
       // Si usas toast, descomenta esta línea:
       // toast.error('Error al exportar CSV'); 
       console.error("Error exporting CSV:", error);
    }
  };
// --------------------------------------------------------------------------------------------------

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '→';
    }
  };

  const getTrendColor = (trend: string, type: 'vegetation' | 'water') => {
    if (type === 'vegetation') {
      return trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-gray-600';
    } else {
      return trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col z-[10060]">
        {/* Header minimalista */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Análisis Comparativo</h2>
            <p className="text-sm text-gray-600 mt-1">{ecosystemName}</p>
          </div>
          <Button 
            onClick={exportToCSV} 
            // Esto asume que tienes un componente Button con variantes
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            {/* Asumiendo que Download es un ícono de Lucide o similar */}
            {/* <Download className="w-4 h-4" /> */}
            Exportar
          </Button>
        </div>

        {/* Contenido compacto */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tarjetas de resumen compactas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Tendencia Lirio</div>
              <div className={`text-sm font-medium ${getTrendColor(trends.vegetation, 'vegetation')}`}>
                {getTrendIcon(trends.vegetation)} {trends.vegetation === 'up' ? 'Aumentando' : trends.vegetation === 'down' ? 'Disminuyendo' : 'Estable'}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Tendencia Agua</div>
              <div className={`text-sm font-medium ${getTrendColor(trends.water, 'water')}`}>
                {getTrendIcon(trends.water)} {trends.water === 'up' ? 'Aumentando' : trends.water === 'down' ? 'Disminuyendo' : 'Estable'}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Período</div>
              <div className="text-sm font-medium text-gray-900">{monthlyAverages.length} meses</div>
            </div>
          </div>

          {/* Gráfica de líneas */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Evolución Mensual</h3>
            <div className="h-48 relative">
              {/* Eje Y */}
              <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-gray-400">
                {[100, 75, 50, 25, 0].map((value) => (
                  <div key={value} className="text-right pr-1">{value}%</div>
                ))}
              </div>
              
              {/* Gráfica */}
              <div className="ml-8 h-full relative">
                {/* Líneas de la cuadrícula */}
                {[0, 25, 50, 75, 100].map((percent) => (
                  <div
                    key={percent}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: `${100 - percent}%` }}
                  />
                ))}
                
                {/* SVG para las líneas de datos */}
                <svg className="w-full h-full" viewBox={`0 0 ${chartData.length > 0 ? (chartData.length - 1) * 100 : 100} 100`} preserveAspectRatio="none">
                  
                  {/* Línea de lirio */}
                  <path
                    d={chartData.map((point, index) => 
                      `${index === 0 ? 'M' : 'L'} ${index * 100} ${100 - point.lirio}`
                    ).join(' ')}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  
                  {/* Línea de agua */}
                  <path
                    d={chartData.map((point, index) => 
                      `${index === 0 ? 'M' : 'L'} ${index * 100} ${100 - point.agua}`
                    ).join(' ')}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  
                  {/* Puntos de lirio */}
                  {chartData.map((point, index) => (
                    <circle
                      key={`lirio-${index}`}
                      cx={index * 100}
                      cy={100 - point.lirio}
                      r="3"
                      fill="#10b981"
                    />
                  ))}
                  
                  {/* Puntos de agua */}
                  {chartData.map((point, index) => (
                    <circle
                      key={`agua-${index}`}
                      cx={index * 100}
                      cy={100 - point.agua}
                      r="3"
                      fill="#3b82f6"
                    />
                  ))}
                </svg>
                
                {/* Eje X - Nombres de meses */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
                  {chartData.map((point, index) => (
                    <div 
                      key={index} 
                      className="text-center"
                      style={{ 
                        position: 'absolute', 
                        left: `${(index * 100 * 100) / (chartData.length > 0 ? (chartData.length - 1) * 100 : 100)}%`, 
                        transform: 'translateX(-50%)', 
                        top: '100%' 
                      }}
                    >
                      {point.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Leyenda */}
            <div className="flex justify-center gap-6 mt-10 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Lirio Acuático</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Agua</span>
              </div>
            </div>
          </div>

          {/* Tabla compacta */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Detalles Mensuales</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-xs">Mes</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-xs">Lirio</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-xs">Agua</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-xs">Análisis</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 text-xs">Variación (vs Mes Ant.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {monthlyAverages.map((month, index) => {
                    const prevMonth = monthlyAverages[index + 1]; 
                    const vegChange = prevMonth ? Number((month.avgVegetation - prevMonth.avgVegetation).toFixed(2)) : 0;
                    const waterChange = prevMonth ? Number((month.avgWater - prevMonth.avgWater).toFixed(2)) : 0;
                    
                    return (
                      <tr key={month.monthKey} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900 font-medium">
                          {month.monthName}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-green-600 font-medium">
                          {month.avgVegetation}%
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-blue-600 font-medium">
                          {month.avgWater}%
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                          {month.count}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {prevMonth ? (
                            <div className="text-xs space-y-1">
                              <div className={vegChange > 0 ? 'text-red-500' : vegChange < 0 ? 'text-green-500' : 'text-gray-400'}>
                                L: {vegChange > 0 ? '+' : ''}{vegChange}%
                              </div>
                              <div className={waterChange > 0 ? 'text-green-500' : waterChange < 0 ? 'text-red-500' : 'text-gray-400'}>
                                A: {waterChange > 0 ? '+' : ''}{waterChange}%
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen estadístico minimalista */}
          {monthlyAverages.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Resumen Estadístico</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Lirio Promedio</div>
                  <div className="text-sm font-medium text-gray-900">
                    {(monthlyAverages.reduce((sum, m) => sum + m.avgVegetation, 0) / monthlyAverages.length).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Agua Promedio</div>
                  <div className="text-sm font-medium text-gray-900">
                    {(monthlyAverages.reduce((sum, m) => sum + m.avgWater, 0) / monthlyAverages.length).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Máx. Lirio</div>
                  <div className="text-sm font-medium text-gray-900">
                    {Math.max(...monthlyAverages.map(m => m.avgVegetation)).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Mín. Lirio</div>
                  <div className="text-sm font-medium text-gray-900">
                    {Math.min(...monthlyAverages.map(m => m.avgVegetation)).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnalysisHistoryModal;
// -------------------------------------------------