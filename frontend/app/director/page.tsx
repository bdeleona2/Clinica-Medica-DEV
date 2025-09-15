'use client';

import React, { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  BarChart3,
  DollarSign,
  Users,
  Clock,
  Star,
  Activity,
  Target,
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  Stethoscope,
  AlertTriangle,
  FileText,
} from 'lucide-react';

// ------- Mocks (fallback si tu API aún no expone estos endpoints)
const mockMonthlyTrends = [
  { mes: 'Ene', ingresos: 1250000, pacientes: 1240, satisfaccion: 4.7 },
  { mes: 'Feb', ingresos: 1320000, pacientes: 1310, satisfaccion: 4.6 },
  { mes: 'Mar', ingresos: 1450000, pacientes: 1425, satisfaccion: 4.8 },
  { mes: 'Abr', ingresos: 1380000, pacientes: 1360, satisfaccion: 4.5 },
  { mes: 'May', ingresos: 1520000, pacientes: 1480, satisfaccion: 4.9 },
  { mes: 'Jun', ingresos: 1480000, pacientes: 1450, satisfaccion: 4.7 },
];

const mockDepartmentMetrics = [
  { nombre: 'Consultas', ingresos: 874500, pacientes: 870, eficiencia: 92 },
  { nombre: 'Imagenología', ingresos: 1023600, pacientes: 1240, eficiencia: 88 },
  { nombre: 'Laboratorio', ingresos: 612300, pacientes: 1020, eficiencia: 95 },
  { nombre: 'Urgencias', ingresos: 408000, pacientes: 680, eficiencia: 78 },
];

const mockDoctorPerformance = [
  { nombre: 'Dr. Miguel Torres', especialidad: 'Cardiología', pacientes: 128, ingresos: 384000, satisfaccion: 4.9, utilizacion: 92 },
  { nombre: 'Dra. Ana López', especialidad: 'Pediatría', pacientes: 145, ingresos: 362500, satisfaccion: 4.8, utilizacion: 88 },
  { nombre: 'Dr. Carlos Ruiz', especialidad: 'Ortopedia', pacientes: 112, ingresos: 448000, satisfaccion: 4.7, utilizacion: 95 },
  { nombre: 'Dra. Sofia Martínez', especialidad: 'Dermatología', pacientes: 96, ingresos: 384000, satisfaccion: 4.6, utilizacion: 84 },
];

// -------- Helper seguro (intenta usar API y sino vuelve a mock)
async function callSafe<T>(fn: (() => Promise<T>) | undefined, fallback: T): Promise<T> {
  try {
    if (typeof fn === 'function') return await fn();
  } catch (e) {
    console.error(e);
  }
  return fallback;
}

export default function DirectorDashboard() {
  const router = useRouter();
  const overviewRef = useRef<HTMLDivElement>(null);   // para exportar el dashboard
  const reportsRef = useRef<HTMLDivElement>(null);    // para “Reporte completo”

  function handleLogout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    router.push('/'); // login
  }

  // --------- Datos básicos que ya traes de tu API genérica
  const [mockAppointments, set_mockAppointments] = useState<any[]>([]);
  const [mockPatients, set_mockPatients] = useState<any[]>([]);
  const [mockDoctors, set_mockDoctors] = useState<any[]>([]);
  const [mockServices, set_mockServices] = useState<any[]>([]);
  const [mockStudies, set_mockStudies] = useState<any[]>([]);
  const [mockInvoices, set_mockInvoices] = useState<any[]>([]);

  // --------- Datos del panel de Dirección (KPIs, series, etc)
  const [kpis, setKpis] = useState({
    ingresosTotales: 2918400,
    crecimientoIngresos: 12.5,
    totalPacientes: 1450,
    crecimientoPacientes: 8.2,
    tiempoEsperaPromedio: 28,
    cambioTiempoEspera: -5,
    satisfaccionPaciente: 4.7,
    cambioSatisfaccion: 2.1,
    utilizacionMedicos: 87,
    cambioUtilizacion: 3.4,
    margenOperativo: 32.5,
    cambioMargen: 1.8,
  });
  const [monthlyTrends, setMonthlyTrends] = useState(mockMonthlyTrends);
  const [deptMetrics, setDeptMetrics] = useState(mockDepartmentMetrics);
  const [doctorPerf, setDoctorPerf] = useState(mockDoctorPerformance);

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | 'full' | null>(null);

  // --------- Cargas iniciales
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Datos “base” que ya tenías
        const [ap, pa, dr, sv, im, inv] = await Promise.all([
          callSafe((api as any)?.appointments?.list, []),
          callSafe((api as any)?.patients?.list, []),
          callSafe((api as any)?.doctors?.list, []),
          callSafe((api as any)?.services?.list, []),
          callSafe((api as any)?.imaging?.list, []),
          callSafe((api as any)?.invoices?.list, []),
        ]);

        // Datos “dirección” (si tus endpoints existen, usa esos; si no, mocks)
        // Esperado (sug): api.director.kpis({ period }), api.director.trends({ period }), etc.
        const [dirKpis, trends, depts, perf] = await Promise.all([
          callSafe((api as any)?.director?.kpis?.bind((api as any)?.director, { period: selectedPeriod }), kpis),
          callSafe((api as any)?.director?.trends?.bind((api as any)?.director, { period: selectedPeriod }), mockMonthlyTrends),
          callSafe((api as any)?.director?.departmentMetrics?.bind((api as any)?.director, { period: selectedPeriod }), mockDepartmentMetrics),
          callSafe((api as any)?.director?.doctorPerformance?.bind((api as any)?.director, { period: selectedPeriod }), mockDoctorPerformance),
        ]);

        if (!mounted) return;
        set_mockAppointments(ap);
        set_mockPatients(pa);
        set_mockDoctors(dr);
        set_mockServices(sv);
        set_mockStudies(im);
        set_mockInvoices(inv);
        setKpis(dirKpis as any);
        setMonthlyTrends(trends as any);
        setDeptMetrics(depts as any);
        setDoctorPerf(perf as any);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  // --------- Utilidades
  const formatCurrency = (amount: number) => `Q${amount.toLocaleString()}`;
  const getChangeIcon = (n: number) => (n >= 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />);
  const getChangeColor = (n: number) => (n >= 0 ? 'text-green-600' : 'text-red-600');

  // --------- Exportar Dashboard (PDF)
  async function exportDashboardPDF() {
    try {
      setExporting('pdf');
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

      const el = overviewRef.current;
      if (!el) return;

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: el.scrollHeight,
      });

      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 20; // márgenes
      const imgH = (canvas.height * imgW) / canvas.width;

      let position = 10;
      let heightLeft = imgH;

      pdf.addImage(img, 'PNG', 10, position, imgW, imgH, undefined, 'FAST');
      heightLeft -= pageH - 20;

      while (heightLeft > 0) {
        pdf.addPage();
        position = 10 - (imgH - heightLeft);
        pdf.addImage(img, 'PNG', 10, position, imgW, imgH, undefined, 'FAST');
        heightLeft -= pageH - 20;
      }

      pdf.save(`dashboard-direccion_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      alert('No se pudo exportar el dashboard. Revisa la consola.');
    } finally {
      setExporting(null);
    }
  }

  // --------- Botones de “Reportes” (genera XLSX con la info del estado)
  async function exportXlsxSingle(type: 'financial' | 'performance' | 'patients' | 'operations' | 'satisfaction') {
    try {
      setExporting('xlsx');
      const XLSX = await import('xlsx');

      const wb = XLSX.utils.book_new();

      if (type === 'financial') {
        const resumen = [
          ['Métrica', 'Valor'],
          ['Ingresos Totales (Q)', kpis.ingresosTotales],
          ['Margen Operativo (%)', kpis.margenOperativo],
        ];
        const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
        const wsDept = XLSX.utils.json_to_sheet(
          deptMetrics.map(d => ({ Departamento: d.nombre, 'Ingresos (Q)': d.ingresos, Pacientes: d.pacientes, Eficiencia: d.eficiencia }))
        );
        const wsTend = XLSX.utils.json_to_sheet(
          monthlyTrends.map(t => ({ Mes: t.mes, 'Ingresos (Q)': t.ingresos, Pacientes: t.pacientes, Satisfacción: t.satisfaccion }))
        );
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Financiero');
        XLSX.utils.book_append_sheet(wb, wsDept, 'Por Departamento');
        XLSX.utils.book_append_sheet(wb, wsTend, 'Tendencias');
      }

      if (type === 'performance') {
        const wsPerf = XLSX.utils.json_to_sheet(
          doctorPerf.map(d => ({
            Médico: d.nombre,
            Especialidad: d.especialidad,
            Pacientes: d.pacientes,
            'Ingresos (Q)': d.ingresos,
            'Satisfacción': d.satisfaccion,
            'Utilización (%)': d.utilizacion,
          }))
        );
        XLSX.utils.book_append_sheet(wb, wsPerf, 'Rendimiento');
      }

      if (type === 'patients') {
        const ws = XLSX.utils.json_to_sheet(
          mockPatients.map((p: any) => ({
            ID: p.id,
            Nombre: p.nombre || p.name,
            Correo: p.correo || p.email,
            Teléfono: p.telefono || p.phone,
            Estado: p.estado || p.status,
          }))
        );
        XLSX.utils.book_append_sheet(wb, ws, 'Pacientes');
      }

      if (type === 'operations') {
        const ops = [
          { Indicador: 'Programadas Hoy', Valor: 47 },
          { Indicador: 'Cancelaciones', Valor: 3 },
          { Indicador: 'No Shows', Valor: 2 },
          { Indicador: 'Tasa de Ocupación (%)', Valor: 91 },
          { Indicador: 'Equipos Operativos', Valor: 12 },
          { Indicador: 'Equipos en Mantenimiento', Valor: 2 },
          { Indicador: 'Utilización de Equipos (%)', Valor: 87 },
        ];
        const ws = XLSX.utils.json_to_sheet(ops);
        XLSX.utils.book_append_sheet(wb, ws, 'Operaciones');
      }

      if (type === 'satisfaction') {
        const sat = [
          ['Satisfacción Promedio (0-5)', kpis.satisfaccionPaciente],
          ['Cambio vs Mes Anterior (%)', kpis.cambioSatisfaccion],
        ];
        const ws = XLSX.utils.aoa_to_sheet(sat);
        XLSX.utils.book_append_sheet(wb, ws, 'Satisfacción');
      }

      XLSX.writeFile(wb, `${type}-report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.error(e);
      alert('No se pudo generar el XLSX. Revisa la consola.');
    } finally {
      setExporting(null);
    }
  }

  // --------- Reporte completo (todas las hojas)
  async function exportFullReportXlsx() {
    try {
      setExporting('full');
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const resumen = [
        ['Métrica', 'Valor'],
        ['Ingresos Totales (Q)', kpis.ingresosTotales],
        ['Total Pacientes', kpis.totalPacientes],
        ['Tiempo de Espera Promedio (min)', kpis.tiempoEsperaPromedio],
        ['Satisfacción (0-5)', kpis.satisfaccionPaciente],
        ['Utilización Médicos (%)', kpis.utilizacionMedicos],
        ['Margen Operativo (%)', kpis.margenOperativo],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          deptMetrics.map(d => ({ Departamento: d.nombre, 'Ingresos (Q)': d.ingresos, Pacientes: d.pacientes, Eficiencia: d.eficiencia }))
        ),
        'Por Departamento'
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          doctorPerf.map(d => ({
            Médico: d.nombre,
            Especialidad: d.especialidad,
            Pacientes: d.pacientes,
            'Ingresos (Q)': d.ingresos,
            'Satisfacción': d.satisfaccion,
            'Utilización (%)': d.utilizacion,
          }))
        ),
        'Rendimiento'
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          monthlyTrends.map(t => ({ Mes: t.mes, 'Ingresos (Q)': t.ingresos, Pacientes: t.pacientes, Satisfacción: t.satisfaccion }))
        ),
        'Tendencias'
      );

      XLSX.writeFile(wb, `reporte-ejecutivo_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.error(e);
      alert('No se pudo generar el Reporte Completo.');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-heading text-gray-900">Dirección Clínica</h1>
                <p className="text-sm text-gray-600">Panel ejecutivo y análisis estratégico</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mes</SelectItem>
                  <SelectItem value="quarter">Trimestre</SelectItem>
                  <SelectItem value="year">Año</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleLogout}>Cerrar Sesión</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Resumen Ejecutivo</TabsTrigger>
            <TabsTrigger value="financial">Análisis Financiero</TabsTrigger>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
            <TabsTrigger value="operations">Operaciones</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
          </TabsList>

          {/* -------- Resumen Ejecutivo -------- */}
          <TabsContent value="overview" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold font-heading text-gray-900">Resumen Ejecutivo</h2>
              <Button variant="outline" onClick={exportDashboardPDF} disabled={!!exporting}>
                <Download className="w-4 h-4 mr-2" />
                {exporting === 'pdf' ? 'Exportando...' : 'Exportar Dashboard (PDF)'}
              </Button>
            </div>

            {/* Contenido a exportar */}
            <div ref={overviewRef} id="overview-export-root" className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.ingresosTotales)}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {getChangeIcon(kpis.crecimientoIngresos)}
                          <span className={`text-sm ${getChangeColor(kpis.crecimientoIngresos)}`}>{kpis.crecimientoIngresos}% vs mes anterior</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Pacientes</p>
                        <p className="text-2xl font-bold text-gray-900">{kpis.totalPacientes.toLocaleString()}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {getChangeIcon(kpis.crecimientoPacientes)}
                          <span className={`text-sm ${getChangeColor(kpis.crecimientoPacientes)}`}>{kpis.crecimientoPacientes}% vs mes anterior</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Tiempo de Espera Promedio</p>
                        <p className="text-2xl font-bold text-gray-900">{kpis.tiempoEsperaPromedio} min</p>
                        <div className="flex items-center gap-1 mt-1">
                          {getChangeIcon(kpis.cambioTiempoEspera)}
                          <span className={`text-sm ${getChangeColor(kpis.cambioTiempoEspera)}`}>{Math.abs(kpis.cambioTiempoEspera)}% vs mes anterior</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Satisfacción del Paciente</p>
                        <p className="text-2xl font-bold text-gray-900">{kpis.satisfaccionPaciente}/5.0</p>
                        <div className="flex items-center gap-1 mt-1">
                          {getChangeIcon(kpis.cambioSatisfaccion)}
                          <span className={`text-sm ${getChangeColor(kpis.cambioSatisfaccion)}`}>{kpis.cambioSatisfaccion}% vs mes anterior</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Star className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Utilización de Médicos</p>
                        <p className="text-2xl font-bold text-gray-900">{kpis.utilizacionMedicos}%</p>
                        <div className="flex items-center gap-1 mt-1">
                          {getChangeIcon(kpis.cambioUtilizacion)}
                          <span className={`text-sm ${getChangeColor(kpis.cambioUtilizacion)}`}>{kpis.cambioUtilizacion}% vs mes anterior</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                        <Activity className="w-6 h-6 text-cyan-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Margen Operativo</p>
                        <p className="text-2xl font-bold text-gray-900">{kpis.margenOperativo}%</p>
                        <div className="flex items-center gap-1 mt-1">
                          {getChangeIcon(kpis.cambioMargen)}
                          <span className={`text-sm ${getChangeColor(kpis.cambioMargen)}`}>{kpis.cambioMargen}% vs mes anterior</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <Target className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tendencias */}
              <Card>
                <CardHeader>
                  <CardTitle>Tendencias Mensuales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Ingresos (Q)</span>
                      <span>Pacientes</span>
                      <span>Satisfacción</span>
                    </div>
                    {monthlyTrends.map((t, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium w-12">{t.mes}</span>
                        <div className="flex-1 flex items-center justify-between px-4">
                          <span className="text-green-600 font-medium">{formatCurrency(t.ingresos)}</span>
                          <span className="text-blue-600 font-medium">{t.pacientes}</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="text-purple-600 font-medium">{t.satisfaccion}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* -------- Análisis Financiero -------- */}
          <TabsContent value="financial" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Análisis Financiero</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ingresos por Departamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {deptMetrics.map((dept, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{dept.nombre}</span>
                          <span className="text-sm font-bold text-green-600">{formatCurrency(dept.ingresos)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(dept.ingresos / kpis.ingresosTotales) * 100}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>{dept.pacientes} pacientes</span>
                          <span>Eficiencia: {dept.eficiencia}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Métricas Financieras Clave</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Ingresos Promedio por Paciente</span>
                    <span className="font-bold text-green-600">{formatCurrency(Math.round(kpis.ingresosTotales / Math.max(1, kpis.totalPacientes)))}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Costo por Consulta</span>
                    <span className="font-bold text-blue-600">Q260.00</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">ROI Equipamiento</span>
                    <span className="font-bold text-purple-600">18.5%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="font-medium">Gastos Operativos</span>
                    <span className="font-bold text-orange-600">Q961,200</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Proyecciones Financieras</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Proyección Trimestral</p>
                    <p className="text-2xl font-bold text-green-600">Q3,880,000</p>
                    <p className="text-xs text-green-600">+15% vs trimestre anterior</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Meta Anual</p>
                    <p className="text-2xl font-bold text-blue-600">Q15,600,000</p>
                    <p className="text-xs text-blue-600">80% completado</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Crecimiento Esperado</p>
                    <p className="text-2xl font-bold text-purple-600">22%</p>
                    <p className="text-xs text-purple-600">Próximos 12 meses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* -------- Rendimiento -------- */}
          <TabsContent value="performance" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Rendimiento del Personal</h2>

            <Card>
              <CardHeader>
                <CardTitle>Rendimiento por Médico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-900">Médico</th>
                        <th className="text-left p-4 font-medium text-gray-900">Especialidad</th>
                        <th className="text-left p-4 font-medium text-gray-900">Pacientes</th>
                        <th className="text-left p-4 font-medium text-gray-900">Ingresos</th>
                        <th className="text-left p-4 font-medium text-gray-900">Satisfacción</th>
                        <th className="text-left p-4 font-medium text-gray-900">Utilización</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorPerf.map((d, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium text-gray-900">{d.nombre}</td>
                          <td className="p-4 text-gray-600">{d.especialidad}</td>
                          <td className="p-4 text-gray-900">{d.pacientes}</td>
                          <td className="p-4 font-bold text-green-600">{formatCurrency(d.ingresos)}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="font-medium">{d.satisfaccion}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={d.utilizacion >= 90 ? 'bg-green-100 text-green-800' : d.utilizacion >= 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                              {d.utilizacion}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium">Dr. Miguel Torres</p>
                      <p className="text-sm text-gray-600">Mayor satisfacción (4.9/5)</p>
                    </div>
                    <Star className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Dr. Carlos Ruiz</p>
                      <p className="text-sm text-gray-600">Mayor utilización (92%)</p>
                    </div>
                    <Activity className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-medium">Dra. Ana López</p>
                      <p className="text-sm text-gray-600">Mayor eficiencia</p>
                    </div>
                    <Target className="w-6 h-6 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Áreas de Mejora</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">Tiempo de Espera</p>
                      <p className="text-sm text-gray-600">Reducir en Imagenología</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium">Capacitación</p>
                      <p className="text-sm text-gray-600">Personal administrativo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium">Equipamiento</p>
                      <p className="text-sm text-gray-600">Mantenimiento TAC</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* -------- Operaciones -------- */}
          <TabsContent value="operations" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Operaciones</h2>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Citas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between"><span className="text-sm">Programadas Hoy</span><Badge className="bg-blue-100 text-blue-800">47</Badge></div>
                  <div className="flex justify-between"><span className="text-sm">Cancelaciones</span><Badge className="bg-red-100 text-red-800">3</Badge></div>
                  <div className="flex justify-between"><span className="text-sm">No Shows</span><Badge className="bg-yellow-100 text-yellow-800">2</Badge></div>
                  <div className="flex justify-between"><span className="text-sm">Tasa de Ocupación</span><Badge className="bg-green-100 text-green-800">91%</Badge></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5" />
                    Personal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between"><span className="text-sm">Médicos Activos</span><Badge className="bg-green-100 text-green-800">15</Badge></div>
                  <div className="flex justify-between"><span className="text-sm">Personal Admin</span><Badge className="bg-blue-100 text-blue-800">8</Badge></div>
                  <div className="flex justify-between"><span className="text-sm">Técnicos</span><Badge className="bg-purple-100 text-purple-800">6</Badge></div>
                  <div className="flex justify-between"><span className="text-sm">Ausencias</span><Badge className="bg-yellow-100 text-yellow-800">1</Badge></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Equipos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between"><span className="text-sm">Operativos</span><Badge className="bg-green-100 text-green-800">12</Badge></div>
                  <div className="flex justify-between"><span className="text-sm">Mantenimiento</span><Badge className="bg-yellow-100 text-yellow-800">2</Badge></div>
                  <div className="flex justify-between"><span className="text-sm">Fuera de Servicio</span><Badge className="bg-red-100 text-red-800">0</Badge></div>
                  <div className="flex justify-between"><span className="text-sm">Utilización</span><Badge className="bg-blue-100 text-blue-800">87%</Badge></div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Alertas Operacionales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium">Mantenimiento Programado</p>
                    <p className="text-sm text-gray-600">TAC - Sala 3 fuera de servicio hasta el 16/01</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                  <AlertTriangle className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Capacidad Alta</p>
                    <p className="text-sm text-gray-600">Consultas externas al 95% de capacidad esta semana</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 border-l-4 border-green-400 rounded">
                  <AlertTriangle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Meta Alcanzada</p>
                    <p className="text-sm text-gray-600">Satisfacción del paciente superó el objetivo mensual</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* -------- Reportes -------- */}
          <TabsContent value="reports" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold font-heading text-gray-900">Reportes Ejecutivos</h2>
              <Button className="bg-red-600 hover:bg-red-700" onClick={exportFullReportXlsx} disabled={!!exporting}>
                <FileText className="w-4 h-4 mr-2" />
                {exporting === 'full' ? 'Generando…' : 'Generar Reporte Completo (XLSX)'}
              </Button>
            </div>

            <div ref={reportsRef} className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Reportes Disponibles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => exportXlsxSingle('financial')} disabled={!!exporting}>
                    <FileText className="w-4 h-4 mr-2" />
                    Reporte Financiero Mensual
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => exportXlsxSingle('performance')} disabled={!!exporting}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Análisis de Rendimiento
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => exportXlsxSingle('patients')} disabled={!!exporting}>
                    <Users className="w-4 h-4 mr-2" />
                    Estadísticas de Pacientes
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => exportXlsxSingle('operations')} disabled={!!exporting}>
                    <Activity className="w-4 h-4 mr-2" />
                    Reporte Operacional
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => exportXlsxSingle('satisfaction')} disabled={!!exporting}>
                    <Star className="w-4 h-4 mr-2" />
                    Encuesta de Satisfacción
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Programación de Reportes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Reportes Automáticos</p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between"><span>Reporte Diario</span><Badge variant="secondary">08:00</Badge></div>
                      <div className="flex justify-between"><span>Reporte Semanal</span><Badge variant="secondary">Lunes</Badge></div>
                      <div className="flex justify-between"><span>Reporte Mensual</span><Badge variant="secondary">Día 1</Badge></div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full bg-transparent">
                    Configurar Reportes
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
